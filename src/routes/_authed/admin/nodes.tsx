import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getNodes,
  getLocations,
  createNode,
  updateNode,
  deleteNode,
  type AdminNode,
  type AdminLocation,
  type PaginatedResponse,
} from '@/lib/api/admin'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/_authed/admin/nodes' as any)({
  component: AdminNodesPage,
})

const emptyForm = {
  name: '',
  fqdn: '',
  scheme: 'https',
  daemon_base: '/var/lib/pterodactyl/volumes',
  daemon_sftp: 2022,
  daemon_listen: 8080,
  memory: 0,
  disk: 0,
  memory_overallocate: 0,
  disk_overallocate: 0,
  location_id: 0,
}

function AdminNodesPage() {
  const [data, setData] = useState<PaginatedResponse<AdminNode> | null>(null)
  const [locations, setLocations] = useState<AdminLocation[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<AdminNode | null>(null)
  const [deletingNode, setDeletingNode] = useState<AdminNode | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = (p: number) => {
    setLoading(true)
    Promise.all([getNodes(p), getLocations(1)])
      .then(([nodesRes, locsRes]) => {
        setData(nodesRes)
        setLocations(locsRes.data.map((l) => l.attributes))
      })
      .catch(() => toast.error('Failed to load nodes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const openCreate = () => {
    setEditingNode(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (node: AdminNode) => {
    setEditingNode(node)
    setForm({
      name: node.name,
      fqdn: node.fqdn,
      scheme: node.scheme,
      daemon_base: node.daemon_base,
      daemon_sftp: node.daemon_sftp,
      daemon_listen: node.daemon_listen,
      memory: node.memory,
      disk: node.disk,
      memory_overallocate: node.memory_overallocate,
      disk_overallocate: node.disk_overallocate,
      location_id: node.location_id,
    })
    setDialogOpen(true)
  }

  const openDelete = (node: AdminNode) => {
    setDeletingNode(node)
    setDeleteOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingNode) {
        await updateNode(editingNode.id, form)
        toast.success('Node updated')
      } else {
        await createNode(form)
        toast.success('Node created')
      }
      setDialogOpen(false)
      load(page)
    } catch {
      toast.error(editingNode ? 'Failed to update node' : 'Failed to create node')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingNode) return
    setSaving(true)
    try {
      await deleteNode(deletingNode.id)
      toast.success('Node deleted')
      setDeleteOpen(false)
      load(page)
    } catch {
      toast.error('Failed to delete node')
    } finally {
      setSaving(false)
    }
  }

  const setField = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }))

  const nodes = data?.data.map((d) => d.attributes) ?? []
  const pagination = data?.meta.pagination

  const formatMB = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nodes</h1>
        <Button onClick={openCreate}>Create Node</Button>
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : nodes.length === 0 ? (
        <p className="text-zinc-400">No nodes found.</p>
      ) : (
        <>
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.08]">
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>FQDN</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead>Disk</TableHead>
                  <TableHead>Daemon Port</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((node) => (
                  <TableRow key={node.id} className="border-white/[0.08]">
                    <TableCell>{node.id}</TableCell>
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell>{node.fqdn}</TableCell>
                    <TableCell>{node.location_id}</TableCell>
                    <TableCell>{formatMB(node.memory)}</TableCell>
                    <TableCell>{formatMB(node.disk)}</TableCell>
                    <TableCell>{node.daemon_listen}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(node)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => openDelete(node)}>Delete</Button>
                    </TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNode ? 'Edit Node' : 'Create Node'}</DialogTitle>
            <DialogDescription>{editingNode ? 'Update the node configuration.' : 'Add a new daemon node.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>FQDN</Label>
                <Input value={form.fqdn} onChange={(e) => setField('fqdn', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Scheme</Label>
                <Select value={form.scheme} onValueChange={(v) => setField('scheme', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="https">HTTPS</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Select value={String(form.location_id || '')} onValueChange={(v) => setField('location_id', Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>{loc.short}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Daemon Base Path</Label>
              <Input value={form.daemon_base} onChange={(e) => setField('daemon_base', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Daemon SFTP Port</Label>
                <Input type="number" value={form.daemon_sftp} onChange={(e) => setField('daemon_sftp', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Daemon Listen Port</Label>
                <Input type="number" value={form.daemon_listen} onChange={(e) => setField('daemon_listen', Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Memory (MB)</Label>
                <Input type="number" value={form.memory} onChange={(e) => setField('memory', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Disk (MB)</Label>
                <Input type="number" value={form.disk} onChange={(e) => setField('disk', Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Memory Overallocate (%)</Label>
                <Input type="number" value={form.memory_overallocate} onChange={(e) => setField('memory_overallocate', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Disk Overallocate (%)</Label>
                <Input type="number" value={form.disk_overallocate} onChange={(e) => setField('disk_overallocate', Number(e.target.value))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingNode ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Node</DialogTitle>
            <DialogDescription>Are you sure you want to delete <strong>{deletingNode?.name}</strong>? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
