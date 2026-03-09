import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  type AdminServer, type AdminAllocation,
  updateServerBuild, getAllocations,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function BuildTab({ server, onSaved }: { server: AdminServer; onSaved: () => void }) {
  const [form, setForm] = useState({
    cpu: server.limits.cpu,
    threads: server.limits.threads || '',
    memory: server.limits.memory,
    swap: server.limits.swap,
    disk: server.limits.disk,
    io: server.limits.io,
    oom_disabled: server.limits.oom_disabled,
    database_limit: server.feature_limits.databases,
    allocation_limit: server.feature_limits.allocations,
    backup_limit: server.feature_limits.backups,
    allocation_id: server.allocation,
  })
  const [allocations, setAllocations] = useState<AdminAllocation[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAllocations(server.node, 1)
      .then((res) => setAllocations(res.data.map((d) => d.attributes)))
      .catch(() => {})
  }, [server.node])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateServerBuild(server.id, {
        allocation_id: form.allocation_id,
        memory: form.memory,
        swap: form.swap,
        disk: form.disk,
        io: form.io,
        cpu: form.cpu,
        threads: form.threads || null,
        oom_disabled: form.oom_disabled,
        feature_limits: {
          databases: form.database_limit,
          allocations: form.allocation_limit,
          backups: form.backup_limit,
        },
      })
      toast.success('Server build updated')
      onSaved()
    } catch {
      toast.error('Failed to update server build')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      <div className="space-y-4">
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Resource Management</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>CPU Limit (%)</Label>
              <Input type="number" value={form.cpu} onChange={(e) => set('cpu', Number(e.target.value))} />
              <p className="text-xs text-zinc-500">Set to 0 for unlimited.</p>
            </div>
            <div className="space-y-1">
              <Label>CPU Pinning</Label>
              <Input value={form.threads} onChange={(e) => set('threads', e.target.value)} placeholder="e.g. 0,1,2" />
              <p className="text-xs text-zinc-500">Comma-separated thread list.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Memory (MiB)</Label>
              <Input type="number" value={form.memory} onChange={(e) => set('memory', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Swap (MiB)</Label>
              <Input type="number" value={form.swap} onChange={(e) => set('swap', Number(e.target.value))} />
              <p className="text-xs text-zinc-500">0 = disabled, -1 = unlimited.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Disk (MiB)</Label>
              <Input type="number" value={form.disk} onChange={(e) => set('disk', Number(e.target.value))} />
              <p className="text-xs text-zinc-500">Set to 0 for unlimited.</p>
            </div>
            <div className="space-y-1">
              <Label>Block IO Weight</Label>
              <Input type="number" min={10} max={1000} value={form.io} onChange={(e) => set('io', Number(e.target.value))} />
              <p className="text-xs text-zinc-500">Range: 10-1000.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={form.oom_disabled} onCheckedChange={(v) => set('oom_disabled', !!v)} />
            <Label className="mb-0">OOM Killer Disabled</Label>
          </div>
        </div>

        <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Feature Limits</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Databases</Label>
              <Input type="number" value={form.database_limit} onChange={(e) => set('database_limit', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Allocations</Label>
              <Input type="number" value={form.allocation_limit} onChange={(e) => set('allocation_limit', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Backups</Label>
              <Input type="number" value={form.backup_limit} onChange={(e) => set('backup_limit', Number(e.target.value))} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Allocation Management</h2>
          <div className="space-y-1">
            <Label>Primary Allocation</Label>
            <Select value={String(form.allocation_id)} onValueChange={(v) => set('allocation_id', Number(v))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select allocation" /></SelectTrigger>
              <SelectContent>
                {allocations.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.ip}:{a.port}{a.alias ? ` (${a.alias})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </div>
  )
}
