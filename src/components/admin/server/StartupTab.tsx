import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  type AdminServer, type AdminNest, type AdminEgg,
  updateServerStartup, getNests, getEggs, getEggVariables,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EggVariable {
  id: number
  name: string
  description: string
  env_variable: string
  default_value: string
  server_value?: string
  user_viewable: boolean
  user_editable: boolean
  rules: string
}

export default function StartupTab({ server, onSaved }: { server: AdminServer; onSaved: () => void }) {
  const [startup, setStartup] = useState(server.container?.startup_command || '')
  const [nestId, setNestId] = useState(server.nest)
  const [eggId, setEggId] = useState(server.egg)
  const [image, setImage] = useState(server.container?.image || '')
  const [nests, setNests] = useState<AdminNest[]>([])
  const [eggs, setEggs] = useState<AdminEgg[]>([])
  const [variables, setVariables] = useState<EggVariable[]>([])
  const [envValues, setEnvValues] = useState<Record<string, string>>({})
  const [defaultStartup, setDefaultStartup] = useState('')
  const [dockerImages, setDockerImages] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getNests(1).then((res) => setNests(res.data.map((d) => d.attributes))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!nestId) return
    getEggs(nestId).then((res) => {
      const eggList = res.data.map((d) => d.attributes)
      setEggs(eggList)
      const currentEgg = eggList.find((e) => e.id === eggId)
      if (currentEgg) {
        setDefaultStartup(currentEgg.startup)
        setDockerImages(currentEgg.docker_images || {})
      }
    }).catch(() => setEggs([]))
  }, [nestId])

  useEffect(() => {
    if (!nestId || !eggId) return
    const egg = eggs.find((e) => e.id === eggId)
    if (egg) {
      setDefaultStartup(egg.startup)
      setDockerImages(egg.docker_images || {})
    }
    getEggVariables(nestId, eggId).then((res) => {
      const vars = res.data.map((d) => d.attributes) as EggVariable[]
      setVariables(vars)
      const defaults: Record<string, string> = {}
      vars.forEach((v) => { defaults[v.env_variable] = v.server_value ?? v.default_value })
      setEnvValues(defaults)
    }).catch(() => setVariables([]))
  }, [eggId, eggs])

  const handleNestChange = (id: string) => {
    const nid = Number(id)
    setNestId(nid)
    setEggId(0)
    setVariables([])
    setEnvValues({})
  }

  const handleEggChange = (id: string) => {
    setEggId(Number(id))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateServerStartup(server.id, {
        startup,
        nest_id: nestId,
        egg_id: eggId,
        image,
        environment: envValues,
      })
      toast.success('Startup configuration updated')
      onSaved()
    } catch {
      toast.error('Failed to update startup')
    } finally {
      setSaving(false)
    }
  }

  const imageEntries = Object.entries(dockerImages)

  return (
    <div className="max-w-3xl mt-4 space-y-6">
      <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Startup Command</h2>
        <Textarea value={startup} onChange={(e) => setStartup(e.target.value)} rows={3} className="font-mono text-sm" />
        {defaultStartup && (
          <div className="space-y-1">
            <Label className="text-zinc-500">Default Startup (from egg)</Label>
            <pre className="bg-black/40 rounded-lg p-3 text-xs text-zinc-400 font-mono overflow-x-auto">{defaultStartup}</pre>
          </div>
        )}
      </div>

      <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Service Configuration</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Nest</Label>
            <Select value={String(nestId)} onValueChange={handleNestChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select nest" /></SelectTrigger>
              <SelectContent>
                {nests.map((n) => <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Egg</Label>
            <Select value={String(eggId)} onValueChange={handleEggChange} disabled={!nestId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select egg" /></SelectTrigger>
              <SelectContent>
                {eggs.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Docker Image</Label>
          {imageEntries.length > 0 ? (
            <Select value={image} onValueChange={setImage}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select image" /></SelectTrigger>
              <SelectContent>
                {imageEntries.map(([label, img]) => (
                  <SelectItem key={img} value={img}>{label} ({img})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Docker image" />
          )}
        </div>
      </div>

      {variables.length > 0 && (
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Environment Variables</h2>
          <div className="space-y-3">
            {variables.map((v) => (
              <div key={v.env_variable} className="space-y-1">
                <Label>{v.name} <span className="text-zinc-500 font-mono text-xs ml-1">{v.env_variable}</span></Label>
                <Input
                  value={envValues[v.env_variable] ?? ''}
                  onChange={(e) => setEnvValues((prev) => ({ ...prev, [v.env_variable]: e.target.value }))}
                />
                {v.description && <p className="text-xs text-zinc-500">{v.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </div>
  )
}
