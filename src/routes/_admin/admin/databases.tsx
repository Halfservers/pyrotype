import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Database, RefreshCw, Trash2, Plus, ArrowLeft, ExternalLink } from 'lucide-react'
import {
  getServers, resetDatabasePassword, deleteServerDatabase,
  getDatabaseHosts, getDatabaseHost, getDatabaseHostDatabases,
  createDatabaseHost, updateDatabaseHost, deleteDatabaseHost, getNodes,
  type AdminServer, type AdminDatabase, type AdminDatabaseHost,
  type AdminNode, type PaginatedResponse,
} from '@/lib/api/admin'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { motion, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/databases' as any)({
  component: AdminDatabasesPage,
})

type ViewMode = 'list' | 'detail'

interface HostFormData {
  name: string; host: string; port: string; username: string
  password: string; max_databases: string; node_id: string
}

const emptyForm: HostFormData = {
  name: '', host: '', port: '3306', username: '', password: '', max_databases: '', node_id: '',
}

function AdminDatabasesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedHostId, setSelectedHostId] = useState<number | null>(null)
  const goToList = useCallback(() => { setViewMode('list'); setSelectedHostId(null) }, [])
  const goToDetail = useCallback((id: number) => { setSelectedHostId(id); setViewMode('detail') }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {viewMode === 'list' && <HostList onSelect={goToDetail} />}
      {viewMode === 'detail' && selectedHostId && (
        <HostDetail hostId={selectedHostId} onBack={goToList} />
      )}
    </div>
  )
}

/* -- Helper: Node selector ------------------------------------------------ */
function NodeSelect({ value, onChange, nodes }: {
  value: string; onChange: (v: string) => void; nodes: AdminNode[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {nodes.map((n) => <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/* -- Helper: build host payload from form --------------------------------- */
function buildPayload(form: HostFormData, includePassword: 'always' | 'if-set') {
  const p: Record<string, any> = {
    name: form.name, host: form.host, port: Number(form.port) || 3306, username: form.username,
  }
  if (includePassword === 'always' || form.password) p.password = form.password
  if (form.max_databases) p.max_databases = Number(form.max_databases)
  if (form.node_id) p.node_id = Number(form.node_id)
  return p
}

/* -- HOST LIST ------------------------------------------------------------ */
function HostList({ onSelect }: { onSelect: (id: number) => void }) {
  const [data, setData] = useState<PaginatedResponse<AdminDatabaseHost> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [nodes, setNodes] = useState<AdminNode[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<HostFormData>(emptyForm)
  const [availableNodes, setAvailableNodes] = useState<AdminNode[]>([])
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback((p: number) => {
    setLoading(true)
    getDatabaseHosts(p).then(setData).catch(() => toast.error('Failed to load database hosts')).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page) }, [page, load])
  useEffect(() => { getNodes(1).then((r) => setNodes(r.data.map((d) => d.attributes))).catch(() => {}) }, [])

  const nodeName = (id: number | null) => {
    if (!id) return '-'
    return nodes.find((n) => n.id === id)?.name ?? String(id)
  }

  const openCreate = () => {
    setForm(emptyForm); setCreateOpen(true)
    getNodes(1).then((r) => setAvailableNodes(r.data.map((d) => d.attributes))).catch(() => {})
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await createDatabaseHost(buildPayload(form, 'always') as any)
      toast.success('Database host created'); setCreateOpen(false); load(page)
    } catch { toast.error('Failed to create database host') }
    finally { setSubmitting(false) }
  }

  const set = (k: keyof HostFormData, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const hosts = data?.data.map((d) => d.attributes) ?? []
  const pagination = data?.meta.pagination

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Database Hosts</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage database host connections and their databases.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Create Host</Button>
      </div>

      {loading ? (
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4"><Skeleton className="h-4 w-8" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-12" /></div>
          ))}
        </div>
      ) : hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
            <Database className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-zinc-500 text-sm">No database hosts configured.</p>
        </div>
      ) : (
        <>
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.08] hover:bg-transparent">
                  {['ID', 'Name', 'Host', 'Port', 'Username', 'Max DBs', 'Node'].map((h) => (
                    <TableHead key={h} className="text-zinc-500 text-xs">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
                {hosts.map((host, i) => (
                  <motion.tr key={host.id} variants={staggerItem} custom={i}
                    className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => onSelect(host.id)}>
                    <TableCell className="font-mono text-zinc-400 text-sm">{host.id}</TableCell>
                    <TableCell className="text-white font-medium text-sm">{host.name}</TableCell>
                    <TableCell className="font-mono text-xs text-zinc-300">{host.host}</TableCell>
                    <TableCell className="text-zinc-400 text-sm">{host.port}</TableCell>
                    <TableCell className="font-mono text-xs text-zinc-400">{host.username}</TableCell>
                    <TableCell className="text-zinc-400 text-sm">{host.max_databases ?? 'Unlimited'}</TableCell>
                    <TableCell className="text-zinc-400 text-sm">{nodeName(host.node_id)}</TableCell>
                  </motion.tr>
                ))}
              </motion.tbody>
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

      {/* Create Host Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Create Database Host</DialogTitle>
            <DialogDescription>Add a new database host connection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Name</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="MySQL Host" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2"><Label>Host</Label>
                <Input value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="127.0.0.1" /></div>
              <div className="space-y-1"><Label>Port</Label>
                <Input value={form.port} onChange={(e) => set('port', e.target.value)} placeholder="3306" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Username</Label>
                <Input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="pterodactyl" /></div>
              <div className="space-y-1"><Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="password" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Max Databases</Label>
                <Input value={form.max_databases} onChange={(e) => set('max_databases', e.target.value)} placeholder="Unlimited" /></div>
              <div className="space-y-1"><Label>Linked Node</Label>
                <NodeSelect value={form.node_id} onChange={(v) => set('node_id', v)} nodes={availableNodes} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}
              disabled={submitting || !form.name || !form.host || !form.username || !form.password}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* -- HOST DETAIL ---------------------------------------------------------- */
function HostDetail({ hostId, onBack }: { hostId: number; onBack: () => void }) {
  const [host, setHost] = useState<AdminDatabaseHost | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<HostFormData>(emptyForm)
  const [nodes, setNodes] = useState<AdminNode[]>([])
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [databases, setDatabases] = useState<AdminDatabase[]>([])
  const [loadingDbs, setLoadingDbs] = useState(true)
  const [servers, setServers] = useState<AdminServer[]>([])
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const loadHost = useCallback(() => {
    setLoading(true)
    getDatabaseHost(hostId).then((res) => {
      const h = res.attributes; setHost(h)
      setForm({ name: h.name, host: h.host, port: String(h.port), username: h.username, password: '',
        max_databases: h.max_databases != null ? String(h.max_databases) : '',
        node_id: h.node_id != null ? String(h.node_id) : '' })
    }).catch(() => toast.error('Failed to load database host')).finally(() => setLoading(false))
  }, [hostId])

  const loadDatabases = useCallback(() => {
    setLoadingDbs(true)
    getDatabaseHostDatabases(hostId)
      .then((res) => setDatabases(res.data.map((d) => d.attributes)))
      .catch(() => setDatabases([]))
      .finally(() => setLoadingDbs(false))
  }, [hostId])

  useEffect(() => {
    loadHost(); loadDatabases()
    getNodes(1).then((r) => setNodes(r.data.map((d) => d.attributes))).catch(() => {})
    getServers(1).then((r) => setServers(r.data.map((d) => d.attributes))).catch(() => {})
  }, [loadHost, loadDatabases])

  const serverName = (id: number) => servers.find((s) => s.id === id)?.name ?? `Server #${id}`
  const set = (k: keyof HostFormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateDatabaseHost(hostId, buildPayload(form, 'if-set'))
      toast.success('Database host updated'); loadHost()
    } catch { toast.error('Failed to update database host') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await deleteDatabaseHost(hostId); toast.success('Database host deleted'); onBack() }
    catch { toast.error('Failed to delete database host') }
    finally { setDeleting(false) }
  }

  const handleResetPw = async (db: AdminDatabase) => {
    setActionLoading(db.id)
    try { await resetDatabasePassword(db.server, db.id); toast.success('Password rotated') }
    catch { toast.error('Failed to reset password') }
    finally { setActionLoading(null) }
  }

  const handleDeleteDb = async (db: AdminDatabase) => {
    setActionLoading(db.id)
    try { await deleteServerDatabase(db.server, db.id); toast.success('Database deleted'); loadDatabases() }
    catch { toast.error('Failed to delete database') }
    finally { setActionLoading(null) }
  }

  if (loading || !host) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <h1 className="text-2xl font-bold">{host.name}</h1>
        <Badge variant="outline" className="ml-2 font-mono text-xs">{host.host}:{host.port}</Badge>
      </div>

      {/* Two-column edit form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Host Details</h2>
          <div className="space-y-1"><Label>Name</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="MySQL Host" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-2"><Label>Host</Label>
              <Input value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="127.0.0.1" /></div>
            <div className="space-y-1"><Label>Port</Label>
              <Input value={form.port} onChange={(e) => set('port', e.target.value)} placeholder="3306" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Max Databases</Label>
              <Input value={form.max_databases} onChange={(e) => set('max_databases', e.target.value)} placeholder="Unlimited" /></div>
            <div className="space-y-1"><Label>Linked Node</Label>
              <NodeSelect value={form.node_id} onChange={(v) => set('node_id', v)} nodes={nodes} /></div>
          </div>
        </div>
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">User Details</h2>
          <div className="space-y-1"><Label>Username</Label>
            <Input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="pterodactyl" /></div>
          <div className="space-y-1"><Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="(unchanged)" />
            <p className="text-xs text-zinc-500">Leave blank to keep the current password.</p></div>
          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <h3 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h3>
            <p className="text-xs text-zinc-500 mb-3">Deleting this host will remove it permanently.</p>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-3 h-3 mr-1.5" />Delete Host</Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-8">
        <Button onClick={handleSave} disabled={saving || !form.name || !form.host || !form.username}
          className="bg-green-600 hover:bg-green-700 text-white">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Databases table */}
      <div className="border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Database className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-semibold">Databases on this Host</h2>
          <span className="text-xs text-zinc-500">({databases.length})</span>
        </div>
        {loadingDbs ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /></div>
            ))}
          </div>
        ) : databases.length === 0 ? (
          <div className="text-zinc-500 text-sm py-8 text-center">No databases on this host.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                {['Server', 'Database Name', 'Username', 'Connections From', 'Max Connections'].map((h) => (
                  <TableHead key={h} className="text-zinc-500 text-xs">{h}</TableHead>
                ))}
                <TableHead className="text-zinc-500 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
              {databases.map((db, i) => (
                <motion.tr key={db.id} variants={staggerItem} custom={i}
                  className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <TableCell>
                    <a href={`/admin/servers/${db.server}`}
                      className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}>
                      {serverName(db.server)}<ExternalLink className="w-3 h-3" />
                    </a>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-white">{db.database}</TableCell>
                  <TableCell className="font-mono text-xs text-zinc-400">{db.username}</TableCell>
                  <TableCell className="text-zinc-400 text-sm">{db.remote || '%'}</TableCell>
                  <TableCell className="text-zinc-400 text-sm">{db.max_connections || 'Unlimited'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" disabled={actionLoading === db.id} onClick={() => handleResetPw(db)}>
                        <RefreshCw className="w-3 h-3 mr-1" />Rotate</Button>
                      <Button variant="ghost" size="xs" className="text-red-400 hover:text-red-300"
                        disabled={actionLoading === db.id} onClick={() => handleDeleteDb(db)}>
                        <Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </motion.tbody>
          </Table>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader><DialogTitle>Delete Database Host</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete <span className="text-white font-medium">{host.name}</span>{' '}
            ({host.host}:{host.port})? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
