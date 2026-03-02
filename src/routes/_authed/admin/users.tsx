import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  type AdminUser,
  type PaginatedResponse,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

export const Route = createFileRoute('/_authed/admin/users' as any)({
  component: AdminUsersPage,
})

interface UserFormData {
  username: string
  email: string
  password: string
  name_first: string
  name_last: string
  root_admin: boolean
}

const emptyForm: UserFormData = {
  username: '',
  email: '',
  password: '',
  name_first: '',
  name_last: '',
  root_admin: false,
}

function AdminUsersPage() {
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const [form, setForm] = useState<UserFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchUsers = (p: number) => {
    setLoading(true)
    getUsers(p)
      .then(setData)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers(page)
  }, [page])

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await createUser({
        username: form.username,
        email: form.email,
        name_first: form.name_first,
        name_last: form.name_last || undefined,
        password: form.password || undefined,
        root_admin: form.root_admin,
      })
      toast.success('User created')
      setCreateOpen(false)
      setForm(emptyForm)
      fetchUsers(page)
    } catch {
      toast.error('Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!editUser) return
    setSubmitting(true)
    try {
      await updateUser(editUser.id, {
        username: form.username,
        email: form.email,
        name_first: form.name_first,
        name_last: form.name_last,
        root_admin: form.root_admin,
        ...(form.password ? { password: form.password } : {}),
      })
      toast.success('User updated')
      setEditUser(null)
      setForm(emptyForm)
      fetchUsers(page)
    } catch {
      toast.error('Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteUser(deleteTarget.id)
      toast.success('User deleted')
      setDeleteTarget(null)
      fetchUsers(page)
    } catch {
      toast.error('Failed to delete user')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (user: AdminUser) => {
    setForm({
      username: user.username,
      email: user.email,
      password: '',
      name_first: user.first_name ?? '',
      name_last: user.last_name ?? '',
      root_admin: user.root_admin,
    })
    setEditUser(user)
  }

  const openCreate = () => {
    setForm(emptyForm)
    setCreateOpen(true)
  }

  const users = data?.data ?? []
  const pagination = data?.meta?.pagination

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={openCreate}>Create User</Button>
      </div>

      {loading && !data ? (
        <div className="text-zinc-400 py-12 text-center">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-zinc-400 py-12 text-center">No users found.</div>
      ) : (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((item) => {
                const user = item.attributes
                return (
                  <TableRow key={user.id} className="border-white/[0.08]">
                    <TableCell className="text-zinc-400">{user.id}</TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-zinc-300">{user.email}</TableCell>
                    <TableCell>
                      {user.root_admin ? (
                        <Badge variant="default">Admin</Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user['2fa_enabled'] ? (
                        <Badge variant="default">Enabled</Badge>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(user)}>
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
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-zinc-400">
            Showing {pagination.count} of {pagination.total} users
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm text-zinc-400">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete <span className="text-white font-medium">{deleteTarget?.username}</span>? This action cannot be undone.
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

function UserForm({
  form,
  setForm,
  isEdit = false,
}: {
  form: UserFormData
  setForm: React.Dispatch<React.SetStateAction<UserFormData>>
  isEdit?: boolean
}) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          placeholder="username"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="user@example.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{isEdit ? 'Password (leave blank to keep)' : 'Password'}</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder={isEdit ? '(unchanged)' : 'password'}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name_first">First Name</Label>
          <Input
            id="name_first"
            value={form.name_first}
            onChange={(e) => setForm((f) => ({ ...f, name_first: e.target.value }))}
            placeholder="First"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name_last">Last Name</Label>
          <Input
            id="name_last"
            value={form.name_last}
            onChange={(e) => setForm((f) => ({ ...f, name_last: e.target.value }))}
            placeholder="Last"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="root_admin">Administrator</Label>
        <Switch
          id="root_admin"
          checked={form.root_admin}
          onCheckedChange={(checked: boolean) => setForm((f) => ({ ...f, root_admin: checked }))}
        />
      </div>
    </div>
  )
}
