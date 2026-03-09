import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  getLocations,
  getNodes,
  createLocation,
  updateLocation,
  deleteLocation,
  type AdminLocation,
  type AdminNode,
  type PaginatedResponse,
} from '@/lib/api/admin'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

type ViewMode = 'list' | 'detail'

/* ── Progress bar with color coding ─────────────────────────────── */
function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct >= 70 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

function formatMB(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`
}

/* ════════════════════════════════════════════════════════════════════ */
function AdminLocationsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)

  const goToList = useCallback(() => {
    setViewMode('list')
    setSelectedLocationId(null)
  }, [])

  const goToDetail = useCallback((id: number) => {
    setSelectedLocationId(id)
    setViewMode('detail')
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {viewMode === 'list' && <LocationList onSelect={goToDetail} />}
      {viewMode === 'detail' && selectedLocationId && (
        <LocationDetail locationId={selectedLocationId} onBack={goToList} />
      )}
    </div>
  )
}

/* ── LOCATION LIST ────────────────────────────────────────────────── */
function LocationList({ onSelect }: { onSelect: (id: number) => void }) {
  const [data, setData] = useState<PaginatedResponse<AdminLocation> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
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
    setShortCode('')
    setDescription('')
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createLocation({ short: shortCode, long: description || undefined })
      toast.success('Location created')
      setDialogOpen(false)
      load(page)
    } catch {
      toast.error('Failed to create location')
    } finally {
      setSaving(false)
    }
  }

  const locations = data?.data.map((d) => d.attributes) ?? []
  const pagination = data?.meta.pagination

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString()

  return (
    <>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow
                    key={loc.id}
                    className="border-white/[0.08] cursor-pointer hover:bg-white/[0.02]"
                    onClick={() => onSelect(loc.id)}
                  >
                    <TableCell>{loc.id}</TableCell>
                    <TableCell className="font-medium">{loc.short}</TableCell>
                    <TableCell className="text-zinc-400">{loc.long || '-'}</TableCell>
                    <TableCell>{formatDate(loc.created_at)}</TableCell>
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
            <DialogTitle>Create Location</DialogTitle>
            <DialogDescription>Add a new data center location.</DialogDescription>
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
            <Button onClick={handleCreate} disabled={saving || !shortCode}>{saving ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ── LOCATION DETAIL ──────────────────────────────────────────────── */
function LocationDetail({ locationId, onBack }: { locationId: number; onBack: () => void }) {
  const [location, setLocation] = useState<AdminLocation | null>(null)
  const [allNodes, setAllNodes] = useState<AdminNode[]>([])
  const [loading, setLoading] = useState(true)

  // Edit form state
  const [shortCode, setShortCode] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      getLocations(1),
      getNodes(1),
    ])
      .then(([locRes, nodeRes]) => {
        // Find this specific location
        const loc = locRes.data.map((d) => d.attributes).find((l) => l.id === locationId)
        if (loc) {
          setLocation(loc)
          setShortCode(loc.short)
          setDescription(loc.long ?? '')
        }

        // Collect all nodes across pages -- for small node counts, page 1 is enough.
        // If there are more pages, load them all.
        const nodes = nodeRes.data.map((d) => d.attributes)
        const totalPages = nodeRes.meta.pagination.total_pages

        if (totalPages <= 1) {
          setAllNodes(nodes)
        } else {
          // Fetch remaining pages
          const promises = []
          for (let p = 2; p <= totalPages; p++) {
            promises.push(getNodes(p))
          }
          Promise.all(promises).then((pages) => {
            const moreNodes = pages.flatMap((pg) => pg.data.map((d) => d.attributes))
            setAllNodes([...nodes, ...moreNodes])
          }).catch(() => {
            setAllNodes(nodes) // Use what we have
          })
        }
      })
      .catch(() => toast.error('Failed to load location details'))
      .finally(() => setLoading(false))
  }, [locationId])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateLocation(locationId, { short: shortCode, long: description || undefined })
      toast.success('Location updated')
      loadData()
    } catch {
      toast.error('Failed to update location')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteLocation(locationId)
      toast.success('Location deleted')
      onBack()
    } catch {
      toast.error('Failed to delete location. It may still have nodes attached.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading || !location) {
    return (
      <>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>&larr; Back</Button>
        </div>
        <p className="text-zinc-400">Loading location...</p>
      </>
    )
  }

  // Filter nodes for this location
  const locationNodes = allNodes.filter((n) => n.location_id === locationId)

  // Calculate resource allocation totals
  const totalMemory = locationNodes.reduce((sum, n) => sum + n.memory, 0)
  const totalDisk = locationNodes.reduce((sum, n) => sum + n.disk, 0)
  const allocatedMemory = locationNodes.reduce((sum, n) => {
    const overalloc = n.memory * (1 + n.memory_overallocate / 100)
    return sum + (overalloc - n.memory)
  }, 0)
  const allocatedDisk = locationNodes.reduce((sum, n) => {
    const overalloc = n.disk * (1 + n.disk_overallocate / 100)
    return sum + (overalloc - n.disk)
  }, 0)
  // For a simple approach: memory/disk pct based on overallocation as a % of total capacity
  // Since we don't have live server usage, show allocated capacity vs total
  const memPct = totalMemory > 0 ? Math.round((allocatedMemory / totalMemory) * 100) : 0
  const diskPct = totalDisk > 0 ? Math.round((allocatedDisk / totalDisk) * 100) : 0

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>&larr; Back</Button>
        <h1 className="text-2xl font-bold">{location.short}</h1>
        <Badge variant="outline" className="ml-2">ID: {location.id}</Badge>
      </div>

      {/* Top row: Edit form + Resource allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Edit form */}
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Location Details</h2>
          <div className="space-y-1">
            <Label>Short Code</Label>
            <Input value={shortCode} onChange={(e) => setShortCode(e.target.value)} placeholder="us-east-1" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="US East (Virginia)" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || !shortCode}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </div>
        </div>

        {/* Right: Resource allocation */}
        <div className="space-y-4">
          <div className="border border-white/[0.08] rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-semibold">Resource Allocation</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Memory</span>
                <span className="text-zinc-400">{formatMB(totalMemory)} total across {locationNodes.length} node{locationNodes.length !== 1 ? 's' : ''}</span>
              </div>
              <ProgressBar pct={memPct} />
              <p className="text-xs text-zinc-500">{memPct}% over-allocated</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Disk</span>
                <span className="text-zinc-400">{formatMB(totalDisk)} total across {locationNodes.length} node{locationNodes.length !== 1 ? 's' : ''}</span>
              </div>
              <ProgressBar pct={diskPct} />
              <p className="text-xs text-zinc-500">{diskPct}% over-allocated</p>
            </div>
          </div>
          <div className="border border-white/[0.08] rounded-xl p-5">
            <div className="flex justify-between text-sm">
              <span>Total Nodes</span>
              <span className="font-semibold">{locationNodes.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Nodes table */}
      <div className="border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <h2 className="text-lg font-semibold">Nodes at this Location</h2>
        </div>
        {locationNodes.length === 0 ? (
          <div className="px-6 py-8 text-center text-zinc-400">No nodes at this location.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>FQDN</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Memory %</TableHead>
                <TableHead>Disk</TableHead>
                <TableHead>Disk %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locationNodes.map((node) => {
                const nodeMemOverPct = node.memory_overallocate
                const nodeDiskOverPct = node.disk_overallocate
                const memColor = nodeMemOverPct >= 70 ? 'text-red-400' : nodeMemOverPct >= 50 ? 'text-yellow-400' : 'text-green-400'
                const diskColor = nodeDiskOverPct >= 70 ? 'text-red-400' : nodeDiskOverPct >= 50 ? 'text-yellow-400' : 'text-green-400'

                return (
                  <TableRow key={node.id} className="border-white/[0.08]">
                    <TableCell>{node.id}</TableCell>
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell className="text-zinc-400">{node.fqdn}</TableCell>
                    <TableCell>{formatMB(node.memory)}</TableCell>
                    <TableCell>
                      <span className={memColor}>{nodeMemOverPct}%</span>
                      <span className="text-zinc-500 text-xs ml-1">overalloc</span>
                    </TableCell>
                    <TableCell>{formatMB(node.disk)}</TableCell>
                    <TableCell>
                      <span className={diskColor}>{nodeDiskOverPct}%</span>
                      <span className="text-zinc-500 text-xs ml-1">overalloc</span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{location.short}</strong>? This will fail if nodes are still assigned to this location.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
