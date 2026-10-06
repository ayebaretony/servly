import { fetchCenterSettings } from "../settings.service";
import { useAsyncData } from "@/lib/useAsyncData";

export function useCenterSettings() {
  return useAsyncData(fetchCenterSettings, "We couldn't load the center settings.");
}
