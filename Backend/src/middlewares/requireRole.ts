/**
 * Backward-compatible RBAC entry — implementation lives in
 * `./rbac-middleware` (reference-style `permittedRole`).
 */
export { permittedRole, permittedRole as requireRole } from "@/middlewares/rbac-middleware";
