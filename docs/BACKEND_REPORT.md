# Pyrotype Backend Report

Generated: 2026-03-01

## Summary

The Pyrotype backend is a TypeScript/Express server that serves as the panel API for managing game servers across two daemon types (Wings and Elytra). It uses Prisma ORM with 39 models, session-based authentication with 2FA support, and provides client, admin, and remote (daemon-to-panel) API surfaces.

**TypeScript compilation: 0 errors** (`tsc --noEmit` exits with code 0)

## TypeScript Error Resolution

| Error Code | Count | Root Cause | Fix Applied |
|------------|-------|------------|-------------|
| TS2345 | ~70 | Express v5 `req.params.*` returns `string \| string[]` | `String()` cast on all `req.params` usages |
| TS2322 | ~51 | Prisma filter type mismatches from params | Same `String()` casting |
| TS2339/TS2551 | ~36 | Missing Prisma relation properties | Added `include` or `: any` annotation |
| TS7006 | ~5 | Implicit `any` on callback params | Explicit `(a: any)` annotations |
| TS2365 | 2 | `number + bigint` arithmetic | `Number()` wrapper on bigint fields |
| TS2353/TS2561 | 5 | Wrong Prisma relation names (`variables` vs `serverVariables`, `transfer` vs `transfers`) | Corrected relation names |
| TS2554 | 1 | Wrong argument count | Fixed function signature |
| Other | ~3 | Missing required fields in `create()`, non-existent composite keys | Added fields, replaced `upsert` with `findFirst`+`update`/`create` |

**Total errors fixed: ~170 across 27+ files**

## Route Coverage

All 7 route groups are properly mounted and verified:

| Route Group | Mount Point | Auth | Status |
|-------------|-------------|------|--------|
| Auth | `/auth/*`, `/sanctum/csrf-cookie` | None (public) | OK |
| Account | `/api/client/account/*` | Session | OK |
| Client | `/api/client/*` | Session | OK |
| Wings Server | `/api/client/servers/wings/:server/*` | Session + Permission | OK |
| Elytra Server | `/api/client/servers/elytra/:server/*` | Session + Permission | OK |
| Admin | `/api/application/*` | API Key | OK |
| Remote | `/api/remote/*` | Node Token | OK |

## Prisma Model Count

**39 models** defined in `server/prisma/schema.prisma`:

User, Server, Node, Allocation, Location, Nest, Egg, EggVariable, ServerVariable, Schedule, Task, Database, DatabaseHost, Subuser, Backup, ServerTransfer, ActivityLog, ActivityLogSubject, AuditLog, ApiKey, Setting, Session, UserSSHKey, RecoveryToken, Mount, MountNode, MountServer, EggMount, Permission, Domain, ServerSubdomain, ElytraJob, ServerOperation, TaskLog, Notification, PasswordReset, FailedJob, Job, ApiLog

## Remaining `any` Types

**71 occurrences across 32 hand-written files** (excludes generated Prisma output).

Most are in Prisma query results that require `.include` relations accessed through untyped patterns. These are functional but should be replaced with proper Prisma-generated types in future refactoring.

Top files by `any` count:
- `remote/serverDetailsController.ts` (5) - Prisma server with nested includes
- `admin/userController.ts` (4) - Prisma user queries
- `admin/nodeController.ts` (4) - Prisma node queries
- `admin/serverController.ts` (4) - Prisma server queries
- `wings/startupController.ts` (4) - Prisma egg variable includes
- `wings/networkController.ts` (4) - Prisma allocation includes
- `remote/backupStatusController.ts` (4) - Prisma backup with server include

## Frontend API Contract Match

### Auth

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| login | GET | `/sanctum/csrf-cookie` | `GET /sanctum/csrf-cookie` | YES |
| login | POST | `/auth/login` | `POST /auth/login` | YES |
| login-checkpoint | POST | `/auth/login/checkpoint` | `POST /auth/login/checkpoint` | YES |
| requestPasswordReset | POST | `/auth/password` | `POST /auth/password` | YES |
| performPasswordReset | POST | `/auth/password/reset` | `POST /auth/password/reset` | YES |

### Account

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| getApiKeys | GET | `/api/client/account/api-keys` | `GET /api/client/account/api-keys` | YES |
| createApiKey | POST | `/api/client/account/api-keys` | `POST /api/client/account/api-keys` | YES |
| deleteApiKey | DELETE | `/api/client/account/api-keys/:id` | `DELETE /api/client/account/api-keys/:identifier` | YES |
| getSSHKeys | GET | `/api/client/account/ssh-keys` | `GET /api/client/account/ssh-keys` | YES |
| createSSHKey | POST | `/api/client/account/ssh-keys` | `POST /api/client/account/ssh-keys` | YES |
| deleteSSHKey | POST | `/api/client/account/ssh-keys/remove` | `POST /api/client/account/ssh-keys/remove` | YES |
| updateEmail | PUT | `/api/client/account/email` | `PUT /api/client/account/email` | YES |
| updatePassword | PUT | `/api/client/account/password` | `PUT /api/client/account/password` | YES |
| getTwoFactorTokenData | GET | `/api/client/account/two-factor` | `GET /api/client/account/two-factor` | YES |
| enableTwoFactor | POST | `/api/client/account/two-factor` | `POST /api/client/account/two-factor` | YES |
| disableTwoFactor | POST | `/api/client/account/two-factor/disable` | `POST /api/client/account/two-factor/disable` | YES |
| getAccountActivity | GET | `/api/client/account/activity` | `GET /api/client/account/activity` | YES |

### Client Root

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| getServers | GET | `/api/client` | `GET /api/client/` | YES |
| getSystemPermissions | GET | `/api/client/permissions` | `GET /api/client/permissions` | YES |
| getServer (initial) | GET | `/api/client/servers/:uuid` | `GET /api/client/servers/:server` | YES |
| getServer (daemon) | GET | `/api/client/servers/:daemonType/:uuid` | Wings: `GET /:server`, Elytra: `GET /` | YES |

### Server - Backups (daemon-routed)

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| createServerBackup | POST | `/:daemonType/:uuid/backups` | Wings: `POST /:server/backups`, Elytra: `POST /backups` | YES |
| deleteServerBackup | DELETE | `/:uuid/backups/:backup` | Wings: `DELETE /:server/backups/:backup`, Elytra: `DELETE /backups/:backup` | YES |
| deleteAllServerBackups | DELETE | `/:daemonType/:uuid/backups/delete-all` | Elytra: `DELETE /backups/delete-all` | PARTIAL - Elytra only |
| getServerBackupDownloadUrl | GET | `/:daemonType/:uuid/backups/:backup/download` | Wings: `GET /:server/backups/:backup/download`, Elytra: `GET /backups/:backup/download` | YES |
| renameServerBackup | POST | `/:daemonType/:uuid/backups/:backup/rename` | Elytra: `POST /backups/:backup/rename` | PARTIAL - Elytra only |
| getBackupStatus | GET | `/:daemonType/:uuid/backups/:backup/status` | Elytra: `GET /backups/:backup` (via showBackup) | GAP - No dedicated `/status` route |
| retryBackup | POST | `/:daemonType/:uuid/backups/:backup/retry` | No route | GAP |
| restoreServerBackup | POST | `/:daemonType/:uuid/backups/:backup/restore` | Wings: `POST /:server/backups/:backup/restore`, Elytra: `POST /backups/:backup/restore` | YES |

### Server - Databases (daemon-routed)

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| getServerDatabases | GET | `/:daemonType/:uuid/databases` | Wings + Elytra | YES |
| createServerDatabase | POST | `/:daemonType/:uuid/databases` | Wings + Elytra | YES |
| deleteServerDatabase | DELETE | `/:daemonType/:uuid/databases/:db` | Wings + Elytra | YES |
| rotateDatabasePassword | POST | `/api/client/:daemonType/servers/:uuid/databases/:db/rotate-password` | Wings + Elytra (at `/:server/databases/:database/rotate-password`) | PATH MISMATCH - Frontend uses `/api/client/:daemonType/servers/...` instead of `/api/client/servers/:daemonType/...` |

### Server - Files (daemon-routed)

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| loadDirectory | GET | `/:daemonType/:uuid/files/list` | Wings + Elytra | YES |
| getFileContents | GET | `/:daemonType/:uuid/files/contents` | Wings + Elytra | YES |
| saveFileContents | POST | `/:daemonType/:uuid/files/write` | Wings + Elytra | YES |
| deleteFiles | POST | `/:daemonType/:uuid/files/delete` | Wings + Elytra | YES |
| renameFiles | PUT | `/:daemonType/:uuid/files/rename` | Wings + Elytra | YES |
| compressFiles | POST | `/:daemonType/:uuid/files/compress` | Wings + Elytra | YES |
| decompressFiles | POST | `/:daemonType/:uuid/files/decompress` | Wings + Elytra | YES |
| copyFile | POST | `/:daemonType/:uuid/files/copy` | Wings + Elytra | YES |
| chmodFiles | POST | `/:daemonType/:uuid/files/chmod` | Wings + Elytra | YES |
| createDirectory | POST | `/:daemonType/:uuid/files/create-folder` | Wings + Elytra | YES |
| getFileDownloadUrl | GET | `/:daemonType/:uuid/files/download` | Wings + Elytra | YES |
| getFileUploadUrl | GET | `/:daemonType/:uuid/files/upload` | Wings + Elytra | YES |

### Server - Network (daemon-routed)

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| createServerAllocation | POST | `/:daemonType/:uuid/network/allocations` | Wings + Elytra | YES |
| deleteServerAllocation | DELETE | `/:daemonType/:uuid/network/allocations/:id` | Wings + Elytra | YES |
| setPrimaryServerAllocation | POST | `/:daemonType/:uuid/network/allocations/:id/primary` | Wings + Elytra | YES |
| setServerAllocationNotes | POST | `/:daemonType/:uuid/network/allocations/:id` | Wings + Elytra | YES |

### Server - Subdomains

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| getSubdomainInfo | GET | `/api/client/servers/:uuid/subdomain` | Elytra: `GET /subdomains` | PATH MISMATCH - Frontend uses `/subdomain` (singular, no daemon prefix); backend uses `/subdomains` (plural, under elytra) |
| setSubdomain | POST | `/api/client/servers/:uuid/subdomain` | Elytra: `POST /subdomains` | PATH MISMATCH |
| deleteSubdomain | DELETE | `/api/client/servers/:uuid/subdomain` | Elytra: `DELETE /subdomains` | PATH MISMATCH |
| checkSubdomainAvailability | POST | `/api/client/servers/:uuid/subdomain/check-availability` | Elytra: `POST /subdomains/check` | PATH MISMATCH |

### Server - Schedules (daemon-routed)

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| getServerSchedules | GET | `/:daemonType/:uuid/schedules` | Wings + Elytra | YES |
| getServerSchedule | GET | `/:daemonType/:uuid/schedules/:id` | Wings + Elytra | YES |
| createOrUpdateSchedule | POST | `/:daemonType/:uuid/schedules[/:id]` | Wings + Elytra | YES |
| createOrUpdateScheduleTask | POST | `/:daemonType/:uuid/schedules/:id/tasks[/:task]` | Wings + Elytra | YES |
| deleteSchedule | DELETE | `/:daemonType/:uuid/schedules/:id` | Wings + Elytra | YES |
| deleteScheduleTask | DELETE | `/api/client/:daemonType/servers/:uuid/schedules/:id/tasks/:task` | Wings + Elytra (at `/:server/schedules/:schedule/tasks/:task`) | PATH MISMATCH - Frontend uses `/api/client/:daemonType/servers/...` |
| triggerScheduleExecution | POST | `/:daemonType/:uuid/schedules/:id/execute` | Wings + Elytra | YES |

### Server - Users/Subusers (daemon-routed)

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| getServerSubusers | GET | `/:daemonType/:uuid/users` | Wings + Elytra (Wings only) | PARTIAL - No Elytra subuser routes |
| createOrUpdateSubuser | POST | `/:daemonType/:uuid/users[/:uuid]` | Wings | PARTIAL |
| deleteSubuser | DELETE | `/:daemonType/:uuid/users/:uuid` | Wings | PARTIAL |

### Server - Startup (daemon-routed)

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| getServerStartup | GET | `/:daemonType/:uuid/startup` | Wings + Elytra | YES |
| updateStartupVariable | PUT | `/:daemonType/:uuid/startup/variable` | Wings + Elytra | YES |
| updateStartupCommand | PUT | `/:daemonType/:uuid/startup/command` | Wings + Elytra | YES |
| processStartupCommand | POST | `/:daemonType/:uuid/startup/command/process` | Wings + Elytra | YES |
| resetStartupCommand | GET | `/:daemonType/:uuid/startup/command/default` | Wings + Elytra | YES |

### Server - Settings (daemon-routed)

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| renameServer | POST | `/:daemonType/:uuid/settings/rename` | Wings + Elytra | YES |
| reinstallServer | POST | `/:daemonType/:uuid/settings/reinstall` | Wings + Elytra | YES |
| revertDockerImage | POST | `/:daemonType/:uuid/settings/docker-image/revert` | Elytra only | PARTIAL |
| setSelectedDockerImage | PUT | `/:daemonType/:uuid/settings/docker-image` | Wings + Elytra | YES |
| previewEggChange | POST | `/:daemonType/:uuid/settings/egg/preview` | Wings + Elytra | YES |
| applyEggChange | POST | `/:daemonType/:uuid/settings/egg/apply` | Wings + Elytra | YES |

### Server - Operations (Elytra-specific)

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| getOperationStatus | GET | `/:daemonType/:uuid/operations/:id` | Elytra: `GET /operations/:operationId` | YES |
| getServerOperations | GET | `/:daemonType/:uuid/operations` | Elytra: `GET /operations` | YES |
| sendPowerAction | POST | `/:daemonType/:uuid/power` | Wings + Elytra | YES |

### Server - Websocket

| Frontend Call | Method | Path | Backend Route | Match |
|--------------|--------|------|---------------|-------|
| getWebsocketToken | GET | `/:daemonType/:uuid/websocket` | Wings + Elytra | YES |

## Known Gaps and Issues

### 1. Missing Backend Routes
- **`GET /backups/:backup/status`** - Frontend expects a dedicated status endpoint; backend has no separate status route (only the show endpoint)
- **`POST /backups/:backup/retry`** - Frontend expects a retry endpoint; no backend route exists

### 2. Path Mismatches
- **`rotateDatabasePassword`** - Frontend calls `/api/client/:daemonType/servers/:uuid/...` (daemon type before `servers`); backend mounts at `/api/client/servers/:daemonType/:server/...` (daemon type after `servers`)
- **`deleteScheduleTask`** - Same path ordering issue as above
- **Subdomain routes** - Frontend calls `/api/client/servers/:uuid/subdomain` (singular, no daemon prefix); backend mounts at `/api/client/servers/elytra/:server/subdomains` (plural, Elytra-scoped)

### 3. Partial Coverage
- **`deleteAllServerBackups`** - Only available on Elytra, no Wings equivalent
- **`renameServerBackup`** - Only available on Elytra, no Wings equivalent
- **`revertDockerImage`** - Only available on Elytra, no Wings equivalent
- **Subuser management** - Only available on Wings; Elytra has no subuser routes (frontend calls with daemon type prefix will 404 for Elytra)

### 4. Type Safety
- 71 remaining `any` annotations across 32 files (all in hand-written code, not generated)
- These are functional but reduce type safety for Prisma query results with nested includes

## Files Modified During QA

### Express v5 Param Casting (String())
- `server/src/controllers/client/servers/elytra/backupsController.ts`
- `server/src/controllers/client/servers/elytra/databaseController.ts`
- `server/src/controllers/client/servers/elytra/networkController.ts`
- `server/src/controllers/client/servers/elytra/scheduleController.ts`
- `server/src/controllers/client/servers/elytra/scheduleTaskController.ts`
- `server/src/controllers/client/servers/subuserController.ts`
- `server/src/controllers/client/servers/wings/fileController.ts`
- `server/src/controllers/client/servers/wings/backupController.ts`
- `server/src/controllers/client/servers/wings/scheduleController.ts`
- `server/src/controllers/client/servers/wings/scheduleTaskController.ts`
- `server/src/controllers/client/servers/wings/databaseController.ts`
- `server/src/controllers/remote/rusticConfigController.ts`

### Prisma Relation Name Fixes
- `server/src/controllers/remote/transferController.ts` - `transfer` to `transfers`
- `server/src/controllers/remote/serverDetailsController.ts` - `variables` to `serverVariables`
- `server/src/controllers/remote/sftpAuthenticationController.ts` - `userSshKey` to `userSSHKey`

### Missing Required Fields
- `server/src/controllers/client/servers/elytra/subdomainController.ts` - Added `recordType`, `dnsRecords`

### Logic Fixes
- `server/src/controllers/client/servers/wings/startupController.ts` - Replaced invalid `upsert` with `findFirst`+`update`/`create`
- `server/src/controllers/client/servers/elytra/backupsController.ts` - `number + bigint` fix with `Number()`

### Complete Rewrites (multiple fix categories)
- `server/src/controllers/remote/transferController.ts`
- `server/src/controllers/remote/serverDetailsController.ts`
- `server/src/controllers/remote/backupStatusController.ts`
- `server/src/controllers/remote/installController.ts`
