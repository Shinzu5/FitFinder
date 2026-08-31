# FitFinder — Authentication Flow

## Login → Authentication → Role Detection → Dashboard Redirect

```
[Login Page]
    │  email + password
    ▼
POST /api/auth/login  (auth.controller.login)
    │  verify password hash (utils/hash)
    │  issue access JWT + refresh token cookie (utils/jwt)
    ▼
auth-store.ts stores: user, role, accessToken
    │
    ▼
getDashboardPathForRole(role)  ← lib/mock-users.ts roleToDashboardPath
    │
    ├─ ADMIN  → /dashboard/admin
    ├─ OWNER  → /dashboard/owner  (or /dashboard/user/create-gym if no gym / unpaid)
    ├─ CLERK  → /dashboard/clerk
    └─ USER   → /dashboard/user
    ▼
app/dashboard/layout.tsx
    │  hydrate session, syncSessionFromServer (GET /api/auth/me)
    │  enforce role path + OWNER gym ownership checks
    ▼
Role dashboard shell renders
```

## Supporting flows

| Step | Frontend | Backend |
|------|----------|---------|
| Register | `(auth)/signup` | `POST /auth/register` → email OTP |
| Verify email | `(auth)/verify-email` | `POST /auth/verify-email` |
| Forgot password | `(auth)/forgot-password` | `POST /auth/forgot-password` |
| Verify reset OTP | `(auth)/verify-reset-code` | `POST /auth/verify-reset-code` |
| Reset password | `(auth)/reset-password` | `POST /auth/reset-password` |
| Token refresh | `lib/api.ts` interceptor | `POST /auth/refresh` |
| Logout | profile menus / store | `POST /auth/logout` |

## Key files

- Frontend entry: `Frontend/src/app/(auth)/login/page.tsx`
- Session store: `Frontend/src/stores/auth-store.ts`
- API client: `Frontend/src/lib/api.ts`
- Backend: `Backend/src/routes/auth.routes.ts`, `controllers/auth.controller.ts`
- Gate: `Frontend/src/app/dashboard/layout.tsx`
- Middleware: `Backend/src/middleware/auth.ts` (`authenticate`)

## Database

- `users` — credentials, `role`, verification/reset fields, `refreshToken`
