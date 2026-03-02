import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

import { forgotPasswordSchema, type ForgotPasswordData } from '@/lib/validators/auth'
import { requestPasswordReset } from '@/lib/api/auth/reset-password'
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

export const Route = createFileRoute('/auth/forgot-password' as any)({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordData) => {
    setError(null)
    setSuccess(null)

    try {
      await requestPasswordReset(values.email)
      form.reset()
      setSuccess('We have emailed your password reset link!')
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
        {success && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
            {success}
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

            <h2 className="text-xl font-extrabold mb-2 text-white">Reset Password</h2>
            <div className="text-sm mb-6 text-zinc-400">
              We&apos;ll send you an email with a link to reset your password.
            </div>

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
                {form.formState.isSubmitting ? 'Sending...' : 'Send Email'}
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
