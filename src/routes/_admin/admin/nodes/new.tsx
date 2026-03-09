import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  createNode, getLocations,
  type AdminLocation,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/_admin/admin/nodes/new' as any)({
  component: NodeCreatePage,
})

const defaultForm = {
  name: '', description: '', location_id: 0, daemon_type: 'wings', backup_disk: 'wings',
  public: true, fqdn: '', internal_fqdn: '', scheme: 'https', behind_proxy: false,
  daemon_base: '/var/lib/elytra/volumes', memory: 0, memory_overallocate: 0,
  disk: 0, disk_overallocate: 0, daemon_listen: 8080, daemon_sftp: 2022,
  trust_alias: false,
}

function RadioPair({ value, onChange, options }: {
  value: boolean; onChange: (v: boolean) => void
  options: [string, string]
}) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(true)}
        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${value ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/10 text-zinc-400 hover:border-white/20'}`}>
        {options[0]}
      </button>
      <button type="button" onClick={() => onChange(false)}
        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${!value ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/10 text-zinc-400 hover:border-white/20'}`}>
        {options[1]}
      </button>
    </div>
  )
}

function NodeCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...defaultForm })
  const [locations, setLocations] = useState<AdminLocation[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getLocations(1).then((r) => setLocations(r.data.map((l) => l.attributes))).catch(() => {})
  }, [])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await createNode(form)
      toast.success('Node created')
      navigate({ to: '/admin/nodes/view/$id', params: { id: String(res.attributes.id) } })
    } catch { toast.error('Failed to create node') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/admin/nodes' })}>&larr; Back</Button>
        <h1 className="text-2xl font-bold">Create Node</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Basic Details */}
        <div className="space-y-4 border border-white/[0.08] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Basic Details</h2>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Node name" />
            <p className="text-xs text-zinc-500">Character limits: a-z A-Z 0-9 _ - . and [Space], 1 to 100 characters.</p>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Select value={String(form.location_id || '')} onValueChange={(v) => set('location_id', Number(v))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.short}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Daemon</Label>
              <Select value={form.daemon_type} onValueChange={(v) => set('daemon_type', v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wings">Wings</SelectItem>
                  <SelectItem value="elytra">Elytra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Backup Disk</Label>
              <Select value={form.backup_disk} onValueChange={(v) => set('backup_disk', v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wings">Wings</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="rustic_local">Rustic Local</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Node Visibility</Label>
            <RadioPair value={form.public} onChange={(v) => set('public', v)} options={['Public', 'Private']} />
          </div>
          <div className="space-y-1">
            <Label>Public FQDN</Label>
            <Input value={form.fqdn} onChange={(e) => set('fqdn', e.target.value)} placeholder="node.example.com" />
          </div>
          <div className="space-y-1">
            <Label>Internal FQDN (Optional)</Label>
            <Input value={form.internal_fqdn} onChange={(e) => set('internal_fqdn', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Communicate Over SSL</Label>
            <RadioPair value={form.scheme === 'https'} onChange={(v) => set('scheme', v ? 'https' : 'http')}
              options={['Use SSL Connection', 'Use HTTP Connection']} />
          </div>
          <div className="space-y-1">
            <Label>Behind Proxy</Label>
            <RadioPair value={!form.behind_proxy} onChange={(v) => set('behind_proxy', !v)}
              options={['Not Behind Proxy', 'Behind Proxy']} />
          </div>
        </div>

        {/* Right - Configuration */}
        <div className="space-y-4 border border-white/[0.08] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Configuration</h2>
          <div className="space-y-1">
            <Label>Daemon Server File Directory</Label>
            <Input value={form.daemon_base} onChange={(e) => set('daemon_base', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Total Memory (MiB)</Label>
              <Input type="number" value={form.memory} onChange={(e) => set('memory', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Memory Over-Allocation (%)</Label>
              <Input type="number" value={form.memory_overallocate} onChange={(e) => set('memory_overallocate', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Total Disk Space (MiB)</Label>
              <Input type="number" value={form.disk} onChange={(e) => set('disk', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Disk Over-Allocation (%)</Label>
              <Input type="number" value={form.disk_overallocate} onChange={(e) => set('disk_overallocate', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Daemon Port</Label>
              <Input type="number" value={form.daemon_listen} onChange={(e) => set('daemon_listen', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Daemon SFTP Port</Label>
              <Input type="number" value={form.daemon_sftp} onChange={(e) => set('daemon_sftp', Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleCreate} disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? 'Creating...' : 'Create Node'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
