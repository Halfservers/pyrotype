import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { Flame, ArrowRight } from 'lucide-react'

import { loginSchema, type LoginData } from '@/lib/validators/auth'
import login from '@/lib/api/auth/login'
import { useAppStore } from '@/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/auth/login' as any)({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const setUserData = useAppStore((s) => s.setUserData)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      user: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        const response = await login(value as LoginData)

        if (response.complete) {
          if (response.user) {
            setUserData(response.user)
          }
          navigate({ to: response.intended || '/' })
          return
        }

        navigate({
          to: '/auth/login/checkpoint',
          search: { token: response.confirmationToken },
        })
      } catch (err: unknown) {
        const e = err as Error & { code?: string; detail?: string }
        if (e.code === 'InvalidCredentials') {
          setError('Invalid username or password. Please try again.')
        } else if (e.code === 'DisplayException') {
          setError(e.detail || e.message)
        } else {
          setError(e.message || 'An error occurred during login.')
        }
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = loginSchema.safeParse(value)
        return result.success ? undefined : result.error.issues.map((i) => i.message).join(', ')
      },
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-brand/[0.04] blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-500/[0.03] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-brand" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Pyrotype</span>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-1 text-white">Welcome back</h2>
          <p className="text-sm text-zinc-500 mb-6">Sign in to your account to continue.</p>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-5"
          >
            <form.Field
              name="user"
              children={(field) => (
                <div className="space-y-2">
                  <Label
                    htmlFor={field.name}
                    className="text-zinc-400 text-xs font-medium uppercase tracking-wider"
                  >
                    Username or Email
                  </Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type="text"
                    className="bg-white/[0.04] border-white/[0.08] text-white h-11 rounded-xl transition-all"
                    placeholder="you@example.com"
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
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={field.name}
                      className="text-zinc-400 text-xs font-medium uppercase tracking-wider"
                    >
                      Password
                    </Label>
                    <Link
                      to="/auth/forgot-password"
                      className="text-xs text-zinc-500 hover:text-brand transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type="password"
                    className="bg-white/[0.04] border-white/[0.08] text-white h-11 rounded-xl transition-all"
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
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold text-sm transition-all group"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign in
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </Button>
              )}
            />
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Powered by Pyrotype
        </p>
      </div>
    </div>
  )
}
