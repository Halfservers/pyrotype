# Pyrotype Project Context

Full context dump for session handoff. This file contains everything needed to continue development.

---

## Project Overview

**Pyrotype** is a full rewrite of **Pyrodactyl** (a Pterodactyl game server panel UI). The original is PHP/Laravel + React (Easy-Peasy, Formik, SWR, Styled Components). Pyrotype replaces it with:

- **Frontend**: TanStack Start + React 19 + Vite 7 + Zustand + react-hook-form + Zod + shadcn/ui + Tailwind CSS 4
- **Backend**: Express 5 + Prisma v7 + SQLite (via `@prisma/adapter-better-sqlite3`) + Zod validation
- **Tests**: Vitest 4 + Supertest (425 tests, 29 files, all passing)

The original source lives in `C:/Users/night/Pyro/pyrodactyl/` (read-only reference).
The new codebase lives in `C:/Users/night/Pyro/pyrotype/`.

---

## Running the Project

```bash
# Terminal 1 — Backend (port 3001)
cd C:/Users/night/Pyro/pyrotype/server
npx tsx watch src/index.ts

# Terminal 2 — Frontend (port 3007)
cd C:/Users/night/Pyro/pyrotype
pnpm dev
# or: npx vite dev --port 3007

# Run tests
cd C:/Users/night/Pyro/pyrotype/server
npx vitest run
```

**Login credentials** (seeded admin user):
- Username: `admin`
- Password: `password`
- Email: `admin@pyrotype.local`
- rootAdmin: `true`

Access the app at `http://localhost:3007`. Login at `/auth/login`. Admin panel at `/admin` (only visible to rootAdmin users).

---

## Architecture

### Vite Proxy

All backend routes use the `/api/` prefix. The Vite dev server proxies `/api` to the backend:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3001',
  },
}
```

**Critical**: TanStack Start SSR intercepts POSTs to frontend routes before the Vite proxy can forward them. This is why ALL backend routes MUST be under `/api/` — otherwise SSR will eat the request and return a 422.

### Database

Prisma v7 with SQLite via driver adapter (no binary engine, no `url` in datasource):

```typescript
// server/src/config/database.ts
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

- Schema: `server/prisma/schema.prisma` — 41 models, all using `@@map` for snake_case table names
- Database file: `server/prisma/dev.db`
- Generated client: `server/src/generated/prisma/`
- `DATABASE_URL=file:./prisma/dev.db` in `server/.env`

### Fractal Response Format

All API responses use the Pterodactyl fractal format for compatibility:

```typescript
// Single item
{ object: 'user', attributes: { id: 1, username: 'admin', ... } }

// List
{ object: 'list', data: [{ object: 'user', attributes: {...} }, ...] }

// Paginated list
{
  object: 'list',
  data: [...],
  meta: {
    pagination: { total, count, per_page, current_page, total_pages, links: {} }
  }
}
```

Helper functions: `fractalItem()`, `fractalList()`, `fractalPaginated()` in `server/src/utils/response.ts`.

### Error Format

```typescript
// All errors follow this shape:
{ errors: [{ code: 'ErrorType', status: '404', detail: 'Human message' }] }
```

Error hierarchy in `server/src/utils/errors.ts`:
- `AppError` (base, 500)
- `NotFoundError` (404)
- `AuthenticationError` (401)
- `ForbiddenError` (403)
- `ValidationError` (422)
- `ConflictError` (409)
- `ServerStateConflictError` (409)
- `TooManyRequestsError` (429)

---

## Backend Route Map

All routes defined in `server/src/routes/index.ts`:

```
GET  /api/health                              — Health check

POST /api/auth/login                          — Login (rate limited 5/min)
POST /api/auth/login/checkpoint               — 2FA checkpoint (rate limited 5/min)
POST /api/auth/password                       — Send reset link (rate limited 3/min)
POST /api/auth/password/reset                 — Reset password (rate limited 3/min)
POST /api/auth/logout                         — Logout
GET  /api/sanctum/csrf-cookie                 — CSRF cookie (204 no-op)

/api/client/account/*                         — Account management (session auth)
  GET    /api/client/account                  — Get account
  PUT    /api/client/account/email             — Update email
  PUT    /api/client/account/password          — Update password
  GET    /api/client/account/activity          — Activity log
  GET    /api/client/account/two-factor        — Get 2FA QR
  POST   /api/client/account/two-factor        — Enable 2FA
  DELETE /api/client/account/two-factor        — Disable 2FA

/api/client/*                                 — Client API (session auth)
  GET    /api/client                          — List user's servers
  GET    /api/client/permissions               — Panel permissions
  /api/client/servers/:server/*               — Per-server operations
  GET    /api/client/api-keys                 — List API keys
  POST   /api/client/api-keys                 — Create API key
  DELETE /api/client/api-keys/:identifier     — Delete API key
  GET    /api/client/ssh-keys                 — List SSH keys
  POST   /api/client/ssh-keys                 — Add SSH key
  DELETE /api/client/ssh-keys/:fingerprint    — Delete SSH key
  GET    /api/client/nests                    — List nests
  GET    /api/client/nests/:nestId/eggs       — List eggs for a nest

/api/client/servers/elytra/:server/*          — Elytra daemon server routes
  GET    /details                             — Server details
  GET    /resources                           — Server resources/stats
  GET    /websocket                           — WebSocket token
  POST   /command                             — Send console command
  POST   /power                               — Power action
  GET    /files/list                          — List files
  GET    /files/contents                      — Get file content
  PUT    /files/rename                        — Rename/move file
  POST   /files/copy                          — Copy file
  PUT    /files/write                         — Write file
  POST   /files/compress                      — Compress files
  POST   /files/decompress                    — Decompress archive
  DELETE /files/delete                        — Delete files
  POST   /files/create-folder                 — Create folder
  PUT    /files/chmod                         — Change permissions
  GET    /files/upload                        — Get upload URL
  POST   /files/upload                        — Direct upload
  GET    /startup                             — Get startup variables
  PUT    /startup/variable                    — Update startup variable
  PUT    /settings/rename                     — Rename server
  POST   /settings/reinstall                  — Reinstall server
  GET    /activity                            — Server activity log
  GET    /elytra/jobs                         — List Elytra jobs

/api/remote/*                                 — Remote daemon API (daemon auth)
  POST   /api/remote/activity                 — Record activity logs

/api/application/*                            — Admin API (session rootAdmin OR Application API key)
  /users, /servers, /nodes, /locations, /nests — Full CRUD
  /servers/:id/suspend, /unsuspend, /reinstall — Server operations
  /nodes/:id/configuration, /allocations      — Node management
```

### Auth Middleware Stack

```
loadUser         — Reads session, attaches req.user (does NOT reject if missing)
requireAuth      — Rejects if no req.user (401)
requirePermission — Checks subuser permissions array
requireAdminAccess — Accepts session rootAdmin OR API key Bearer token
requireApiKey    — API key only (Application keys, keyType=1)
```

The `requireAdminAccess` middleware in `server/src/middleware/apiKeyAuth.ts` allows admin routes to work with both browser sessions (for the admin UI) and API keys (for external integrations).

---

## Frontend Route Map

```
/                                    — Root (__root.tsx — reads window.PterodactylUser)
├── /auth/login                      — Login page
├── /auth/login/checkpoint           — 2FA checkpoint
├── /auth/forgot-password            — Forgot password
├── /auth/reset-password/:token      — Reset password
└── /_authed                         — Auth guard layout (NavBar + Outlet)
    ├── /                            — Dashboard (server list)
    ├── /account                     — Account layout with sidebar
    │   ├── /account/                — Account overview
    │   ├── /account/api             — API credentials
    │   ├── /account/ssh             — SSH keys
    │   └── /account/activity        — Activity log
    ├── /admin                       — Admin layout (tab nav, rootAdmin only)
    │   ├── /admin/                  — Admin dashboard (live counts)
    │   ├── /admin/users             — Users CRUD (table + create/edit/delete)
    │   ├── /admin/servers           — Servers management (suspend/reinstall/delete)
    │   ├── /admin/nodes             — Nodes CRUD (with location dropdown)
    │   └── /admin/locations         — Locations CRUD
    └── /server/:id                  — Server layout (sidebar, WebSocket, ServerStoreProvider)
        ├── /server/:id/             — Console (xterm.js)
        ├── /server/:id/files        — File manager
        ├── /server/:id/databases    — Databases
        ├── /server/:id/backups      — Backups
        ├── /server/:id/network      — Network/allocations
        ├── /server/:id/users        — Subusers
        ├── /server/:id/schedules    — Schedules
        ├── /server/:id/startup      — Startup variables
        ├── /server/:id/settings     — Server settings
        ├── /server/:id/activity     — Activity log
        ├── /server/:id/shell        — Shell
        └── /server/:id/mods         — Mods (Modrinth)
```

### NavBar

The top navbar in `_authed.tsx` shows:
- **Pyrotype** logo (links to `/`)
- **Servers** link
- **Account** link
- **Admin** link (only if `userData.rootAdmin`)
- Username display + **Logout** button

---

## State Management

### Zustand Store (`src/store/index.ts`)

Composed from 5 slices:
- `user.ts` — `userData`, `setUserData`, `updateUserData`, `updateUserEmail`
- `settings.ts` — `SiteSettings`, `setSiteSettings`
- `permissions.ts` — `PanelPermissions`, `setPanelPermissions`, `fetchPanelPermissions`
- `flash.ts` — `FlashMessage[]`, `addFlash`, `addError`, `clearAndAddHttpError`, `clearFlashes`
- `progress.ts` — `continuous`, `startContinuous`, `setProgress`, `setProgressComplete`

### Server Store (Context-based)

Each server page gets its own store via React Context (`ServerStoreProvider`). Holds: server data, permissions, status, socket instance, databases, file directory, selected files, uploads, subusers, schedules.

---

## Frontend API Layer

### HTTP Client (`src/lib/api/http.ts`)

Axios instance with:
- `withCredentials: true` (cookies)
- Progress callbacks (decoupled from store via `setProgressCallbacks()`)
- Fractal response types (`FractalResponseData`, `FractalResponseList`, `FractalPaginatedResponse`)
- `httpErrorToHuman()` error message extractor
- `QueryBuilderParams` + `withQueryBuilderParams()` for filter/sort query strings

### Admin API Client (`src/lib/api/admin/index.ts`)

Typed functions for all admin CRUD operations:
```typescript
getUsers(page), getUser(id), createUser(data), updateUser(id, data), deleteUser(id)
getServers(page), getServer(id), suspendServer(id), unsuspendServer(id), reinstallServer(id), deleteServer(id, force)
getNodes(page), getNode(id), createNode(data), updateNode(id, data), deleteNode(id)
getLocations(page), createLocation(data), updateLocation(id, data), deleteLocation(id)
getNests(page)
getAdminOverview() — returns { users, servers, nodes, locations } counts
```

---

## Key Backend Files

| File | Purpose |
|------|---------|
| `server/src/index.ts` | Entry point (starts Express on port 3001) |
| `server/src/app.ts` | Express app setup (middleware, routes, error handler) |
| `server/src/config/database.ts` | Prisma v7 + SQLite adapter singleton |
| `server/src/config/logger.ts` | Winston logger |
| `server/src/config/redis.ts` | Redis client (ioredis) |
| `server/src/config/queue.ts` | BullMQ queue setup |
| `server/src/routes/index.ts` | Route registration hub |
| `server/src/routes/auth.ts` | Auth routes (all under /api/) |
| `server/src/routes/admin/index.ts` | Admin routes (requireAdminAccess) |
| `server/src/routes/client/index.ts` | Client routes (servers, nests) |
| `server/src/routes/client/account.ts` | Account routes |
| `server/src/routes/client/servers/elytra.ts` | Elytra daemon server routes |
| `server/src/routes/remote/index.ts` | Remote daemon-to-panel routes |
| `server/src/middleware/auth.ts` | requireAuth middleware |
| `server/src/middleware/apiKeyAuth.ts` | requireAdminAccess + requireApiKey |
| `server/src/middleware/loadUser.ts` | Session → req.user middleware |
| `server/src/middleware/permissions.ts` | Subuser permission checking |
| `server/src/middleware/validate.ts` | Zod validation middleware (Express 5 compatible) |
| `server/src/middleware/rateLimiter.ts` | Rate limiting |
| `server/src/middleware/errorHandler.ts` | Global error handler |
| `server/src/middleware/daemonType.ts` | Wings vs Elytra routing |
| `server/src/utils/errors.ts` | AppError hierarchy |
| `server/src/utils/response.ts` | Fractal response helpers |
| `server/src/utils/pagination.ts` | Zod pagination schema + offset calc |
| `server/src/utils/crypto.ts` | bcrypt password hashing |
| `server/src/constants/permissions.ts` | Permission definitions |
| `server/src/services/auth/session.ts` | Session management |
| `server/src/services/auth/twoFactor.ts` | 2FA (TOTP) |
| `server/src/services/auth/apiKey.ts` | API key management |
| `server/src/services/wings/client.ts` | Wings daemon HTTP client |
| `server/src/services/wings/websocket.ts` | Wings WebSocket proxy |
| `server/prisma/schema.prisma` | 41 Prisma models |
| `server/prisma/dev.db` | SQLite database |

## Key Frontend Files

| File | Purpose |
|------|---------|
| `src/routes/__root.tsx` | Root layout (QueryClientProvider, reads window.PterodactylUser) |
| `src/routes/_authed.tsx` | Auth guard + NavBar + Outlet |
| `src/routes/_authed/index.tsx` | Dashboard (server list) |
| `src/routes/_authed/admin.tsx` | Admin layout with tab navigation |
| `src/routes/_authed/admin/index.tsx` | Admin dashboard with live counts |
| `src/routes/_authed/admin/users.tsx` | Users CRUD page |
| `src/routes/_authed/admin/servers.tsx` | Servers management page |
| `src/routes/_authed/admin/nodes.tsx` | Nodes CRUD page |
| `src/routes/_authed/admin/locations.tsx` | Locations CRUD page |
| `src/routes/_authed/account.tsx` | Account layout with sidebar |
| `src/routes/_authed/server/$id.tsx` | Server layout (sidebar, WebSocket, ServerStoreProvider) |
| `src/store/index.ts` | Zustand store (5 slices composed) |
| `src/lib/api/http.ts` | Axios instance + fractal types |
| `src/lib/api/admin/index.ts` | Admin API client with typed functions |
| `src/lib/api/auth/login.ts` | Login API call |
| `src/lib/api/auth/login-checkpoint.ts` | 2FA checkpoint API call |
| `src/lib/api/auth/reset-password.ts` | Password reset API calls |
| `vite.config.ts` | Vite config with /api proxy to :3001 |
| `tsconfig.json` | TypeScript config with @/ path alias |

---

## Test Infrastructure

### Config (`server/vitest.config.ts`)
- Vitest 4 with `fileParallelism: false`
- Test env vars: `NODE_ENV=test`, `DATABASE_URL=file:./prisma/test.db`, `SESSION_SECRET=test-secret`

### Setup (`server/tests/setup.ts`)
- Copies `dev.db` → `test.db` before each suite
- Mocks: Redis, BullMQ, nodemailer, logger, rate limiter (disabled in tests)

### Helpers
- `server/tests/helpers/test-app.ts` — `createTestApp()`, `createAgent()` (supertest with cookies), `createAuthenticatedAgent()`, `request()` (one-shot supertest)
- `server/tests/helpers/fixtures.ts` — `ADMIN_USER`, `MALFORMED_INPUTS`, `PATH_TRAVERSAL_ATTEMPTS`, factory functions
- `server/tests/helpers/admin-auth.ts` — Admin API key auth for tests

### Test Files (29 files, 425 tests, all passing)

**Auth (38 tests)**:
- `tests/auth/login.test.ts` (17) — login flow, validation, rate limiting
- `tests/auth/checkpoint.test.ts` (6) — 2FA checkpoint
- `tests/auth/password-reset.test.ts` (15) — forgot + reset password

**Middleware (68 tests)**:
- `tests/middleware/auth-middleware.test.ts` (16)
- `tests/middleware/permissions.test.ts` (19)
- `tests/middleware/rate-limiter.test.ts` (6)
- `tests/middleware/validate.test.ts` (9)
- `tests/middleware/error-handler.test.ts` (14)
- `tests/middleware/load-user.test.ts` (4)

**Client API (68 tests)**:
- `tests/client/servers.test.ts` (15)
- `tests/client/account.test.ts` (22)
- `tests/client/api-keys.test.ts` (10)
- `tests/client/ssh-keys.test.ts` (13)
- `tests/client/nests.test.ts` (8)

**Admin API (101 tests)**:
- `tests/admin/users.test.ts` (24)
- `tests/admin/servers.test.ts` (22)
- `tests/admin/nodes.test.ts` (22)
- `tests/admin/locations.test.ts` (16)
- `tests/admin/nests.test.ts` (17)

**Security (81 tests)**:
- `tests/security/auth-bypass.test.ts` (28)
- `tests/security/privilege-escalation.test.ts` (17)
- `tests/security/input-validation.test.ts` (19)
- `tests/security/rate-limiting.test.ts` (6)
- `tests/security/error-safety.test.ts` (11)

**Integration (69 tests)**:
- `tests/integration/health.test.ts` (6)
- `tests/integration/full-auth-flow.test.ts` (6)
- `tests/integration/response-shapes.test.ts` (15)
- `tests/integration/edge-cases.test.ts` (22)
- `tests/integration/database-relations.test.ts` (20)

---

## Known Issues / Bugs Fixed

1. **`/auth/login` POST 422** — TanStack Start SSR intercepted POSTs to frontend routes before Vite proxy. Fixed by moving all backend auth routes under `/api/` prefix.

2. **`allocationController.ts` createMany on SQLite** — `createMany({ skipDuplicates: true })` failed because SQLite had no unique constraint on `(nodeId, ip, port)`. Fixed with existence-check loop.

3. **`validate.ts` Express 5 read-only properties** — Direct assignment to `req.query`/`req.params` failed in Express 5. Fixed with `Object.defineProperty`.

4. **Admin routes 401 with session auth** — Admin routes only accepted API key Bearer tokens, not session cookies. Fixed by adding `requireAdminAccess` middleware.

5. **No sidebar/navigation on dashboard** — `_authed.tsx` rendered bare `<Outlet />`. Fixed by adding NavBar component.

### Low-Severity Security Findings (not yet fixed)

1. Non-string types in login `user` field cause 500 (`.includes('@')` on non-string)
2. Invalid JSON body returns 500 instead of 400

---

## Dependencies

### Frontend (`pyrotype/package.json`)
```
@tanstack/react-start, @tanstack/react-router, @tanstack/react-query, @tanstack/react-table, @tanstack/react-virtual
zustand, react-hook-form, @hookform/resolvers, zod
axios, sockette, events
@xterm/xterm, @xterm/addon-fit, @xterm/addon-search, @xterm/addon-web-links
chart.js, react-chartjs-2, date-fns, @date-fns/tz
@codemirror/* (autocomplete, commands, language, language-data, lint, search, state, view)
@gravity-ui/icons, cmdk, sonner, motion, lucide-react
clsx, tailwind-merge, class-variance-authority
radix-ui, shadcn
cronstrue, qrcode.react, copy-to-clipboard, debounce, uuid, deepmerge-ts, react-fast-compare
@hcaptcha/react-hcaptcha, @marsidev/react-turnstile
tailwindcss v4, @tailwindcss/vite
react v19, react-dom v19, vite v7, typescript v5
```

### Backend (`pyrotype/server/package.json`)
```
express v5, @prisma/client v7, @prisma/adapter-better-sqlite3 v7
zod v4, axios, bcrypt, uuid
express-session, cookie-parser, cors, helmet, morgan
ioredis, bullmq
jsonwebtoken, nodemailer, winston, ws
tsx (dev), tsup (build), vitest v4, supertest v7
```

---

## Prisma Schema Summary (41 models)

Key models: `User`, `Server`, `Node`, `Location`, `Nest`, `Egg`, `EggVariable`, `Allocation`, `Database`, `DatabaseHost`, `Subuser`, `ApiKey`, `RecoveryToken`, `UserSSHKey`, `AuditLog`, `Backup`, `Schedule`, `Task`, `ServerTransfer`, `ElytraJob`, `ServerOperation`, `Setting`, `Session`

The schema uses `@@map("table_name")` and `@map("column_name")` throughout to match the original Laravel snake_case database.

Datasource is SQLite with no `url` field (uses driver adapter):
```prisma
datasource db {
  provider = "sqlite"
}
```

---

## What's NOT Done Yet

1. **Server detail pages** — Route files exist but most are placeholder stubs (console, files, databases, backups, network, users, schedules, startup, settings, activity, shell, mods). The server layout (`$id.tsx`) and sidebar exist.

2. **WebSocket console** — The WebSocket manager and event types are partially ported but the xterm.js console component needs finishing.

3. **File manager** — CodeMirror editor integration needs work.

4. **Nests admin page** — No frontend route for `/admin/nests` (the API exists).

5. **Wings vs Elytra daemon routing** — Backend has `daemonType` middleware but the frontend doesn't yet handle both daemon types.

6. **Command palette** — Not ported yet (uses cmdk).

7. **2FA flows** — Backend 2FA endpoints exist, frontend login checkpoint page exists, but the account 2FA enable/disable UI needs work.

8. **Low-severity security fixes** — Non-string login input causing 500, invalid JSON body returning 500.

---

## Original Source Reference

The original Pyrodactyl source is at `C:/Users/night/Pyro/pyrodactyl/`. Key reference files:

| File | Purpose |
|------|---------|
| `pyrodactyl/resources/scripts/components/App.tsx` | Root app: routing, providers, auth check |
| `pyrodactyl/resources/scripts/routers/routes.ts` | All route definitions with permissions |
| `pyrodactyl/resources/scripts/routers/ServerRouter.tsx` | Server layout: sidebar, WebSocket |
| `pyrodactyl/resources/scripts/state/server/index.ts` | ServerContext store (Easy-Peasy) |
| `pyrodactyl/resources/scripts/api/http.ts` | Axios instance with Fractal types |
| `pyrodactyl/resources/scripts/plugins/Websocket.ts` | WebSocket class |
| `pyrodactyl/resources/scripts/components/server/WebsocketHandler.tsx` | WebSocket lifecycle |
| `pyrodactyl/resources/scripts/components/server/console/Console.tsx` | xterm.js terminal |
| `pyrodactyl/resources/scripts/api/server/getServer.ts` | Server fetch with daemon type routing |
| `pyrodactyl/package.json` | All current dependencies |
