import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Globe, Trash2, X } from 'lucide-react'
import {
  getNodes,
  getAllocations,
  createAllocations,
  deleteAllocation,
  removeAllocationBlock,
  type AdminNode,
  type AdminAllocation,
  type PaginatedResponse,
} from '@/lib/api/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { motion, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/allocations' as any)({
  component: AdminAllocationsPage,
})

function AdminAllocationsPage() {
  const [nodes, setNodes] = useState<AdminNode[]>([])
  const [selectedNode, setSelectedNode] = useState<number | null>(null)
  const [allocations, setAllocations] = useState<AdminAllocation[]>([])
  const [loadingNodes, setLoadingNodes] = useState(true)
  const [loadingAllocs, setLoadingAllocs] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginatedResponse<AdminAllocation>['meta']['pagination'] | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [ip, setIp] = useState('')
  const [ports, setPorts] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [removingBlock, setRemovingBlock] = useState<string | null>(null)

  useEffect(() => {
    getNodes(1)
      .then((res) => setNodes(res.data.map((d) => d.attributes)))
      .catch(() => toast.error('Failed to load nodes'))
      .finally(() => setLoadingNodes(false))
  }, [])

  const loadAllocations = (nodeId: number, p: number) => {
    setLoadingAllocs(true)
    getAllocations(nodeId, p)
      .then((res) => {
        setAllocations(res.data.map((d) => d.attributes))
        setPagination(res.meta.pagination)
      })
      .catch(() => toast.error('Failed to load allocations'))
      .finally(() => setLoadingAllocs(false))
  }

  const handleNodeChange = (val: string) => {
    const id = Number(val)
    setSelectedNode(id)
    setPage(1)
    loadAllocations(id, 1)
  }

  const handlePageChange = (p: number) => {
    setPage(p)
    if (selectedNode) loadAllocations(selectedNode, p)
  }

  const handleCreate = async () => {
    if (!selectedNode || !ip || !ports) return
    setSaving(true)
    try {
      const portList = ports.split(',').map((p) => p.trim()).filter(Boolean)
      await createAllocations(selectedNode, { ip, ports: portList })
      toast.success('Allocations created')
      setCreateOpen(false)
      setIp('')
      setPorts('')
      loadAllocations(selectedNode, page)
    } catch {
      toast.error('Failed to create allocations')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (alloc: AdminAllocation) => {
    if (!selectedNode) return
    setDeleting(alloc.id)
    try {
      await deleteAllocation(selectedNode, alloc.id)
      toast.success('Allocation deleted')
      loadAllocations(selectedNode, page)
    } catch {
      toast.error('Failed to delete. It may be assigned to a server.')
    } finally {
      setDeleting(null)
    }
  }

  const handleRemoveBlock = async (ip: string) => {
    if (!selectedNode) return
    setRemovingBlock(ip)
    try {
      const result = await removeAllocationBlock(selectedNode, ip) as { deleted: number }
      toast.success(`Removed ${result.deleted} unassigned allocation${result.deleted !== 1 ? 's' : ''} for ${ip}`)
      loadAllocations(selectedNode, page)
    } catch {
      toast.error('Failed to remove allocations for this IP')
    } finally {
      setRemovingBlock(null)
    }
  }

  // Compute unique IPs from the current page of allocations
  const uniqueIps = Array.from(new Set(allocations.map((a) => a.ip)))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Allocations</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage network port allocations per node.</p>
        </div>
        {selectedNode && (
          <Button onClick={() => { setIp(''); setPorts(''); setCreateOpen(true) }}>Add Allocation</Button>
        )}
      </div>

      {/* Node selector */}
      <div className="glass rounded-xl p-4 mb-6">
        <Label className="text-xs text-zinc-500 mb-1 block">Select Node</Label>
        {loadingNodes ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select value={selectedNode ? String(selectedNode) : ''} onValueChange={handleNodeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a node..." />
            </SelectTrigger>
            <SelectContent>
              {nodes.map((n) => (
                <SelectItem key={n.id} value={String(n.id)}>
                  {n.name} ({n.fqdn})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!selectedNode ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
            <Globe className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-zinc-500 text-sm">Select a node to view its allocations.</p>
        </div>
      ) : loadingAllocs ? (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>ID</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.08]">
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : allocations.length === 0 ? (
        <div className="text-zinc-400 py-12 text-center">No allocations for this node.</div>
      ) : (
        <>
          {uniqueIps.length > 0 && (
            <div className="glass rounded-xl p-4 mb-4">
              <p className="text-xs text-zinc-500 mb-2">Remove all unassigned allocations by IP block</p>
              <div className="flex flex-wrap gap-2">
                {uniqueIps.map((blockIp) => (
                  <Button
                    key={blockIp}
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10 font-mono text-xs"
                    disabled={removingBlock === blockIp}
                    onClick={() => handleRemoveBlock(blockIp)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    {blockIp}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.08] hover:bg-transparent">
                  <TableHead>ID</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
                {allocations.map((alloc, i) => (
                  <motion.tr
                    key={alloc.id}
                    variants={staggerItem}
                    custom={i}
                    className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors"
                  >
                    <TableCell className="text-zinc-400">{alloc.id}</TableCell>
                    <TableCell className="font-mono text-sm">{alloc.ip}</TableCell>
                    <TableCell className="font-mono text-sm">{alloc.port}</TableCell>
                    <TableCell className="text-zinc-400">{alloc.alias || '-'}</TableCell>
                    <TableCell>
                      {alloc.assigned ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-red-400 hover:text-red-300"
                        disabled={deleting === alloc.id || alloc.assigned}
                        onClick={() => handleDelete(alloc)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </motion.tbody>
            </Table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-zinc-400">
                Page {pagination.current_page} of {pagination.total_pages} ({pagination.total} allocations)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => handlePageChange(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allocation</DialogTitle>
            <DialogDescription>Create new port allocations for the selected node.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>IP Address</Label>
              <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="0.0.0.0" />
            </div>
            <div className="space-y-1">
              <Label>Ports</Label>
              <Input value={ports} onChange={(e) => setPorts(e.target.value)} placeholder="25565, 25566-25570" />
              <p className="text-xs text-zinc-500">Comma-separated. Supports ranges (e.g., 25565-25570).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !ip || !ports}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
