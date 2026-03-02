import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

import { sshKeySchema, type SshKeyData } from '@/lib/validators/account'
import {
  useSSHKeysQuery,
  useCreateSSHKeyMutation,
  useDeleteSSHKeyMutation,
} from '@/lib/queries'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

export const Route = createFileRoute('/_authed/account/ssh' as any)({
  component: AccountSSHPage,
})

function AccountSSHPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteKey, setDeleteKey] = useState<{
    name: string
    fingerprint: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: keys, isLoading } = useSSHKeysQuery()
  const createSSHKey = useCreateSSHKeyMutation()
  const deleteSSHKey = useDeleteSSHKeyMutation()

  const form = useForm<SshKeyData>({
    resolver: zodResolver(sshKeySchema),
    defaultValues: { name: '', publicKey: '' },
  })

  const onCreateSubmit = async (values: SshKeyData) => {
    setError(null)
    try {
      await createSSHKey.mutateAsync(values)
      form.reset()
      setShowCreateModal(false)
    } catch (err: any) {
      setError(err.message || 'Failed to add SSH key.')
    }
  }

  const onDelete = async () => {
    if (!deleteKey) return
    try {
      await deleteSSHKey.mutateAsync(deleteKey.fingerprint)
      setDeleteKey(null)
    } catch (err: any) {
      setError(err.message || 'Failed to delete SSH key.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">SSH Keys</h2>
        <Button onClick={() => setShowCreateModal(true)}>Add SSH Key</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Card className="bg-[#ffffff09] border-[#ffffff12]">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
            </div>
          ) : !keys || keys.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-zinc-200 mb-2">No SSH Keys</h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                You haven't added any SSH keys yet. Add one to securely access your
                servers.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key: any) => (
                <div
                  key={key.fingerprint}
                  className="bg-[#ffffff05] border border-[#ffffff08] rounded-lg p-4 hover:border-[#ffffff15] transition-all duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-zinc-100 truncate">
                        {key.name}
                      </h4>
                      <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                        <span>
                          Added:{' '}
                          {new Date(key.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <code className="font-mono px-2 py-1 bg-[#ffffff08] border border-[#ffffff08] rounded text-zinc-300">
                          SHA256:{'*'.repeat(16)}
                        </code>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setDeleteKey({
                          name: key.name,
                          fingerprint: key.fingerprint,
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SSH Key</DialogTitle>
            <DialogDescription>
              Add a new SSH key to your account for secure server access.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSH Key Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="A name for this SSH key" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publicKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Public Key</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ssh-rsa AAAAB3..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Adding...' : 'Add Key'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteKey} onOpenChange={() => setDeleteKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SSH Key</DialogTitle>
            <DialogDescription>
              Removing the <code className="font-mono">{deleteKey?.name}</code> SSH key
              will invalidate its usage across the Panel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteKey(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Delete Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
