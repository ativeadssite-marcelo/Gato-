# Security Audit Status - GATO SaaS

**Date:** 2026-09-29
**Branch:** feat/billing-saas
**Status:** In Progress - Manual Review Phase

---

## Executive Summary

The GATO SaaS project is a multi-tenant auto parts management system with React frontend and Express backend. A security audit was initiated using the `find-security-vulnerabilities-in-code` skill, but the `strix` binary is not installed in the environment. This document captures the manual code review progress and pending items.

### Current State
- **TypeScript compilation** has errors in `server/caixa.ts` and `server/caixaRoutes.ts` related to `PermissionResource` enum values and type mismatches
- **Frontend integration** for caixa module not yet complete (no menu button, no components)
- **Security review** started but not completed due to tooling limitations

### Files Inspected

#### 1. `server/env.ts` - Environment Validation
- **Status:** ✅ OK
- Zod-based validation properly configured
- No obvious injection risks found

#### 2. `server/rbacEngine.ts` - RBAC Authorization
- **Status:** ⚠️ Needs review
- `PermissionResource` enum defines valid resources
- Caixa routes reference "sales" permission which may not be valid
- **Line ~40-50:** Verify all permission references match enum values

#### 3. `server/caixa.ts` - Caixa Business Logic
- **Status:** ⚠️ TypeScript errors pending fix
- **Line 137:** `sales` property removed, need to use breakdown fields instead
- **Multi-tenant:** Ensure all database queries filter by `tenant_id`
- **Cash flow:** Opening/closing logic, movement recording appears sound

#### 4. `server/caixaRoutes.ts` - Caixa API Routes
- **Status:** ⚠️ Permission resource mismatch
- Missing `Router` import (appears fixed)
- **Critical:** `requirePermission("sales")` - "sales" not in `PermissionResource` enum
- **Fix needed:** Map to valid resource (e.g., `billing_contracts` or `company_data`)

#### 5. `server/auth.ts` - Authentication
- **Status:** ✅ HMAC-SHA256 session tokens
- RBAC middleware appears properly implemented
- Token validation looks correct

#### 6. `src/utils/accessControl.ts` - Frontend Access Control
- **Status:** ✅ Role-based frontend filtering
- Uses RBAC data from context

#### 7. `server/dbMirror.ts` - Database Mirroring
- **Status:** ⚠️ Verify tenant isolation
- Shared mirror function; `server/store.ts` should import from here

### Vulnerabilities Found (Manual Review)

| ID | Severity | Type | File/Endpoint | Problem | Impact | Evidence |
|----|----------|------|---------------|---------|--------|----------|
| V1 | Medium | Permission Mismatch | `server/caixaRoutes.ts:28` | `requirePermission("sales")` not in enum | Auth bypass possible | Enum defines: company_data, customers_employees, billing_contracts, pos_settings, inventory, reports, financial, users, system_config |
| V2 | Medium | Possible IDOR | `server/caixa.ts:getOpenBoletoData()` | No tenant_id filter on query | Data leak across tenants | Need to verify all DB queries add `.where("tenant_id", user.tenantId)` |
| V3 | Low | Missing Input Validation | `server/caixaRoutes.ts` | Receipt/boleto data not validated via Zod | Injection/format issues | Zod schemas exist in `src/types/caixa.ts` but not applied at route level |
| V4 | Low | CSRF Risk | All POST endpoints | No CSRF token validation | Session riding | Auth uses HMAC tokens; verify if frontend sends CSRF headers |

### Pending Items / Blockers

1. **Fix TypeScript errors** in `server/caixa.ts` line 137 and `server/caixaRoutes.ts` permission resource
2. **Map caixa permissions** to valid `PermissionResource` enum values
3. **Add tenant_id filtering** to all caixa database queries (verify in `server/caixa.ts`)
4. **Add frontend menu button** for caixa module
5. **Run full TypeScript compilation** (`npm run typecheck` or `tsc`)
6. **Run lint** (`npm run lint`)

### Next Steps (Ordered by Risk)

**P0 (Critical - Fix before deployment):**
1. Fix `server/caixaRoutes.ts` - replace `requirePermission("sales")` with valid enum value
2. Fix `server/caixa.ts` line 137 - use breakdown fields instead of removed `sales` property
3. Ensure all caixa queries filter by `tenant_id`

**P1 (Important - Should fix):**
4. Add Zod schema validation at route level for caixa inputs
5. Add CSRF protection verification for POST endpoints
6. Review `server/dbMirror.ts` vs `server/store.ts` duplication

**P2 (Desirable - Nice to have):**
7. Add frontend caixa menu item and components
8. Add comprehensive tests for caixa service
9. Review all other routes for similar permission enum issues

### Audit Completion Criteria

- [ ] TypeScript compilation passes with `tsc --noEmit`
- [ ] Lint passes with `npm run lint`
- [ ] All `requirePermission()` calls use valid `PermissionResource` enum values
- [ ] All caixa API endpoints have tenant_id filtering
- [ ] Frontend caixa integration complete
- [ ] Security findings documented and remediated

### Notes for Continuation

- The `strix` tool is not installed; this manual review captures the findings
- Priority should be fixing TypeScript errors first (blocks everything else)
- After fixes, re-run typecheck/lint, then continue with the remaining vulnerability checks
- Consider installing `strix-cli` for automated review on clean build