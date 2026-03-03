import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
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

export const Route = createFileRoute('/_admin/admin/locations' as any)({
  component: AdminLocationsPage,
})

function AdminLocationsPage() {
  const [data, setData] = useState<PaginatedResponse<AdminLocation> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<AdminLocation | null>(null)
  const [deletingLocation, setDeletingLocation] = useState<AdminLocation | null>(null)
  const [shortCode, setShortCode] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const load = (p: number) => {
    setLoading(true)
    getLocations(p)
      .then(setData)
      .catch(() => toast.error('Failed to load locations'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const openCreate = () => {
    setEditingLocation(null)
    setShortCode('')
    setDescription('')
    setDialogOpen(true)
  }

  const openEdit = (loc: AdminLocation) => {
    setEditingLocation(loc)
    setShortCode(loc.short)
    setDescription(loc.long ?? '')
    setDialogOpen(true)
  }

  const openDelete = (loc: AdminLocation) => {
    setDeletingLocation(loc)
    setDeleteOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, { short: shortCode, long: description || undefined })
        toast.success('Location updated')
      } else {
        await createLocation({ short: shortCode, long: description || undefined })
        toast.success('Location created')
      }
      setDialogOpen(false)
      load(page)
    } catch {
      toast.error(editingLocation ? 'Failed to update location' : 'Failed to create location')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingLocation) return
    setSaving(true)
    try {
      await deleteLocation(deletingLocation.id)
      toast.success('Location deleted')
      setDeleteOpen(false)
      load(page)
    } catch {
      toast.error('Failed to delete location. It may still have nodes attached.')
    } finally {
      setSaving(false)
    }
  }

  const locations = data?.data.map((d) => d.attributes) ?? []
  const pagination = data?.meta.pagination

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Locations</h1>
        <Button onClick={openCreate}>Create Location</Button>
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : locations.length === 0 ? (
        <p className="text-zinc-400">No locations found.</p>
      ) : (
        <>
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.08]">
                  <TableHead>ID</TableHead>
                  <TableHead>Short Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow key={loc.id} className="border-white/[0.08]">
                    <TableCell>{loc.id}</TableCell>
                    <TableCell className="font-medium">{loc.short}</TableCell>
                    <TableCell className="text-zinc-400">{loc.long || '-'}</TableCell>
                    <TableCell>{formatDate(loc.created_at)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => openDelete(loc)}>Delete</Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit Location' : 'Create Location'}</DialogTitle>
            <DialogDescription>{editingLocation ? 'Update the location details.' : 'Add a new data center location.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Short Code</Label>
              <Input value={shortCode} onChange={(e) => setShortCode(e.target.value)} placeholder="us-east-1" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="US East (Virginia)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !shortCode}>{saving ? 'Saving...' : editingLocation ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingLocation?.short}</strong>? This will fail if nodes are still assigned to this location.
            </DialogDescription>
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
