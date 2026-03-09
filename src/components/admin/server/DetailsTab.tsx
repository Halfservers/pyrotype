import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { type AdminServer, type AdminUser, updateServerDetails, searchUsers } from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function DetailsTab({ server, onSaved }: { server: AdminServer; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: server.name,
    external_id: server.external_id || '',
    owner_id: String(server.user),
    description: server.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [ownerSearch, setOwnerSearch] = useState('')
  const [ownerResults, setOwnerResults] = useState<AdminUser[]>([])
  const [ownerOpen, setOwnerOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (ownerSearch.length < 2 || /^\d+$/.test(ownerSearch)) {
      setOwnerResults([])
      setOwnerOpen(false)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchUsers(ownerSearch)
        const users = res.data.map((d) => d.attributes)
        setOwnerResults(users)
        setOwnerOpen(users.length > 0)
      } catch {
        setOwnerResults([])
        setOwnerOpen(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [ownerSearch])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateServerDetails(server.id, {
        name: form.name,
        user: Number(form.owner_id),
        external_id: form.external_id || undefined,
        description: form.description || undefined,
      })
      toast.success('Server details updated')
      onSaved()
    } catch {
      toast.error('Failed to update server details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mt-4">
      <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Server Details</h2>
        <div className="space-y-1">
          <Label>Server Name</Label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>External ID</Label>
          <Input value={form.external_id} onChange={(e) => set('external_id', e.target.value)}
            placeholder="Optional external identifier" />
        </div>
        <div className="space-y-1 relative">
          <Label>Owner</Label>
          <Input
            value={ownerSearch || form.owner_id}
            onChange={(e) => {
              const val = e.target.value
              setOwnerSearch(val)
              if (/^\d+$/.test(val)) set('owner_id', val)
              else set('owner_id', '')
            }}
            placeholder="Search username/email or enter ID..."
          />
          {ownerOpen && (
            <div className="absolute z-50 w-full mt-1 bg-[#0a0a0a] border border-white/[0.08] rounded-md shadow-lg max-h-48 overflow-y-auto">
              {ownerResults.map((user) => (
                <button key={user.id} type="button"
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.06] transition-colors"
                  onClick={() => {
                    set('owner_id', String(user.id))
                    setOwnerSearch(`${user.username} (${user.email})`)
                    setOwnerOpen(false)
                  }}>
                  <span className="text-white">{user.username}</span>
                  <span className="text-zinc-500 ml-1">({user.email})</span>
                  <span className="text-zinc-600 ml-1">-- ID: {user.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving || !form.name || !form.owner_id}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
