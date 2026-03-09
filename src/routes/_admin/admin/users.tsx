import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  getUsers, getUser, createUser, updateUser, deleteUser, getServers,
  type AdminUser, type PaginatedResponse,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { motion, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/users' as any)({
  component: AdminUsersPage,
})

type ViewMode = 'list' | 'create' | 'detail'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Espanol' },
  { value: 'fr', label: 'Francais' },
  { value: 'pt', label: 'Portugues' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ru', label: 'Russian' },
]

/* -- Radio-style toggle button pair (matching nodes.tsx) ---------- */
function RadioPair({ value, onChange, options }: {
  value: boolean; onChange: (v: boolean) => void; options: [string, string]
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

/* ================================================================ */
function AdminUsersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const goToList = useCallback(() => { setViewMode('list'); setSelectedUserId(null) }, [])
  const goToDetail = useCallback((id: number) => { setSelectedUserId(id); setViewMode('detail') }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {viewMode === 'list' && <UserList onCreate={() => setViewMode('create')} onSelect={goToDetail} />}
      {viewMode === 'create' && <UserCreate onBack={goToList} onCreated={goToDetail} />}
      {viewMode === 'detail' && selectedUserId && (
        <UserDetail userId={selectedUserId} onBack={goToList} />
      )}
    </div>
  )
}

/* -- USER LIST --------------------------------------------------- */
function UserList({ onCreate, onSelect }: { onCreate: () => void; onSelect: (id: number) => void }) {
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    getUsers(page).then(setData).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false))
  }, [page])

  const users = data?.data ?? []
  const pagination = data?.meta?.pagination

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={onCreate}>Create User</Button>
      </div>

      {loading && !data ? (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>ID</TableHead><TableHead>Username</TableHead>
                <TableHead>Email</TableHead><TableHead>Admin</TableHead>
                <TableHead>2FA</TableHead><TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.08]">
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : users.length === 0 ? (
        <div className="text-zinc-400 py-12 text-center">No users found.</div>
      ) : (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>ID</TableHead><TableHead>Username</TableHead>
                <TableHead>Email</TableHead><TableHead>Admin</TableHead>
                <TableHead>2FA</TableHead><TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
              {users.map((item, index) => {
                const user = item.attributes
                return (
                  <motion.tr key={user.id} variants={staggerItem} custom={index}
                    className="border-b border-white/[0.08] cursor-pointer hover:bg-white/[0.03] transition-colors duration-150"
                    onClick={() => onSelect(user.id)}>
                    <TableCell className="text-zinc-400">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-zinc-300">{user.email}</TableCell>
                    <TableCell>
                      {user.root_admin
                        ? <Badge variant="default">Admin</Badge>
                        : <Badge variant="secondary">User</Badge>}
                    </TableCell>
                    <TableCell>
                      {user['2fa_enabled']
                        ? <Badge variant="default">Enabled</Badge>
                        : <Badge variant="outline">Disabled</Badge>}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </motion.tr>
                )
              })}
            </motion.tbody>
          </Table>
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-zinc-400">
            Showing {pagination.count} of {pagination.total} users
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="flex items-center px-3 text-sm text-zinc-400">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  )
}

/* -- USER CREATE (full-page form) -------------------------------- */
function UserCreate({ onBack, onCreated }: { onBack: () => void; onCreated: (id: number) => void }) {
  const [form, setForm] = useState({
    email: '', username: '', name_first: '', name_last: '',
    language: 'en', root_admin: false, password: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await createUser({
        username: form.username, email: form.email,
        name_first: form.name_first, name_last: form.name_last || undefined,
        password: form.password || undefined, root_admin: form.root_admin,
      })
      toast.success('User created')
      onCreated(res.attributes.id)
    } catch { toast.error('Failed to create user') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>&larr; Back</Button>
        <h1 className="text-2xl font-bold">Create User</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 border border-white/[0.08] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Identity</h2>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="space-y-1">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="username" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input value={form.name_first} onChange={(e) => set('name_first', e.target.value)} placeholder="First" />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={form.name_last} onChange={(e) => set('name_last', e.target.value)} placeholder="Last" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Language</Label>
            <Select value={form.language} onValueChange={(v) => set('language', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-4">
          <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Password</h2>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Optional" />
            </div>
            <p className="text-xs text-zinc-500">
              If left empty, the user will receive an email with a setup link to set their password.
            </p>
          </div>
          <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Permissions</h2>
            <div className="space-y-1">
              <Label>Root Admin</Label>
              <RadioPair value={form.root_admin} onChange={(v) => set('root_admin', v)} options={['Yes', 'No']} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

/* -- USER DETAIL ------------------------------------------------- */
function UserDetail({ userId, onBack }: { userId: number; onBack: () => void }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [serverCount, setServerCount] = useState<number | null>(null)

  const [form, setForm] = useState({
    email: '', username: '', name_first: '', name_last: '', language: 'en',
  })
  const [password, setPassword] = useState('')
  const [rootAdmin, setRootAdmin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPerms, setSavingPerms] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const loadUser = useCallback(() => {
    setLoading(true)
    getUser(userId)
      .then((r) => {
        const u = r.attributes
        setUser(u)
        setForm({
          email: u.email, username: u.username,
          name_first: u.first_name ?? '', name_last: u.last_name ?? '',
          language: u.language || 'en',
        })
        setRootAdmin(u.root_admin)
      })
      .catch(() => toast.error('Failed to load user'))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { loadUser() }, [loadUser])

  useEffect(() => {
    getServers(1).then((r) => {
      const owned = r.data.filter((s) => s.attributes.user === userId)
      setServerCount(owned.length > 0 ? owned.length : 0)
    }).catch(() => setServerCount(null))
  }, [userId])

  const handleSaveIdentity = async () => {
    setSaving(true)
    try {
      await updateUser(userId, {
        email: form.email, username: form.username,
        name_first: form.name_first, name_last: form.name_last,
        language: form.language,
      })
      toast.success('User updated')
      loadUser()
    } catch { toast.error('Failed to update user') }
    finally { setSaving(false) }
  }

  const handleSavePassword = async () => {
    if (!password) return
    setSavingPassword(true)
    try {
      await updateUser(userId, { password })
      toast.success('Password updated')
      setPassword('')
    } catch { toast.error('Failed to update password') }
    finally { setSavingPassword(false) }
  }

  const handleSavePermissions = async () => {
    setSavingPerms(true)
    try {
      await updateUser(userId, { root_admin: rootAdmin })
      toast.success('Permissions updated')
      loadUser()
    } catch { toast.error('Failed to update permissions') }
    finally { setSavingPerms(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteUser(userId)
      toast.success('User deleted')
      onBack()
    } catch { toast.error('Failed to delete user') }
    finally { setDeleting(false) }
  }

  if (loading || !user) return <p className="text-zinc-400">Loading user...</p>

  const hasServers = serverCount !== null && serverCount > 0

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>&larr; Back</Button>
        <h1 className="text-2xl font-bold">{user.username}</h1>
        {user.root_admin && <Badge variant="default" className="ml-1">Admin</Badge>}
        <span className="text-sm text-zinc-500 ml-2">{user.email}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column -- Identity */}
        <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Identity</h2>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => set('username', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input value={form.name_first} onChange={(e) => set('name_first', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={form.name_last} onChange={(e) => set('name_last', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Language</Label>
            <Select value={form.language} onValueChange={(v) => set('language', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveIdentity} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Password */}
          <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Password</h2>
            <div className="space-y-1">
              <Label>New Password</Label>
              <Input type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
            </div>
            <p className="text-xs text-zinc-500">Leave blank to keep the current password.</p>
            <div className="flex justify-end">
              <Button onClick={handleSavePassword} disabled={savingPassword || !password}>
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>

          {/* Permissions */}
          <div className="border border-white/[0.08] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Permissions</h2>
            <div className="space-y-1">
              <Label>Root Admin</Label>
              <RadioPair value={rootAdmin} onChange={setRootAdmin} options={['Yes', 'No']} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSavePermissions} disabled={savingPerms}>
                {savingPerms ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border border-red-500/20 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
            {hasServers ? (
              <p className="text-sm text-zinc-400">
                This user owns <span className="text-white font-medium">{serverCount}</span> server(s).
                All servers must be removed or transferred before the user can be deleted.
              </p>
            ) : (
              <p className="text-sm text-zinc-400">
                Deleting this user is permanent and cannot be undone.
              </p>
            )}
            <Button variant="destructive" disabled={hasServers}
              onClick={() => setDeleteOpen(true)}>
              Delete User
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{user.username}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
