# Backend Scripts (not part of the running API)

Standalone utilities used for local debugging and one-off Neon checks.
They are **not** imported by `Backend/src` and do not affect runtime behavior.

| Script | Purpose |
|--------|---------|
| `check-db.js` | Quick Prisma connectivity / table probe |
| `check-admin.js` / `check-admin-api.*` | Admin user / dashboard API smoke checks |
| `check-gyms.js` / `check-user.js` | Gym / user row probes |
| `create-admin.ts` | Create or repair an ADMIN account |
| `test-xendit*.js` | Manual Xendit Payment Request experiments |
| `test-update-gym.js` | Manual gym update probe |

Run from `Backend/` with Node/ts-node as needed, e.g.:

```bash
npx ts-node scripts/create-admin.ts
```
