import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  type AdminServer, type AdminNode, type AdminAllocation,
  reinstallServer, toggleServerInstall, suspendServer, unsuspendServer,
  transferServer, getNodes, getAllocations,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

function ActionSection({ title, description, variant, buttonText, onClick, disabled }: {
  title: string; description: string; variant?: 'destructive' | 'outline'
  buttonText: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <div className={`border rounded-xl p-5 space-y-3 ${variant === 'destructive' ? 'border-red-500/20' : 'border-white/[0.08]'}`}>
      <h3 className={`text-sm font-semibold ${variant === 'destructive' ? 'text-red-400' : ''}`}>{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
      <Button variant={variant || 'outline'} onClick={onClick} disabled={disabled}>{buttonText}</Button>
    </div>
  )
}

export default function ManageTab({ server, onSaved }: { server: AdminServer; onSaved: () => void }) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const [nodes, setNodes] = useState<AdminNode[]>([])
  const [targetNode, setTargetNode] = useState('')
  const [allocations, setAllocations] = useState<AdminAllocation[]>([])
  const [targetAlloc, setTargetAlloc] = useState('')
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    getNodes(1).then((res) => setNodes(res.data.map((d) => d.attributes).filter((n) => n.id !== server.node))).catch(() => {})
  }, [server.node])

  useEffect(() => {
    if (!targetNode) { setAllocations([]); setTargetAlloc(''); return }
    getAllocations(Number(targetNode), 1)
      .then((res) => setAllocations(res.data.map((d) => d.attributes).filter((a) => !a.assigned)))
      .catch(() => setAllocations([]))
  }, [targetNode])

  const runAction = async (action: string) => {
    setActing(true)
    try {
      switch (action) {
        case 'reinstall': await reinstallServer(server.id); toast.success('Reinstall started'); break
        case 'toggle-install': await toggleServerInstall(server.id); toast.success('Install status toggled'); break
        case 'suspend': await suspendServer(server.id); toast.success('Server suspended'); break
        case 'unsuspend': await unsuspendServer(server.id); toast.success('Server unsuspended'); break
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${action} server`)
    } finally {
      setActing(false)
      setConfirmAction(null)
    }
  }

  const handleTransfer = async () => {
    if (!targetNode || !targetAlloc) return
    setTransferring(true)
    try {
      await transferServer(server.id, { node_id: Number(targetNode), allocation_id: Number(targetAlloc) })
      toast.success('Transfer initiated')
      onSaved()
    } catch {
      toast.error('Failed to initiate transfer')
    } finally {
      setTransferring(false)
    }
  }

  const isInstalled = !!server.container?.installed_at

  return (
    <div className="max-w-2xl mt-4 space-y-4">
      {isInstalled && (
        <ActionSection title="Reinstall Server" buttonText="Reinstall"
          description="This will reinstall the server with its current egg. All data will be wiped."
          variant="destructive" onClick={() => setConfirmAction('reinstall')} />
      )}

      <ActionSection title="Toggle Install Status"
        buttonText={isInstalled ? 'Mark as Not Installed' : 'Mark as Installed'}
        description={isInstalled ? 'Mark this server as not installed. It will show as installing.' : 'Mark this server as installed.'}
        onClick={() => setConfirmAction('toggle-install')} />

      <ActionSection
        title={server.suspended ? 'Unsuspend Server' : 'Suspend Server'}
        buttonText={server.suspended ? 'Unsuspend' : 'Suspend'}
        description={server.suspended ? 'Allow this server to be accessed by users again.' : 'Suspend this server to prevent user access.'}
        variant={server.suspended ? 'outline' : 'destructive'}
        onClick={() => setConfirmAction(server.suspended ? 'unsuspend' : 'suspend')} />

      <div className="border border-white/[0.08] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Transfer Server</h3>
        <p className="text-sm text-zinc-400">Move this server to a different node.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Target Node</label>
            <Select value={targetNode} onValueChange={setTargetNode}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select node" /></SelectTrigger>
              <SelectContent>
                {nodes.map((n) => <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Primary Allocation</label>
            <Select value={targetAlloc} onValueChange={setTargetAlloc} disabled={!targetNode}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select allocation" /></SelectTrigger>
              <SelectContent>
                {allocations.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.ip}:{a.port}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleTransfer} disabled={transferring || !targetNode || !targetAlloc}>
          {transferring ? 'Transferring...' : 'Transfer'}
        </Button>
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmAction?.replace('-', ' ')} this server? This action may be destructive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmAction && runAction(confirmAction)} disabled={acting}>
              {acting ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
