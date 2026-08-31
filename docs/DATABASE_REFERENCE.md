# FitFinder — Database Reference (Neon / Prisma)

Schema source: `Backend/prisma/schema.prisma`

| Table | Model | Purpose | Related feature(s) | Used by |
|-------|-------|---------|--------------------|---------|
| `users` | `User` | Accounts, roles, OTP/reset, clerk↔gym link | Auth, Admin, all roles | `auth.controller`, all authenticated APIs |
| `notifications` | `Notification` | Persisted inbox items + unread state | Notifications | `notification.service`, jobs, messaging/membership hooks |
| `direct_messages` | `DirectMessage` | Cross-role 1:1 chat | Messages | `messaging.controller` |
| `direct_conversation_hides` | `DirectConversationHide` | Soft-hide a DM thread per user | Messages | `messaging.controller` |
| `gyms` | `Gym` | Gym profile + optional gym Xendit key | Owner, Gymer, Admin | `gym.controller`, owner/clerk/user flows |
| `owner_subscriptions` | `OwnerSubscription` | Paid owner platform plan periods | Payments, Analytics | `ownerSubscription.service`, admin revenue/counters |
| `membership_plans` | `MembershipPlan` | Gym membership SKUs | Membership, Owner, Clerk | owner CRUD, join/approval |
| `gym_memberships` | `GymMembership` | Active/expired member enrollments | Membership, Analytics | `gymMembership.service`, access checks |
| `coaches` | `Coach` | Trainers + booking metadata | Coaches | owner CRUD, join flow, gym profile |
| `equipment` | `Equipment` | Gym equipment inventory | Equipment | owner CRUD, gymer list |
| `exercises` | `Exercise` | Exercise library / media | Exercises | owner CRUD, gymer list |
| `shop_products` | `ShopProduct` | Gym shop catalog | Shop | owner CRUD, gymer list |
| `conversations` | `Conversation` | Legacy gym-thread container | Messages (legacy) | older user/owner message helpers |
| `messages` | `Message` | Legacy gym-thread messages | Messages (legacy) | older user/owner message helpers |
| `clerk_transactions` | `ClerkTransaction` | OTC / walk-in / renewal sales lines | Walk-in, Reports | `clerk.controller`, owner reports |
| `daily_sales_reports` | `DailySalesReport` | Closed daily sales summaries | Reports | clerk close day, owner reports |
| `walk_in_approvals` | `WalkInApproval` | Join/renew approval queue | Approvals, Walk-in, Payments | user join, clerk approve, Xendit membership |
| `admin_activities` | `AdminActivity` | Admin “recent activity” feed | Admin Analytics | `admin.controller` |
| `xendit_payments` | `XenditPayment` | GCash payment records (SUBSCRIPTION / MEMBERSHIP) | Payments, Xendit, Analytics | `payment.controller`, `adminRevenue.service` |

## Enums (quick)

| Enum | Values | Used for |
|------|--------|----------|
| `UserRole` | USER, OWNER, CLERK, ADMIN | Auth / permissions |
| `GymStatus` | PENDING, ACTIVE, DECLINED | Gym listing |
| `MembershipStatus` | ACTIVE, EXPIRING, EXPIRED | Access control |
| `ApprovalStatus` | PENDING, APPROVED, DECLINED | Walk-in queue |
| `PaymentMethod` | CASH, CASHLESS, XENDIT | Clerk transactions |
| `TransactionType` | MONTHLY, SESSION, SUPPLEMENTS, DAY_PASS, RENEWAL, COACH | Sales lines |
| `EquipmentStatus` | AVAILABLE, IN_USE, UNDER_MAINTENANCE | Equipment UI |
| `ActivityTone` | SUCCESS, INFO, WARNING | Admin activity styling |

## Revenue note (defense)

**Platform revenue** is computed from `xendit_payments` where `type = 'SUBSCRIPTION'` and `status = 'SUCCEEDED'`.  
Gym OTC totals in `clerk_transactions` / `daily_sales_reports` are **gym-side** and do not feed Admin platform revenue.
