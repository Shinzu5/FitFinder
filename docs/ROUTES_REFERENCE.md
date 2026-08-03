# FitFinder — API Routes Reference

Base URL: `http://localhost:5000/api` (see `NEXT_PUBLIC_API_URL` / `PORT`).  
Auth: `Authorization: Bearer <accessToken>` unless noted. Refresh cookie used by `/auth/refresh`.

------------------------------------

## Health

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/health` | none | `index.ts` inline |

------------------------------------

## Authentication (`/auth`)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/auth/register` | none | `register` |
| POST | `/auth/verify-email` | none | `verifyEmail` |
| POST | `/auth/resend-verification` | none | `resendVerification` |
| POST | `/auth/login` | none | `login` |
| POST | `/auth/refresh` | refresh cookie | `refreshToken` |
| POST | `/auth/forgot-password` | none | `forgotPassword` |
| POST | `/auth/verify-reset-code` | none | `verifyResetCode` |
| POST | `/auth/reset-password` | none | `resetPassword` |
| PUT | `/auth/change-password` | JWT | `changePassword` |
| GET | `/auth/me` | JWT | `getMe` |
| PUT | `/auth/me` | JWT | `updateMe` |
| POST | `/auth/logout` | JWT | `logout` |

------------------------------------

## Gyms (`/gyms`)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/gyms` | JWT | `listGyms` |
| GET | `/gyms/:id` | JWT | `getGym` |
| POST | `/gyms` | JWT (owner flow) | `createGym` |
| PUT | `/gyms/:id` | JWT Owner | `updateGym` |
| DELETE | `/gyms/:id` | JWT Owner | `deleteGym` |

------------------------------------

## Admin (`/admin`) — role ADMIN

| Method | Path | Handler |
|--------|------|---------|
| GET | `/admin/dashboard` | `getDashboard` |
| GET | `/admin/gyms` | `getAdminGyms` |
| GET | `/admin/analytics` | `getAnalytics` |
| GET | `/admin/users` | `getUsers` |
| DELETE | `/admin/users/:id` | `removeUser` |
| GET | `/admin/transactions` | `getTransactions` |

------------------------------------

## Gym Owner (`/owner`) — role OWNER

| Method | Path | Handler |
|--------|------|---------|
| GET | `/owner/my-gym` | `getMyGym` |
| GET | `/owner/payment-settings` | `getPaymentSettings` |
| PUT | `/owner/payment-settings` | `updatePaymentSettings` |
| GET | `/owner/members` | `getMembers` |
| DELETE | `/owner/members/:id` | `removeMember` |
| GET | `/owner/membership-plans` | `getMembershipPlans` |
| POST | `/owner/membership-plans` | `createMembershipPlan` |
| PUT | `/owner/membership-plans/:id` | `updateMembershipPlan` |
| DELETE | `/owner/membership-plans/:id` | `deleteMembershipPlan` |
| GET/POST | `/owner/coaches` | `getCoaches` / `createCoach` |
| PUT/DELETE | `/owner/coaches/:id` | `updateCoach` / `removeCoach` |
| GET/POST | `/owner/equipment` | `getEquipment` / `createEquipment` |
| PUT | `/owner/equipment/:id` | `updateEquipment` |
| PUT | `/owner/equipment/:id/toggle` | `toggleEquipment` |
| DELETE | `/owner/equipment/:id` | `removeEquipment` |
| GET/POST | `/owner/exercises` | `getExercises` / `createExercise` |
| PUT/DELETE | `/owner/exercises/:id` | `updateExercise` / `removeExercise` |
| GET/POST | `/owner/shop` | `getShopProducts` / `createShopProduct` |
| PUT/DELETE | `/owner/shop/:id` | `updateShopProduct` / `removeShopProduct` |
| GET/POST | `/owner/staff` | `getStaff` / `addStaff` |
| DELETE | `/owner/staff/:id` | `removeStaff` |
| GET/POST | `/owner/messages` | `getMessages` / `sendMessage` (legacy gym chat) |
| GET | `/owner/sales-reports` | `getSalesReports` |
| GET | `/owner/sales-reports/:id` | `getSalesReportReceipt` |

------------------------------------

## Clerk + Owner walk-in staff (`/clerk`)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/clerk/dashboard` | `getDashboard` |
| GET/POST | `/clerk/transactions` | `getTransactions` / `recordPayment` |
| GET/POST | `/clerk/members` | `getMembers` / `registerMember` |
| GET | `/clerk/plans` | `getPlans` |
| GET | `/clerk/approvals` | `getApprovals` |
| PUT | `/clerk/approvals/:id/approve` | `approveWalkIn` |
| PUT | `/clerk/approvals/:id/decline` | `declineWalkIn` |
| GET | `/clerk/walk-in-payments` | `getWalkInPayments` |
| POST | `/clerk/walk-in-payments/:id/complete` | `completeWalkInPayment` |
| GET | `/clerk/sales/closing-preview` | `getClosingPreview` |
| POST | `/clerk/sales/close` | `closeDailySales` |

------------------------------------

## Gymer / User (`/user`)

| Method | Path | Handler |
|--------|------|---------|
| POST | `/user/join-gym` | `joinGym` |
| GET | `/user/membership` | `getMembership` |
| DELETE | `/user/membership` | `leaveMembership` |
| GET/POST | `/user/messages` | `getMessages` / `sendUserMessage` (legacy) |
| POST | `/user/ai-chat` | `aiChat` |
| GET | `/user/walk-in-status` | `getWalkInStatus` |
| POST | `/user/walk-in-done/:id` | `completeWalkInOnboarding` |
| GET | `/user/exercises` | `getMemberExercises` |
| GET | `/user/equipment` | `getMemberEquipment` |
| GET | `/user/shop` | `getMemberShop` |

------------------------------------

## Subscriptions (`/subscriptions`) — owner plan compat

| Method | Path | Handler |
|--------|------|---------|
| POST | `/subscriptions/purchase` | `purchaseSubscription` |
| GET | `/subscriptions/my-plan` | `getMyPlan` |

------------------------------------

## Payments / Xendit (`/payments`)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/payments/create-gcash` | JWT | `createGcashPaymentHandler` |
| GET | `/payments/:id/status` | JWT | `checkPaymentStatus` |
| POST | `/payments/xendit-webhook` | Xendit callback token | `xenditWebhook` |

------------------------------------

## Upload (`/upload`)

| Method | Path | Handler |
|--------|------|---------|
| POST | `/upload/image` | `uploadImage` |

------------------------------------

## Messages — Direct (`/messages`)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/messages/search` | `searchUsers` |
| GET | `/messages/conversations` | `getConversations` |
| GET | `/messages/thread/:userId` | `getThread` |
| POST | `/messages/thread/:userId/read` | `markThreadRead` |
| DELETE | `/messages/conversations/:userId` | `hideConversation` |
| POST | `/messages` | `sendDirectMessage` |

------------------------------------

## Notifications (`/notifications`)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/notifications` | `getNotifications` |
| GET | `/notifications/unread-count` | `getUnreadCount` |
| POST | `/notifications/read-all` | `readAllNotifications` |
| POST | `/notifications/:id/read` | `readNotification` |
