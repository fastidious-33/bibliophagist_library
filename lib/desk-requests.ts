import { db } from '@/lib/db';
import type { MemberStatus } from '@/lib/members';

/**
 * Deciding members' requests at the desk: book requests (accept, which sets
 * the book aside for pickup; decline; release; a longer window) and
 * change requests to their details. The inbox reads them in
 * lib/desk-inbox.ts. Server code only; every caller has already checked
 * librarian().
 */

// ---------- Book requests ----------

export interface BookRequest {
  id: string;
  book_id: string;
  book_title: string;
  status: 'requested' | 'accepted';
  handover: 'in_person' | 'courier';
  courier_address: string | null;
  member_note: string | null;
  created_at: string;
  decided_at: string | null;
  member_id: string;
  member_name: string;
  member_status: MemberStatus;
}

/** How long an accepted request stays set aside, waiting for pickup. */
export const SET_ASIDE_DAYS = 14;

/** A book set aside for someone, waiting for pickup (an accepted request). */
export interface SetAside extends BookRequest {
  set_aside_until: string | null;
}

/** Everything set aside, the window ending soonest first. A query (not yet run), for a transaction. */
export function setAsidesQuery() {
  return db()`
    select r.id, r.book_id, r.book_title, r.status, r.handover, r.courier_address, r.member_note,
           r.created_at, r.decided_at, r.set_aside_until, m.id as member_id, m.name as member_name,
           m.status as member_status
    from requests r join members m on m.id = r.member_id
    where r.status = 'accepted'
    order by r.set_aside_until asc nulls last, r.decided_at asc`;
}

/**
 * Accept one or several waiting requests: each book is set aside until the
 * end of the day, SET_ASIDE_DAYS from today in India (the email comes with
 * A4). Returns the ones that were still waiting.
 */
export async function acceptRequests(ids: string[]): Promise<DecidedRequest[]> {
  if (ids.length === 0) return [];
  const rows = await db()`
    update requests r set status = 'accepted', decided_at = now(),
      set_aside_until =
        ((((now() at time zone 'Asia/Kolkata')::date + ${SET_ASIDE_DAYS}::int) + time '23:59:59')
         at time zone 'Asia/Kolkata')
    from members m
    where r.id = any(${ids}::uuid[]) and r.status = 'requested' and m.id = r.member_id
    returning r.id, r.book_id, r.book_title, r.handover, r.set_aside_until, m.name, m.email`;
  return rows as DecidedRequest[];
}

/** A request just decided at the desk, with who it was from (for its email). */
export interface DecidedRequest {
  id: string;
  book_id: string;
  book_title: string;
  handover: 'in_person' | 'courier';
  set_aside_until: string | null;
  name: string;
  email: string;
}

/** Decline several waiting requests at once, with one note. Returns the ones that were still waiting. */
export async function declineRequests(ids: string[], note: string | null): Promise<DecidedRequest[]> {
  if (ids.length === 0) return [];
  const rows = await db()`
    update requests r set status = 'declined', note = ${note}, decided_at = now(), courier_address = null
    from members m
    where r.id = any(${ids}::uuid[]) and r.status = 'requested' and m.id = r.member_id
    returning r.id, r.book_id, r.book_title, r.handover, r.set_aside_until, m.name, m.email`;
  return rows as DecidedRequest[];
}

/**
 * A set-aside book that wasn't collected: let it go (back to the shelf;
 * B4 offers it to the next in line). Any courier address goes.
 */
export async function releaseSetAside(id: string): Promise<boolean> {
  const rows = await db()`
    update requests set status = 'released', decided_at = now(), courier_address = null
    where id = ${id} and status = 'accepted'
    returning id`;
  return rows.length > 0;
}

/** Give a set-aside book a few more days for pickup (the window moves; nothing else changes). */
export async function extendSetAside(id: string, days: number): Promise<boolean> {
  const rows = await db()`
    update requests
    set set_aside_until = coalesce(set_aside_until, now()) + make_interval(days => ${days}::int)
    where id = ${id} and status = 'accepted'
    returning id`;
  return rows.length > 0;
}

/** An open request, for the lend form to start from. */
export async function getOpenRequest(id: string): Promise<BookRequest | null> {
  const rows = await db()`
    select r.id, r.book_id, r.book_title, r.status, r.handover, r.courier_address, r.member_note,
           r.created_at, r.decided_at, m.id as member_id, m.name as member_name,
           m.status as member_status
    from requests r join members m on m.id = r.member_id
    where r.id = ${id} and r.status in ('requested', 'accepted')`;
  return (rows[0] as BookRequest | undefined) ?? null;
}

// ---------- Change requests ----------

/**
 * Approve: apply the fields they asked for (only those; a null means
 * "remove", except name and phone, which can't be emptied) and mark the
 * request approved, in one statement. An approval resets the
 * three-declines count (§10). Returns the member's id, or null if it was
 * already decided.
 */
export async function approveChange(id: string): Promise<string | null> {
  const rows = await db()`
    with d as (
      update detail_changes set status = 'approved', decided_at = now()
      where id = ${id} and status = 'pending'
      returning member_id, new_values
    )
    update members m set
      name      = case when d.new_values ? 'name'      then coalesce(d.new_values->>'name', m.name)   else m.name end,
      phone     = case when d.new_values ? 'phone'     then coalesce(d.new_values->>'phone', m.phone) else m.phone end,
      location  = case when d.new_values ? 'location'  then d.new_values->>'location'  else m.location end,
      instagram = case when d.new_values ? 'instagram' then d.new_values->>'instagram' else m.instagram end,
      college   = case when d.new_values ? 'college'   then d.new_values->>'college'   else m.college end,
      linkedin  = case when d.new_values ? 'linkedin'  then d.new_values->>'linkedin'  else m.linkedin end
    from d
    where m.id = d.member_id
    returning m.id`;
  return (rows[0] as { id: string } | undefined)?.id ?? null;
}

/** Decline, with an optional note they see on /account. Returns the member's id, or null if already decided. */
export async function declineChange(id: string, note: string | null): Promise<string | null> {
  const rows = await db()`
    update detail_changes set status = 'declined', librarian_note = ${note}, decided_at = now()
    where id = ${id} and status = 'pending'
    returning member_id`;
  return (rows[0] as { member_id: string } | undefined)?.member_id ?? null;
}
