import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { createApiKeySchema, type CreateApiKeyData } from '@/lib/validators/account'
import { useCreateApiKeyMutation, useDeleteApiKeyMutation } from '@/lib/queries'
import http from '@/lib/api/http'

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

export const Route = createFileRoute('/_authed/account/api' as any)({
  component: AccountApiPage,
})

interface ApiKey {
  identifier: string
  description: string
  allowedIps: string[]
  lastUsedAt: string | null
  createdAt: string
}

function AccountApiPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteIdentifier, setDeleteIdentifier] = useState('')
  const [createdKey, setCreatedKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['account', 'api-keys'],
    queryFn: async (): Promise<ApiKey[]> => {
      const { data } = await http.get('/api/client/account/api-keys')
      return (data.data || []).map((item: any) => ({
        identifier: item.attributes.identifier,
        description: item.attributes.description,
        allowedIps: item.attributes.allowed_ips || [],
        lastUsedAt: item.attributes.last_used_at,
        createdAt: item.attributes.created_at,
      }))
    },
  })

  const createKey = useCreateApiKeyMutation()
  const deleteKey = useDeleteApiKeyMutation()

  const form = useForm<CreateApiKeyData>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { description: '', allowedIps: '' },
  })

  const onCreateSubmit = async (values: CreateApiKeyData) => {
    setError(null)
    try {
      const result = await createKey.mutateAsync(values)
      form.reset()
      setShowCreateModal(false)
      if (result?.secretToken) {
        setCreatedKey(`${result.identifier}${result.secretToken}`)
      }
      queryClient.invalidateQueries({ queryKey: ['account', 'api-keys'] })
    } catch (err: any) {
      setError(err.message || 'Failed to create API key.')
    }
  }

  const onDelete = async () => {
    try {
      await deleteKey.mutateAsync(deleteIdentifier)
      setDeleteIdentifier('')
      queryClient.invalidateQueries({ queryKey: ['account', 'api-keys'] })
    } catch (err: any) {
      setError(err.message || 'Failed to delete API key.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">API Keys</h2>
        <Button onClick={() => setShowCreateModal(true)}>Create API Key</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {createdKey && (
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <p className="text-sm text-green-400 mb-2">
              Your new API key has been created. Please copy it now as it will not be shown
              again.
            </p>
            <code className="block px-3 py-2 bg-[#ffffff09] border border-[#ffffff12] rounded text-sm text-white font-mono break-all">
              {createdKey}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setCreatedKey('')}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#ffffff09] border-[#ffffff12]">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-zinc-200 mb-2">No API Keys</h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                You haven't created any API keys yet. Create one to get started with the
                API.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.identifier}
                  className="bg-[#ffffff05] border border-[#ffffff08] rounded-lg p-4 hover:border-[#ffffff15] transition-all duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-zinc-100 truncate">
                        {key.description}
                      </h4>
                      <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                        <span>
                          Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                        </span>
                        <code className="font-mono px-2 py-1 bg-[#ffffff08] border border-[#ffffff08] rounded text-zinc-300">
                          {key.identifier}
                        </code>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteIdentifier(key.identifier)}
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
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for accessing the panel API.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="A description for this API key" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowedIps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed IPs</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Leave blank for any IP"
                      />
                    </FormControl>
                    <p className="text-xs text-zinc-500">
                      Leave blank to allow any IP address. Provide IPs on separate lines.
                    </p>
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
                  {form.formState.isSubmitting ? 'Creating...' : 'Create Key'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteIdentifier} onOpenChange={() => setDeleteIdentifier('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              All requests using the <code className="font-mono">{deleteIdentifier}</code>{' '}
              key will be invalidated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteIdentifier('')}>
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
