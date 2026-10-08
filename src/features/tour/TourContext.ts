import { createContext } from "react";

export type TourContextValue = {
  // Opens the tour from the start (the "Replay tour" button)
  startTour: () => void;
};

export const TourContext = createContext<TourContextValue | null>(null);
