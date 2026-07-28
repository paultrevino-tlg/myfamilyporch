import { setStorytellerPhone } from "../../settings/actions";

// The storyteller's SMS number. Extracted so the hub's Phone box and the setup
// wizard render the SAME form — a second copy would drift, and this one carries
// the "no consent is recorded here" wording that keeps the first-party consent
// model honest.
//
// `from="setup"` sends the post-save redirect back into the wizard instead of
// the hub, so the flow doesn't eject you halfway through.
export default function PhoneForm({
  storytellerId,
  storytellerName,
  phone,
  from,
}: {
  storytellerId: string;
  storytellerName: string;
  phone: string | null;
  from?: "setup";
}) {
  return (
    <form action={setStorytellerPhone} className="space-y-3">
      <input type="hidden" name="storyteller_id" value={storytellerId} />
      {from && <input type="hidden" name="from" value={from} />}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm">
          <span className="text-ink/60">Phone</span>
          <input
            type="tel"
            name="phone"
            defaultValue={phone ?? ""}
            placeholder="+1 602 555 4471"
            className="mt-1 input"
          />
        </label>
        <button type="submit" className="btn-ink">
          Save
        </button>
      </div>
      <p className="max-w-prose text-xs leading-relaxed text-ink/55">
        No consent is recorded here. {storytellerName} confirms it themselves by
        tapping the invite link — that first-person opt-in is what lets us text
        them.
      </p>
    </form>
  );
}
