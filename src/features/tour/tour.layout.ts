// Where Ace, his speech bubble and the spotlight go. Pure maths on rectangles, so it can be reasoned about on its own.

export type Rect = { left: number; top: number; width: number; height: number };

// Which edge of the bubble the little pointer sits on (the edge facing Ace). null on phones, where the bubble is a bottom sheet.
export type Tail = "left" | "right" | null;

export type TourLayout = {
  sheet: boolean; // phone: the bubble docks to the bottom of the screen
  ace: { x: number; y: number; flip: boolean }; // top-left of Ace's box, and whether he faces left
  bubble: { left: number; top: number; width: number; tail: Tail; tailOffset: number };
};

export const WALK_MS = 600;
const PHONE_BELOW = 640; // matches Tailwind's `sm`
const BUBBLE_WIDTH = 340;
const MARGIN = 12;
const GAP = 14; // between the target and Ace/bubble
const ACE_GAP = 8; // between Ace and his bubble
// Ace's shoes end at about 92.5% of his drawing's height
const FEET = 0.925;

export const isPhone = (vw: number) => vw < PHONE_BELOW;
export const aceSize = (vw: number) => (isPhone(vw) ? 64 : 96);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

type LayoutInput = { rect: Rect | null; vw: number; vh: number; bubbleH: number };

export function computeLayout({ rect, vw, vh, bubbleH }: LayoutInput): TourLayout {
  const ace = aceSize(vw);

  // Phone: bubble is a bottom sheet and Ace stands on its top edge, under the target
  if (isPhone(vw)) {
    const sheetTop = vh - bubbleH;
    const x = rect ? clamp(rect.left + rect.width / 2 - ace / 2, MARGIN, vw - ace - MARGIN) : 16;
    return {
      sheet: true,
      ace: { x, y: sheetTop - ace * FEET, flip: x + ace / 2 > vw / 2 },
      bubble: { left: 0, top: sheetTop, width: vw, tail: null, tailOffset: 0 },
    };
  }

  const stageW = ace + ACE_GAP + BUBBLE_WIDTH;
  const stageH = Math.max(ace, bubbleH);

  // Builds the Ace + bubble pair with its top-left corner at (left, top)
  function stage(left: number, top: number, aceOnLeft: boolean, align: "top" | "bottom" | "center", flip: boolean): TourLayout {
    const aceX = aceOnLeft ? left : left + BUBBLE_WIDTH + ACE_GAP;
    const bubbleLeft = aceOnLeft ? left + ace + ACE_GAP : left;
    const aceY = align === "top" ? top : align === "bottom" ? top + stageH - ace : top + (stageH - ace) / 2;
    const bubbleTop = align === "top" ? top : align === "bottom" ? top + stageH - bubbleH : top + (stageH - bubbleH) / 2;
    return {
      sheet: false,
      ace: { x: aceX, y: aceY, flip },
      bubble: {
        left: bubbleLeft,
        top: bubbleTop,
        width: BUBBLE_WIDTH,
        tail: aceOnLeft ? "left" : "right",
        tailOffset: clamp(aceY + ace * 0.45 - bubbleTop, 20, bubbleH - 20),
      },
    };
  }

  // Welcome and finish: no target, so the pair sits in the middle of the screen
  if (!rect) return stage((vw - stageW) / 2, (vh - stageH) / 2, true, "center", false);

  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const sideTop = clamp(centerY - stageH / 2, MARGIN, Math.max(MARGIN, vh - stageH - MARGIN));
  const alignedLeft = clamp(rect.left, MARGIN, vw - stageW - MARGIN);

  // Whichever side has room, tried in this order. Ace faces the target.
  if (bottom + GAP + stageH <= vh - MARGIN) {
    return stage(alignedLeft, bottom + GAP, true, "top", centerX < alignedLeft + ace / 2);
  }
  if (rect.top - GAP - stageH >= MARGIN) {
    return stage(alignedLeft, rect.top - GAP - stageH, true, "bottom", centerX < alignedLeft + ace / 2);
  }
  if (right + GAP + stageW <= vw - MARGIN) return stage(right + GAP, sideTop, true, "center", true);
  if (rect.left - GAP - stageW >= MARGIN) return stage(rect.left - GAP - stageW, sideTop, false, "center", false);

  // The target fills the screen (a big calendar on a small window): stand inside it, near the bottom
  const inside = clamp(Math.min(bottom, vh) - stageH - 16, MARGIN, Math.max(MARGIN, vh - stageH - MARGIN));
  return stage(clamp(centerX - stageW / 2, MARGIN, vw - stageW - MARGIN), inside, true, "bottom", false);
}
