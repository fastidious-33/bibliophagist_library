import { DESK_STATUSES, type DeskMember } from '@/lib/desk-members';
import { LIFE_STAGE_LABEL, STATUS_COPY, type LifeStage } from '@/lib/members';

/**
 * The member form's fields, for "Add a member" (no member yet) and a
 * member's "Edit details". Rendered on the server inside a DeskForm.
 */
export default function MemberFields({ member }: { member?: DeskMember }) {
  return (
    <div className="desk-fields">
      {member && <input type="hidden" name="memberId" value={member.id} />}
      <label>
        <span>Name</span>
        <input name="name" required maxLength={100} defaultValue={member?.name} autoComplete="off" />
      </label>
      <label>
        <span>Email{member ? ' (changing it unlinks their sign-in)' : ''}</span>
        <input name="email" type="email" required maxLength={200} defaultValue={member?.email} autoComplete="off" />
      </label>
      <label>
        <span>Phone</span>
        <input name="phone" type="tel" required maxLength={30} defaultValue={member?.phone} autoComplete="off" />
      </label>
      <label>
        <span>Stage</span>
        <select name="status" defaultValue={member?.status ?? 'approved'}>
          {DESK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_COPY[status].stamp}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Location</span>
        <input name="location" maxLength={200} defaultValue={member?.location ?? ''} autoComplete="off" />
      </label>
      <label>
        <span>Instagram</span>
        <input name="instagram" maxLength={100} defaultValue={member?.instagram ?? ''} autoComplete="off" />
      </label>
      <label>
        <span>Status in life</span>
        <select name="life_stage" defaultValue={member?.life_stage ?? ''}>
          <option value="">Not given</option>
          {(Object.keys(LIFE_STAGE_LABEL) as LifeStage[]).map((stage) => (
            <option key={stage} value={stage}>
              {LIFE_STAGE_LABEL[stage]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>College and course</span>
        <input name="college" maxLength={200} defaultValue={member?.college ?? ''} autoComplete="off" />
      </label>
      <label>
        <span>LinkedIn</span>
        <input name="linkedin" maxLength={300} defaultValue={member?.linkedin ?? ''} autoComplete="off" />
      </label>
      <label className="desk-field-wide">
        <span>Your note (only you see it)</span>
        <textarea name="librarian_note" rows={3} maxLength={2000} defaultValue={member?.librarian_note ?? ''} />
      </label>
      <label className="desk-field-wide">
        <span>Decline note (they see it if the stage is Not approved)</span>
        <textarea name="decline_note" rows={2} maxLength={500} defaultValue={member?.decline_note ?? ''} />
      </label>
    </div>
  );
}
