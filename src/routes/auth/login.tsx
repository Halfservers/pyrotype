import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Flame, ArrowRight } from 'lucide-react'

import { loginSchema, type LoginData } from '@/lib/validators/auth'
import login from '@/lib/api/auth/login'
import { useAppStore } from '@/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

export const Route = createFileRoute('/auth/login' as any)({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const setUserData = useAppStore((s) => s.setUserData)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      user: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginData) => {
    setError(null)

    try {
      const response = await login(values)

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
    } catch (err: any) {
      if (err.code === 'InvalidCredentials') {
        setError('Invalid username or password. Please try again.')
      } else if (err.code === 'DisplayException') {
        setError(err.detail || err.message)
      } else {
        setError(err.message || 'An error occurred during login.')
      }
    }
  }

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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="user"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                      Username or Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        disabled={form.formState.isSubmitting}
                        className="bg-white/[0.04] border-white/[0.08] text-white h-11 rounded-xl transition-all"
                        placeholder="you@example.com"
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                        Password
                      </FormLabel>
                      <Link
                        to="/auth/forgot-password"
                        className="text-xs text-zinc-500 hover:text-brand transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        disabled={form.formState.isSubmitting}
                        className="bg-white/[0.04] border-white/[0.08] text-white h-11 rounded-xl transition-all"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full h-11 rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold text-sm transition-all group"
              >
                {form.formState.isSubmitting ? (
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
            </form>
          </Form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Powered by Pyrotype
        </p>
      </div>
    </div>
  )
}
