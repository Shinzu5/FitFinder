# FitFinder — Message Flow

## Sender → Database → Socket.IO → Receiver

Primary inbox uses **direct messages** (`/api/messages`), not the legacy `conversations`/`messages` tables.

```
[Any role UI: Messages panel]
    │  compose text + select peer
    ▼
POST /api/messages  { receiverId, text }
    │  messaging.controller.sendDirectMessage
    │  canMessage(senderRole, receiverRole) gate
    ▼
Prisma write → direct_messages
    │  also clears direct_conversation_hides for both peers
    ▼
Socket.IO emit receive_message
    │  rooms: user:{receiverId} and user:{senderId}
    ▼
useDirectMessageSocket.ts on each connected client
    │  routes payload into role store:
    │  user-messages-store / owner-messages-store /
    │  clerk-messages-store / admin-messages-store
    ▼
Receiver UI updates instantly (no refresh)
```

## Side effects

1. **Notification inbox** — `createNotification` for the receiver (`type: MESSAGE`) → `notification` socket event → `NotificationBell`.
2. **Read receipts** — opening a thread calls `POST /api/messages/thread/:userId/read` → sets `readAt`, emits `messages_read`.
3. **Hide conversation** — `DELETE /api/messages/conversations/:userId` → `direct_conversation_hides` + `conversation_hidden` / `conversation_deleted`.

## Key files

| Layer | Path |
|-------|------|
| Client socket | `Frontend/src/lib/socket.ts` |
| Listener | `Frontend/src/hooks/useDirectMessageSocket.ts` |
| Stores | `Frontend/src/stores/*-messages-store.ts` |
| API | `Backend/src/routes/messaging.routes.ts` |
| Controller | `Backend/src/controllers/messaging.controller.ts` |
| Rules | `Backend/src/utils/messagingRules.ts` |
| Transport | `Backend/src/socket/index.ts` |

## Database

- `direct_messages`
- `direct_conversation_hides`
- `users` (search / peer summary)
- `notifications` (message alert rows)

## Socket events

| Event | Direction |
|-------|-----------|
| `receive_message` | Server → clients |
| `conversation_hidden` / `conversation_deleted` | Server → clients |
| `messages_read` | Server → clients (no FE listener yet) |
