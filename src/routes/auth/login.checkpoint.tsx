import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { z } from 'zod'
import { Flame } from 'lucide-react'

import loginCheckpoint from '@/lib/api/auth/login-checkpoint'
import { motion } from '@/components/motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const checkpointSearchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/auth/login/checkpoint' as any)({
  validateSearch: checkpointSearchSchema,
  component: LoginCheckpointPage,
})

const codeSchema = z.object({
  code: z.string().min(1, 'Please enter an authentication code.'),
})

const recoverySchema = z.object({
  recoveryCode: z.string().min(1, 'Please enter a recovery code.'),
})

function LoginCheckpointPage() {
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const [isMissingDevice, setIsMissingDevice] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const codeForm = useForm({
    defaultValues: { code: '' },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const response = await loginCheckpoint(token!, value.code, undefined)
        if (response.complete) {
          window.location.href = response.intended || '/'
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.')
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = codeSchema.safeParse(value)
        return result.success ? undefined : result.error.issues.map((i) => i.message).join(', ')
      },
    },
  })

  const recoveryForm = useForm({
    defaultValues: { recoveryCode: '' },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const response = await loginCheckpoint(token!, '', value.recoveryCode)
        if (response.complete) {
          window.location.href = response.intended || '/'
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.')
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = recoverySchema.safeParse(value)
        return result.success ? undefined : result.error.issues.map((i) => i.message).join(', ')
      },
    },
  })

  if (!token) {
    navigate({ to: '/auth/login' })
    return null
  }

  const activeForm = isMissingDevice ? recoveryForm : codeForm

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
          <h2 className="text-xl font-bold mb-1 text-white">
            Two Factor Authentication
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Check the device linked with your account for your code.
          </p>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              activeForm.handleSubmit()
            }}
            className="space-y-5"
          >
            {isMissingDevice ? (
              <recoveryForm.Field
                name="recoveryCode"
                children={(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor={field.name}
                      className="text-zinc-400 text-xs font-medium uppercase tracking-wider"
                    >
                      Recovery Code
                    </Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      type="text"
                      placeholder="Enter recovery code"
                      autoFocus
                      className="bg-white/[0.04] border-white/[0.08] text-white h-11 rounded-xl transition-all focus:border-brand/50 focus:ring-2 focus:ring-brand/20"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Enter one of the recovery codes generated when you setup 2-Factor
                      authentication on this account in order to continue.
                    </p>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(String).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              />
            ) : (
              <codeForm.Field
                name="code"
                children={(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor={field.name}
                      className="text-zinc-400 text-xs font-medium uppercase tracking-wider"
                    >
                      Authentication Code
                    </Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      type="text"
                      placeholder="000000"
                      autoComplete="one-time-code"
                      autoFocus
                      className="bg-white/[0.04] border-white/[0.08] text-white h-11 rounded-xl transition-all focus:border-brand/50 focus:ring-2 focus:ring-brand/20"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Enter the two-factor token displayed by your device.
                    </p>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(String).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              />
            )}

            <activeForm.Subscribe
              selector={(s) => s.isSubmitting}
              children={(isSubmitting) => (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold text-sm transition-all"
                >
                  {isSubmitting ? 'Verifying...' : 'Login'}
                </Button>
              )}
            />
          </form>

          <Separator className="my-6 bg-white/[0.08]" />

          <div className="space-y-2">
            <button
              onClick={() => {
                codeForm.reset()
                recoveryForm.reset()
                setIsMissingDevice((s) => !s)
              }}
              className="block w-full text-center py-2.5 px-4 text-xs font-medium tracking-wide uppercase text-zinc-400 hover:text-white transition-colors duration-200 border border-white/[0.08] rounded-xl hover:bg-white/[0.04]"
            >
              {!isMissingDevice ? "I've Lost My Device" : 'I Have My Device'}
            </button>

            <Link
              to="/auth/login"
              className="block w-full text-center py-2.5 px-4 text-xs font-medium tracking-wide uppercase text-zinc-400 hover:text-white transition-colors duration-200 border border-white/[0.08] rounded-xl hover:bg-white/[0.04]"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
