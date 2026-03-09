import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { type AdminMount, getMounts, addServerMount, removeServerMount } from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function MountsTab({ serverId }: { serverId: number }) {
  const [mounts, setMounts] = useState<AdminMount[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getMounts(1)
      .then((res) => setMounts(res.data.map((d) => d.attributes)))
      .catch(() => toast.error('Failed to load mounts'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const isMounted = (mount: AdminMount) =>
    mount.servers?.some((s) => s.id === serverId) ?? false

  const handleToggle = async (mount: AdminMount) => {
    setActionLoading(mount.id)
    try {
      if (isMounted(mount)) {
        await removeServerMount(serverId, mount.id)
        toast.success(`Mount "${mount.name}" removed`)
      } else {
        await addServerMount(serverId, mount.id)
        toast.success(`Mount "${mount.name}" added`)
      }
      load()
    } catch {
      toast.error(`Failed to ${isMounted(mount) ? 'remove' : 'add'} mount`)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <p className="text-zinc-400 mt-4">Loading mounts...</p>

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold mb-3">Available Mounts</h2>
      {mounts.length === 0 ? (
        <p className="text-zinc-400">No mounts configured on this panel.</p>
      ) : (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mounts.map((mount) => {
                const mounted = isMounted(mount)
                return (
                  <TableRow key={mount.id} className="border-white/[0.08]">
                    <TableCell>{mount.id}</TableCell>
                    <TableCell className="font-medium">{mount.name}</TableCell>
                    <TableCell className="font-mono text-sm text-zinc-400">{mount.source}</TableCell>
                    <TableCell className="font-mono text-sm text-zinc-400">{mount.target}</TableCell>
                    <TableCell>
                      {mounted
                        ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Mounted</Badge>
                        : <Badge variant="outline" className="text-zinc-500">Unmounted</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={mounted ? 'destructive' : 'outline'}
                        size="sm"
                        disabled={actionLoading === mount.id}
                        onClick={() => handleToggle(mount)}
                      >
                        {actionLoading === mount.id ? '...' : mounted ? 'Remove' : 'Add'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
