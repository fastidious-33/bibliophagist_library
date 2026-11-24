/**
 * Getting in touch from the desk (PLAN.md "Account and desk rework", B3):
 * WhatsApp, Call and Email links, and the ready-made WhatsApp messages.
 * Nothing is sent by the site: each link opens the librarian's own app with
 * the message filled in, to edit before sending.
 *
 * The wording below is a draft: change it freely.
 */

/** The first name, for "Hi Riya". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * A phone number as WhatsApp and tel: links want it: digits only, with the
 * country code. A 10-digit number is taken as Indian (91 in front); a
 * leading 0 (a trunk prefix) is dropped. Null if it doesn't look like a
 * phone number.
 */
export function phoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const international = phone.trim().startsWith('+');
  let digits = phone.replace(/\D/g, '');
  if (!international) {
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** A WhatsApp chat with them, with `message` typed in ready to edit (none if empty). */
export function whatsappUrl(phone: string | null | undefined, message = ''): string | null {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}

export function callUrl(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

export function emailUrl(email: string | null | undefined, subject?: string): string | null {
  if (!email) return null;
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}

/** Ready-made WhatsApp messages. Dates arrive already written ("7 Dec"). */
export const MESSAGES = {
  setAside: (name: string, title: string, until: string) =>
    `Hi ${firstName(name)}, “${title}” is set aside for you at the library until ${until}. When suits you for the handover?`,
  overdue: (name: string, title: string, due: string) =>
    `Hi ${firstName(name)}, a gentle reminder that “${title}” was due back on ${due}. Could you return it this week? If you need more time, ask from your account.`,
  payment: (name: string, amount: number, parts: string, upiId: string) =>
    `Hi ${firstName(name)}, welcome to the library! To start borrowing, pay ₹${amount} (${parts})${
      upiId ? ` by UPI to ${upiId}` : ''
    }. I’ll mark it on your account once it arrives.`,
};
