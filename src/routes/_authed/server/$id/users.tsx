import { createFileRoute } from '@tanstack/react-router'
import UsersContainer from '@/components/server/users/users-container'

export const Route = createFileRoute('/_authed/server/$id/users' as any)({
  component: UsersContainer,
})
