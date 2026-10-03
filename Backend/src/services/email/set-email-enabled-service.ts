import { EmailEnabledState } from "@/services/email/email-state";

export function SetEmailEnabledService(enabled: boolean) {
  EmailEnabledState.enabled = enabled;
}
