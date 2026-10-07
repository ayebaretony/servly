import type { Timestamp } from "firebase/firestore";

// Shape of blocks/{blockId} in Firestore (AGENTS.md section 7), plus the document id.
// A block closes one court for part of one day, e.g. for resurfacing. Its time is held by slot documents, like a booking's.
export type Block = {
  id: string;
  courtId: string;
  startAt: Timestamp;
  endAt: Timestamp;
  reason: string;
  createdBy: string;
};
