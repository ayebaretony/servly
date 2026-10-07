import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ActionItem = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  // "danger" is for actions that remove or cancel something
  tone?: "danger";
};

type ActionsMenuProps = {
  label: string; // names the row for screen readers, e.g. "Maya Chen's booking"
  items: ActionItem[];
};

// The "..." button at the end of a table row. The menu is positioned on the screen (not inside the table), because tables
// scroll sideways on small screens and would otherwise cut the menu off.
export function ActionsMenu({ label, items }: ActionsMenuProps) {
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
    const menuItems = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    menuItems()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return close(true);
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      // Arrow keys move through the items and wrap around, as in a native menu
      event.preventDefault();
      const all = menuItems();
      const index = all.indexOf(document.activeElement as HTMLElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      all[(index + step + all.length) % all.length]?.focus();
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`More actions for ${label}`}
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
          aria-label={`Actions for ${label}`}
          style={{ top: position.top, right: position.right }}
          className="card fixed z-30 w-48 p-1 shadow-lg"
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect, tone }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              className={`focus-ring flex w-full items-center gap-2.5 rounded-chip px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar ${
                tone === "danger" ? "text-danger" : "text-ink"
              }`}
              onClick={() => {
                close(false);
                onSelect();
              }}
            >
              <Icon aria-hidden="true" className={`size-4 ${tone === "danger" ? "" : "text-muted"}`} />
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
