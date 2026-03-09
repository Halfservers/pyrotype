import { useState } from 'react'
import { toast } from 'sonner'
import { type AdminServer, deleteServer } from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export default function DeleteTab({ server, onDeleted }: { server: AdminServer; onDeleted: () => void }) {
  const [confirmType, setConfirmType] = useState<'safe' | 'force' | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirmType) return
    setDeleting(true)
    try {
      await deleteServer(server.id, confirmType === 'force')
      toast.success(`Server "${server.name}" deleted`)
      onDeleted()
    } catch {
      toast.error('Failed to delete server')
    } finally {
      setDeleting(false)
      setConfirmType(null)
    }
  }

  return (
    <div className="max-w-2xl mt-4 space-y-4">
      <div className="border border-red-500/20 rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-red-400">Safely Delete</h2>
        <p className="text-sm text-zinc-400">
          Attempt to gracefully delete this server by stopping it first, then removing all associated data.
          If the daemon is offline, the deletion will fail.
        </p>
        <Button variant="destructive" onClick={() => setConfirmType('safe')}>Delete Server</Button>
      </div>

      <div className="border border-red-500/20 rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-red-400">Force Delete</h2>
        <p className="text-sm text-zinc-400">
          Force delete this server from the panel. If the daemon is online, the server will also be removed
          from the daemon. If the daemon is offline, data may be left behind on the node.
        </p>
        <Button variant="destructive" onClick={() => setConfirmType('force')}>Force Delete Server</Button>
      </div>

      <Dialog open={!!confirmType} onOpenChange={(open) => { if (!open) setConfirmType(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmType === 'force' ? 'Force Delete Server' : 'Delete Server'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmType === 'force' ? 'force ' : ''}delete
              <strong> {server.name}</strong>? This action cannot be undone. All server data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmType(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
