import { createFileRoute } from '@tanstack/react-router'
import ShellContainer from '@/components/server/shell/shell-container'

export const Route = createFileRoute('/_authed/server/$id/shell' as any)({
  component: ShellContainer,
})
