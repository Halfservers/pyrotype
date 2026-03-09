import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { createContext, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getNode, type AdminNode } from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface NodeContextValue {
  node: AdminNode
  reloadNode: () => void
}

export const NodeContext = createContext<NodeContextValue>(null as any)

export const Route = createFileRoute('/_admin/admin/nodes/view/$id' as any)({
  component: NodeDetailLayout,
})

function NodeDetailLayout() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [node, setNode] = useState<AdminNode | null>(null)
  const [loading, setLoading] = useState(true)

  const loadNode = useCallback(() => {
    setLoading(true)
    getNode(Number(id))
      .then((r) => setNode(r.attributes))
      .catch(() => toast.error('Failed to load node'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadNode() }, [loadNode])

  if (loading || !node) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-zinc-400">Loading node...</p>
      </div>
    )
  }

  const tabLinkBase = 'px-4 py-2 text-sm text-zinc-400 hover:text-white border-b-2 border-transparent transition-colors'
  const tabLinkActive = 'px-4 py-2 text-sm text-white border-b-2 border-white transition-colors'

  return (
    <NodeContext.Provider value={{ node, reloadNode: loadNode }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/admin/nodes' })}>&larr; Back</Button>
          <h1 className="text-2xl font-bold">{node.name}</h1>
          <Badge variant="outline" className="ml-2">{node.fqdn}</Badge>
        </div>
        <nav className="flex gap-1 border-b border-white/[0.08] mb-6">
          <Link
            to="/admin/nodes/view/$id"
            params={{ id }}
            activeOptions={{ exact: true }}
            className={tabLinkBase}
            activeProps={{ className: tabLinkActive }}
          >
            About
          </Link>
          <Link
            to="/admin/nodes/view/$id/settings"
            params={{ id }}
            className={tabLinkBase}
            activeProps={{ className: tabLinkActive }}
          >
            Settings
          </Link>
          <Link
            to="/admin/nodes/view/$id/configuration"
            params={{ id }}
            className={tabLinkBase}
            activeProps={{ className: tabLinkActive }}
          >
            Configuration
          </Link>
          <Link
            to="/admin/nodes/view/$id/allocation"
            params={{ id }}
            className={tabLinkBase}
            activeProps={{ className: tabLinkActive }}
          >
            Allocation
          </Link>
          <Link
            to="/admin/nodes/view/$id/servers"
            params={{ id }}
            className={tabLinkBase}
            activeProps={{ className: tabLinkActive }}
          >
            Servers
          </Link>
        </nav>
        <Outlet />
      </div>
    </NodeContext.Provider>
  )
}
