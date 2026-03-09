import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  type AdminServer,
  type AdminNode,
  type AdminNest,
  type AdminEgg,
  type AdminAllocation,
  type PaginatedResponse,
  getServers,
  getNodes,
  getNests,
  getEggs,
  getAllocations,
  createServer,
  searchUsers,
  createNest,
  type AdminUser,
} from '@/lib/api/admin'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { motion, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/servers/' as any)({
  component: AdminServersIndex,
})

interface CreateServerForm {
  name: string
  owner_id: string
  node_id: string
  allocation_id: string
  nest_id: string
  egg_id: string
  memory: string
  disk: string
  cpu: string
  swap: string
  io: string
  description: string
}

const emptyCreateForm: CreateServerForm = {
  name: '', owner_id: '', node_id: '', allocation_id: '',
  nest_id: '', egg_id: '', memory: '1024', disk: '10240',
  cpu: '100', swap: '512', io: '500', description: '',
}

/* -- Reusable searchable dropdown -------------------------------- */
function SearchableDropdown({
  items, value, onSelect, placeholder, disabled, footer,
}: {
  items: { id: string; label: string; sublabel?: string }[]
  value: string
  onSelect: (id: string) => void
  placeholder: string
  disabled?: boolean
  footer?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = items.find((i) => i.id === value)
  const filtered = search
    ? items.filter(
        (i) =>
          i.label.toLowerCase().includes(search.toLowerCase()) ||
          (i.sublabel && i.sublabel.toLowerCase().includes(search.toLowerCase())),
      )
    : items

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className="flex h-9 w-full items-center justify-between rounded-md border border-white/[0.08] bg-transparent px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => { setSearch(''); setOpen(!open) }}
      >
        {selected ? (
          <span className="text-white truncate text-left">
            {selected.label}
            {selected.sublabel && <span className="text-zinc-500 ml-1">{selected.sublabel}</span>}
          </span>
        ) : (
          <span className="text-zinc-500">{placeholder}</span>
        )}
        <svg className="h-4 w-4 opacity-50 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#0a0a0a] border border-white/[0.08] rounded-md shadow-lg">
          <div className="p-1.5">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder:text-zinc-500 outline-none focus:border-white/20"
              placeholder="Search..."
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500">No results</div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors ${item.id === value ? 'text-white bg-white/[0.04]' : 'text-zinc-300'}`}
                  onClick={() => { onSelect(item.id); setOpen(false) }}
                >
                  {item.label}
                  {item.sublabel && <span className="text-zinc-500 ml-1">{item.sublabel}</span>}
                </button>
              ))
            )}
          </div>
          {footer}
        </div>
      )}
    </div>
  )
}

/* ================================================================ */
function AdminServersIndex() {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ServerList
        onSelect={(id) => navigate({ to: '/admin/servers/view/$id', params: { id: String(id) } })}
        onCreate={() => setCreateOpen(true)}
      />
      <CreateServerDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => setCreateOpen(false)} />
    </div>
  )
}

/* -- SERVER LIST ------------------------------------------------- */
function ServerList({ onSelect, onCreate }: { onSelect: (id: number) => void; onCreate: () => void }) {
  const [data, setData] = useState<PaginatedResponse<AdminServer> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getServers(page)
      .then(setData)
      .catch(() => toast.error('Failed to load servers'))
      .finally(() => setLoading(false))
  }, [page])

  const servers = data?.data ?? []
  const pagination = data?.meta.pagination

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
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Servers</h1>
        <Button onClick={onCreate}>Create Server</Button>
      </div>

      {loading && !data ? (
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.08]">
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
                </TableRow>
              </TableHeader>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
                {servers.map(({ attributes: s }, index) => (
                  <motion.tr
                    key={s.id}
                    variants={staggerItem}
                    custom={index}
                    className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
                    onClick={() => onSelect(s.id)}
                  >
                    <TableCell className="font-mono text-zinc-300">{s.id}</TableCell>
                    <TableCell className="text-white font-medium">{s.name}</TableCell>
                    <TableCell className="text-zinc-300">{s.user}</TableCell>
                    <TableCell className="text-zinc-300">{s.node}</TableCell>
                    <TableCell>{statusBadge(s)}</TableCell>
                    <TableCell className="text-zinc-300">{s.limits.memory} MB</TableCell>
                    <TableCell className="text-zinc-300">{s.limits.disk} MB</TableCell>
                    <TableCell className="text-zinc-300">{s.limits.cpu}%</TableCell>
                  </motion.tr>
                ))}
              </motion.tbody>
            </Table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-zinc-400">
                Page {pagination.current_page} of {pagination.total_pages} ({pagination.total} servers)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.current_page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.current_page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

/* -- CREATE SERVER DIALOG ---------------------------------------- */
function CreateServerDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void
}) {
  const [createForm, setCreateForm] = useState<CreateServerForm>(emptyCreateForm)
  const [creating, setCreating] = useState(false)
  const [availableNodes, setAvailableNodes] = useState<AdminNode[]>([])
  const [availableNests, setAvailableNests] = useState<AdminNest[]>([])
  const [availableEggs, setAvailableEggs] = useState<AdminEgg[]>([])
  const [availableAllocations, setAvailableAllocations] = useState<AdminAllocation[]>([])
  const [ownerSearch, setOwnerSearch] = useState('')
  const [ownerResults, setOwnerResults] = useState<AdminUser[]>([])
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false)
  const ownerDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [showNewNestForm, setShowNewNestForm] = useState(false)
  const [newNestName, setNewNestName] = useState('')
  const [creatingNewNest, setCreatingNewNest] = useState(false)

  useEffect(() => {
    if (!open) return
    setCreateForm(emptyCreateForm)
    setAvailableEggs([])
    setAvailableAllocations([])
    setOwnerSearch('')
    setOwnerResults([])
    setOwnerDropdownOpen(false)
    setShowNewNestForm(false)
    setNewNestName('')
    Promise.all([getNodes(1), getNests(1)]).then(([nodesRes, nestsRes]) => {
      setAvailableNodes(nodesRes.data.map((d) => d.attributes))
      const nests = nestsRes.data.map((d) => d.attributes)
      setAvailableNests(nests)
      if (nests.length > 0) {
        const firstNestId = String(nests[0].id)
        setCreateForm((f) => ({ ...f, nest_id: firstNestId }))
        getEggs(nests[0].id)
          .then((eggsRes) => {
            const eggs = eggsRes.data.map((d) => d.attributes)
            setAvailableEggs(eggs)
            if (eggs.length > 0) setCreateForm((f) => ({ ...f, egg_id: String(eggs[0].id) }))
          })
          .catch(() => {})
      }
    })
  }, [open])

  useEffect(() => {
    if (ownerSearch.length < 2 || /^\d+$/.test(ownerSearch)) {
      setOwnerResults([])
      setOwnerDropdownOpen(false)
      return
    }
    clearTimeout(ownerDebounceRef.current)
    ownerDebounceRef.current = setTimeout(async () => {
      try {
        const res = await searchUsers(ownerSearch)
        const users = res.data.map((d) => d.attributes)
        setOwnerResults(users)
        setOwnerDropdownOpen(users.length > 0)
      } catch {
        setOwnerResults([])
        setOwnerDropdownOpen(false)
      }
    }, 300)
    return () => clearTimeout(ownerDebounceRef.current)
  }, [ownerSearch])

  const setField = (key: keyof CreateServerForm, value: string) =>
    setCreateForm((f) => ({ ...f, [key]: value }))

  const handleNestChange = async (nestId: string) => {
    setCreateForm((f) => ({ ...f, nest_id: nestId, egg_id: '' }))
    try {
      const res = await getEggs(Number(nestId))
      setAvailableEggs(res.data.map((d) => d.attributes))
    } catch { setAvailableEggs([]) }
  }

  const handleNodeChange = async (nodeId: string) => {
    setCreateForm((f) => ({ ...f, node_id: nodeId, allocation_id: '' }))
    try {
      const res = await getAllocations(Number(nodeId), 1)
      setAvailableAllocations(res.data.map((d) => d.attributes).filter((a) => !a.assigned))
    } catch { setAvailableAllocations([]) }
  }

  const handleCreateNest = async () => {
    if (!newNestName.trim()) return
    setCreatingNewNest(true)
    try {
      const res = await createNest({ name: newNestName.trim() })
      const nest = res.attributes
      setAvailableNests((prev) => [...prev, nest])
      handleNestChange(String(nest.id))
      setNewNestName('')
      setShowNewNestForm(false)
      toast.success(`Nest "${nest.name}" created`)
    } catch { toast.error('Failed to create nest') }
    finally { setCreatingNewNest(false) }
  }

  const handleCreateServer = async () => {
    const selectedEgg = availableEggs.find((e) => e.id === Number(createForm.egg_id))
    if (!selectedEgg) return
    setCreating(true)
    try {
      await createServer({
        name: createForm.name,
        owner_id: Number(createForm.owner_id),
        node_id: Number(createForm.node_id),
        allocation_id: Number(createForm.allocation_id),
        nest_id: Number(createForm.nest_id),
        egg_id: Number(createForm.egg_id),
        startup: selectedEgg.startup,
        image: selectedEgg.docker_image,
        memory: Number(createForm.memory),
        swap: Number(createForm.swap),
        disk: Number(createForm.disk),
        io: Number(createForm.io),
        cpu: Number(createForm.cpu),
        description: createForm.description || undefined,
      })
      toast.success('Server created')
      onOpenChange(false)
      onCreated()
    } catch { toast.error('Failed to create server') }
    finally { setCreating(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border-white/[0.08] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Server</DialogTitle>
          <DialogDescription>Provision a new server on the panel.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Server Name</Label>
            <Input value={createForm.name} onChange={(e) => setField('name', e.target.value)} placeholder="My Server" />
          </div>
          <div className="space-y-1 relative">
            <Label>Owner</Label>
            <Input
              value={ownerSearch || createForm.owner_id}
              onChange={(e) => {
                const val = e.target.value
                setOwnerSearch(val)
                if (/^\d+$/.test(val)) setField('owner_id', val)
                else setField('owner_id', '')
              }}
              placeholder="Search username/email or enter ID..."
            />
            {ownerDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-[#0a0a0a] border border-white/[0.08] rounded-md shadow-lg max-h-48 overflow-y-auto">
                {ownerResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.06] transition-colors"
                    onClick={() => {
                      setField('owner_id', String(user.id))
                      setOwnerSearch(`${user.username} (${user.email})`)
                      setOwnerDropdownOpen(false)
                    }}
                  >
                    <span className="text-white">{user.username}</span>
                    <span className="text-zinc-500 ml-1">({user.email})</span>
                    <span className="text-zinc-600 ml-1">-- ID: {user.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Node</Label>
              <SearchableDropdown
                items={availableNodes.map((n) => ({ id: String(n.id), label: n.name }))}
                value={createForm.node_id}
                onSelect={handleNodeChange}
                placeholder="Select node..."
              />
            </div>
            <div className="space-y-1">
              <Label>Allocation</Label>
              <SearchableDropdown
                items={availableAllocations.map((a) => ({ id: String(a.id), label: `${a.ip}:${a.port}` }))}
                value={createForm.allocation_id}
                onSelect={(v) => setField('allocation_id', v)}
                placeholder="Select port..."
                disabled={!createForm.node_id}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nest</Label>
              <SearchableDropdown
                items={availableNests.map((n) => ({ id: String(n.id), label: n.name }))}
                value={createForm.nest_id}
                onSelect={handleNestChange}
                placeholder="Select nest..."
                footer={
                  <div className="border-t border-white/[0.08]">
                    {showNewNestForm ? (
                      <div className="p-2 flex gap-2">
                        <input
                          value={newNestName}
                          onChange={(e) => setNewNestName(e.target.value)}
                          placeholder="Nest name..."
                          className="flex-1 px-2 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder:text-zinc-500 outline-none"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNest() }}
                        />
                        <Button size="xs" onClick={handleCreateNest} disabled={creatingNewNest || !newNestName.trim()}>
                          {creatingNewNest ? '...' : 'Add'}
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-white/[0.06]"
                        onClick={() => setShowNewNestForm(true)}
                      >
                        + Create new nest
                      </button>
                    )}
                  </div>
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Egg</Label>
              <SearchableDropdown
                items={availableEggs.map((e) => ({ id: String(e.id), label: e.name }))}
                value={createForm.egg_id}
                onSelect={(v) => setField('egg_id', v)}
                placeholder="Select egg..."
                disabled={!createForm.nest_id}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Memory (MB)</Label>
              <Input value={createForm.memory} onChange={(e) => setField('memory', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Disk (MB)</Label>
              <Input value={createForm.disk} onChange={(e) => setField('disk', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>CPU (%)</Label>
              <Input value={createForm.cpu} onChange={(e) => setField('cpu', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Swap (MB)</Label>
              <Input value={createForm.swap} onChange={(e) => setField('swap', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>IO Weight</Label>
              <Input value={createForm.io} onChange={(e) => setField('io', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={createForm.description} onChange={(e) => setField('description', e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleCreateServer}
            disabled={creating || !createForm.name || !createForm.owner_id || !createForm.node_id || !createForm.allocation_id || !createForm.nest_id || !createForm.egg_id}
          >
            {creating ? 'Creating...' : 'Create Server'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
