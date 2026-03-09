import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getAllocations, createAllocations, removeMultipleAllocations,
  type AdminAllocation, type PaginatedResponse,
} from '@/lib/api/admin'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { NodeContext } from '../view.$id'

export const Route = createFileRoute('/_admin/admin/nodes/view/$id/allocation' as any)({
  component: AllocationTab,
})

function AllocationTab() {
  const { node } = useContext(NodeContext)
  const nodeId = node.id
  const [data, setData] = useState<PaginatedResponse<AdminAllocation> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [newIp, setNewIp] = useState('')
  const [newAlias, setNewAlias] = useState('')
  const [newPorts, setNewPorts] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback((p: number) => {
    setLoading(true)
    getAllocations(nodeId, p).then(setData).catch(() => toast.error('Failed to load allocations')).finally(() => setLoading(false))
  }, [nodeId])

  useEffect(() => { load(page) }, [page, load])

  const allocs = data?.data.map((d) => d.attributes) ?? []
  const pagination = data?.meta.pagination

  const toggleSelect = (id: number) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => {
    if (selected.size === allocs.length) setSelected(new Set())
    else setSelected(new Set(allocs.map((a) => a.id)))
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    try {
      await removeMultipleAllocations(nodeId, Array.from(selected))
      toast.success(`Deleted ${selected.size} allocation(s)`)
      setSelected(new Set())
      load(page)
    } catch { toast.error('Failed to delete allocations') }
  }

  const handleSubmitNew = async () => {
    if (!newIp || !newPorts) { toast.error('IP and ports are required'); return }
    setSubmitting(true)
    try {
      const ports = newPorts.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean)
      await createAllocations(nodeId, { ip: newIp, ports, alias: newAlias || undefined })
      toast.success('Allocations created')
      setNewIp(''); setNewAlias(''); setNewPorts('')
      load(page)
    } catch { toast.error('Failed to create allocations') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Existing Allocations</h2>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              Delete Selected ({selected.size})
            </Button>
          )}
        </div>
        {loading ? <p className="text-zinc-400">Loading...</p> : (
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.08]">
                  <TableHead className="w-10">
                    <Checkbox checked={allocs.length > 0 && selected.size === allocs.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>IP Alias</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-zinc-400">No allocations</TableCell></TableRow>
                ) : allocs.map((a) => (
                  <TableRow key={a.id} className="border-white/[0.08]">
                    <TableCell><Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggleSelect(a.id)} /></TableCell>
                    <TableCell>{a.ip}</TableCell>
                    <TableCell>{a.alias || '-'}</TableCell>
                    <TableCell>{a.port}</TableCell>
                    <TableCell>{a.assigned ? <Badge variant="secondary">Assigned</Badge> : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-zinc-400">Page {pagination.current_page} of {pagination.total_pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </div>
      <div className="border border-white/[0.08] rounded-xl p-6 space-y-4 h-fit">
        <h2 className="text-lg font-semibold">Assign New Allocations</h2>
        <div className="space-y-1"><Label>IP Address</Label><Input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="0.0.0.0" /></div>
        <div className="space-y-1"><Label>IP Alias</Label><Input value={newAlias} onChange={(e) => setNewAlias(e.target.value)} placeholder="Optional alias" /></div>
        <div className="space-y-1"><Label>Ports</Label><Textarea value={newPorts} onChange={(e) => setNewPorts(e.target.value)} rows={4} placeholder="25565&#10;25566-25570" /></div>
        <Button onClick={handleSubmitNew} disabled={submitting} className="w-full">{submitting ? 'Submitting...' : 'Submit'}</Button>
      </div>
    </div>
  )
}
