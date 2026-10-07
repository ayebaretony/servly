import { Archive, MoreHorizontal, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Court } from "@/types/court";

type CourtActionsMenuProps = {
  court: Court;
  onEdit: (court: Court) => void;
  onArchive: (court: Court) => void;
};

// The "..." button at the end of a row. The menu is positioned on the screen (not inside the table), because the table
// scrolls sideways on small screens and would otherwise cut the menu off.
export function CourtActionsMenu({ court, onEdit, onArchive }: CourtActionsMenuProps) {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOpen = position !== null;

  function close(returnFocus: boolean) {
    setPosition(null);
    if (returnFocus) triggerRef.current?.focus();
  }

  function toggle() {
    if (isOpen) return close(false);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    };
    // The menu would drift away from its row if the page moved underneath it
    const onMove = () => close(false);

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [isOpen]);

  const itemClass =
    "focus-ring flex w-full items-center gap-2.5 rounded-chip px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-sidebar";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`More actions for ${court.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggle}
        className="focus-ring grid size-8 place-items-center rounded-button text-muted transition-colors hover:bg-sidebar hover:text-ink"
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </button>

      {position && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${court.name}`}
          style={{ top: position.top, right: position.right }}
          className="card fixed z-30 w-44 p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              close(false);
              onEdit(court);
            }}
          >
            <Pencil aria-hidden="true" className="size-4 text-muted" />
            Edit court
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${itemClass} text-danger`}
            onClick={() => {
              close(false);
              onArchive(court);
            }}
          >
            <Archive aria-hidden="true" className="size-4" />
            Archive court
          </button>
        </div>
      )}
    </>
  );
}
