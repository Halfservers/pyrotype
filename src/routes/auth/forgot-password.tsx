import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { Flame } from 'lucide-react'

import { forgotPasswordSchema } from '@/lib/validators/auth'
import { requestPasswordReset } from '@/lib/api/auth/reset-password'
import { httpErrorToHuman } from '@/lib/http'
import { motion } from '@/components/motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/auth/forgot-password' as any)({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setError(null)
      setSuccess(null)

      try {
        await requestPasswordReset(value.email)
        form.reset()
        setSuccess('We have emailed your password reset link!')
      } catch (err: unknown) {
        setError(httpErrorToHuman(err))
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = forgotPasswordSchema.safeParse(value)
        return result.success ? undefined : result.error.issues.map((i) => i.message).join(', ')
      },
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 15, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-brand/[0.06] blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -25, 20, 0],
            y: [0, 20, -30, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-500/[0.05] blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-md px-6"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-brand" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Pyrotype</span>
        </Link>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-xl shadow-[0_8px_64px_rgba(0,0,0,0.3)]">
          <h2 className="text-xl font-bold mb-1 text-white">Reset Password</h2>
          <p className="text-sm text-zinc-500 mb-6">
            We&apos;ll send you an email with a link to reset your password.
          </p>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
              {success}
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
              name="email"
              children={(field) => (
                <div className="space-y-2">
                  <Label
                    htmlFor={field.name}
                    className="text-zinc-400 text-xs font-medium uppercase tracking-wider"
                  >
                    Email
                  </Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type="email"
                    className="bg-white/[0.04] border-white/[0.08] text-white h-11 rounded-xl transition-all focus:border-brand/50 focus:ring-2 focus:ring-brand/20"
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

            <form.Subscribe
              selector={(s) => s.isSubmitting}
              children={(isSubmitting) => (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold text-sm transition-all"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              )}
            />
          </form>

          <Separator className="my-6 bg-white/[0.08]" />

          <Link
            to="/auth/login"
            className="block w-full text-center py-2.5 px-4 text-xs font-medium tracking-wide uppercase text-zinc-400 hover:text-white transition-colors duration-200 border border-white/[0.08] rounded-xl hover:bg-white/[0.04]"
          >
            Return to Login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
