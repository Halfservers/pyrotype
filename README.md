# Pyrotype

A modern game server management panel built from the ground up as a clean-room rewrite of [Pyrodactyl](https://github.com/pyrodactyl-io/panel) (Pterodactyl fork).

Pyrotype replaces the original PHP/Laravel monolith with a standalone React frontend and Express API, delivering a leaner codebase (25% fewer lines, 23% fewer dependencies) with full TypeScript strict mode, modern tooling, and a polished UI powered by shadcn/ui.

## Tech Stack

### Frontend
- **Framework**: [TanStack Start](https://tanstack.com/start) + React 19 + Vite 7
- **Routing**: TanStack Router (file-based, fully type-safe)
- **State**: Zustand 5 (global) + React Context (per-server)
- **Forms**: React Hook Form + Zod validation
- **UI**: [shadcn/ui](https://ui.shadcn.com) (28 components) + Tailwind CSS 4
- **Terminal**: xterm.js 6 with fit, search, and web-links addons
- **Editor**: CodeMirror 6
- **Charts**: Chart.js + react-chartjs-2

### Backend
- **Runtime**: Node.js + Express 5
- **ORM**: Prisma 7 with SQLite (via `@prisma/adapter-better-sqlite3`)
- **Auth**: Express sessions + bcrypt + TOTP 2FA
- **Queue**: BullMQ + Redis (ioredis)
- **Tests**: Vitest 4 + Supertest (425 tests across 29 files)

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- Redis (for queue/session backend)

### Installation

```bash
git clone https://github.com/Halfservers/pyrotype.git
cd pyrotype
pnpm install

cd server
pnpm install
cp .env.example .env    # configure DATABASE_URL, SESSION_SECRET, etc.
npx prisma generate
npx prisma db push
```

### Development

```bash
# Terminal 1 - Backend (port 3001)
cd server
npx tsx watch src/index.ts

# Terminal 2 - Frontend (port 3007)
pnpm dev
```

Open [http://localhost:3007](http://localhost:3007) in your browser.

### Build

```bash
pnpm build
```

### Testing

```bash
cd server
npx vitest run
```

## Project Structure

```
pyrotype/
├── src/                          # Frontend source
│   ├── routes/                   # File-based routing (TanStack Router)
│   │   ├── __root.tsx            # Root layout
│   │   ├── _authed.tsx           # Auth guard + client sidebar
│   │   ├── _authed/
│   │   │   ├── index.tsx         # Dashboard (server list)
│   │   │   ├── account.tsx       # Account wrapper
│   │   │   ├── account/          # Profile, API keys, SSH keys, activity
│   │   │   └── server/$id.tsx    # Server layout + sidebar
│   │   ├── _admin.tsx            # Admin guard + admin sidebar
│   │   ├── _admin/admin/         # Admin pages (users, servers, nodes, locations)
│   │   └── auth/                 # Login, 2FA, password reset
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components (28)
│   │   ├── server/               # Server page components (~60 files)
│   │   ├── elements/             # Shared elements (spinner, editor, etc.)
│   │   └── layout/               # Layout helpers
│   ├── store/                    # Zustand store (5 slices)
│   ├── lib/
│   │   ├── api/                  # HTTP client + typed API functions
│   │   ├── hooks/                # Custom hooks
│   │   └── validators/           # Zod schemas
│   └── styles.css                # Tailwind config + brand tokens
├── server/                       # Backend source
│   ├── src/
│   │   ├── routes/               # Express route handlers
│   │   ├── middleware/            # Auth, validation, rate limiting, error handling
│   │   ├── services/             # Auth, Wings/Elytra daemon clients
│   │   ├── config/               # Database, Redis, logger, queue
│   │   ├── utils/                # Errors, fractal responses, pagination, crypto
│   │   └── constants/            # Permission definitions
│   ├── prisma/
│   │   └── schema.prisma         # 41 models
│   └── tests/                    # 425 tests (auth, client, admin, security, integration)
├── docs/                         # Project documentation
└── vite.config.ts                # Vite config with /api proxy
```

## Navigation

Pyrotype uses three independent [shadcn Sidebar](https://ui.shadcn.com/docs/components/sidebar) layouts:

**Client Sidebar** - Dashboard, account pages, and admin link (for root admins). Collapsible with icon-only mode and mobile drawer.

**Server Sidebar** - Per-server navigation with 11 pages: console, files, databases, backups, network, users, schedules, startup, settings, activity, and software.

**Admin Sidebar** - Separate admin section with its own layout and rose-colored accent theme. Manages users, servers, nodes, and locations. Requires root admin privileges.

## API

All backend routes are prefixed with `/api/`. The Vite dev server proxies `/api` requests to the Express backend at port 3001.

| Route Group | Description |
|---|---|
| `/api/auth/*` | Authentication (login, 2FA, password reset) |
| `/api/client/*` | Client API (servers, account, API keys, SSH keys, nests) |
| `/api/client/servers/elytra/:server/*` | Daemon server operations (console, files, power, backups) |
| `/api/application/*` | Admin API (CRUD for users, servers, nodes, locations, nests) |
| `/api/remote/*` | Daemon-to-panel communication |

All responses follow the Pterodactyl fractal format for API compatibility.

## Linting & Formatting

```bash
pnpm lint          # ESLint
pnpm format        # Prettier check
pnpm check         # Prettier write + ESLint fix
```

## Cloudflare Workers Edition

Want to run Pyrotype entirely on Cloudflare Workers with no VPS required? Check out the `cloudflare-workers` branch:

```bash
git clone -b cloudflare-workers https://github.com/Halfservers/pyrotype.git
```

That branch replaces the Node.js backend with a fully Cloudflare-native stack:
- **Hono v4** instead of Express
- **Cloudflare D1** instead of SQLite
- **Cloudflare KV** instead of Redis
- **Cloudflare Queues** instead of BullMQ
- **Durable Objects** for WebSocket console proxy
- **TanStack Form** instead of React Hook Form
- **Native fetch()** instead of axios

Everything runs in a single Cloudflare Worker — frontend SSR and backend API together.

## License

[Apache License 2.0](LICENSE)
