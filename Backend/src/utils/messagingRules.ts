// Cross-role direct-messaging permission matrix.
// "ALL" means that role can message any registered user (including itself, e.g. owner-to-owner).
const MESSAGE_RULES: Record<string, "ALL" | string[]> = {
  ADMIN: ["OWNER", "USER", "CLERK"],
  CLERK: "ALL",
  OWNER: "ALL",
  USER: "ALL",
};

export function canMessage(senderRole: string, receiverRole: string): boolean {
  const allowed = MESSAGE_RULES[senderRole];
  if (!allowed) return false;
  if (allowed === "ALL") return true;
  return allowed.includes(receiverRole);
}
