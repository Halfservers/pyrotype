import { createFileRoute } from '@tanstack/react-router'
import StartupContainer from '@/components/server/startup/startup-container'

export const Route = createFileRoute('/_authed/server/$id/startup' as any)({
  component: StartupContainer,
})
