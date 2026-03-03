import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Terminal, FolderOpen, Database, Archive, Globe, Users,
  Calendar, Rocket, Settings, Activity, Package, ArrowLeft,
} from 'lucide-react'

import getServer from '@/lib/api/server/get-server'
import { httpErrorToHuman } from '@/lib/http'
import { ServerStoreProvider } from '@/store/ServerStoreProvider'
import { useServerStore } from '@/store/server'
import ConflictStateRenderer from '@/components/server/ConflictStateRenderer'
import TransferListener from '@/components/server/transfer/TransferListener'
import InstallListener from '@/components/server/InstallListener'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_authed/server/$id' as any)({
  component: ServerLayout,
})

const serverNavItems = [
  { label: 'Console', path: '', icon: Terminal, end: true },
  { label: 'Files', path: 'files', icon: FolderOpen },
  { label: 'Databases', path: 'databases', icon: Database },
  { label: 'Backups', path: 'backups', icon: Archive },
  { label: 'Network', path: 'network', icon: Globe },
  { label: 'Users', path: 'users', icon: Users },
  { label: 'Schedules', path: 'schedules', icon: Calendar },
  { label: 'Startup', path: 'startup', icon: Rocket },
  { label: 'Settings', path: 'settings', icon: Settings },
  { label: 'Activity', path: 'activity', icon: Activity },
  { label: 'Software', path: 'shell', icon: Package },
] as const

function ServerLayout() {
  return (
    <ServerStoreProvider>
      <ServerLayoutInner />
    </ServerStoreProvider>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  const styles: Record<string, string> = {
    running: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    starting: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    stopping: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    offline: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    suspended: 'bg-red-500/15 text-red-400 border-red-500/20',
    installing: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  }
  const style = styles[status ?? ''] ?? styles.offline
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

function ServerLayoutInner() {
  const { id } = Route.useParams()
  const location = useLocation()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const server = useServerStore((s) => s.server)
  const setServer = useServerStore((s) => s.setServer)
  const setPermissions = useServerStore((s) => s.setPermissions)
  const clearServerState = useServerStore((s) => s.clearServerState)

  useEffect(() => {
    setError('')
    setLoading(true)

    getServer(id)
      .then(([serverData, permissions]) => {
        setServer(serverData as any)
        setPermissions(permissions)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError(httpErrorToHuman(err))
        setLoading(false)
      })

    return () => {
      clearServerState()
    }
  }, [id])

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Terminal className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <Link to="/" className="text-sm text-brand hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (loading || !server) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <ServerSidebar id={id} server={server} pathname={location.pathname} />
      <SidebarInset className="bg-[#0a0a0a]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4 md:hidden">
          <SidebarTrigger className="text-zinc-400 hover:text-white" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-white/[0.06]" />
          <span className="text-sm font-medium text-zinc-300 truncate">{server.name}</span>
        </header>
        <TransferListener />
        <ConflictStateRenderer>
          <Outlet />
        </ConflictStateRenderer>
        <InstallListener />
      </SidebarInset>
    </SidebarProvider>
  )
}

function ServerSidebar({
  id,
  server,
  pathname,
}: {
  id: string
  server: import('@/store/server').Server
  pathname: string
}) {
  const basePath = `/server/${id}`

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-3">
        <SidebarMenuButton asChild tooltip="Back to servers" className="mb-2">
          <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white">
            <ArrowLeft className="size-4 shrink-0" />
            <span>Back to servers</span>
          </Link>
        </SidebarMenuButton>
        <div className="px-1 group-data-[collapsible=icon]:hidden">
          <p className="font-semibold text-white text-sm truncate">{server.name}</p>
          <div className="mt-1.5">
            <StatusBadge status={server.status} />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Server</SidebarGroupLabel>
          <SidebarMenu>
            {serverNavItems.map((item) => {
              const Icon = item.icon
              const fullPath = item.path ? `${basePath}/${item.path}` : basePath
              const isActive =
                'end' in item && item.end
                  ? pathname === fullPath || pathname === `${fullPath}/`
                  : pathname.startsWith(fullPath)

              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                    <Link to={fullPath as any}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="rounded-lg bg-white/[0.04] px-3 py-2 group-data-[collapsible=icon]:hidden">
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Server ID</p>
          <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">{id}</p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
