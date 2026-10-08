import { useContext } from "react";
import { TourContext } from "./TourContext";

export function useTour() {
  const value = useContext(TourContext);
  if (!value) throw new Error("useTour must be used inside <TourProvider>.");
  return value;
}
