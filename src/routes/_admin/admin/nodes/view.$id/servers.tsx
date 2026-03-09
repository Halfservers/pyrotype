import { createFileRoute } from '@tanstack/react-router'
import { useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getNodeServers,
  type AdminServer, type PaginatedResponse,
} from '@/lib/api/admin'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { NodeContext } from '../view.$id'

export const Route = createFileRoute('/_admin/admin/nodes/view/$id/servers' as any)({
  component: ServersTab,
})

function ServersTab() {
  const { node } = useContext(NodeContext)
  const nodeId = node.id
  const [data, setData] = useState<PaginatedResponse<AdminServer> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getNodeServers(nodeId, page).then(setData).catch(() => toast.error('Failed to load servers')).finally(() => setLoading(false))
  }, [nodeId, page])

  const servers = data?.data.map((d) => d.attributes) ?? []
  const pagination = data?.meta.pagination

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Servers on this Node</h2>
      {loading ? <p className="text-zinc-400">Loading...</p> : (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>Server Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Nest</TableHead>
                <TableHead>Egg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-zinc-400">No servers on this node</TableCell></TableRow>
              ) : servers.map((s) => (
                <TableRow key={s.id} className="border-white/[0.08]">
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.user}</TableCell>
                  <TableCell>{s.nest}</TableCell>
                  <TableCell>{s.egg}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-zinc-400">Page {pagination.current_page} of {pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
