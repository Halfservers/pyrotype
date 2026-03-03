import { createFileRoute, Link } from '@tanstack/react-router'
import { LayoutList, LayoutGrid, Cpu, MemoryStick, HardDrive, Server } from 'lucide-react'

import { useServerListQuery } from '@/lib/queries'
import { useAppStore } from '@/store'
import { usePersistedState } from '@/lib/hooks/usePersistedState'

export const Route = createFileRoute('/_authed/' as any)({
  component: DashboardPage,
})

function DashboardPage() {
  const userData = useAppStore((s) => s.userData)
  const uuid = userData?.uuid ?? ''
  const rootAdmin = userData?.rootAdmin ?? false

  const page = 1
  const [serverViewMode, setServerViewMode] = usePersistedState<'owner' | 'admin-all' | 'all'>(
    `${uuid}:server_view_mode`,
    'owner',
  )
  const [displayOption, setDisplayOption] = usePersistedState(
    `${uuid}:dashboard_display_option`,
    'list',
  )

  const getApiType = (): string | undefined => {
    if (serverViewMode === 'owner') return 'owner'
    if (serverViewMode === 'admin-all') return 'admin-all'
    if (serverViewMode === 'all') return 'all'
    return undefined
  }

  const { data: servers, isLoading } = useServerListQuery({ page, type: getApiType() })

  const viewModes = [
    { value: 'owner' as const, label: 'Your Servers' },
    ...(rootAdmin ? [{ value: 'admin-all' as const, label: 'All Servers' }] : []),
    { value: 'all' as const, label: 'Accessible' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {serverViewMode === 'admin-all'
              ? 'All Servers'
              : serverViewMode === 'all'
                ? 'Accessible Servers'
                : 'Your Servers'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isLoading
              ? 'Loading...'
              : `${servers?.items.length ?? 0} server${(servers?.items.length ?? 0) !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
            {viewModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setServerViewMode(mode.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  serverViewMode === mode.value
                    ? 'bg-brand/15 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Layout toggle */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
            <button
              onClick={() => setDisplayOption('list')}
              className={`p-1.5 rounded-lg transition-all ${
                displayOption === 'list'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-label="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayOption('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                displayOption === 'grid'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        </div>
      ) : !servers?.items.length ? (
        <EmptyState />
      ) : displayOption === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.items.map((server) => (
            <ServerCard key={server.uuid} server={server} layout="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {servers.items.map((server) => (
            <ServerCard key={server.uuid} server={server} layout="list" />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        <Server className="w-7 h-7 text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-zinc-300 mb-1">No servers yet</h3>
      <p className="text-sm text-zinc-500 max-w-sm text-center">
        There are no servers associated with your account.
      </p>
    </div>
  )
}

function StatusDot({ status }: { status?: string | null }) {
  const colorMap: Record<string, string> = {
    running: 'bg-emerald-400',
    starting: 'bg-yellow-400',
    stopping: 'bg-yellow-400',
    offline: 'bg-zinc-500',
    suspended: 'bg-red-400',
    installing: 'bg-blue-400',
  }

  const color = colorMap[status ?? ''] ?? 'bg-zinc-600'
  const isActive = status === 'running'

  return (
    <span className="relative flex h-2.5 w-2.5">
      {isActive && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-40 animate-ping`}
        />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  )
}

function ServerCard({ server, layout }: { server: any; layout: 'list' | 'grid' }) {
  const defaultAllocation = server.allocations?.find((a: any) => a.isDefault)
  const address = defaultAllocation
    ? `${defaultAllocation.alias || defaultAllocation.ip}:${defaultAllocation.port}`
    : null

  if (layout === 'grid') {
    return (
      <Link
        to="/server/$id"
        params={{ id: server.id }}
        className="group block bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 hover:border-brand/30 hover:bg-white/[0.05] transition-all duration-300"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:border-brand/20 transition-colors">
              <Server className="w-4 h-4 text-zinc-400 group-hover:text-brand transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{server.name}</p>
              {address && <p className="text-xs text-zinc-500 font-mono">{address}</p>}
            </div>
          </div>
          <StatusDot status={server.status} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <ResourceStat icon={Cpu} label="CPU" value="--" />
          <ResourceStat icon={MemoryStick} label="RAM" value="--" />
          <ResourceStat icon={HardDrive} label="Disk" value="--" />
        </div>
      </Link>
    )
  }

  return (
    <Link
      to="/server/$id"
      params={{ id: server.id }}
      className="group flex items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 hover:border-brand/30 hover:bg-white/[0.05] transition-all duration-300"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:border-brand/20 transition-colors">
          <Server className="w-4 h-4 text-zinc-400 group-hover:text-brand transition-colors" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <p className="font-semibold text-white">{server.name}</p>
            <StatusDot status={server.status} />
          </div>
          {address && (
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{address}</p>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-6">
        <ResourceStat icon={Cpu} label="CPU" value="--" />
        <ResourceStat icon={MemoryStick} label="RAM" value="--" />
        <ResourceStat icon={HardDrive} label="Disk" value="--" />
      </div>
    </Link>
  )
}

function ResourceStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-zinc-600" />
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-medium text-zinc-300">{value}</span>
    </div>
  )
}
