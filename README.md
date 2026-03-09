# Pyrotype

A modern game server management panel built as a clean-room rewrite of [Pyrodactyl](https://github.com/pyrodactyl-io/panel) (Pterodactyl fork). Runs entirely on Cloudflare Workers — no VPS required.

Pyrotype replaces the original PHP/Laravel monolith with a full-stack TypeScript application: React frontend with SSR and a Hono API backend, all deployed as a single Cloudflare Worker.

## Tech Stack

### Frontend
- **Framework**: [TanStack Start](https://tanstack.com/start) + React 19 + Vite 7
- **Routing**: TanStack Router (file-based, fully type-safe)
- **State**: Zustand 5 (global) + React Context (per-server)
- **Forms**: TanStack Form + Zod validation
- **UI**: [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS 4
- **Terminal**: xterm.js 6 with fit, search, and web-links addons
- **Editor**: CodeMirror 6
- **Charts**: Chart.js + react-chartjs-2

### Backend
- **Runtime**: Cloudflare Workers
- **API**: [Hono](https://hono.dev) v4
- **ORM**: Prisma 6 with D1 adapter
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Sessions**: Cloudflare KV
- **Queue**: Cloudflare Queues (background job processing)
- **WebSockets**: Durable Objects (server console proxy)
- **Auth**: bcrypt + TOTP 2FA
- **Tests**: Vitest (534 tests across 32 files)

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm 10+
- A [Cloudflare](https://dash.cloudflare.com) account

### Installation

```bash
git clone https://github.com/Halfservers/pyrotype.git
cd pyrotype
pnpm install

cd server
pnpm install
npx prisma generate
```

### Cloudflare Setup

```bash
# Create D1 database
wrangler d1 create pyrotype-db

# Create KV namespace for sessions
wrangler kv namespace create SESSION_KV
```

Copy the example config and fill in your IDs:

```bash
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml` with your `account_id`, `database_id`, and KV `id`.

Set your app secret:

```bash
wrangler secret put APP_KEY
```

### Database Migration

```bash
# Local development
pnpm db:migrate:local

# Remote (production)
pnpm db:migrate:remote
```

### Development

```bash
# Terminal 1 — Backend (Wrangler dev server)
cd server
pnpm dev

# Terminal 2 — Frontend (Vite dev server, port 3007)
pnpm dev
```

### Deploy

```bash
pnpm deploy
```

Or push to `main` — GitHub Actions handles CI and deployment automatically.

### Testing

```bash
cd server
pnpm test
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
│   │   ├── _admin/admin/         # Admin pages (users, servers, nodes, etc.)
│   │   └── auth/                 # Login, 2FA, password reset
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── server/               # Server page components
│   │   ├── elements/             # Shared elements (spinner, editor, etc.)
│   │   └── layout/               # Layout helpers
│   ├── store/                    # Zustand stores
│   ├── lib/
│   │   ├── api/                  # HTTP client + typed API functions
│   │   ├── hooks/                # Custom hooks
│   │   └── validators/           # Zod schemas
│   └── styles.css                # Tailwind config + brand tokens
├── server/                       # Backend source
│   ├── src/
│   │   ├── routes/               # Hono route handlers
│   │   ├── middleware/            # Auth, validation, rate limiting
│   │   ├── services/             # Backups, schedules, databases, DNS, notifications
│   │   ├── controllers/          # Admin, client, remote controllers
│   │   ├── config/               # Database, mail, daemon client
│   │   ├── utils/                # Errors, fractal responses, pagination, crypto
│   │   └── types/                # TypeScript interfaces (Env, SessionData, etc.)
│   ├── prisma/
│   │   └── schema.prisma         # 39 models
│   └── tests/                    # 534 tests (auth, client, admin, security, integration)
├── migrations/                   # D1 SQL migrations
├── wrangler.toml.example         # Cloudflare Worker config template
└── vite.config.ts                # Vite + Cloudflare plugin
```

## Navigation

Pyrotype uses three independent [shadcn Sidebar](https://ui.shadcn.com/docs/components/sidebar) layouts:

**Client Sidebar** — Dashboard, account pages, and admin link (for root admins). Collapsible with icon-only mode and mobile drawer.

**Server Sidebar** — Per-server navigation: console, files, databases, backups, network, users, schedules, startup, settings, activity, and software.

**Admin Sidebar** — Separate admin section with its own layout. Manages users, servers, nodes, locations, nests, eggs, databases, and domains.

## API

All backend routes are under `/api/`. Frontend SSR and API run in the same Worker.

| Route Group | Description |
|---|---|
| `/api/auth/*` | Authentication (login, 2FA, password reset) |
| `/api/client/*` | Client API (servers, account, API keys, SSH keys, nests) |
| `/api/client/servers/:server/*` | Server operations (console, files, power, backups) |
| `/api/application/*` | Admin API (CRUD for users, servers, nodes, locations, nests) |
| `/api/remote/*` | Daemon-to-panel communication |

All responses follow the Pterodactyl fractal format for API compatibility.

## Linting & Formatting

```bash
pnpm lint          # ESLint
pnpm format        # Prettier check
pnpm check         # Prettier write + ESLint fix
```

## License

[Apache License 2.0](LICENSE)
