# FitFinder — Project Structure

Paths relative to `FitFinder/`. This documents the **live** layout used in production/dev.

---

## Top level

```
FitFinder/
├── PROJECT_INDEX.md          # Master index for defense navigation
├── docs/                     # Capstone documentation (this folder)
├── Frontend/                 # Next.js 15 (App Router) + Zustand + Socket.IO client
└── Backend/                  # Express 5 + Prisma (Neon) + Socket.IO + Xendit + Gemini
```

---

## Frontend (`Frontend/src`)

```
src/
├── app/                      # Next.js routes (URL = folder path)
│   ├── (auth)/               # Login, register, email verify, password reset
│   ├── landing-page/         # Marketing landing
│   ├── page.tsx              # `/` entry
│   └── dashboard/            # Role-gated dashboards
│       ├── layout.tsx        # Auth gate + USER chrome + realtime hooks
│       ├── user/             # Gymer
│       ├── owner/            # Gym Owner
│       ├── clerk/            # Clerk
│       └── admin/            # Platform Admin
├── components/
│   ├── features/             # Landing, auth shell, create-gym shell
│   ├── notifications/        # NotificationBell
│   ├── messages/             # Shared message modals
│   └── ui/                   # Button, input, label, checkbox, alert
├── hooks/                    # Socket + realtime sync hooks
├── stores/                   # Zustand domain stores
└── lib/                      # API client, socket, media, role helpers
```

### Major Frontend folders

| Folder | Purpose |
|--------|---------|
| `app/(auth)/` | Authentication pages (login/register/OTP/reset) |
| `app/dashboard/user/` | Gymer: gyms, join, membership, content, AI, messages |
| `app/dashboard/owner/` | Owner: gym ops, plans, coaches, equipment, shop, reports, approvals |
| `app/dashboard/clerk/` | Clerk: register member, approvals, walk-in payments, messages |
| `app/dashboard/admin/` | Admin: overview, gyms, users, analytics, transactions, messages |
| `components/features/` | Cross-route shells (landing, auth, create-gym) |
| `components/notifications/` | In-app notification UI |
| `hooks/` | Socket.IO listeners and list sync |
| `stores/` | Client state + API calls per domain |
| `lib/` | Shared clients/utilities (`api.ts`, `socket.ts`) |

### Major Frontend files

| File | Purpose |
|------|---------|
| `app/dashboard/layout.tsx` | Session hydrate, role redirect, mount realtime hooks, USER shell |
| `lib/api.ts` | Axios instance, Bearer token, refresh-cookie handling |
| `lib/socket.ts` | Singleton Socket.IO client |
| `lib/mock-users.ts` | `UserRole` type + `roleToDashboardPath` (legacy name; live auth uses Neon) |
| `lib/mock-gyms.ts` | Shared `Gym` TypeScript type for gymer home cards |
| `stores/auth-store.ts` | Login/register/session/role helpers |
| `components/notifications/NotificationBell.tsx` | Unread badge + list + mark read |

---

## Backend (`Backend`)

```
Backend/
├── prisma/
│   ├── schema.prisma         # Neon schema (source of truth)
│   └── seed.ts               # Optional seed (do not re-run blindly for demos)
├── scripts/                  # Standalone debug scripts (NOT part of API runtime)
├── uploads/                  # Local uploaded media
└── src/
    ├── index.ts              # Express + Socket.IO bootstrap, route mounts, jobs
    ├── config/               # env, database, email, owner plan catalog
    ├── middleware/           # auth, roles, validate, upload, errors
    ├── routes/               # HTTP route tables (stable /api mounts)
    ├── controllers/          # Request handlers
    ├── services/             # Business/domain services
    ├── socket/               # Socket.IO init + emit helpers
    └── utils/                # JWT, hash, responses, messaging rules, revenue buckets
```

### Major Backend folders

| Folder | Purpose |
|--------|---------|
| `src/routes/` | Declares REST paths; mounts under `/api/*` in `index.ts` |
| `src/controllers/` | Parse request → call services → respond |
| `src/services/` | Membership, payments, notifications, AI, email, revenue |
| `src/socket/` | Realtime transport |
| `src/middleware/` | JWT auth, role gates, validation, uploads |
| `src/config/` | Environment + Prisma + SMTP + owner plans |
| `src/utils/` | Pure helpers (JWT, hashing, API envelope) |
| `prisma/` | Schema + migrations/push target for Neon |
| `scripts/` | One-off DB/API probes (see `scripts/README.md`) |

### Major Backend files

| File | Purpose |
|------|---------|
| `src/index.ts` | App entry: middleware, routers, Socket.IO, 60s notification/expiry jobs |
| `src/socket/index.ts` | JWT handshake, rooms (`user:{id}`, `gym:{id}`, `gym_catalog`) |
| `src/middleware/auth.ts` | `authenticate` — Bearer JWT → `req.userId` / `req.userRole` |
| `src/config/database.ts` | Prisma client singleton (Neon) |
| `prisma/schema.prisma` | All tables/enums |
| `services/xendit.service.ts` | GCash Payment Requests |
| `services/ai.service.ts` | Gemini fitness assistant |
| `services/notification.service.ts` | Persist + emit inbox notifications |
| `services/realtime.service.ts` | Domain socket fan-out helpers |
| `services/gymMembership.service.ts` | Activate/extend gym memberships |
| `services/ownerSubscription.service.ts` | Activate owner platform plans |
| `services/adminRevenue.service.ts` | Platform revenue from SUCCEEDED owner Xendit payments |

---

## Logical feature grouping (unchanged URLs)

| Feature | Frontend home | Backend home |
|---------|---------------|--------------|
| Authentication | `app/(auth)/` | `routes/auth.routes.ts` + `controllers/auth.controller.ts` |
| Admin | `app/dashboard/admin/` | `routes/admin.routes.ts` |
| Gym Owner | `app/dashboard/owner/` | `routes/owner.routes.ts` |
| Clerk | `app/dashboard/clerk/` | `routes/clerk.routes.ts` |
| Gymer | `app/dashboard/user/` | `routes/user.routes.ts` |
| Membership | `user/membership` + join flow | `user.controller` + `gymMembership.service` |
| Payments / Xendit | create-gym + join/gcash | `payment.*` + `xendit.service` |
| Walk-in / Approvals | clerk + owner panels | `clerk.controller` |
| Reports | `owner/reports` | owner sales-reports + clerk close day |
| Analytics | `admin/analytics` | `admin.controller` + `adminRevenue.service` |
| Messages | `*/messages` | `messaging.*` |
| Notifications | `NotificationBell` | `notification.*` |
| AI Assistant | `user/ai` | `user` ai-chat + `ai.service` |
| Socket.IO | `lib/socket.ts` + `hooks/*` | `socket/index.ts` + `realtime.service` |
| Database | — | `prisma/schema.prisma` |

---

## Why App Router / API paths were not physically relocated

Moving `Frontend/src/app/**` would change public URLs. Moving Express mount paths would break the frontend client. For the capstone defense, **logical** feature maps (this file + `CODE_MAP.md` + `PROJECT_INDEX.md`) provide navigation without risking regressions.
