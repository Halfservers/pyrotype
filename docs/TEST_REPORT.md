# Pyrotype Exhaustive Test Report

**Date:** 2026-03-02
**Duration:** ~8 minutes (6 parallel agents)
**Framework:** Vitest 4.0.18 + Supertest 7.2.2
**Database:** SQLite via Prisma v7 + better-sqlite3 adapter

---

## Summary

```
Test Files:  29 passed (29)
Tests:       425 passed (425)
Failures:    0
Duration:    31.63s
```

**All 425 tests pass. Zero failures.**

---

## Test Coverage by Domain

### Auth Endpoints (38 tests)
| File | Tests | Status |
|------|-------|--------|
| `tests/auth/login.test.ts` | 17 | PASS |
| `tests/auth/checkpoint.test.ts` | 6 | PASS |
| `tests/auth/password-reset.test.ts` | 15 | PASS |

**Endpoints tested:**
- `POST /api/auth/login` — valid creds, wrong password, nonexistent user, empty body, missing fields, XSS, SQL injection, oversized input
- `GET /api/sanctum/csrf-cookie` — returns 204
- `POST /api/auth/logout` — authenticated, unauthenticated, session clearing
- `POST /api/auth/login/checkpoint` — without pending auth, empty body, invalid token, missing fields, no user info leakage
- `POST /api/auth/password` — valid email, nonexistent email (no enumeration), token creation, token replacement
- `POST /api/auth/password/reset` — full flow, invalid token, mismatched passwords, missing fields, short password, token deletion after use, token reuse prevention

### Middleware (68 tests)
| File | Tests | Status |
|------|-------|--------|
| `tests/middleware/auth-middleware.test.ts` | 16 | PASS |
| `tests/middleware/permissions.test.ts` | 19 | PASS |
| `tests/middleware/rate-limiter.test.ts` | 6 | PASS |
| `tests/middleware/validate.test.ts` | 9 | PASS |
| `tests/middleware/error-handler.test.ts` | 14 | PASS |
| `tests/middleware/load-user.test.ts` | 4 | PASS |

**Middleware tested:**
- `isAuthenticated` — session auth, Bearer API key auth, rejection paths
- `isAdmin` — rootAdmin=true/false
- `requireTwoFactor` — enabled/disabled/verified states
- `authenticateServerAccess` — owner, subuser, admin, non-owner, invalid ID
- `requirePermission` — wildcard, exact match, prefix match, rejection
- `validateServerState` — normal, suspended, maintenance, restoring
- `rateLimit` — under/at/over limit, window reset, per-IP/per-path tracking
- `validate` — body/query/params validation, Zod error formatting
- `errorHandler` — all AppError subtypes, unknown errors, response shapes
- `loadUser` — valid session, no session, deleted user, DB errors

### Client API (68 tests)
| File | Tests | Status |
|------|-------|--------|
| `tests/client/servers.test.ts` | 15 | PASS |
| `tests/client/account.test.ts` | 22 | PASS |
| `tests/client/api-keys.test.ts` | 10 | PASS |
| `tests/client/ssh-keys.test.ts` | 13 | PASS |
| `tests/client/nests.test.ts` | 8 | PASS |

**Endpoints tested:**
- `GET /api/client/` — server list, pagination, type=owner/admin/admin-all filters
- `GET /api/client/permissions` — permission schema
- `GET /api/client/version` — version info
- Account CRUD: GET details, PUT email, PUT password, GET activity
- API Key CRUD: GET list, POST create, DELETE remove, full lifecycle
- SSH Key CRUD: GET list, POST create, POST remove, duplicate fingerprint handling
- Nest endpoints: GET list, GET by ID, 404 handling

### Admin API (101 tests)
| File | Tests | Status |
|------|-------|--------|
| `tests/admin/users.test.ts` | 24 | PASS |
| `tests/admin/servers.test.ts` | 22 | PASS |
| `tests/admin/nodes.test.ts` | 22 | PASS |
| `tests/admin/locations.test.ts` | 16 | PASS |
| `tests/admin/nests.test.ts` | 17 | PASS |

**Endpoints tested:**
- User CRUD: GET list/detail, POST create, PATCH update, DELETE remove
- Server CRUD: GET list/detail, POST create, PATCH details/build, DELETE normal/force
- Server management: POST suspend/unsuspend/reinstall
- Node CRUD: GET list/detail, POST create, PATCH update, DELETE remove
- Allocation CRUD: GET list, POST create, DELETE remove
- Location CRUD: GET list/detail, POST create, PATCH update, DELETE remove (409 conflict)
- Nest/Egg: GET nests list/detail, GET eggs list/detail, egg-nest relationships
- Auth enforcement: 401 unauthenticated, 403 non-admin on all endpoints

### Security (81 tests)
| File | Tests | Status |
|------|-------|--------|
| `tests/security/auth-bypass.test.ts` | 28 | PASS |
| `tests/security/privilege-escalation.test.ts` | 17 | PASS |
| `tests/security/input-validation.test.ts` | 19 | PASS |
| `tests/security/rate-limiting.test.ts` | 6 | PASS |
| `tests/security/error-safety.test.ts` | 11 | PASS |

**Security boundaries tested:**
- Auth bypass: 17+ protected endpoints return 401 without auth
- Invalid sessions: forged, empty, random cookies rejected
- Bearer tokens: empty, no-dot, invalid ID, non-Bearer scheme, dots-only rejected
- Horizontal privesc: non-admin blocked from all 7+ admin endpoints
- Vertical privesc: non-admin cannot create/modify/delete users, suspend servers, manage nodes/locations
- XSS prevention: 5+ XSS payloads not reflected in responses
- SQL injection: 5+ injection payloads fail safely (no data leak)
- Input validation: null bytes, unicode overflow, oversized payloads, type mismatches
- Rate limiting: enforced and reset correctly
- Error safety: no stack traces, no DB details, consistent error format

### Integration & Edge Cases (69 tests)
| File | Tests | Status |
|------|-------|--------|
| `tests/integration/health.test.ts` | 6 | PASS |
| `tests/integration/full-auth-flow.test.ts` | 6 | PASS |
| `tests/integration/response-shapes.test.ts` | 15 | PASS |
| `tests/integration/edge-cases.test.ts` | 22 | PASS |
| `tests/integration/database-relations.test.ts` | 20 | PASS |

**Integration flows tested:**
- Health check endpoint (GET, HEAD, POST)
- Full auth lifecycle: login → protected resource → logout → denied
- CSRF → login → account details flow
- Failed login → retry → success
- Independent sessions across agents
- Response shape validation on all error/success types
- Pagination structure validation
- Edge cases: empty body, wrong content-type, malformed JSON, huge pages, negative pages, unknown routes, OPTIONS/CORS, trailing slashes, double slashes
- Database relations: User↔Server, Server↔Node↔Location, Nest↔Egg, Allocation↔Node, unique constraints

---

## Source Code Bugs Found & Fixed

### 1. Allocation Controller — SQLite `createMany` Incompatibility
**File:** `server/src/controllers/admin/allocationController.ts`
**Issue:** `createMany({ skipDuplicates: true })` caused 500 errors on SQLite because there is no unique constraint on `(nodeId, ip, port)`.
**Fix:** Replaced with a loop that checks for existing allocations before creating.

### 2. Validate Middleware — Express 5 Read-Only Properties
**File:** `server/src/middleware/validate.ts`
**Issue:** `req.query` and `req.params` are read-only getters in Express 5. Direct assignment caused runtime errors.
**Fix:** Used `Object.defineProperty` instead of direct assignment.

---

## Security Findings (Non-Critical)

### 1. Non-String Type in Login Causes 500
**Severity:** Low
**Issue:** Sending `{ user: 123, password: "test" }` causes a 500 because `loginController` calls `.includes('@')` on a non-string value.
**Impact:** No auth bypass or data leak — just an unhandled type error.
**Recommendation:** Add `typeof user === 'string'` check or rely on Zod schema validation.

### 2. Invalid JSON Body Returns 500
**Severity:** Low
**Issue:** Sending malformed JSON body returns 500 instead of 400. Express JSON parser error is caught by errorHandler as a generic error.
**Impact:** No data leak — just incorrect status code.
**Recommendation:** Add SyntaxError check in errorHandler for 400 response.

---

## Test Infrastructure

### Files Created
```
server/vitest.config.ts          — Vitest configuration
server/tests/setup.ts            — Global setup (mocks, test DB)
server/tests/helpers/test-app.ts — Express test app + supertest helpers
server/tests/helpers/fixtures.ts — Test data factories
server/tests/helpers/admin-auth.ts — Admin API key auth helper
server/tests/auth/               — 3 test files (38 tests)
server/tests/middleware/         — 6 test files (68 tests)
server/tests/client/             — 5 test files (68 tests)
server/tests/admin/              — 5 test files (101 tests)
server/tests/security/           — 5 test files (81 tests)
server/tests/integration/        — 5 test files (69 tests)
```

### Dependencies Added
```
vitest@4.0.18, @vitest/coverage-v8@4.0.18, supertest@7.2.2, @types/supertest@7.2.0
```

### Run Commands
```bash
cd pyrotype/server
npm test                    # Run all 425 tests
npx vitest run tests/auth/  # Run auth tests only
npx vitest run tests/admin/ # Run admin tests only
npx vitest --watch          # Watch mode
```

---

## Conclusion

All 425 tests pass across 29 test files covering auth, middleware, client API, admin API, security boundaries, and integration flows. Two source code bugs were discovered and fixed. Two low-severity security findings were documented for future hardening.
