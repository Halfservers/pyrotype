import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { createContext, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type AdminServer, getServer } from '@/lib/api/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const ServerContext = createContext<{
  server: AdminServer
  reloadServer: () => void
}>({} as any)

export const Route = createFileRoute('/_admin/admin/servers/view/$id' as any)({
  component: ServerViewLayout,
})

function ServerViewLayout() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [server, setServer] = useState<AdminServer | null>(null)
  const [loading, setLoading] = useState(true)

  const loadServer = useCallback(() => {
    setLoading(true)
    getServer(Number(id))
      .then((r) => setServer(r.attributes))
      .catch(() => toast.error('Failed to load server'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadServer() }, [loadServer])

  if (loading || !server) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-zinc-400">Loading server...</p>
      </div>
    )
  }

  const isInstalled = !!server.container?.installed_at

  const statusBadge = () => {
    if (server.suspended) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Suspended</Badge>
    }
    if (server.status === 'running') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Running</Badge>
    }
    return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">{server.status ?? 'Unknown'}</Badge>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/admin/servers' })}>&larr; Back</Button>
        <h1 className="text-2xl font-bold">{server.name}</h1>
        <Badge variant="outline" className="ml-1 font-mono text-xs">{server.uuid.slice(0, 8)}</Badge>
        {statusBadge()}
      </div>

      <nav className="flex gap-1 border-b border-white/[0.08] mb-6">
        <Link
          to="/admin/servers/view/$id"
          params={{ id }}
          activeOptions={{ exact: true }}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-white border-b-2 border-transparent"
          activeProps={{ className: 'px-4 py-2 text-sm text-white border-b-2 border-white' }}
        >
          About
        </Link>
        {isInstalled && (
          <Link
            to="/admin/servers/view/$id/details"
            params={{ id }}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white border-b-2 border-transparent"
            activeProps={{ className: 'px-4 py-2 text-sm text-white border-b-2 border-white' }}
          >
            Details
          </Link>
        )}
        {isInstalled && (
          <Link
            to="/admin/servers/view/$id/build"
            params={{ id }}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white border-b-2 border-transparent"
            activeProps={{ className: 'px-4 py-2 text-sm text-white border-b-2 border-white' }}
          >
            Build Configuration
          </Link>
        )}
        {isInstalled && (
          <Link
            to="/admin/servers/view/$id/startup"
            params={{ id }}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white border-b-2 border-transparent"
            activeProps={{ className: 'px-4 py-2 text-sm text-white border-b-2 border-white' }}
          >
            Startup
          </Link>
        )}
        {isInstalled && (
          <Link
            to="/admin/servers/view/$id/database"
            params={{ id }}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white border-b-2 border-transparent"
            activeProps={{ className: 'px-4 py-2 text-sm text-white border-b-2 border-white' }}
          >
            Database
          </Link>
        )}
        {isInstalled && (
          <Link
            to="/admin/servers/view/$id/mounts"
            params={{ id }}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white border-b-2 border-transparent"
            activeProps={{ className: 'px-4 py-2 text-sm text-white border-b-2 border-white' }}
          >
            Mounts
          </Link>
        )}
        <Link
          to="/admin/servers/view/$id/manage"
          params={{ id }}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-white border-b-2 border-transparent"
          activeProps={{ className: 'px-4 py-2 text-sm text-white border-b-2 border-white' }}
        >
          Manage
        </Link>
        <Link
          to="/admin/servers/view/$id/delete"
          params={{ id }}
          className="px-4 py-2 text-sm text-red-400/60 hover:text-red-400 border-b-2 border-transparent"
          activeProps={{ className: 'px-4 py-2 text-sm text-red-400 border-b-2 border-red-400' }}
        >
          Delete
        </Link>
      </nav>

      <ServerContext.Provider value={{ server, reloadServer: loadServer }}>
        <Outlet />
      </ServerContext.Provider>
    </div>
  )
}
