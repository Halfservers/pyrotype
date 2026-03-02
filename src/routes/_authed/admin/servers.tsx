import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  type AdminServer,
  type PaginatedResponse,
  getServers,
  suspendServer,
  unsuspendServer,
  reinstallServer,
  deleteServer,
} from '@/lib/api/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'

export const Route = createFileRoute('/_authed/admin/servers' as any)({
  component: AdminServersPage,
})

type ConfirmAction = {
  type: 'reinstall' | 'delete'
  server: AdminServer
  force?: boolean
}

function AdminServersPage() {
  const [data, setData] = useState<PaginatedResponse<AdminServer> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [forceDelete, setForceDelete] = useState(false)

  const fetchServers = (p: number) => {
    setLoading(true)
    getServers(p)
      .then(setData)
      .catch(() => toast.error('Failed to load servers'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchServers(page)
  }, [page])

  const handleSuspendToggle = async (server: AdminServer) => {
    setActionLoading(server.id)
    try {
      if (server.suspended) {
        await unsuspendServer(server.id)
        toast.success(`Server "${server.name}" unsuspended`)
      } else {
        await suspendServer(server.id)
        toast.success(`Server "${server.name}" suspended`)
      }
      fetchServers(page)
    } catch {
      toast.error(`Failed to ${server.suspended ? 'unsuspend' : 'suspend'} server`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirm) return
    setActionLoading(confirm.server.id)
    try {
      if (confirm.type === 'reinstall') {
        await reinstallServer(confirm.server.id)
        toast.success(`Server "${confirm.server.name}" reinstall started`)
      } else {
        await deleteServer(confirm.server.id, forceDelete)
        toast.success(`Server "${confirm.server.name}" deleted`)
      }
      fetchServers(page)
    } catch {
      toast.error(`Failed to ${confirm.type} server`)
    } finally {
      setActionLoading(null)
      setConfirm(null)
      setForceDelete(false)
    }
  }

  const pagination = data?.meta.pagination
  const servers = data?.data ?? []

  const statusBadge = (server: AdminServer) => {
    if (server.suspended) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Suspended</Badge>
    }
    if (server.status === 'running') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Running</Badge>
    }
    return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">{server.status ?? 'Unknown'}</Badge>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Servers</h1>

      {loading && !data ? (
        <div className="text-zinc-400 py-12 text-center">Loading servers...</div>
      ) : servers.length === 0 ? (
        <div className="text-zinc-400 py-12 text-center">No servers found.</div>
      ) : (
        <>
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.08] hover:bg-transparent">
                  <TableHead className="text-zinc-400">ID</TableHead>
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Owner</TableHead>
                  <TableHead className="text-zinc-400">Node</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Memory</TableHead>
                  <TableHead className="text-zinc-400">Disk</TableHead>
                  <TableHead className="text-zinc-400">CPU</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map(({ attributes: s }) => (
                  <TableRow key={s.id} className="border-white/[0.08]">
                    <TableCell className="font-mono text-zinc-300">{s.id}</TableCell>
                    <TableCell className="text-white font-medium">{s.name}</TableCell>
                    <TableCell className="text-zinc-300">{s.user}</TableCell>
                    <TableCell className="text-zinc-300">{s.node}</TableCell>
                    <TableCell>{statusBadge(s)}</TableCell>
                    <TableCell className="text-zinc-300">{s.limits.memory} MB</TableCell>
                    <TableCell className="text-zinc-300">{s.limits.disk} MB</TableCell>
                    <TableCell className="text-zinc-300">{s.limits.cpu}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={actionLoading === s.id}
                          onClick={() => handleSuspendToggle(s)}
                        >
                          {s.suspended ? 'Unsuspend' : 'Suspend'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={actionLoading === s.id}
                          onClick={() => setConfirm({ type: 'reinstall', server: s })}
                        >
                          Reinstall
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-red-400 hover:text-red-300"
                          disabled={actionLoading === s.id}
                          onClick={() => setConfirm({ type: 'delete', server: s })}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-zinc-400">
                Page {pagination.current_page} of {pagination.total_pages} ({pagination.total} servers)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page >= pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(open) => { if (!open) { setConfirm(null); setForceDelete(false) } }}>
        <AlertDialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === 'reinstall' ? 'Reinstall Server' : 'Delete Server'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === 'reinstall'
                ? `This will reinstall "${confirm.server.name}". All server data will be wiped. This action cannot be undone.`
                : `This will permanently delete "${confirm?.server.name}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm?.type === 'delete' && (
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
                className="rounded border-white/20"
              />
              Force delete (skip graceful shutdown)
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmAction}
            >
              {confirm?.type === 'reinstall' ? 'Reinstall' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
