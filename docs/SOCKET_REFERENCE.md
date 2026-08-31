# FitFinder — Socket.IO Reference

**Server:** `Backend/src/socket/index.ts`  
**Client:** `Frontend/src/lib/socket.ts`  
**Auth:** JWT in `handshake.auth.token`  
**Auto rooms on connect:** `user:{userId}`, `gym_catalog`  
**Client-joined rooms:** `gym:{gymId}` via `join_gym` / `leave_gym`

------------------------------------

## Client → Server

| Event | Emitter (Frontend) | Listener (Backend) | Purpose |
|-------|--------------------|--------------------|---------|
| `join_gym` | `useMemberGymContentSync.ts`, `use-gym-profile.ts` | `socket/index.ts` | Subscribe to gym-scoped content updates |
| `leave_gym` | same | `socket/index.ts` | Leave gym room |

------------------------------------

## Server → Client

| Event | Emitter (Backend) | Listener (Frontend) | Purpose |
|-------|-------------------|---------------------|---------|
| `receive_message` | `messaging.controller.ts` | `useDirectMessageSocket.ts` | Deliver new DM in realtime |
| `conversation_deleted` | `messaging.controller.ts` | `useDirectMessageSocket.ts` | Remove thread after hide (peer view) |
| `conversation_hidden` | `messaging.controller.ts` | `useDirectMessageSocket.ts` | Confirm hide for actor |
| `messages_read` | `messaging.controller.ts` | *(none)* | Thread marked read (available for future UI) |
| `notification` | `notification.service.ts` | `useNotificationsSocket.ts` | New/updated inbox notification |
| `notifications_updated` | `notification.service.ts`, jobs | `useNotificationsSocket.ts` | Unread count sync |
| `notification_read` | `notification.service.ts` | `useNotificationsSocket.ts` | Single item marked read |
| `walk_in_status` | `realtime.service.ts` | `useWalkInApprovalSync.ts` | Gymer join/renew status updates |
| `walk_in_approvals_updated` | `realtime.service.ts` | `useWalkInApprovalSync.ts` | Staff approvals list refresh |
| `membership_updated` | `realtime.service.ts` | `useWalkInApprovalSync.ts` | Gymer membership changed |
| `members_updated` | `realtime.service.ts` | `useMembersListSync.ts` | Owner/Clerk members list refresh |
| `sales_updated` | `realtime.service.ts` | `useSalesSync.ts` | Sales/reports refresh |
| `equipment_updated` | `realtime.service.ts` | `useMemberGymContentSync.ts`, `use-gym-profile.ts` | Equipment list sync |
| `shop_updated` | `realtime.service.ts` | `useMemberGymContentSync.ts` | Shop catalog sync |
| `coaches_updated` | `realtime.service.ts` | `use-gym-profile.ts`, `CoachesPanel.tsx` | Coaches list sync |
| `membership_plans_updated` | `realtime.service.ts` | `useClerkMembershipPlansSync.ts`, `use-gym-profile.ts` | Plan catalog sync |
| `gym_plans_catalog_updated` | `realtime.service.ts` → `gym_catalog` | `user/page.tsx` | Home gym starting prices |
| `admin_gyms_updated` | `realtime.service.ts` | `useAdminRealtimeSync.ts`, admin panels | Admin gyms/revenue refresh |
| `admin_users_updated` | `realtime.service.ts` | `AdminUsersPanel.tsx` | Admin users list refresh |
| `account_deleted` | `realtime.service.ts` / account removal | `useAccountDeletedSync.ts` | Force logout |
| `owner_gym_cleared` | `gym.controller.ts` | `useOwnerRepurchaseSync.ts` | Gym deleted → clear owner state |
| `owner_must_repurchase` | `gym.controller.ts` | `useOwnerRepurchaseSync.ts` | Force owner plan repurchase |
| `owner_subscription_updated` | `ownerSubscription.service.ts`, subscription controller | *(none)* | Owner plan activated (available for future UI) |

------------------------------------

## Helper emitters

| Helper | File | Notes |
|--------|------|-------|
| `emitToUser` / `emitToGym` / `emitToRoom` | `socket/index.ts` | Low-level fan-out |
| `emitWalkInStatus`, `emitMembersUpdated`, … | `realtime.service.ts` | Domain-specific broadcasts |
| `createNotification` | `notification.service.ts` | DB write + `notification` emit |
