# FitFinder — Project Index (Capstone Defense)

**Start here.** This is the master map for locating every feature without changing how the app runs.

> Runtime paths (Next.js `app/` routes and Express `/api/*` mounts) were intentionally kept stable so behavior stays identical. Feature grouping below is the **logical** map of the live codebase. Full detail lives in `docs/`.

---

## Quick links

| Document | Use when you need… |
|----------|-------------------|
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Folder tree + purpose of major folders/files |
| [docs/CODE_MAP.md](docs/CODE_MAP.md) | Per-feature frontend / backend / DB / sockets |
| [docs/ROUTES_REFERENCE.md](docs/ROUTES_REFERENCE.md) | Every REST endpoint by feature |
| [docs/DATABASE_REFERENCE.md](docs/DATABASE_REFERENCE.md) | Tables → purpose → feature → used by |
| [docs/SOCKET_REFERENCE.md](docs/SOCKET_REFERENCE.md) | Socket event emitters & listeners |
| [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md) | Login → JWT → role → dashboard |
| [docs/PAYMENT_FLOW.md](docs/PAYMENT_FLOW.md) | Membership → approval → activation → reports |
| [docs/MESSAGE_FLOW.md](docs/MESSAGE_FLOW.md) | Sender → Neon → Socket.IO → receiver |
| [docs/AI_ASSISTANT_FLOW.md](docs/AI_ASSISTANT_FLOW.md) | Question → domain gate → Gemini → reply |

---

## Feature → where to look

| Feature | Frontend entry | Backend entry | Docs |
|---------|----------------|---------------|------|
| **Authentication** | `Frontend/src/app/(auth)/login/page.tsx` | `Backend/src/routes/auth.routes.ts` | AUTH_FLOW, CODE_MAP § Login |
| **Admin** | `Frontend/src/app/dashboard/admin/page.tsx` | `Backend/src/routes/admin.routes.ts` | CODE_MAP § Admin |
| **Gym Owner** | `Frontend/src/app/dashboard/owner/page.tsx` | `Backend/src/routes/owner.routes.ts` | CODE_MAP § Gym Owner |
| **Clerk** | `Frontend/src/app/dashboard/clerk/page.tsx` | `Backend/src/routes/clerk.routes.ts` | CODE_MAP § Clerk |
| **Gymer** | `Frontend/src/app/dashboard/user/page.tsx` | `Backend/src/routes/user.routes.ts` | CODE_MAP § Gymer |
| **Membership** | `.../user/membership/page.tsx` | `user.controller` + `gymMembership.service` | PAYMENT_FLOW |
| **Payments / Xendit** | join GCash + create-gym payment pages | `routes/payment.routes.ts` | PAYMENT_FLOW |
| **Walk-in Payments** | `.../clerk/walk-in` + owner walk-in | `clerk.routes` walk-in-* | PAYMENT_FLOW |
| **Approvals** | `.../clerk/approvals` + owner approvals | `PUT /api/clerk/approvals/:id/*` | PAYMENT_FLOW |
| **Reports** | `.../owner/reports/page.tsx` | `GET /api/owner/sales-reports` | CODE_MAP § Reports |
| **Analytics** | `.../admin/analytics/page.tsx` | `GET /api/admin/analytics` | CODE_MAP § Analytics |
| **Messages** | `*/messages/page.tsx` (all roles) | `routes/messaging.routes.ts` | MESSAGE_FLOW |
| **Notifications** | `components/notifications/NotificationBell.tsx` | `routes/notification.routes.ts` | CODE_MAP § Notifications |
| **Coaches** | `.../owner/coaches` | `owner` coaches CRUD | CODE_MAP § Coaches |
| **Equipment** | owner CRUD + user equipment | `owner` + `user` equipment | CODE_MAP § Equipment |
| **Shop** | owner CRUD + user shop | `owner` + `user` shop | CODE_MAP § Shop |
| **Exercises** | owner CRUD + user exercises | `owner` + `user` exercises | CODE_MAP § Exercises |
| **AI Assistant** | `.../user/ai/page.tsx` | `POST /api/user/ai-chat` | AI_ASSISTANT_FLOW |
| **Socket.IO** | `Frontend/src/lib/socket.ts` | `Backend/src/socket/index.ts` | SOCKET_REFERENCE |
| **Database** | — | `Backend/prisma/schema.prisma` | DATABASE_REFERENCE |
| **Middleware** | — | `Backend/src/middleware/*` | PROJECT_STRUCTURE |
| **Utilities** | `Frontend/src/lib/*` | `Backend/src/utils/*` | PROJECT_STRUCTURE |
| **Hooks** | `Frontend/src/hooks/*` | — | PROJECT_STRUCTURE |
| **Services** | — | `Backend/src/services/*` | PROJECT_STRUCTURE |
| **API client** | `Frontend/src/lib/api.ts` | `Backend/src/index.ts` mounts | ROUTES_REFERENCE |

---

## Role dashboards (URL → folder)

| Role | Dashboard URL | Folder |
|------|---------------|--------|
| ADMIN | `/dashboard/admin` | `Frontend/src/app/dashboard/admin/` |
| OWNER | `/dashboard/owner` | `Frontend/src/app/dashboard/owner/` |
| CLERK | `/dashboard/clerk` | `Frontend/src/app/dashboard/clerk/` |
| GYMER (`USER`) | `/dashboard/user` | `Frontend/src/app/dashboard/user/` |

Shared gate / realtime mounts: `Frontend/src/app/dashboard/layout.tsx`

---

## Backend mount points (`Backend/src/index.ts`)

| Mount | Router file |
|-------|-------------|
| `/api/auth` | `routes/auth.routes.ts` |
| `/api/gyms` | `routes/gym.routes.ts` |
| `/api/admin` | `routes/admin.routes.ts` |
| `/api/owner` | `routes/owner.routes.ts` |
| `/api/clerk` | `routes/clerk.routes.ts` |
| `/api/user` | `routes/user.routes.ts` |
| `/api/subscriptions` | `routes/subscription.routes.ts` |
| `/api/payments` | `routes/payment.routes.ts` |
| `/api/upload` | `routes/upload.routes.ts` |
| `/api/messages` | `routes/messaging.routes.ts` |
| `/api/notifications` | `routes/notification.routes.ts` |
| `/api/health` | inline in `index.ts` |

---

## Organization notes (defense talking points)

1. **Next.js App Router** paths = public URLs — moving `app/dashboard/**` would change routes; left intact on purpose.
2. **Express routers** keep stable `/api/*` mounts; controllers/services stay under conventional `routes/`, `controllers/`, `services/`.
3. **Standalone debug scripts** moved to `Backend/scripts/` (not imported by the API).
4. **Removed unused duplicates** (confirmed zero imports): mock auth helpers, unused shells/placeholders, unused `useAuth` / `route-guard`.
5. **Neon schema** source of truth: `Backend/prisma/schema.prisma` only.
