import { CalendarDays, Wrench, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";

const ROW_CLASS = "flex h-10 w-full items-center gap-3 rounded-button border bg-surface px-3 text-left text-xs font-medium text-ink";

function ActionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />;
}

// `onBlockTime` is only passed for admins, since only they can block time (firestore.rules)
export function QuickActions({ onBlockTime }: { onBlockTime?: () => void }) {
  return (
    <Card className="p-6">
      <h2 className="type-h2">Quick actions</h2>

      <div className="mt-5 space-y-2.5">
        {onBlockTime && (
          <button type="button" onClick={onBlockTime} className={`${ROW_CLASS} focus-ring transition-colors hover:bg-sidebar`}>
            <ActionIcon icon={Wrench} />
            Block time for maintenance
          </button>
        )}

        <Link to="/calendar" className={`${ROW_CLASS} focus-ring transition-colors hover:bg-sidebar`}>
          <ActionIcon icon={CalendarDays} />
          View calendar
        </Link>
      </div>
    </Card>
  );
}
