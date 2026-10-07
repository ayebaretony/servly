import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

// Built on the native <dialog>: the browser traps focus inside it, returns focus afterwards and handles Escape.
// Mount it only while it should be open. It deliberately does not close on a backdrop click, so a half-filled form can't be lost by accident.
// Put <ModalBody> and <ModalFooter> inside; the header stays put while the body scrolls on small screens.
export function Modal({ title, description, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl rounded-card border bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40 open:flex open:flex-col"
    >
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div>
          <h2 id={titleId} className="type-h2">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="focus-ring -mr-1.5 grid size-8 shrink-0 place-items-center rounded-button text-muted transition-colors hover:bg-sidebar hover:text-ink"
        >
          <X aria-hidden="true" className="size-[18px]" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-3 border-t bg-page px-5 py-4 sm:px-6">{children}</div>;
}
