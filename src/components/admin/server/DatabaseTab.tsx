import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  type AdminDatabase, type AdminDatabaseHost,
  getServerDatabases, createServerDatabase, resetDatabasePassword,
  deleteServerDatabase, getDatabaseHosts,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export default function DatabaseTab({ serverId }: { serverId: number }) {
  const [databases, setDatabases] = useState<AdminDatabase[]>([])
  const [hosts, setHosts] = useState<AdminDatabaseHost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<AdminDatabase | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({ host: '', database: '', remote: '%', max_connections: '0' })
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getServerDatabases(serverId),
      getDatabaseHosts(),
    ]).then(([dbRes, hostRes]) => {
      setDatabases(dbRes.data.map((d) => d.attributes))
      setHosts(hostRes.data.map((d) => d.attributes))
    }).catch(() => toast.error('Failed to load databases'))
      .finally(() => setLoading(false))
  }, [serverId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.host || !form.database) return
    setCreating(true)
    try {
      await createServerDatabase(serverId, {
        host: Number(form.host),
        database: form.database,
        remote: form.remote || '%',
      })
      toast.success('Database created')
      setForm({ host: '', database: '', remote: '%', max_connections: '0' })
      load()
    } catch {
      toast.error('Failed to create database')
    } finally {
      setCreating(false)
    }
  }

  const handleResetPassword = async (db: AdminDatabase) => {
    try {
      await resetDatabasePassword(serverId, db.id)
      toast.success(`Password reset for ${db.database}`)
    } catch {
      toast.error('Failed to reset password')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteServerDatabase(serverId, deleteTarget.id)
      toast.success(`Database ${deleteTarget.database} deleted`)
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Failed to delete database')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <p className="text-zinc-400 mt-4">Loading databases...</p>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold mb-3">Server Databases</h2>
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>Database</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Connections From</TableHead>
                <TableHead>Host</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {databases.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-zinc-400">No databases</TableCell></TableRow>
              ) : databases.map((db) => {
                const host = hosts.find((h) => h.id === db.host)
                return (
                  <TableRow key={db.id} className="border-white/[0.08]">
                    <TableCell className="font-mono text-sm">{db.database}</TableCell>
                    <TableCell className="font-mono text-sm">{db.username}</TableCell>
                    <TableCell>{db.remote}</TableCell>
                    <TableCell>{host ? `${host.host}:${host.port}` : db.host}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="xs" onClick={() => handleResetPassword(db)}>
                          Reset Password
                        </Button>
                        <Button variant="ghost" size="xs" className="text-red-400 hover:text-red-300"
                          onClick={() => setDeleteTarget(db)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="border border-white/[0.08] rounded-xl p-6 space-y-4 h-fit">
        <h2 className="text-lg font-semibold">Create Database</h2>
        <div className="space-y-1">
          <Label>Database Host</Label>
          <Select value={form.host} onValueChange={(v) => setForm((f) => ({ ...f, host: v }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select host" /></SelectTrigger>
            <SelectContent>
              {hosts.map((h) => <SelectItem key={h.id} value={String(h.id)}>{h.name} ({h.host}:{h.port})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Database Name</Label>
          <div className="flex items-center gap-0">
            <span className="text-sm text-zinc-500 bg-white/[0.04] border border-white/[0.08] border-r-0 rounded-l-md px-2 py-1.5">s{serverId}_</span>
            <Input value={form.database} onChange={(e) => setForm((f) => ({ ...f, database: e.target.value }))}
              className="rounded-l-none" placeholder="database_name" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Connections From</Label>
          <Input value={form.remote} onChange={(e) => setForm((f) => ({ ...f, remote: e.target.value }))} placeholder="%" />
        </div>
        <Button onClick={handleCreate} disabled={creating || !form.host || !form.database} className="w-full">
          {creating ? 'Creating...' : 'Create Database'}
        </Button>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Database</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.database}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
