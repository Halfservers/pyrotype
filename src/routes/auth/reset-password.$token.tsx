import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { z } from 'zod'

import { resetPasswordSchema } from '@/lib/validators/auth'
import { performPasswordReset } from '@/lib/api/auth/reset-password'
import { httpErrorToHuman } from '@/lib/http'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const searchSchema = z.object({
  email: z.string().optional(),
})

export const Route = createFileRoute('/auth/reset-password/$token' as any)({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useParams()
  const { email } = Route.useSearch()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        await performPasswordReset(email || '', {
          token,
          password: value.password,
          passwordConfirmation: value.passwordConfirmation,
        })
        window.location.href = '/'
      } catch (err: unknown) {
        setError(httpErrorToHuman(err))
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = resetPasswordSchema.safeParse(value)
        return result.success ? undefined : result.error.issues.map((i) => i.message).join(', ')
      },
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-lg px-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
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

          {email && (
            <div className="text-center mb-6">
              <Input
                className="text-center bg-[#ffffff09] border-[#ffffff12] text-white"
                value={email}
                disabled
              />
            </div>
          )}

          <form.Field
            name="password"
            children={(field) => (
              <div className="space-y-2 mt-6">
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
                <p className="text-xs text-zinc-500 mt-1">
                  Passwords must be at least 8 characters in length.
                </p>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.map(String).join(', ')}
                  </p>
                )}
              </div>
            )}
          />

          <form.Field
            name="passwordConfirmation"
            children={(field) => (
              <div className="space-y-2 mt-6">
                <Label htmlFor={field.name} className="text-zinc-300">
                  Confirm New Password
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

          <div className="mt-6">
            <form.Subscribe
              selector={(s) => s.isSubmitting}
              children={(isSubmitting) => (
                <Button
                  className="w-full mt-4 rounded-full bg-brand border-0 ring-0 outline-hidden capitalize font-bold text-sm py-2"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
              )}
            />
          </div>

          <div aria-hidden className="my-8 bg-[#ffffff33] min-h-[1px]" />

          <div className="text-center w-full rounded-lg border-0 ring-0 outline-hidden capitalize font-bold text-sm py-2">
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
  )
}
