import { createFileRoute } from '@tanstack/react-router'
import { useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getNodeSystemInfo, getNodeServers, deleteNode,
  type PaginatedResponse, type AdminServer,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { NodeContext } from '../view.$id'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin/admin/nodes/view/$id/' as any)({
  component: AboutTab,
})

function formatMB(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`
}

function ProgressBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  return (
    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

type ConnStatus = 'checking' | 'online' | 'offline'

function ConnectionBadge({ status }: { status: ConnStatus }) {
  if (status === 'checking') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        Checking...
      </span>
    )
  }
  if (status === 'online') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        Connected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
      <span className="w-2 h-2 rounded-full bg-red-400" />
      Connection Failed
    </span>
  )
}

function AboutTab() {
  const { node } = useContext(NodeContext)
  const navigate = useNavigate()
  const [sysInfo, setSysInfo] = useState<Record<string, unknown> | null>(null)
  const [connStatus, setConnStatus] = useState<ConnStatus>('checking')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [serverCount, setServerCount] = useState<number | null>(null)
  const [allocatedMem, setAllocatedMem] = useState(0)
  const [allocatedDisk, setAllocatedDisk] = useState(0)

  useEffect(() => {
    setConnStatus('checking')
    getNodeSystemInfo(node.id)
      .then((data) => {
        if (data && !('error' in data)) {
          setSysInfo(data)
          setConnStatus('online')
        } else {
          setConnStatus('offline')
        }
      })
      .catch(() => setConnStatus('offline'))

    // Fetch servers to get total count and allocated resources
    getNodeServers(node.id, 1)
      .then((r: PaginatedResponse<AdminServer>) => {
        setServerCount(r.meta.pagination.total)
        let mem = 0
        let disk = 0
        for (const s of r.data) {
          const attrs = (s as any).attributes ?? s
          mem += attrs.limits?.memory ?? attrs.memory ?? 0
          disk += attrs.limits?.disk ?? attrs.disk ?? 0
        }
        setAllocatedMem(mem)
        setAllocatedDisk(disk)
      })
      .catch(() => {})
  }, [node.id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteNode(node.id)
      toast.success('Node deleted')
      navigate({ to: '/admin/nodes' })
    } catch { toast.error('Failed to delete node') }
    finally { setDeleting(false) }
  }

  const totalDisk = node.disk * (1 + node.disk_overallocate / 100)
  const totalMem = node.memory * (1 + node.memory_overallocate / 100)

  const diskPctColor = totalDisk > 0 && (allocatedDisk / totalDisk) >= 0.7 ? 'bg-red-500' : 'bg-green-500'
  const memPctColor = totalMem > 0 && (allocatedMem / totalMem) >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connection Status</h2>
            <ConnectionBadge status={connStatus} />
          </div>
          {connStatus === 'offline' && (
            <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-4 space-y-2">
              <p className="text-sm text-red-300 font-medium">Unable to reach the daemon</p>
              <ul className="text-xs text-red-400/80 space-y-1 list-disc list-inside">
                <li>Verify Wings/Elytra is running on the node</li>
                <li>Check that <code className="px-1 py-0.5 bg-red-500/10 rounded">{node.fqdn}:{node.daemon_listen}</code> is reachable</li>
                <li>Confirm the daemon token matches (Configuration tab)</li>
                <li>Check firewall rules allow port {node.daemon_listen}</li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-red-500/20 text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  setConnStatus('checking')
                  getNodeSystemInfo(node.id)
                    .then((data) => {
                      if (data && !('error' in data)) {
                        setSysInfo(data)
                        setConnStatus('online')
                        toast.success('Connection restored')
                      } else {
                        setConnStatus('offline')
                      }
                    })
                    .catch(() => setConnStatus('offline'))
                }}
              >
                Retry Connection
              </Button>
            </div>
          )}
        </div>

        {/* Daemon Info */}
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Daemon Version</span>
              <span>{connStatus === 'checking' ? <span className="animate-pulse text-zinc-500">Loading...</span> : connStatus === 'online' ? (sysInfo?.version as string) || 'Unknown' : <span className="text-zinc-600">N/A</span>}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">System Information</span>
              <span>{connStatus === 'checking' ? <span className="animate-pulse text-zinc-500">Loading...</span> : connStatus === 'online' ? `${(sysInfo?.os as string) || 'Unknown'} ${(sysInfo?.architecture as string) || ''}` : <span className="text-zinc-600">N/A</span>}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">CPU Threads</span>
              <span>{connStatus === 'checking' ? <span className="animate-pulse text-zinc-500">Loading...</span> : connStatus === 'online' ? (sysInfo?.cpu_count as number) || 'Unknown' : <span className="text-zinc-600">N/A</span>}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Daemon Type</span>
              <span className="capitalize">{node.daemon_type || 'wings'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">FQDN</span>
              <span className="text-zinc-300">{node.scheme}://{node.fqdn}:{node.daemon_listen}</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border border-red-500/20 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
          <p className="text-sm text-zinc-400">Deleting this node will remove it permanently. This action cannot be undone.</p>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete Node</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">At-a-Glance</h2>
        <div className="border border-white/[0.08] rounded-xl p-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Disk Space Allocated</span>
            <span>{formatMB(allocatedDisk)} / {formatMB(totalDisk)}</span>
          </div>
          <ProgressBar used={allocatedDisk} total={totalDisk} color={diskPctColor} />
        </div>
        <div className="border border-white/[0.08] rounded-xl p-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Memory Allocated</span>
            <span>{formatMB(allocatedMem)} / {formatMB(totalMem)}</span>
          </div>
          <ProgressBar used={allocatedMem} total={totalMem} color={memPctColor} />
        </div>
        <div className="border border-white/[0.08] rounded-xl p-5">
          <div className="flex justify-between text-sm">
            <span>Total Servers</span>
            <span className="font-semibold">{serverCount ?? '...'}</span>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Node</DialogTitle>
            <DialogDescription>Are you sure you want to delete <strong>{node.name}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
