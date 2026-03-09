import { createFileRoute, Link } from '@tanstack/react-router'
import { LayoutList, LayoutGrid, Cpu, MemoryStick, HardDrive, Server, Activity, Power, PowerOff } from 'lucide-react'

import { useServerListQuery } from '@/lib/queries'
import { useAppStore } from '@/store'
import { usePersistedState } from '@/lib/hooks/usePersistedState'
import type { Server as ServerData } from '@/lib/api/server/get-server'
import { motion, AnimatePresence, staggerContainer, staggerItem } from '@/components/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

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

  const items = servers?.items ?? []
  const totalServers = items.length
  const activeCount = items.filter((s) => s.status === null).length
  const suspendedCount = items.filter((s) => s.status === 'suspended').length
  const allocations = items.reduce((sum, s) => sum + (s.allocations?.length ?? 0), 0)

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
              : `${totalServers} server${totalServers !== 1 ? 's' : ''}`}
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
          <ToggleGroup
            type="single"
            value={displayOption}
            onValueChange={(v) => v && setDisplayOption(v)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-1"
          >
            <ToggleGroupItem value="list" aria-label="List view" className="p-1.5 rounded-lg data-[state=on]:bg-white/10 data-[state=on]:text-white text-zinc-500 hover:text-zinc-300">
              <LayoutList className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="p-1.5 rounded-lg data-[state=on]:bg-white/10 data-[state=on]:text-white text-zinc-500 hover:text-zinc-300">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Stats Overview */}
      {!isLoading && items.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          <StatsCard icon={Server} label="Total Servers" value={totalServers} color="brand" />
          <StatsCard icon={Activity} label="Active" value={activeCount} color="emerald" />
          <StatsCard icon={PowerOff} label="Suspended" value={suspendedCount} color="zinc" />
          <StatsCard icon={Power} label="Allocations" value={allocations} color="purple" />
        </motion.div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState />
      ) : (
        <AnimatePresence mode="wait">
          {displayOption === 'grid' ? (
            <motion.div
              key="grid"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {items.map((server) => (
                <motion.div key={server.uuid} variants={staggerItem}>
                  <ServerCard server={server} layout="grid" />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="space-y-2"
            >
              {items.map((server) => (
                <motion.div key={server.uuid} variants={staggerItem}>
                  <ServerCard server={server} layout="list" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

const colorClasses = {
  brand: { bg: 'bg-brand/10', text: 'text-brand', glow: 'shadow-brand/10' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
  zinc: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', glow: 'shadow-zinc-500/10' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', glow: 'shadow-purple-500/10' },
} as const

function StatsCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color: keyof typeof colorClasses
}) {
  const c = colorClasses[color]
  return (
    <motion.div
      variants={staggerItem}
      className="glass glass-hover rounded-xl p-4 flex items-center gap-3"
    >
      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
        <Icon className={`w-4.5 h-4.5 ${c.text}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-brand/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl glass flex items-center justify-center">
          <Server className="w-7 h-7 text-brand" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-1">No servers yet</h3>
      <p className="text-sm text-zinc-500 max-w-sm text-center">
        There are no servers associated with your account.
      </p>
    </motion.div>
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

function ServerCard({ server, layout }: { server: ServerData; layout: 'list' | 'grid' }) {
  const defaultAllocation = server.allocations?.find((a) => a.isDefault)
  const address = defaultAllocation
    ? `${defaultAllocation.alias || defaultAllocation.ip}:${defaultAllocation.port}`
    : null

  if (layout === 'grid') {
    return (
      <Link
        to="/server/$id"
        params={{ id: server.id }}
        className="group block glass glass-hover rounded-2xl p-5 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_8px_32px_rgba(107,62,255,0.08)] transition-all duration-300"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="relative">
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
        </div>
      </Link>
    )
  }

  return (
    <Link
      to="/server/$id"
      params={{ id: server.id }}
      className="group relative flex items-center justify-between glass glass-hover rounded-xl px-5 py-4 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_8px_32px_rgba(107,62,255,0.08)] transition-all duration-300"
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="relative flex items-center gap-4">
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

      <div className="relative hidden sm:flex items-center gap-6">
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
