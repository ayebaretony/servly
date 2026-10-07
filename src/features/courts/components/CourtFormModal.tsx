import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/useToast";
import type { Court, CourtStatus } from "@/types/court";
import { NAME_MAX, SURFACE_MAX, validateCourt, type CourtFormValues } from "../court.validation";
import { CourtError, createCourt, updateCourt } from "../courts.service";

// Only suggestions: the field takes any text
const SURFACE_SUGGESTIONS = ["Outdoor hard court", "Indoor hard court", "Indoor acrylic court", "Clay court", "Grass court"];

type CourtFormModalProps = {
  court?: Court; // present = editing this court, absent = adding a new one
  courts: Court[]; // the current list: for the duplicate-name check and for picking the new court's colour
  onClose: () => void;
  onSaved: () => void;
};

// One form for both "Add court" and "Edit court". Mount it only while it should be open.
export function CourtFormModal({ court, courts, onClose, onSaved }: CourtFormModalProps) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const isEditing = court !== undefined;

  const [values, setValues] = useState<CourtFormValues>({
    name: court?.name ?? "",
    surface: court?.surface ?? "",
    status: court?.status ?? "available",
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The dialog opens on its close button; start on the first field instead so typing can begin straight away
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("input")?.focus();
  }, []);

  // Errors appear after the first "Save" and then follow the typing
  const errors = submitted ? validateCourt(values, courts, court?.id) : {};

  function set<K extends keyof CourtFormValues>(field: K, value: CourtFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    setSubmitError(null);

    const found = validateCourt(values, courts, court?.id);
    if (Object.keys(found).length > 0) {
      // Take the person to the first field that needs attention
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    const input = {
      name: values.name.trim(),
      surface: values.surface.trim(),
      status: values.status,
    };

    setSaving(true);
    try {
      if (court) await updateCourt(court.id, input);
      else await createCourt(input, courts);
      showToast(isEditing ? `${input.name} was updated.` : `${input.name} was added.`);
      onSaved();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof CourtError ? error.message : "We couldn't save the court. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEditing ? "Edit court" : "Add court"}
      description={isEditing ? "Change the details or availability of this court." : "Set up a new court so it can be booked."}
      onClose={onClose}
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Court name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              error={errors.name}
              maxLength={NAME_MAX + 20}
              autoComplete="off"
              placeholder={`e.g. Court ${courts.length + 1}`}
            />
            <Input
              label="Court type"
              value={values.surface}
              onChange={(event) => set("surface", event.target.value)}
              error={errors.surface}
              maxLength={SURFACE_MAX + 20}
              list="court-surface-options"
              autoComplete="off"
              placeholder="e.g. Outdoor hard court"
            />
            <datalist id="court-surface-options">
              {SURFACE_SUGGESTIONS.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
            <Select label="Status" value={values.status} onChange={(event) => set("status", event.target.value as CourtStatus)}>
              <option value="available">Available</option>
              <option value="maintenance">Under maintenance</option>
            </Select>
            <p className="text-xs text-muted">The hourly rate is set on each booking, because customers pay different rates.</p>
          </div>
        </ModalBody>

        <ModalFooter>
          {submitError && (
            <p role="alert" className="mr-auto text-xs text-danger">
              {submitError}
            </p>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save changes" : "Add court"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
