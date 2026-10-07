import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { formatDuration, formatLongDate, formatTimeRange, todayInTimezone } from "@/lib/time";
import type { Block } from "@/types/block";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";

type BlockDetailsModalProps = {
  block: Block;
  court: Court | undefined; // undefined when the court was archived since
  settings: CenterSettings;
  onClose: () => void;
  // Admins only: opens the confirmation to remove the block
  onRemove?: () => void;
};

// Read-only view of a maintenance block
export function BlockDetailsModal({ block, court, settings, onClose, onRemove }: BlockDetailsModalProps) {
  const start = block.startAt.toDate();
  const end = block.endAt.toDate();

  return (
    <Modal title="Maintenance block" description={court?.name ?? "Archived court"} onClose={onClose}>
      <ModalBody>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail label="Reason">{block.reason}</Detail>
          <Detail label="Court">{court?.name ?? "Archived court"}</Detail>
          <Detail label="Date">{formatLongDate(todayInTimezone(settings.timezone, start))}</Detail>
          <Detail label="Time">
            {formatTimeRange(start, end, settings.timezone)} ·{" "}
            {formatDuration(Math.round((end.getTime() - start.getTime()) / 60_000))}
          </Detail>
        </dl>
        <p className="mt-4 text-xs text-muted">This time can't be booked while the block is in place.</p>
      </ModalBody>
      <ModalFooter>
        {onRemove && (
          <Button variant="danger" onClick={onRemove} className="mr-auto">
            Remove block
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}
