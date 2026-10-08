import { Card } from "@/components/ui/Card";
import { ChangePasswordBlock } from "./ChangePasswordBlock";
import { InactivityTimeoutBlock } from "./InactivityTimeoutBlock";

export function SecuritySection() {
  return (
    <Card>
      <div className="p-6 pb-5">
        <h2 className="type-h2">Security</h2>
        <p className="mt-1 text-xs text-muted">Keep the booking system and your customers' details safe.</p>
      </div>

      <div className="space-y-6 border-t p-6">
        <section aria-labelledby="idle-heading">
          <h3 id="idle-heading" className="mb-3 text-sm font-semibold text-ink">
            Automatic sign-out
          </h3>
          <InactivityTimeoutBlock />
        </section>

        <section aria-labelledby="password-heading" className="border-t pt-6">
          <h3 id="password-heading" className="mb-3 text-sm font-semibold text-ink">
            Your password
          </h3>
          <ChangePasswordBlock />
        </section>
      </div>
    </Card>
  );
}
