import { type AdminServer } from '@/lib/api/admin'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TableRow className="border-white/[0.08]">
      <TableCell className="text-zinc-400 font-medium w-1/3">{label}</TableCell>
      <TableCell>{children}</TableCell>
    </TableRow>
  )
}

export default function AboutTab({ server }: { server: AdminServer }) {
  const cpuDisplay = server.limits.cpu === 0 ? 'Unlimited' : `${server.limits.cpu}%`
  const diskDisplay = server.limits.disk === 0 ? 'Unlimited' : `${server.limits.disk} MiB`
  const threadsDisplay = server.limits.threads || null
  const defaultConnection = `${server.allocation}`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
      <div className="lg:col-span-2">
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.08]">
            <h2 className="text-lg font-semibold">Information</h2>
          </div>
          <Table>
            <TableBody>
              <InfoRow label="Internal ID">{server.id}</InfoRow>
              <InfoRow label="External ID">
                {server.external_id || <Badge variant="outline" className="text-zinc-500">Not Set</Badge>}
              </InfoRow>
              <InfoRow label="UUID">
                <span className="font-mono text-sm">{server.uuid}</span>
              </InfoRow>
              <InfoRow label="Current Egg">
                <span>{server.nest}::{server.egg}</span>
              </InfoRow>
              <InfoRow label="Server Name">{server.name}</InfoRow>
              <InfoRow label="CPU Limit">
                {server.limits.cpu === 0
                  ? <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">Unlimited</Badge>
                  : cpuDisplay}
              </InfoRow>
              <InfoRow label="CPU Pinning">
                {threadsDisplay
                  ? <span className="font-mono text-sm">{threadsDisplay}</span>
                  : <Badge variant="outline" className="text-zinc-500">Not Set</Badge>}
              </InfoRow>
              <InfoRow label="Memory">{server.limits.memory} MiB</InfoRow>
              <InfoRow label="Swap">{server.limits.swap} MiB</InfoRow>
              <InfoRow label="Disk">
                {server.limits.disk === 0
                  ? <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">Unlimited</Badge>
                  : diskDisplay}
              </InfoRow>
              <InfoRow label="Block IO Weight">{server.limits.io}</InfoRow>
              <InfoRow label="Default Connection">
                <span className="font-mono text-sm">{defaultConnection}</span>
              </InfoRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4">
        {server.suspended && (
          <div className="border border-red-500/30 rounded-xl p-5 bg-red-500/5">
            <h3 className="text-sm font-semibold text-red-400 mb-1">Suspended</h3>
            <p className="text-xs text-zinc-400">This server is currently suspended and inaccessible to users.</p>
          </div>
        )}

        {server.status === 'installing' && (
          <div className="border border-yellow-500/30 rounded-xl p-5 bg-yellow-500/5">
            <h3 className="text-sm font-semibold text-yellow-400 mb-1">Installing</h3>
            <p className="text-xs text-zinc-400">This server is currently running its installation process.</p>
          </div>
        )}

        <div className="border border-white/[0.08] rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Server Owner</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">User ID</span>
            <a href={`/admin/users?id=${server.user}`} className="text-blue-400 hover:underline">
              {server.user}
            </a>
          </div>
        </div>

        <div className="border border-white/[0.08] rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Server Node</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Node ID</span>
            <a href={`/admin/nodes?id=${server.node}`} className="text-blue-400 hover:underline">
              {server.node}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
