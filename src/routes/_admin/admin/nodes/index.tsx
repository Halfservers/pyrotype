import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getNodes, getNodeSystemInfo,
  type AdminNode, type PaginatedResponse,
} from '@/lib/api/admin'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_admin/admin/nodes/' as any)({
  component: NodeListPage,
})

function formatMB(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`
}

function StatusDot({ nodeId }: { nodeId: number }) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    getNodeSystemInfo(nodeId)
      .then((data) => setStatus(data && !('error' in data) ? 'online' : 'offline'))
      .catch(() => setStatus('offline'))
  }, [nodeId])

  const colors = {
    checking: 'bg-yellow-400 animate-pulse',
    online: 'bg-green-400',
    offline: 'bg-red-400',
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className={`text-xs ${status === 'online' ? 'text-green-400' : status === 'offline' ? 'text-red-400' : 'text-yellow-400'}`}>
        {status === 'checking' ? '...' : status === 'online' ? 'Online' : 'Offline'}
      </span>
    </span>
  )
}

function NodeListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<PaginatedResponse<AdminNode> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getNodes(page).then(setData).catch(() => toast.error('Failed to load nodes')).finally(() => setLoading(false))
  }, [page])

  const nodes = data?.data.map((d) => d.attributes) ?? []
  const pagination = data?.meta.pagination

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nodes</h1>
        <Button onClick={() => navigate({ to: '/admin/nodes/new' })}>Create Node</Button>
      </div>
      {loading ? <p className="text-zinc-400">Loading...</p> : nodes.length === 0 ? <p className="text-zinc-400">No nodes found.</p> : (
        <>
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.08]">
                  <TableHead className="w-16">Status</TableHead>
                  <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>FQDN</TableHead>
                  <TableHead>Memory</TableHead><TableHead>Disk</TableHead>
                  <TableHead>Daemon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node) => (
                  <TableRow key={node.id} className="border-white/[0.08] cursor-pointer hover:bg-white/[0.02]"
                    onClick={() => navigate({ to: '/admin/nodes/view/$id', params: { id: String(node.id) } })}>
                    <TableCell><StatusDot nodeId={node.id} /></TableCell>
                    <TableCell>{node.id}</TableCell>
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell className="text-zinc-400">{node.fqdn}</TableCell>
                    <TableCell>{formatMB(node.memory)}</TableCell>
                    <TableCell>{formatMB(node.disk)}</TableCell>
                    <TableCell className="capitalize text-zinc-400">{node.daemon_type || 'wings'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-zinc-400">Page {pagination.current_page} of {pagination.total_pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
