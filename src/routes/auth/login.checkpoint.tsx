import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { z } from 'zod'

import loginCheckpoint from '@/lib/api/auth/login-checkpoint'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="p-12 bg-[#ffffff09] border border-[#ffffff11] shadow-xs rounded-xl">
        <div className="w-full max-w-lg px-8">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              activeForm.handleSubmit()
            }}
            className="w-full flex flex-col"
          >
            <Link to="/">
              <div className="flex h-12 mb-4 items-center w-full">
                <span className="text-2xl font-bold text-white tracking-tight">
                  Pyrotype
                </span>
              </div>
            </Link>

            <div aria-hidden className="my-8 bg-[#ffffff33] min-h-[1px]" />

            <h2 className="text-xl font-extrabold mb-2 text-white">
              Two Factor Authentication
            </h2>
            <div className="text-sm mb-6 text-zinc-400">
              Check device linked with your account for code.
            </div>

            <div className="mt-6">
              {isMissingDevice ? (
                <recoveryForm.Field
                  name="recoveryCode"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name} className="text-zinc-300">
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
                        className="bg-[#ffffff09] border-[#ffffff12] text-white"
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
                      <Label htmlFor={field.name} className="text-zinc-300">
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
                        className="bg-[#ffffff09] border-[#ffffff12] text-white"
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
            </div>

            <div className="mt-6">
              <activeForm.Subscribe
                selector={(s) => s.isSubmitting}
                children={(isSubmitting) => (
                  <Button
                    className="w-full mt-4 rounded-full bg-brand border-0 ring-0 outline-hidden capitalize font-bold text-sm py-2"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Verifying...' : 'Login'}
                  </Button>
                )}
              />
            </div>

            <div aria-hidden className="my-8 bg-[#ffffff33] min-h-[1px]" />

            <div className="text-center w-full rounded-t-lg border-0 ring-0 outline-hidden capitalize font-bold text-sm py-2 mb-2">
              <span
                onClick={() => {
                  codeForm.reset()
                  recoveryForm.reset()
                  setIsMissingDevice((s) => !s)
                }}
                className="block w-full text-center py-2.5 px-4 text-xs font-medium tracking-wide uppercase text-white hover:text-white/80 transition-colors duration-200 border border-white/20 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
              >
                {!isMissingDevice ? "I've Lost My Device" : 'I Have My Device'}
              </span>
            </div>

            <div className="text-center w-full rounded-b-lg border-0 ring-0 outline-hidden capitalize font-bold text-sm py-2">
              <Link
                to="/auth/login"
                className="block w-full text-center py-2.5 px-4 text-xs font-medium tracking-wide uppercase text-white hover:text-white/80 transition-colors duration-200 border border-white/20 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                Return to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
