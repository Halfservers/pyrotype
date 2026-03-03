import { createFileRoute } from '@tanstack/react-router'
import ServerConsoleContainer from '@/components/server/console/server-console-container'

export const Route = createFileRoute('/_authed/server/$id/' as any)({
  component: ServerConsoleContainer,
})
