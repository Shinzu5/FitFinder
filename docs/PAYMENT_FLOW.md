# FitFinder — Payment / Membership Flow

## Membership Purchase → Approval → Activation → Reports

There are two membership payment paths that converge on the same approval model.

### A) Walk-in (cash at desk)

```
Gymer selects gym + plan (+ optional coach)
    │
    ▼
POST /api/user/join-gym  (paymentMethod: walk-in)
    │  creates walk_in_approvals (PENDING, paymentStatus PAID recorded for OTC)
    │  emits walk_in_status + walk_in_approvals_updated
    │  creates notifications (gymer + Owner/Clerk)
    ▼
Owner/Clerk Approvals UI
    │
    ├─ PUT /api/clerk/approvals/:id/approve
    │     activateMembershipFromApproval → gym_memberships ACTIVE
    │     clerk_transactions sales line
    │     notify gymer (approved / renewed)
    │
    └─ PUT /api/clerk/approvals/:id/decline
          status DECLINED + notify gymer
```

### B) GCash / Xendit (cashless)

```
Gymer selects GCash
    │
    ▼
POST /api/payments/create-gcash  (type: MEMBERSHIP)
    │  xendit.service.createGcashPayment
    │  stores xendit_payments PENDING
    ▼
User pays in GCash → webhook or status poll
    │
    ▼
activatePayment (MEMBERSHIP)
    │  creates walk_in_approvals PENDING (isRenewal if existing membership)
    │  emits walk_in_status + approvals_updated + notifications
    ▼
Same Owner/Clerk approve / decline path as walk-in
```

### Activation details

- Implemented in `clerk.controller` → `activateMembershipFromApproval`
- Uses `gymMembership.service.upsertGymMembership`
- Renewals extend `expiresAt` via `computeExtendedExpiresAt`
- Realtime: `membership_updated`, `members_updated`, `sales_updated`

### Reports (Owner)

```
Clerk/Owner records sales during the day (approvals / OTC)
    │
    ▼
POST /api/clerk/sales/close
    │  creates daily_sales_reports + links clerk_transactions
    │  emits sales_updated
    ▼
GET /api/owner/sales-reports
    Owner Reports UI
```

### Owner platform plan (separate from gym membership)

```
USER → create-gym plan picker
    │
    ▼
POST /api/payments/create-gcash  (type: SUBSCRIPTION)
    │
    ▼
activatePayment → ensureOwnerSubscriptionFromPayment
    │  owner_subscriptions row + promote role OWNER
    ▼
POST /api/gyms  (register gym)
```

Admin **platform revenue** charts/transactions read SUCCEEDED `xendit_payments` with `type = SUBSCRIPTION` only.

## Key files

| Layer | Path |
|-------|------|
| Join UI | `Frontend/src/app/dashboard/user/gym/[gymId]/join/**` |
| Stores | `join-gym-store.ts`, `membership-store.ts`, `walk-in-approvals-store.ts` |
| Payments API | `Backend/src/controllers/payment.controller.ts` |
| Xendit | `Backend/src/services/xendit.service.ts` |
| Approvals | `Backend/src/controllers/clerk.controller.ts` |
| Membership core | `Backend/src/services/gymMembership.service.ts` |

## Database tables

`xendit_payments` → `walk_in_approvals` → `gym_memberships` → `clerk_transactions` → `daily_sales_reports`
