import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/useToast";
import { BookingError } from "@/features/bookings/bookings.service";
import { formatTimeRange, todayInTimezone, formatDayLabel } from "@/lib/time";
import type { Block } from "@/types/block";
import type { Court } from "@/types/court";
import type { CenterSettings } from "@/types/settings";
import { deleteBlock } from "../blocks.service";

type RemoveBlockModalProps = {
  block: Block;
  court: Court | undefined;
  settings: CenterSettings;
  today: string;
  onClose: () => void;
  onDone: () => void;
};

// Confirmation before a block is removed (AGENTS.md section 4: destructive actions ask first)
export function RemoveBlockModal({ block, court, settings, today, onClose, onDone }: RemoveBlockModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = block.startAt.toDate();
  const when = `${formatDayLabel(todayInTimezone(settings.timezone, start), today)}, ${formatTimeRange(start, block.endAt.toDate(), settings.timezone)}`;

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await deleteBlock(block.id);
      showToast("Block removed. The time is free to book again.");
      onDone();
      onClose();
    } catch (caught) {
      setError(caught instanceof BookingError ? caught.message : "We couldn't remove the block. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Remove this block?" onClose={onClose}>
      <ModalBody>
        <div className="space-y-4">
          <p className="rounded-card bg-sidebar px-4 py-3 text-sm text-ink">
            <span className="font-semibold">{block.reason}</span>
            <span className="text-muted">
              {" · "}
              {court?.name ?? "Archived court"}
              {" · "}
              {when}
            </span>
          </p>
          <p className="text-sm text-ink">The court becomes available for these times, so customers can book it again.</p>
        </div>
      </ModalBody>
      <ModalFooter>
        {error && (
          <p role="alert" className="mr-auto text-xs text-danger">
            {error}
          </p>
        )}
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Keep block
        </Button>
        <Button variant="danger" onClick={() => void confirm()} disabled={saving}>
          {saving ? "Removing…" : "Remove block"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
