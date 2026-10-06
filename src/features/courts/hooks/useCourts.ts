import { fetchCourts } from "../courts.service";
import { useAsyncData } from "@/lib/useAsyncData";

export function useCourts() {
  return useAsyncData(fetchCourts, "We couldn't load the courts.");
}
