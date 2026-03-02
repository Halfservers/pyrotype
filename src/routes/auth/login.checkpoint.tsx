import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'

import loginCheckpoint from '@/lib/api/auth/login-checkpoint'

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

type CodeData = z.infer<typeof codeSchema>
type RecoveryData = z.infer<typeof recoverySchema>

function LoginCheckpointPage() {
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const [isMissingDevice, setIsMissingDevice] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const codeForm = useForm<CodeData>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  })

  const recoveryForm = useForm<RecoveryData>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { recoveryCode: '' },
  })

  if (!token) {
    navigate({ to: '/auth/login' })
    return null
  }

  const onSubmit = async (values: CodeData | RecoveryData) => {
    setError(null)
    const code = 'code' in values ? values.code : ''
    const recoveryCode = 'recoveryCode' in values ? values.recoveryCode : undefined

    try {
      const response = await loginCheckpoint(token, code, recoveryCode)
      if (response.complete) {
        window.location.href = response.intended || '/'
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.')
    }
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

          <Form {...(activeForm as any)}>
            <form
              onSubmit={activeForm.handleSubmit(onSubmit)}
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
                  <FormField
                    control={recoveryForm.control}
                    name="recoveryCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">Recovery Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="Enter recovery code"
                            autoFocus
                            className="bg-[#ffffff09] border-[#ffffff12] text-white"
                          />
                        </FormControl>
                        <p className="text-xs text-zinc-500 mt-1">
                          Enter one of the recovery codes generated when you setup 2-Factor
                          authentication on this account in order to continue.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={codeForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300">Authentication Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="000000"
                            autoComplete="one-time-code"
                            autoFocus
                            className="bg-[#ffffff09] border-[#ffffff12] text-white"
                          />
                        </FormControl>
                        <p className="text-xs text-zinc-500 mt-1">
                          Enter the two-factor token displayed by your device.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="mt-6">
                <Button
                  className="w-full mt-4 rounded-full bg-brand border-0 ring-0 outline-hidden capitalize font-bold text-sm py-2"
                  type="submit"
                  disabled={activeForm.formState.isSubmitting}
                >
                  {activeForm.formState.isSubmitting ? 'Verifying...' : 'Login'}
                </Button>
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
          </Form>
        </div>
      </div>
    </div>
  )
}
