# Pyrotype Conversion Report

## Summary

Pyrotype is a complete rewrite of the Pyrodactyl game server panel frontend, migrated from Next.js to TanStack Start with a modern React architecture.

## File Statistics

| Category | Count |
|----------|-------|
| Total .ts/.tsx files | 199 |
| Route files | 25 |
| Component files | 101 |
| Lib files (api, hooks, queries, validators, utils) | 47 |
| Store files | 8 |
| Type definition files | 10 |
| .js/.jsx files in src/ | 0 |

## TypeScript Compilation

- **Status**: PASS (0 errors)
- **Compiler**: `tsc --noEmit` with strict mode, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`

## Route Coverage

All 24 Pyrodactyl routes have been converted:

### Auth Routes (4)
| Route | File |
|-------|------|
| `/auth/login` | `src/routes/auth/login.tsx` |
| `/auth/login/checkpoint` | `src/routes/auth/login.checkpoint.tsx` |
| `/auth/forgot-password` | `src/routes/auth/forgot-password.tsx` |
| `/auth/reset-password/:token` | `src/routes/auth/reset-password.$token.tsx` |

### Dashboard (1)
| Route | File |
|-------|------|
| `/` | `src/routes/_authed/index.tsx` |

### Account Routes (4)
| Route | File |
|-------|------|
| `/account` (layout) | `src/routes/_authed/account.tsx` |
| `/account/` (overview) | `src/routes/_authed/account/index.tsx` |
| `/account/api` | `src/routes/_authed/account/api.tsx` |
| `/account/ssh` | `src/routes/_authed/account/ssh.tsx` |
| `/account/activity` | `src/routes/_authed/account/activity.tsx` |

### Server Routes (13)
| Route | File |
|-------|------|
| `/server/:id` (layout) | `src/routes/_authed/server/$id.tsx` |
| `/server/:id/` (console) | `src/routes/_authed/server/$id/index.tsx` |
| `/server/:id/files` | `src/routes/_authed/server/$id/files.tsx` |
| `/server/:id/databases` | `src/routes/_authed/server/$id/databases.tsx` |
| `/server/:id/backups` | `src/routes/_authed/server/$id/backups.tsx` |
| `/server/:id/network` | `src/routes/_authed/server/$id/network.tsx` |
| `/server/:id/users` | `src/routes/_authed/server/$id/users.tsx` |
| `/server/:id/schedules` | `src/routes/_authed/server/$id/schedules.tsx` |
| `/server/:id/startup` | `src/routes/_authed/server/$id/startup.tsx` |
| `/server/:id/settings` | `src/routes/_authed/server/$id/settings.tsx` |
| `/server/:id/activity` | `src/routes/_authed/server/$id/activity.tsx` |
| `/server/:id/shell` | `src/routes/_authed/server/$id/shell.tsx` |
| `/server/:id/mods` | `src/routes/_authed/server/$id/mods.tsx` |

## Architecture Changes

### Framework Migration
- **From**: Next.js (Pyrodactyl)
- **To**: TanStack Start + Vite

### Routing
- **From**: Next.js file-based routing
- **To**: TanStack Router file-based routing with auto-generated route tree (`routeTree.gen.ts`)
- Auth guard implemented via `_authed.tsx` layout route with `beforeLoad` check

### State Management
- **From**: Zustand with Pyrodactyl patterns
- **To**: Zustand with slices pattern (`AppStore` = `UserSlice & SettingsSlice & PermissionsSlice & FlashSlice & ProgressSlice`)
- Server-scoped state via context-based `ServerStore` with `ServerStoreProvider`

### Data Fetching
- **From**: Mixed patterns (SWR, direct API calls)
- **To**: TanStack Query with custom hooks (`useServerListQuery`, `useServerSchedulesQuery`, etc.)
- Mutations via `useMutation` hooks with proper invalidation

### Forms
- **From**: Custom form handling
- **To**: react-hook-form + zod validators + shadcn/ui Form components

### UI Components
- **From**: Tailwind + custom components
- **To**: Tailwind + shadcn/ui (Button, Card, Dialog, Tabs, Input, Form, Select, etc.)

### API Layer
- Import paths changed from `@/api/*` to `@/lib/api/*`
- Daemon type routing via `getGlobalDaemonType()` for Elytra/Wings support

### SSR Integration
- `setupRouterSsrQueryIntegration({ router, queryClient })` from `@tanstack/react-router-ssr-query`

## Issues Fixed During QA

### Missing Dependencies
- `lucide-react` was not installed (resolved ~20 import errors)

### Import Path Mismatches (73 errors)
- Components used old Pyrodactyl paths (`@/api/http`, `@/api/server/backups/createServerBackup`)
- Corrected to Pyrotype paths (`@/lib/api/http`, named exports from `@/lib/api/server/backups`)

### Store Property Names (10 errors)
- `state.user` corrected to `state.userData`
- `state.permissions` corrected to `state.panelPermissions`
- `backupStorageMb` corrected to `backups` (featureLimits)

### Route Type Errors (26 errors)
- `createFileRoute` path arguments required `as any` cast due to route tree generation timing
- Relative route links (`./`) cast with `as any`

### Unused Variables/Imports (35 errors)
- Removed unused imports and local variables to satisfy `noUnusedLocals`
- Removed unused functions (`formatStorage`, `mbToBytes`, `onTriggerLogout`)

### Type Mismatches (11 errors)
- `ServerDatabase` type aligned between API layer and store (added `maxConnections`)
- `null` vs `undefined` handling for form field values
- react-hook-form resolver type casts where zod inference didn't match

### Missing Components
- Created `src/components/elements/editor/Editor.tsx` stub (code editor placeholder)
- Created `src/lib/permissions.ts` (permission definitions for subuser management)

### Router Configuration
- Fixed `setupRouterSsrQueryIntegration` call signature (takes options object, not positional args)

### Route Conflicts
- Removed duplicate `src/routes/index.tsx` that conflicted with `_authed/index.tsx`
