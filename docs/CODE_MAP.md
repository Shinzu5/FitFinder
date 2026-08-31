# FitFinder — Code Map (by feature)

Paths relative to `FitFinder/`.

------------------------------------

## Login / Authentication

**Frontend**
- `Frontend/src/app/(auth)/login/page.tsx` — entry
- `Frontend/src/app/(auth)/signup/page.tsx`
- `Frontend/src/app/(auth)/verify-email/page.tsx`
- `Frontend/src/app/(auth)/forgot-password/page.tsx`
- `Frontend/src/app/(auth)/verify-reset-code/page.tsx`
- `Frontend/src/app/(auth)/reset-password/page.tsx`
- `Frontend/src/components/features/auth/AuthShell.tsx`
- `Frontend/src/stores/auth-store.ts`
- `Frontend/src/lib/api.ts`
- `Frontend/src/lib/mock-users.ts` — `roleToDashboardPath`

**Backend**
- `Backend/src/routes/auth.routes.ts`
- `Backend/src/controllers/auth.controller.ts`
- `Backend/src/middleware/auth.ts`
- `Backend/src/middleware/requireRole.ts`
- `Backend/src/utils/jwt.ts`
- `Backend/src/utils/hash.ts`
- `Backend/src/services/email.service.ts`

**Database**
- `users`

**Socket**
- none (auth is REST + HTTP-only refresh cookie)

------------------------------------

## Admin

**Frontend**
- `Frontend/src/app/dashboard/admin/page.tsx` — entry (overview)
- `Frontend/src/app/dashboard/admin/layout.tsx`
- `Frontend/src/app/dashboard/admin/{gyms,users,analytics,transactions,messages,settings}/page.tsx`
- `Frontend/src/app/dashboard/admin/_components/*`
- `Frontend/src/stores/admin-store.ts`, `admin-gyms-store.ts`, `admin-users-store.ts`, `admin-analytics-store.ts`, `admin-messages-store.ts`, `admin-settings-store.ts`
- `Frontend/src/hooks/useAdminRealtimeSync.ts`

**Backend**
- `Backend/src/routes/admin.routes.ts`
- `Backend/src/controllers/admin.controller.ts`
- `Backend/src/services/adminRevenue.service.ts`
- `Backend/src/utils/adminRevenue.ts`
- `Backend/src/services/accountRemoval.service.ts`

**Database**
- `users`, `gyms`, `owner_subscriptions`, `xendit_payments`, `admin_activities`, `gym_memberships`

**Socket**
- `admin_gyms_updated`, `admin_users_updated`, `account_deleted`

------------------------------------

## Gym Owner

**Frontend**
- `Frontend/src/app/dashboard/owner/page.tsx` — entry
- `Frontend/src/app/dashboard/owner/layout.tsx`
- `Frontend/src/app/dashboard/owner/{my-gym,memberships,members,coaches,equipment,exercises,shop,messages,payment-settings,approvals,walk-in,reports}/page.tsx`
- `Frontend/src/app/dashboard/owner/_components/*`
- `Frontend/src/stores/owner-*.ts`, `create-gym-store.ts`
- `Frontend/src/hooks/useOwnerRepurchaseSync.ts`, `useSalesSync.ts`, `useMembersListSync.ts`

**Backend**
- `Backend/src/routes/owner.routes.ts`
- `Backend/src/controllers/owner.controller.ts`
- `Backend/src/controllers/gym.controller.ts` (create/update/delete gym)
- `Backend/src/routes/gym.routes.ts`
- `Backend/src/services/ownerSubscription.service.ts`

**Database**
- `gyms`, `owner_subscriptions`, `membership_plans`, `coaches`, `equipment`, `exercises`, `shop_products`, `gym_memberships`, `daily_sales_reports`, `clerk_transactions`

**Socket**
- `owner_gym_cleared`, `owner_must_repurchase`, `owner_subscription_updated` (emit only), domain `*_updated` events

------------------------------------

## Clerk

**Frontend**
- `Frontend/src/app/dashboard/clerk/page.tsx` — entry
- `Frontend/src/app/dashboard/clerk/{register,members,approvals,walk-in,messages}/page.tsx`
- `Frontend/src/app/dashboard/clerk/_components/*`
- `Frontend/src/stores/clerk-store.ts`, `clerk-messages-store.ts`, `walk-in-approvals-store.ts`
- `Frontend/src/hooks/useWalkInApprovalSync.ts`, `useClerkMembershipPlansSync.ts`

**Backend**
- `Backend/src/routes/clerk.routes.ts`
- `Backend/src/controllers/clerk.controller.ts`

**Database**
- `users` (`clerkGymId`), `walk_in_approvals`, `gym_memberships`, `clerk_transactions`, `daily_sales_reports`, `membership_plans`

**Socket**
- `walk_in_approvals_updated`, `members_updated`, `sales_updated`, `membership_plans_updated`

------------------------------------

## Gymer

**Frontend**
- `Frontend/src/app/dashboard/user/page.tsx` — entry (browse gyms)
- `Frontend/src/app/dashboard/layout.tsx` — USER shell + access lock
- `Frontend/src/app/dashboard/user/{membership,exercises,equipment,shop,messages,ai}/page.tsx`
- `Frontend/src/app/dashboard/user/gym/[gymId]/**`
- `Frontend/src/stores/membership-store.ts`, `join-gym-store.ts`, `member-gym-content-store.ts`, `user-messages-store.ts`, `user-ai-store.ts`
- `Frontend/src/hooks/useMemberGymContentSync.ts`, `useWalkInApprovalSync.ts`

**Backend**
- `Backend/src/routes/user.routes.ts`
- `Backend/src/controllers/user.controller.ts`
- `Backend/src/routes/gym.routes.ts` (`listGyms`, `getGym`)

**Database**
- `gyms`, `membership_plans`, `gym_memberships`, `walk_in_approvals`, `coaches`, `equipment`, `exercises`, `shop_products`

**Socket**
- `walk_in_status`, `membership_updated`, `equipment_updated`, `shop_updated`, `coaches_updated`, `membership_plans_updated`, `gym_plans_catalog_updated`

------------------------------------

## Membership

**Frontend**
- `Frontend/src/app/dashboard/user/membership/page.tsx` — entry
- `Frontend/src/app/dashboard/user/gym/[gymId]/join/**`
- `Frontend/src/app/dashboard/user/_components/join-gym/*`
- `Frontend/src/stores/membership-store.ts`, `join-gym-store.ts`

**Backend**
- `Backend/src/controllers/user.controller.ts` — `joinGym`, `getMembership`, `leaveMembership`
- `Backend/src/services/gymMembership.service.ts`
- `Backend/src/services/membershipAccess.service.ts`
- `Backend/src/services/membershipNotification.service.ts`

**Database**
- `gym_memberships`, `membership_plans`, `walk_in_approvals`, `xendit_payments` (MEMBERSHIP)

**Socket**
- `membership_updated`, `members_updated`, `walk_in_status`

------------------------------------

## Payments / Xendit

**Frontend**
- Owner plan: `Frontend/src/app/dashboard/user/create-gym/{page,payment,done}.tsx` + `create-gym-store.ts`
- Membership GCash: `.../join/gcash/**` + `GcashPaymentView.tsx` / `GcashSuccessView.tsx`
- Gym key settings: `Frontend/src/app/dashboard/owner/payment-settings/page.tsx`

**Backend**
- `Backend/src/routes/payment.routes.ts`
- `Backend/src/controllers/payment.controller.ts`
- `Backend/src/services/xendit.service.ts`
- `Backend/src/services/ownerSubscription.service.ts`
- `Backend/src/routes/subscription.routes.ts` (compat)

**Database**
- `xendit_payments`, `owner_subscriptions`, `walk_in_approvals`, `gyms.xenditApiKey`

**Socket**
- `walk_in_status`, `walk_in_approvals_updated`, `owner_subscription_updated` (emit), `admin_gyms_updated`

------------------------------------

## Walk-in Payments

**Frontend**
- Gymer: `.../join/walk-in/page.tsx`, `WalkInRegistrationView.tsx`
- Staff: `Frontend/src/app/dashboard/clerk/walk-in/page.tsx`, `owner/walk-in/page.tsx`
- `Frontend/src/app/dashboard/clerk/_components/WalkInPaymentPanel.tsx`

**Backend**
- `POST /api/user/join-gym`
- `GET /api/clerk/walk-in-payments`
- `POST /api/clerk/walk-in-payments/:id/complete`
- `POST /api/clerk/sales/close`

**Database**
- `walk_in_approvals`, `clerk_transactions`, `daily_sales_reports`, `gym_memberships`

**Socket**
- `walk_in_status`, `walk_in_approvals_updated`, `sales_updated`

------------------------------------

## Approvals

**Frontend**
- `Frontend/src/app/dashboard/clerk/approvals/page.tsx`
- `Frontend/src/app/dashboard/owner/approvals/page.tsx`
- `Frontend/src/app/dashboard/clerk/_components/ClerkApprovalsPanel.tsx`
- `Frontend/src/stores/walk-in-approvals-store.ts`
- `Frontend/src/hooks/useWalkInApprovalSync.ts`

**Backend**
- `GET /api/clerk/approvals`
- `PUT /api/clerk/approvals/:id/approve`
- `PUT /api/clerk/approvals/:id/decline`

**Database**
- `walk_in_approvals`, `gym_memberships`, `clerk_transactions`

**Socket**
- `walk_in_status`, `walk_in_approvals_updated`, `membership_updated`, `members_updated`

------------------------------------

## Reports

**Frontend**
- `Frontend/src/app/dashboard/owner/reports/page.tsx`
- `Frontend/src/app/dashboard/owner/_components/OwnerReportsPanel.tsx` (or equivalent)
- `Frontend/src/stores/owner-sales-reports-store.ts`
- `Frontend/src/hooks/useSalesSync.ts`

**Backend**
- `GET /api/owner/sales-reports`
- `GET /api/owner/sales-reports/:id`
- `GET /api/clerk/sales/closing-preview`
- `POST /api/clerk/sales/close`

**Database**
- `daily_sales_reports`, `clerk_transactions`

**Socket**
- `sales_updated`

------------------------------------

## Analytics

**Frontend**
- `Frontend/src/app/dashboard/admin/analytics/page.tsx`
- `Frontend/src/app/dashboard/admin/_components/*` (analytics panels)
- `Frontend/src/stores/admin-analytics-store.ts`
- Admin overview also uses `admin-store.ts`

**Backend**
- `GET /api/admin/dashboard`
- `GET /api/admin/analytics`
- `GET /api/admin/transactions`
- `Backend/src/services/adminRevenue.service.ts`

**Database**
- `xendit_payments`, `owner_subscriptions`, `users`, `gyms`, `gym_memberships`, `admin_activities`

**Socket**
- `admin_gyms_updated` (refresh triggers)

------------------------------------

## Messages

**Frontend**
- `Frontend/src/app/dashboard/{user,owner,clerk,admin}/messages/page.tsx`
- Panels: `UserMessagesPanel`, `MessagesPanel`, `ClerkMessagesPanel`, `AdminMessagesPanel`
- Stores: `user-messages-store.ts`, `owner-messages-store.ts`, `clerk-messages-store.ts`, `admin-messages-store.ts`
- `Frontend/src/hooks/useDirectMessageSocket.ts`
- `Frontend/src/lib/merge-chat-messages.ts`

**Backend**
- `Backend/src/routes/messaging.routes.ts`
- `Backend/src/controllers/messaging.controller.ts`
- `Backend/src/utils/messagingRules.ts`

**Database**
- `direct_messages`, `direct_conversation_hides`, `users`

**Socket Events**
- `receive_message`
- `conversation_deleted` / `conversation_hidden`
- `messages_read` (emitted; no frontend listener currently)

------------------------------------

## Notifications

**Frontend**
- `Frontend/src/components/notifications/NotificationBell.tsx` — entry UI
- `Frontend/src/stores/notifications-store.ts`
- `Frontend/src/hooks/useNotificationsSocket.ts`
- Mounted from `app/dashboard/layout.tsx` + role headers

**Backend**
- `Backend/src/routes/notification.routes.ts`
- `Backend/src/controllers/notification.controller.ts`
- `Backend/src/services/notification.service.ts`
- `Backend/src/services/notificationJobs.service.ts`
- `Backend/src/services/membershipNotification.service.ts`

**Database**
- `notifications`

**Socket Events**
- `notification`
- `notifications_updated`
- `notification_read`

------------------------------------

## Coaches

**Frontend**
- `Frontend/src/app/dashboard/owner/coaches/page.tsx`
- `Frontend/src/app/dashboard/owner/_components/CoachesPanel.tsx`
- `Frontend/src/stores/owner-coaches-store.ts` (or equivalent)
- Gymer view via gym profile: `use-gym-profile.ts`

**Backend**
- Owner coaches CRUD in `owner.controller.ts` / `owner.routes.ts`
- `Backend/src/services/realtime.service.ts` → `emitCoachesUpdated`

**Database**
- `coaches`

**Socket**
- `coaches_updated`

------------------------------------

## Equipment

**Frontend**
- Owner: `.../owner/equipment/page.tsx`
- Gymer: `.../user/equipment/page.tsx`
- `Frontend/src/hooks/useMemberGymContentSync.ts`

**Backend**
- Owner equipment CRUD; `GET /api/user/equipment`
- `emitEquipmentUpdated`

**Database**
- `equipment`

**Socket**
- `equipment_updated`

------------------------------------

## Shop

**Frontend**
- Owner: `.../owner/shop/page.tsx`
- Gymer: `.../user/shop/page.tsx`

**Backend**
- Owner shop CRUD; `GET /api/user/shop`
- `emitShopUpdated`

**Database**
- `shop_products`

**Socket**
- `shop_updated`

------------------------------------

## Exercises

**Frontend**
- Owner: `.../owner/exercises/page.tsx`
- Gymer: `.../user/exercises/page.tsx`

**Backend**
- Owner exercises CRUD; `GET /api/user/exercises`

**Database**
- `exercises`

**Socket**
- none dedicated (fetch on navigation / membership unlock)

------------------------------------

## AI Assistant

**Frontend**
- `Frontend/src/app/dashboard/user/ai/page.tsx` — entry
- `Frontend/src/app/dashboard/user/_components/UserAiAssistantPanel.tsx`
- `Frontend/src/stores/user-ai-store.ts`

**Backend**
- `POST /api/user/ai-chat` → `user.controller.aiChat`
- `Backend/src/services/ai.service.ts`

**Database**
- none (stateless; chat kept in client store)

**Socket**
- none

------------------------------------

## Socket.IO (platform)

**Frontend**
- `Frontend/src/lib/socket.ts`
- `Frontend/src/hooks/use*.ts` (listeners)

**Backend**
- `Backend/src/socket/index.ts`
- `Backend/src/services/realtime.service.ts`

**Database**
- n/a (transport only)

------------------------------------

## Database (platform)

**Source of truth**
- `Backend/prisma/schema.prisma`
- Client: `Backend/src/config/database.ts`

------------------------------------

## Middleware / Utilities / API / Components / Hooks / Services

| Layer | Location |
|-------|----------|
| Middleware | `Backend/src/middleware/*` |
| Utilities (BE) | `Backend/src/utils/*` |
| Utilities (FE) | `Frontend/src/lib/*` |
| Components | `Frontend/src/components/**` + role `_components/` |
| Hooks | `Frontend/src/hooks/*` |
| Services | `Backend/src/services/*` |
| API client | `Frontend/src/lib/api.ts` |
| API server | `Backend/src/index.ts` + `routes/*` |
