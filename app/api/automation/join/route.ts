import { automationGuard } from '@/lib/automation';
import { saveSignUp, type LifeStage } from '@/lib/members';

/**
 * POST /api/automation/join: a new sign-up from the Tally Join form,
 * passed on by Activepieces Flow 3 (M3-BORROWING.md §14, §16.8).
 *
 * Only Activepieces can call it: the `x-library-secret` header must match
 * AUTOMATION_SECRET. It checks the required answers and consent, then saves
 * a pending member and answers { ok, status } (see SignUpResult). It never
 * echoes anyone's details back.
 *
 *   401  wrong or missing secret        nothing stored
 *   400  a required answer is missing   nothing stored; `missing` names which
 *   503  the site isn't set up yet      nothing stored
 */
export async function POST(request: Request) {
  const refused = automationGuard(request);
  if (refused) return refused;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const fields = {
    submission_id: answer(body.submission_id),
    name: answer(body.name),
    email: answer(body.email),
    phone: answer(body.phone),
    location: answer(body.location),
    instagram: answer(body.instagram),
  };
  const missing = Object.entries(fields)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (fields.email && !looksLikeEmail(fields.email)) missing.push('email');
  if (answer(body.consent).toLowerCase() !== 'yes') missing.push('consent');
  if (missing.length > 0) {
    return Response.json({ ok: false, error: 'missing_fields', missing }, { status: 400 });
  }

  const status = await saveSignUp({
    submissionId: fields.submission_id,
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    location: fields.location,
    instagram: fields.instagram,
    lifeStage: toLifeStage(answer(body.life_stage)),
    college: answer(body.college) || null,
    linkedin: answer(body.linkedin) || null,
  });

  return Response.json({ ok: true, status });
}

/**
 * One answer as trimmed text. Tally's choice questions can reach
 * Activepieces as a list (["Yes"]), so a list gives its first item.
 */
function answer(value: unknown): string {
  if (Array.isArray(value)) return answer(value[0]);
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' ? value.trim() : '';
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** The form's "Your current status in life?": Working / Student / In-Btw. */
function toLifeStage(value: string): LifeStage | null {
  const v = value.toLowerCase().replace(/[^a-z]/g, '');
  if (v === 'working') return 'working';
  if (v === 'student') return 'student';
  if (v === 'inbtw' || v === 'inbetween') return 'in_between';
  return null;
}
