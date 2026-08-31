/**
 * Merge server thread history with local/socket messages.
 * Prevents GET /messages/thread from wiping messages that arrived
 * via Socket.IO while the request was in flight (Admin-safe pattern).
 */
export function mergeChatMessages<T extends { id: string; createdAt: number }>(
  local: T[],
  fromServer: T[],
): T[] {
  const byId = new Map<string, T>();

  for (const message of fromServer) {
    if (message.id.startsWith("preview-")) continue;
    byId.set(message.id, message);
  }

  for (const message of local) {
    if (message.id.startsWith("preview-")) continue;
    if (!byId.has(message.id)) {
      byId.set(message.id, message);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
}
