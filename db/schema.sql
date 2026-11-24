-- The members database for borrowing (M3). Spec: M3-BORROWING.md §9.
--
-- Run it by pasting the whole file into Neon's SQL Editor: first on the
-- `dev` branch, then on `production` once A1 is checked. It only creates
-- what's missing, so running it twice is harmless; it never drops or
-- changes existing tables (a later change gets its own script).
--
-- Logins themselves live in Neon Auth's own `neon_auth` schema; a member
-- points at theirs through `login_id`. Books stay in Sanity: `book_id` is the
-- Sanity _id / call number (B123), with the title copied in so history
-- still reads well if a book is renamed or removed.

-- People: everyone who joined through the Tally form or was added at the desk.
create table if not exists members (
  id                  uuid primary key default gen_random_uuid(),
  -- The Neon Auth user, linked on their first sign-in with the same email.
  login_id            text unique,
  source              text not null check (source in ('tally', 'desk')),
  -- So a Tally submission replayed by Activepieces is never stored twice.
  tally_submission_id text unique,
  name                text not null,
  email               text not null,
  phone               text not null,
  -- Required on the Tally form; may be empty for members added by hand.
  location            text,
  instagram           text,
  life_stage          text check (life_stage in ('working', 'student', 'in_between')),
  college             text,
  linkedin            text,
  status              text not null default 'pending'
                      check (status in ('pending', 'approved', 'active', 'paused', 'declined', 'left')),
  librarian_note      text,          -- only the librarian sees it
  decline_note        text,          -- shown to them if declined
  consent_at          timestamptz,   -- when they accepted the privacy notice
  joined_at           timestamptz not null default now(),
  approved_at         timestamptz,
  left_at             timestamptz,
  -- When they were declined: declined people are archived, and deleted 30
  -- days later (lib/desk-members.ts purgeDeclined).
  declined_at         timestamptz,
  -- Set when the librarian re-opens change requests after three declines
  -- in a row; only declines after it count.
  change_requests_reset_at timestamptz,
  -- Their library card number ("No. 0042"): given on approval, in order,
  -- from member_card_no_seq, and never reused.
  card_no             integer unique,
  -- Books at once (requests, set-asides and books out together); 2 unless
  -- the librarian raises it.
  borrow_limit        integer not null default 2 check (borrow_limit between 1 and 10)
);

-- One member per email, however it's capitalised.
create unique index if not exists members_email_key on members (lower(email));

-- Added 2026-11-20, after `members` was first created on dev.
alter table members add column if not exists change_requests_reset_at timestamptz;

-- Added 2026-11-21. Anyone declined before it existed starts their 30 days
-- from the first run (later runs find nothing to fill in).
alter table members add column if not exists declined_at timestamptz;
update members set declined_at = now() where status = 'declined' and declined_at is null;

-- Added 2026-11-23 (account and desk rework, B1): card numbers and each
-- member's own book limit.
create sequence if not exists member_card_no_seq;
alter table members add column if not exists card_no integer unique;
alter table members add column if not exists borrow_limit integer not null default 2
  check (borrow_limit between 1 and 10);

-- Numbers everyone approved before card numbers existed, in the order they
-- were approved. Later runs find no one without a number.
do $$
declare
  r record;
begin
  for r in
    select id from members
    where card_no is null and approved_at is not null and status in ('approved', 'active', 'paused')
    order by approved_at, joined_at, id
  loop
    update members set card_no = nextval('member_card_no_seq') where id = r.id;
  end loop;
end $$;

-- A member asking to change their details. Members can't edit their record
-- themselves: the librarian approves (applies new_values) or declines at the
-- desk. Only the fields that differ are stored.
create table if not exists detail_changes (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references members (id) on delete cascade,
  old_values     jsonb not null,   -- e.g. {"phone": "+91…"} as it was when asked
  new_values     jsonb not null,   -- the same keys, as they want it (null = remove)
  member_note    text,             -- their optional "why"
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'declined')),
  librarian_note text,             -- shown to them if declined
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);

-- One waiting request per member: sending another replaces it.
create unique index if not exists detail_changes_pending_key on detail_changes (member_id)
  where status = 'pending';
create index if not exists detail_changes_member_idx on detail_changes (member_id, decided_at desc);

-- The ₹500 deposit and ₹300 subscription, marked by hand at the desk.
-- A refunded deposit stays as history; paying again is a new row.
create table if not exists payments (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references members (id) on delete cascade,
  kind          text not null check (kind in ('deposit', 'subscription')),
  amount        integer not null check (amount >= 0),   -- rupees
  status        text not null check (status in ('paid', 'waived', 'refunded')),
  method        text check (method in ('upi', 'cash', 'other')),
  reference     text,                                   -- optional UPI reference
  paid_at       timestamptz,
  refunded_at   timestamptz,
  refund_amount integer check (refund_amount >= 0),
  note          text,
  created_at    timestamptz not null default now()
);

-- One current (paid or waived) payment of each kind per member; any number
-- of refunded ones before it.
create unique index if not exists payments_current_key on payments (member_id, kind)
  where status <> 'refunded';
create index if not exists payments_member_idx on payments (member_id);

-- Added 2026-11-20, after `payments` was first created on dev with
-- `unique (member_id, kind)`, which allowed only one deposit ever: drops it
-- (the index above replaces it). A fresh run has no such constraint.
alter table payments drop constraint if exists payments_member_id_kind_key;

-- "Request this book", from the site's own form.
create table if not exists requests (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references members (id) on delete cascade,
  book_id         text not null,
  book_title      text not null,
  -- accepted = set aside, waiting for pickup (until set_aside_until);
  -- released = set aside but not collected, and let go.
  status          text not null default 'requested'
                  check (status in ('requested', 'accepted', 'declined', 'cancelled', 'lent', 'released')),
  handover        text not null check (handover in ('in_person', 'courier')),
  courier_address text,          -- cleared on return, decline or release
  member_note     text,          -- their note to the librarian
  note            text,          -- the librarian's decline note
  created_at      timestamptz not null default now(),
  decided_at      timestamptz,
  -- The pickup window: 14 days from accepting, to the end of that day in
  -- India. The desk flags day 7 and day 14; nothing happens on its own.
  set_aside_until timestamptz
);

create index if not exists requests_member_idx on requests (member_id);
create index if not exists requests_open_book_idx on requests (book_id)
  where status in ('requested', 'accepted');

-- Added 2026-11-23 (B1): the pickup window and the "released" ending.
-- Requests already accepted get 14 days from when they were accepted.
alter table requests add column if not exists set_aside_until timestamptz;
update requests
set set_aside_until =
  ((((coalesce(decided_at, created_at) at time zone 'Asia/Kolkata')::date + 14) + time '23:59:59')
   at time zone 'Asia/Kolkata')
where status = 'accepted' and set_aside_until is null;
alter table requests drop constraint if exists requests_status_check;
alter table requests add constraint requests_status_check
  check (status in ('requested', 'accepted', 'declined', 'cancelled', 'lent', 'released'));

-- The waitlist: a line per book that's out (B1, used from B2). First come,
-- first served; the librarian can reorder. Active members only, up to 5
-- books each (checked by the site, like the book limit).
create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members (id) on delete cascade,
  book_id    text not null,
  book_title text not null,
  place      integer not null,   -- lower goes first; gaps are fine
  created_at timestamptz not null default now(),
  unique (member_id, book_id)
);

create index if not exists waitlist_book_idx on waitlist (book_id, place);
create index if not exists waitlist_member_idx on waitlist (member_id);

-- Books out, and the history of every loan.
create table if not exists loans (
  id              uuid primary key default gen_random_uuid(),
  -- Emptied when a member deletes their account: the loan stays as
  -- history with only their name (member_name below).
  member_id       uuid references members (id) on delete set null,
  -- The borrower's name, copied in when they delete their account, so
  -- history still says who had the book. Empty while the member exists
  -- (their record has the name).
  member_name     text,
  request_id      uuid references requests (id) on delete set null,   -- empty when lent straight from the desk
  book_id         text not null,
  book_title      text not null,
  lent_at         timestamptz not null default now(),
  due_at          timestamptz not null,
  extended_count  integer not null default 0 check (extended_count >= 0),
  returned_at     timestamptz,
  handover        text not null check (handover in ('in_person', 'courier')),
  courier_address text,          -- cleared on return
  note            text           -- the librarian's own note ("not read, issues"); only the desk shows it
);

create index if not exists loans_member_idx on loans (member_id);
create index if not exists loans_open_book_idx on loans (book_id) where returned_at is null;
create index if not exists loans_open_due_idx on loans (due_at) where returned_at is null;

-- Added 2026-11-20, after `loans` was first created on dev: brings an
-- existing table up to date (a fresh run already has the column above).
alter table loans add column if not exists note text;
alter table loans add column if not exists member_name text;

-- "Ask for more time" on a book out (B1, used from B2). The librarian
-- approves (the due date moves by `extra`) or declines with a note. One open
-- ask per loan; at most 3 per loan (checked by the site).
create table if not exists more_time_asks (
  id             uuid primary key default gen_random_uuid(),
  loan_id        uuid not null references loans (id) on delete cascade,
  -- A Postgres interval. Asked as 15, 30 or 45 days (since 2026-11-24);
  -- the first values were weeks and a month, kept so older asks stay valid.
  extra          text not null check (extra in ('15 days', '30 days', '45 days', '1 week', '2 weeks', '1 month')),
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'declined')),
  member_note    text,             -- their optional "why"
  librarian_note text,             -- shown to them if declined
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);

create unique index if not exists more_time_asks_pending_key on more_time_asks (loan_id)
  where status = 'pending';
create index if not exists more_time_asks_loan_idx on more_time_asks (loan_id);

-- Added 2026-11-24: asks are 15, 30 or 45 days, like the desk's extensions.
alter table more_time_asks drop constraint if exists more_time_asks_extra_check;
alter table more_time_asks add constraint more_time_asks_extra_check
  check (extra in ('15 days', '30 days', '45 days', '1 week', '2 weeks', '1 month'));

-- So the daily run never sends the same reminder twice in a day.
create table if not exists reminders_sent (
  loan_id uuid not null references loans (id) on delete cascade,
  kind    text not null check (kind in ('due_soon', 'due_today', 'overdue')),
  sent_on date not null,
  primary key (loan_id, kind, sent_on)
);
