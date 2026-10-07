import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/useToast";
import type { Court } from "@/types/court";
import { CourtError, archiveCourt } from "../courts.service";

type ArchiveCourtModalProps = {
  court: Court;
  onClose: () => void;
  onArchived: () => void;
};

// Confirmation before a court disappears from the list (AGENTS.md section 4: destructive actions ask first)
export function ArchiveCourtModal({ court, onClose, onArchived }: ArchiveCourtModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await archiveCourt(court.id);
      showToast(`${court.name} was archived.`);
      onArchived();
      onClose();
    } catch (caught) {
      setError(caught instanceof CourtError ? caught.message : "We couldn't archive the court. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title={`Archive ${court.name}?`} onClose={onClose}>
      <ModalBody>
        <p className="text-sm text-ink">
          {court.name} will be removed from the courts list and the booking form. Its past bookings and revenue stay in
          your records.
        </p>
      </ModalBody>
      <ModalFooter>
        {error && (
          <p role="alert" className="mr-auto text-xs text-danger">
            {error}
          </p>
        )}
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => void confirm()} disabled={saving}>
          {saving ? "Archiving…" : "Archive court"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
