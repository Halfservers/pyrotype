import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

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
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-lg px-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full flex flex-col">
            <div className="flex h-12 mb-4 items-center w-full">
              <span className="text-2xl font-bold text-white tracking-tight">Pyrotype</span>
            </div>

            <div aria-hidden className="my-8 bg-[#ffffff33] min-h-[1px]" />

            <h2 className="text-xl font-extrabold mb-2 text-white">Login</h2>

            <FormField
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Username or Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      disabled={form.formState.isSubmitting}
                      className="bg-[#ffffff09] border-[#ffffff12] text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="relative mt-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Password</FormLabel>
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
              <Link
                to="/auth/forgot-password"
                className="text-xs text-zinc-500 tracking-wide no-underline hover:text-zinc-400 absolute top-1 right-0"
              >
                Forgot Password?
              </Link>
            </div>

            <div className="mt-6">
              <Button
                className="relative mt-4 w-full rounded-full bg-brand border-0 ring-0 outline-hidden capitalize font-bold text-sm py-2"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
