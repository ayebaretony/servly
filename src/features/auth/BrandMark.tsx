import markSrc from "@/assets/servly-mark.png";

type BrandMarkProps = {
  // "light" is for dark backgrounds such as the green/navy brand panel
  tone?: "dark" | "light";
  size?: "md" | "lg";
};

// Logo mark (cropped from the brand logo.png) next to the app name.
// The mark is navy, so on a dark panel it sits inside a white ring to stay visible.
export function BrandMark({ tone = "dark", size = "md" }: BrandMarkProps) {
  const isLight = tone === "light";
  const imageSize = size === "lg" ? "size-16" : "size-9";
  const nameSize = size === "lg" ? "text-4xl" : "text-xl";

  return (
    <div className={`flex items-center ${size === "lg" ? "flex-col gap-4" : "gap-2.5"}`}>
      <img
        src={markSrc}
        alt=""
        className={`${imageSize} rounded-full ${isLight ? "bg-white p-0.5 ring-1 ring-white/40" : ""}`}
      />
      <span className={`font-heading font-bold tracking-tight ${nameSize} ${isLight ? "text-white" : "text-primary"}`}>
        Servly
      </span>
    </div>
  );
}
