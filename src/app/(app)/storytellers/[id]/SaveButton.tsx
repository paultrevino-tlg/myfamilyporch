// The one Save button used by every inline editor on the storyteller hub and by
// the extracted ScheduleEditor. Shared so the wizard and the hub don't drift.
export default function SaveButton() {
  return (
    <button type="submit" className="btn-ink">
      Save
    </button>
  );
}
