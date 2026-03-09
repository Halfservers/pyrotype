import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Plus, Pencil, Trash2, Link2Off } from 'lucide-react'
import {
  getMounts,
  getMount,
  createMount,
  updateMount,
  deleteMount,
  attachMountEggs,
  attachMountNodes,
  detachMountEgg,
  detachMountNode,
  type AdminMount,
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { motion, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/mounts' as any)({
  component: AdminMounts,
})

// ── Form types ────────────────────────────────────────────────────

interface MountFormData {
  name: string
  description: string
  source: string
  target: string
  read_only: boolean
  user_mountable: boolean
}

const emptyMountForm: MountFormData = {
  name: '',
  description: '',
  source: '',
  target: '',
  read_only: false,
  user_mountable: false,
}

// ── Main page ─────────────────────────────────────────────────────

function AdminMounts() {
  const [mounts, setMounts] = useState<PaginatedResponse<AdminMount> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Expand state
  const [expandedMount, setExpandedMount] = useState<number | null>(null)
  const [mountDetails, setMountDetails] = useState<Record<number, AdminMount>>({})
  const [loadingDetails, setLoadingDetails] = useState<number | null>(null)

  // Mount CRUD state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<MountFormData>(emptyMountForm)
  const [editingMount, setEditingMount] = useState<AdminMount | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminMount | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Attach dialog state
  const [attachEggsTarget, setAttachEggsTarget] = useState<number | null>(null)
  const [eggIdsInput, setEggIdsInput] = useState('')
  const [attachingEggs, setAttachingEggs] = useState(false)
  const [attachNodesTarget, setAttachNodesTarget] = useState<number | null>(null)
  const [nodeIdsInput, setNodeIdsInput] = useState('')
  const [attachingNodes, setAttachingNodes] = useState(false)

  const fetchMounts = (p = page) => {
    setLoading(true)
    getMounts(p)
      .then(setMounts)
      .catch(() => toast.error('Failed to load mounts'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMounts(page)
  }, [page])

  const toggleMount = async (id: number) => {
    if (expandedMount === id) {
      setExpandedMount(null)
      return
    }
    setExpandedMount(id)
    if (!mountDetails[id]) {
      await loadMountDetails(id)
    }
  }

  const loadMountDetails = async (id: number) => {
    setLoadingDetails(id)
    try {
      const res = await getMount(id)
      setMountDetails((prev) => ({ ...prev, [id]: res.attributes }))
    } catch {
      toast.error('Failed to load mount details')
    } finally {
      setLoadingDetails(null)
    }
  }

  // ── Mount CRUD handlers ───────────────────────────────────────

  const openCreate = () => {
    setForm(emptyMountForm)
    setEditingMount(null)
    setDialogOpen(true)
  }

  const openEdit = (mount: AdminMount, e: React.MouseEvent) => {
    e.stopPropagation()
    setForm({
      name: mount.name,
      description: mount.description || '',
      source: mount.source,
      target: mount.target,
      read_only: mount.read_only,
      user_mountable: mount.user_mountable,
    })
    setEditingMount(mount)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload: Partial<AdminMount> = {
        name: form.name,
        description: form.description || undefined,
        source: form.source,
        target: form.target,
        read_only: form.read_only,
        user_mountable: form.user_mountable,
      }
      if (editingMount) {
        await updateMount(editingMount.id, payload)
        toast.success('Mount updated')
      } else {
        await createMount(payload)
        toast.success('Mount created')
      }
      setDialogOpen(false)
      fetchMounts()
    } catch {
      toast.error(editingMount ? 'Failed to update mount' : 'Failed to create mount')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = (mount: AdminMount, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteTarget(mount)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteMount(deleteTarget.id)
      toast.success('Mount deleted')
      setDeleteTarget(null)
      if (expandedMount === deleteTarget.id) setExpandedMount(null)
      fetchMounts()
    } catch {
      toast.error('Failed to delete mount')
    } finally {
      setDeleting(false)
    }
  }

  // ── Attach / detach handlers ─────────────────────────────────

  const handleDetachEgg = async (mountId: number, eggId: number) => {
    try {
      await detachMountEgg(mountId, eggId)
      toast.success('Egg detached')
      await loadMountDetails(mountId)
    } catch {
      toast.error('Failed to detach egg')
    }
  }

  const handleDetachNode = async (mountId: number, nodeId: number) => {
    try {
      await detachMountNode(mountId, nodeId)
      toast.success('Node detached')
      await loadMountDetails(mountId)
    } catch {
      toast.error('Failed to detach node')
    }
  }

  const handleAttachEggs = async () => {
    if (!attachEggsTarget) return
    const ids = eggIdsInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
    if (ids.length === 0) {
      toast.error('Enter at least one egg ID')
      return
    }
    setAttachingEggs(true)
    try {
      await attachMountEggs(attachEggsTarget, ids)
      toast.success('Eggs attached')
      setAttachEggsTarget(null)
      setEggIdsInput('')
      await loadMountDetails(attachEggsTarget)
    } catch {
      toast.error('Failed to attach eggs')
    } finally {
      setAttachingEggs(false)
    }
  }

  const handleAttachNodes = async () => {
    if (!attachNodesTarget) return
    const ids = nodeIdsInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
    if (ids.length === 0) {
      toast.error('Enter at least one node ID')
      return
    }
    setAttachingNodes(true)
    try {
      await attachMountNodes(attachNodesTarget, ids)
      toast.success('Nodes attached')
      setAttachNodesTarget(null)
      setNodeIdsInput('')
      await loadMountDetails(attachNodesTarget)
    } catch {
      toast.error('Failed to attach nodes')
    } finally {
      setAttachingNodes(false)
    }
  }

  const pagination = mounts?.meta?.pagination
  const mountItems = mounts?.data.map((d) => d.attributes) ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mounts</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage filesystem mounts attached to eggs and nodes.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Create Mount
        </Button>
      </div>

      {loading ? (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="text-zinc-400 w-10" />
                <TableHead className="text-zinc-400">ID</TableHead>
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Source</TableHead>
                <TableHead className="text-zinc-400">Target</TableHead>
                <TableHead className="text-zinc-400">Read Only</TableHead>
                <TableHead className="text-zinc-400">User Mountable</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.08]">
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : mountItems.length === 0 ? (
        <div className="text-zinc-400 py-12 text-center">No mounts found.</div>
      ) : (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="text-zinc-400 w-10" />
                <TableHead className="text-zinc-400">ID</TableHead>
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Source</TableHead>
                <TableHead className="text-zinc-400">Target</TableHead>
                <TableHead className="text-zinc-400">Read Only</TableHead>
                <TableHead className="text-zinc-400">User Mountable</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
              {mountItems.map((mount, i) => (
                <MountRow
                  key={mount.id}
                  mount={mount}
                  index={i}
                  expanded={expandedMount === mount.id}
                  details={mountDetails[mount.id]}
                  loadingDetails={loadingDetails === mount.id}
                  onToggle={() => toggleMount(mount.id)}
                  onEdit={(e) => openEdit(mount, e)}
                  onDelete={(e) => confirmDelete(mount, e)}
                  onDetachEgg={(eggId) => handleDetachEgg(mount.id, eggId)}
                  onDetachNode={(nodeId) => handleDetachNode(mount.id, nodeId)}
                  onAttachEggs={() => { setAttachEggsTarget(mount.id); setEggIdsInput('') }}
                  onAttachNodes={() => { setAttachNodesTarget(mount.id); setNodeIdsInput('') }}
                />
              ))}
            </motion.tbody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-zinc-500">
            Page {pagination.current_page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create / Edit Mount Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>{editingMount ? 'Edit Mount' : 'Create Mount'}</DialogTitle>
            <DialogDescription>
              {editingMount ? 'Update this mount configuration.' : 'Create a new filesystem mount.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="My Mount"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-1">
              <Label>Source Path</Label>
              <Input
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="/mnt/host/path"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Target Path</Label>
              <Input
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                placeholder="/mnt/container/path"
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Read Only</Label>
              <Switch
                checked={form.read_only}
                onCheckedChange={(checked: boolean) => setForm((f) => ({ ...f, read_only: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>User Mountable</Label>
              <Switch
                checked={form.user_mountable}
                onCheckedChange={(checked: boolean) => setForm((f) => ({ ...f, user_mountable: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.name || !form.source || !form.target}
            >
              {submitting ? 'Saving...' : editingMount ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Mount Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Delete Mount</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete{' '}
            <span className="text-white font-medium">{deleteTarget?.name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach Eggs Dialog */}
      <Dialog open={!!attachEggsTarget} onOpenChange={(open) => !open && setAttachEggsTarget(null)}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Attach Eggs</DialogTitle>
            <DialogDescription>Enter egg IDs to attach to this mount, separated by commas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Egg IDs</Label>
            <Input
              value={eggIdsInput}
              onChange={(e) => setEggIdsInput(e.target.value)}
              placeholder="1, 2, 3"
              className="font-mono"
            />
            <p className="text-xs text-zinc-500">Comma-separated list of egg IDs.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachEggsTarget(null)}>Cancel</Button>
            <Button onClick={handleAttachEggs} disabled={attachingEggs || !eggIdsInput.trim()}>
              {attachingEggs ? 'Attaching...' : 'Attach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach Nodes Dialog */}
      <Dialog open={!!attachNodesTarget} onOpenChange={(open) => !open && setAttachNodesTarget(null)}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Attach Nodes</DialogTitle>
            <DialogDescription>Enter node IDs to attach to this mount, separated by commas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Node IDs</Label>
            <Input
              value={nodeIdsInput}
              onChange={(e) => setNodeIdsInput(e.target.value)}
              placeholder="1, 2, 3"
              className="font-mono"
            />
            <p className="text-xs text-zinc-500">Comma-separated list of node IDs.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachNodesTarget(null)}>Cancel</Button>
            <Button onClick={handleAttachNodes} disabled={attachingNodes || !nodeIdsInput.trim()}>
              {attachingNodes ? 'Attaching...' : 'Attach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Mount Row component ──────────────────────────────────────────

function MountRow({
  mount,
  index,
  expanded,
  details,
  loadingDetails,
  onToggle,
  onEdit,
  onDelete,
  onDetachEgg,
  onDetachNode,
  onAttachEggs,
  onAttachNodes,
}: {
  mount: AdminMount
  index: number
  expanded: boolean
  details?: AdminMount
  loadingDetails: boolean
  onToggle: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onDetachEgg: (eggId: number) => void
  onDetachNode: (nodeId: number) => void
  onAttachEggs: () => void
  onAttachNodes: () => void
}) {
  return (
    <>
      <motion.tr
        variants={staggerItem}
        custom={index}
        className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
        onClick={onToggle}
      >
        <TableCell className="w-10">
          <ChevronRight
            className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
        </TableCell>
        <TableCell className="font-mono text-zinc-300">{mount.id}</TableCell>
        <TableCell className="text-white font-medium">{mount.name}</TableCell>
        <TableCell className="font-mono text-xs text-zinc-400 max-w-[180px] truncate">{mount.source}</TableCell>
        <TableCell className="font-mono text-xs text-zinc-400 max-w-[180px] truncate">{mount.target}</TableCell>
        <TableCell>
          <Badge variant={mount.read_only ? 'default' : 'outline'} className="text-[10px]">
            {mount.read_only ? 'Yes' : 'No'}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={mount.user_mountable ? 'default' : 'outline'} className="text-[10px]">
            {mount.user_mountable ? 'Yes' : 'No'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="xs" onClick={onEdit}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-red-400 hover:text-red-300"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      </motion.tr>

      {expanded && (
        <tr className="border-b border-white/[0.08]">
          <td colSpan={8} className="p-0">
            <div className="bg-white/[0.02] px-6 py-4 space-y-6">
              {loadingDetails ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4 items-center py-2">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Eggs sub-table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Attached Eggs</h4>
                      <Button size="sm" variant="outline" onClick={onAttachEggs}>
                        <Plus className="w-3 h-3 mr-1" />
                        Attach Eggs
                      </Button>
                    </div>
                    {!details?.eggs || details.eggs.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-2">No eggs attached.</p>
                    ) : (
                      <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/[0.06] hover:bg-transparent">
                              <TableHead className="text-zinc-500 text-xs">ID</TableHead>
                              <TableHead className="text-zinc-500 text-xs">Name</TableHead>
                              <TableHead className="text-zinc-500 text-xs text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {details.eggs.map((egg) => (
                              <TableRow key={egg.id} className="border-white/[0.06]">
                                <TableCell className="font-mono text-zinc-400 text-sm">{egg.id}</TableCell>
                                <TableCell className="text-white text-sm">{egg.name}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => onDetachEgg(egg.id)}
                                  >
                                    <Link2Off className="w-3 h-3 mr-1" />
                                    Detach
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Nodes sub-table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Attached Nodes</h4>
                      <Button size="sm" variant="outline" onClick={onAttachNodes}>
                        <Plus className="w-3 h-3 mr-1" />
                        Attach Nodes
                      </Button>
                    </div>
                    {!details?.nodes || details.nodes.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-2">No nodes attached.</p>
                    ) : (
                      <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/[0.06] hover:bg-transparent">
                              <TableHead className="text-zinc-500 text-xs">ID</TableHead>
                              <TableHead className="text-zinc-500 text-xs">Name</TableHead>
                              <TableHead className="text-zinc-500 text-xs text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {details.nodes.map((node) => (
                              <TableRow key={node.id} className="border-white/[0.06]">
                                <TableCell className="font-mono text-zinc-400 text-sm">{node.id}</TableCell>
                                <TableCell className="text-white text-sm">{node.name}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => onDetachNode(node.id)}
                                  >
                                    <Link2Off className="w-3 h-3 mr-1" />
                                    Detach
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
