import { createFileRoute } from '@tanstack/react-router'
import { useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getNodeConfiguration, getAutoDeployToken } from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NodeContext } from '../view.$id'

export const Route = createFileRoute('/_admin/admin/nodes/view/$id/configuration' as any)({
  component: ConfigurationTab,
})

function jsonToYaml(obj: Record<string, any>, indent = 0): string {
  const pad = '  '.repeat(indent)
  return Object.entries(obj).map(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) return `${pad}${k}:\n${jsonToYaml(v, indent + 1)}`
    if (Array.isArray(v)) return `${pad}${k}:\n${v.map((i) => `${pad}  - ${i}`).join('\n')}`
    return `${pad}${k}: ${v}`
  }).join('\n')
}

function ConfigurationTab() {
  const { node } = useContext(NodeContext)
  const [config, setConfig] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    getNodeConfiguration(node.id)
      .then((data) => setConfig(jsonToYaml(data)))
      .catch(() => setConfig('# Failed to load configuration'))
  }, [node.id])

  const handleGenerateToken = async () => {
    setGenerating(true)
    try {
      const res = await getAutoDeployToken(node.id)
      setToken(res.token)
      toast.success('Token generated')
    } catch { toast.error('Failed to generate token') }
    finally { setGenerating(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="border border-white/[0.08] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">Configuration File</h2>
        <pre className="bg-black/40 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto whitespace-pre font-mono max-h-[500px] overflow-y-auto">
          {config ?? 'Loading...'}
        </pre>
      </div>
      <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Auto-Deploy</h2>
        <p className="text-sm text-zinc-400">
          Use the button below to generate a token for the auto-deployment script. This token is used to provision the daemon on a new machine.
        </p>
        <Button onClick={handleGenerateToken} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Token'}
        </Button>
        {token && (
          <div className="space-y-2">
            <Label>Deploy Token</Label>
            <pre className="bg-black/40 rounded-lg p-3 text-sm text-green-400 font-mono break-all">{token}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
