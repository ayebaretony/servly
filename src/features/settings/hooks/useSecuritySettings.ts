import { useAsyncData } from "@/lib/useAsyncData";
import { fetchSecuritySettings } from "../security.service";

export function useSecuritySettings() {
  return useAsyncData(fetchSecuritySettings, "We couldn't load the security settings.");
}
