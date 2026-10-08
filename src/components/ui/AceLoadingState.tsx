import { useLoadingGate } from "@/lib/useLoadingGate";
import { AceLoader, type AceSize, type AceVariant } from "./AceLoader";

type AceLoadingStateProps = {
  variant?: AceVariant;
  size?: AceSize;
  label?: string;
  // screen = whole window (sign-in check); page = inside the app shell (default); section = inside a card
  layout?: "screen" | "page" | "section";
};

// Ace and his caption, centred on the page background. For pages and sections that are waiting for data.
// Wrap the decision to show it in useLoadingGate so it doesn't flash on fast loads.
export function AceLoadingState({ variant = "bounce", size = "md", label, layout = "page" }: AceLoadingStateProps) {
  return (
    <div className={`ace-state ace-state--${layout}`}>
      <AceLoader variant={variant} size={size} label={label} />
    </div>
  );
}

// For <Suspense fallback>: that component only exists while loading, so it can wait before drawing Ace
// (it can't be held on screen afterwards, because React removes it the moment the page is ready).
export function AceSuspenseFallback(props: AceLoadingStateProps) {
  const { visible } = useLoadingGate(true);
  return visible ? <AceLoadingState {...props} /> : null;
}
