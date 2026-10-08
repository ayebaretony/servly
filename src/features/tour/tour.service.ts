import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TOUR_VERSION } from "./tour.steps";

// Remembers on the person's own users/{uid} document that they have seen the tour, so it never shows again on any device.
// firestore.rules lets a user change this one field and nothing else on their own profile.
export function markTourDone(uid: string) {
  return updateDoc(doc(db, "users", uid), {
    onboarding: { tourVersion: TOUR_VERSION, completedAt: serverTimestamp() },
  });
}
