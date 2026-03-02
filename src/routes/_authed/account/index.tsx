import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

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

  const form = useForm<UpdateEmailData>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      email: userData?.email ?? '',
      password: '',
    },
  })

  const onSubmit = async (values: UpdateEmailData) => {
    setError(null)
    setSuccess(null)
    try {
      await updateEmail.mutateAsync(values)
      setSuccess('Email updated successfully.')
      form.setValue('password', '')
    } catch (err: any) {
      setError(err.message || 'Failed to update email.')
    }
  }

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      className="bg-[#ffffff09] border-[#ffffff12] text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Current Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      className="bg-[#ffffff09] border-[#ffffff12] text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Updating...' : 'Update Email'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function UpdatePasswordSection() {
  const updatePassword = useUpdatePasswordMutation()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<UpdatePasswordData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      current: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: UpdatePasswordData) => {
    setError(null)
    setSuccess(null)
    try {
      await updatePassword.mutateAsync(values)
      setSuccess('Password updated successfully.')
      form.reset()
    } catch (err: any) {
      setError(err.message || 'Failed to update password.')
    }
  }

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="current"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Current Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      className="bg-[#ffffff09] border-[#ffffff12] text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">New Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      className="bg-[#ffffff09] border-[#ffffff12] text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      className="bg-[#ffffff09] border-[#ffffff12] text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Form>
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
