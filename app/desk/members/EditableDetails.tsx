'use client';

import { useState, type ReactNode } from 'react';
import DeskForm, { type DeskResult } from '../DeskForm';

/**
 * A member's details on their file: shown as plain rows, and "Edit
 * details" turns them into the form in place (Cancel turns it back; saving
 * does too). The rows and the fields are rendered on the server.
 */
export default function EditableDetails({
  view,
  action,
  children,
}: {
  view: ReactNode;
  action: (previous: DeskResult, form: FormData) => Promise<DeskResult>;
  /** The form's fields. */
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <>
        {view}
        <p className="desk-add">
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            Edit details
          </button>
        </p>
      </>
    );
  }

  return (
    <div className="member-edit">
      <DeskForm action={action} submit="Save details" className="desk-form" onSuccess={() => setEditing(false)}>
        {children}
      </DeskForm>
      <button type="button" className="text-button member-edit-cancel" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </div>
  );
}
