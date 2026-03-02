import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'

import { resetPasswordSchema, type ResetPasswordData } from '@/lib/validators/auth'
import { performPasswordReset } from '@/lib/api/auth/reset-password'
import { httpErrorToHuman } from '@/lib/api/http'

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

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
  })

  const onSubmit = async (values: ResetPasswordData) => {
    setError(null)

    try {
      await performPasswordReset(email || '', {
        token,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      })
      window.location.href = '/'
    } catch (err: any) {
      setError(httpErrorToHuman(err))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-lg px-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full flex flex-col">
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="mt-6">
                  <FormLabel className="text-zinc-300">New Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      disabled={form.formState.isSubmitting}
                      className="bg-[#ffffff09] border-[#ffffff12] text-white"
                    />
                  </FormControl>
                  <p className="text-xs text-zinc-500 mt-1">
                    Passwords must be at least 8 characters in length.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passwordConfirmation"
              render={({ field }) => (
                <FormItem className="mt-6">
                  <FormLabel className="text-zinc-300">Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      disabled={form.formState.isSubmitting}
                      className="bg-[#ffffff09] border-[#ffffff12] text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-6">
              <Button
                className="w-full mt-4 rounded-full bg-brand border-0 ring-0 outline-hidden capitalize font-bold text-sm py-2"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Resetting...' : 'Reset Password'}
              </Button>
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
        </Form>
      </div>
    </div>
  )
}
