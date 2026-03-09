import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getApiKeys,
  createApiKey,
  deleteApiKey,
  type AdminApiKey,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { motion, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/api' as any)({
  component: AdminApiKeysPage,
})

const API_RESOURCES = [
  { key: 'users', label: 'Users' },
  { key: 'servers', label: 'Servers' },
  { key: 'nodes', label: 'Nodes' },
  { key: 'locations', label: 'Locations' },
  { key: 'nests', label: 'Nests' },
  { key: 'allocations', label: 'Allocations' },
  { key: 'databases', label: 'Databases' },
  { key: 'server-databases', label: 'Server Databases' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'mounts', label: 'Mounts' },
] as const

const PERMISSION_LEVELS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Read' },
  { value: 2, label: 'Read & Write' },
] as const

function defaultPermissions(): Record<string, number> {
  return Object.fromEntries(API_RESOURCES.map((r) => [r.key, 0]))
}

function AdminApiKeysPage() {
  const [keys, setKeys] = useState<AdminApiKey[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminApiKey | null>(null)
  const [secretDialogOpen, setSecretDialogOpen] = useState(false)
  const [newSecret, setNewSecret] = useState('')

  const [description, setDescription] = useState('')
  const [allowedIps, setAllowedIps] = useState('')
  const [permissions, setPermissions] = useState<Record<string, number>>(defaultPermissions)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchKeys = () => {
    setLoading(true)
    getApiKeys()
      .then((res) => {
        const items = (res as any).data ?? res
        const mapped = Array.isArray(items)
          ? items.map((item: any) => item.attributes ?? item)
          : []
        setKeys(mapped)
      })
      .catch(() => toast.error('Failed to load API keys'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const openCreate = () => {
    setDescription('')
    setAllowedIps('')
    setPermissions(defaultPermissions())
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      const ips = allowedIps
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean)
      const res = await createApiKey({
        description,
        allowed_ips: ips.length > 0 ? ips : undefined,
        permissions,
      })
      const secret = (res as any).meta?.secret_token ?? (res as any).secret_token ?? ''
      toast.success('API key created')
      setCreateOpen(false)
      setNewSecret(secret)
      setSecretDialogOpen(true)
      fetchKeys()
    } catch {
      toast.error('Failed to create API key')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteApiKey(deleteTarget.id)
      toast.success('API key deleted')
      setDeleteTarget(null)
      fetchKeys()
    } catch {
      toast.error('Failed to delete API key')
    } finally {
      setSubmitting(false)
    }
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(newSecret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : 'Never'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <Button onClick={openCreate}>Create API Key</Button>
      </div>

      {loading && keys.length === 0 ? (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>Identifier</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.08]">
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : keys.length === 0 ? (
        <div className="text-zinc-400 py-12 text-center">No API keys found.</div>
      ) : (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>Identifier</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {keys.map((key, index) => (
                <motion.tr
                  key={key.id}
                  variants={staggerItem}
                  custom={index}
                  className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors duration-150"
                >
                  <TableCell className="font-mono text-sm">{key.identifier}</TableCell>
                  <TableCell className="text-zinc-300">{key.description || '-'}</TableCell>
                  <TableCell className="text-zinc-400">{formatDate(key.last_used_at)}</TableCell>
                  <TableCell className="text-zinc-400">{formatDate(key.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(key)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </motion.tbody>
          </Table>
        </div>
      )}

      {/* Create API Key Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="api-description">Description</Label>
              <Input
                id="api-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this key for?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="api-ips">Allowed IPs</Label>
              <Input
                id="api-ips"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="Leave blank for any, or comma-separated IPs"
              />
              <p className="text-xs text-zinc-500">
                Comma-separated list of IPs allowed to use this key. Leave blank to allow all.
              </p>
            </div>

            {/* Permissions Table */}
            <div className="grid gap-2">
              <Label>Permissions</Label>
              <div className="border border-white/[0.08] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                      <th className="text-left px-4 py-2.5 font-medium text-zinc-300">Resource</th>
                      {PERMISSION_LEVELS.map((level) => (
                        <th key={level.value} className="px-4 py-2.5 text-center font-medium text-zinc-300 w-28">
                          {level.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {API_RESOURCES.map((resource, idx) => (
                      <tr
                        key={resource.key}
                        className={`border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors ${idx === API_RESOURCES.length - 1 ? 'border-b-0' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-zinc-300">{resource.label}</td>
                        {PERMISSION_LEVELS.map((level) => (
                          <td key={level.value} className="px-4 py-2.5 text-center">
                            <input
                              type="radio"
                              name={`perm-${resource.key}`}
                              checked={permissions[resource.key] === level.value}
                              onChange={() =>
                                setPermissions((prev) => ({ ...prev, [resource.key]: level.value }))
                              }
                              className="h-4 w-4 cursor-pointer accent-blue-500"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !description}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret Token Dialog */}
      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-sm text-amber-400">
              This token will only be shown once. Please copy it now and store it securely.
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={newSecret}
                className="font-mono text-sm"
              />
              <Button variant="outline" onClick={copySecret}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSecretDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete the API key{' '}
            <span className="text-white font-medium">{deleteTarget?.identifier}</span>? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
