# PYROTYPE — SPARC Orchestration Plan

Saved for reference. See the full prompt in the conversation history.

## Wave Execution Order

| Wave | Agents | Mode | Description |
|------|--------|------|-------------|
| 0A | migrator | Sequential | Backend: Express → Hono + D1 + KV + Queues |
| 0B | migrator | Sequential (after 0A) | Frontend: axios → native fetch() |
| 0C | migrator | Sequential (after 0B) | Frontend: RHF → TanStack Form v1 |
| 1A | analyst | Parallel | TypeScript model definitions |
| 1B | analyst | Parallel | TanStack Query key factory + hooks |
| 2A | developer | Parallel | Console (xterm.js + WebSocket) |
| 2B | developer | Parallel | File manager |
| 2C | developer | Parallel | Backups (Wings vs Elytra) |
| 2D | developer | Parallel | Databases, Network, Startup |
| 2E | developer | Parallel | Schedules, Users, Settings, Activity |
| 3A | developer | Parallel | Game server features (8 components) |
| 3B | developer | Parallel | MCLogs + Operation progress |
| 3C | developer | Parallel | Transfer/Install listeners + Uptime |
| 3D | developer | Parallel | i18n + Command palette |
| 3E | developer | Parallel | Modrinth + Shell |
| 4A | reviewer | Sequential | TypeScript strict audit |
| 4B | fixer | Sequential | Backend bug fixes |
| 4C | devops | Sequential | Unified CF Workers deployment |

## Target Stack
- Hono v4 (replaces Express 5)
- Cloudflare D1 (replaces SQLite/better-sqlite3)
- Cloudflare KV (replaces Redis/ioredis)
- Cloudflare Queues (replaces BullMQ)
- Durable Objects (WebSocket console proxy)
- Native fetch() (replaces axios)
- TanStack Form v1 (replaces React Hook Form)
