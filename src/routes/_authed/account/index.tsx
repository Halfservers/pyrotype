import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'

import {
  updateEmailSchema,
  updatePasswordSchema,
  type UpdateEmailData,
  type UpdatePasswordData,
} from '@/lib/validators/account'
import {
  useUpdateEmailMutation,
  useUpdatePasswordMutation,
} from '@/lib/queries'
import { useAppStore } from '@/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authed/account/' as any)({
  component: AccountOverviewPage,
})

function AccountOverviewPage() {
  return (
    <div className="space-y-6">
      <UpdateEmailSection />
      <UpdatePasswordSection />
      <TwoFactorSection />
      <PanelVersionSection />
    </div>
  )
}

function UpdateEmailSection() {
  const userData = useAppStore((s) => s.userData)
  const updateEmail = useUpdateEmailMutation()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: userData?.email ?? '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setError(null)
      setSuccess(null)
      try {
        await updateEmail.mutateAsync(value as UpdateEmailData)
        setSuccess('Email updated successfully.')
        form.setFieldValue('password', '')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update email.')
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = updateEmailSchema.safeParse(value)
        return result.success ? undefined : result.error.issues.map((i) => i.message).join(', ')
      },
    },
  })

  return (
    <Card className="bg-[#ffffff09] border-[#ffffff12]">
      <CardHeader>
        <CardTitle className="text-white">Account Email</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
            {success}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <form.Field
            name="email"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-zinc-300">
                  Email
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="email"
                  className="bg-[#ffffff09] border-[#ffffff12] text-white"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.map(String).join(', ')}
                  </p>
                )}
              </div>
            )}
          />
          <form.Field
            name="password"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-zinc-300">
                  Current Password
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="password"
                  className="bg-[#ffffff09] border-[#ffffff12] text-white"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.map(String).join(', ')}
                  </p>
                )}
              </div>
            )}
          />
          <form.Subscribe
            selector={(s) => s.isSubmitting}
            children={(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Email'}
              </Button>
            )}
          />
        </form>
      </CardContent>
    </Card>
  )
}

function UpdatePasswordSection() {
  const updatePassword = useUpdatePasswordMutation()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      current: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      setError(null)
      setSuccess(null)
      try {
        await updatePassword.mutateAsync(value as UpdatePasswordData)
        setSuccess('Password updated successfully.')
        form.reset()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update password.')
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = updatePasswordSchema.safeParse(value)
        return result.success ? undefined : result.error.issues.map((i) => i.message).join(', ')
      },
    },
  })

  return (
    <Card className="bg-[#ffffff09] border-[#ffffff12]">
      <CardHeader>
        <CardTitle className="text-white">Account Password</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
            {success}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <form.Field
            name="current"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-zinc-300">
                  Current Password
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="password"
                  className="bg-[#ffffff09] border-[#ffffff12] text-white"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.map(String).join(', ')}
                  </p>
                )}
              </div>
            )}
          />
          <form.Field
            name="password"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-zinc-300">
                  New Password
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="password"
                  className="bg-[#ffffff09] border-[#ffffff12] text-white"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.map(String).join(', ')}
                  </p>
                )}
              </div>
            )}
          />
          <form.Field
            name="confirmPassword"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-zinc-300">
                  Confirm Password
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="password"
                  className="bg-[#ffffff09] border-[#ffffff12] text-white"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.map(String).join(', ')}
                  </p>
                )}
              </div>
            )}
          />
          <form.Subscribe
            selector={(s) => s.isSubmitting}
            children={(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            )}
          />
        </form>
      </CardContent>
    </Card>
  )
}

function TwoFactorSection() {
  const userData = useAppStore((s) => s.userData)
  const isEnabled = userData?.useTotp ?? false

  return (
    <Card className="bg-[#ffffff09] border-[#ffffff12]">
      <CardHeader>
        <CardTitle className="text-white">Multi-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-400 mb-4">
          {isEnabled
            ? 'Two-factor authentication is currently enabled on your account.'
            : 'Two-factor authentication is not currently enabled on your account. Enable it for an extra layer of security.'}
        </p>
        <Button variant={isEnabled ? 'destructive' : 'default'}>
          {isEnabled ? 'Disable Two-Factor' : 'Enable Two-Factor'}
        </Button>
      </CardContent>
    </Card>
  )
}

function PanelVersionSection() {
  return (
    <Card className="bg-[#ffffff09] border-[#ffffff12]">
      <CardHeader>
        <CardTitle className="text-white">Panel Version</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4 text-zinc-300">
          This is useful to provide Pyro staff if you run into an unexpected issue.
        </p>
        <div className="flex flex-col gap-2">
          <code className="px-3 py-2 bg-[#ffffff09] border border-[#ffffff12] rounded text-sm text-zinc-300 font-mono">
            Pyrotype (TanStack)
          </code>
        </div>
      </CardContent>
    </Card>
  )
}
