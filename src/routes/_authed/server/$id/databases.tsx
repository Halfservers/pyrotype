import { createFileRoute } from '@tanstack/react-router'
import DatabasesContainer from '@/components/server/databases/databases-container'

export const Route = createFileRoute('/_authed/server/$id/databases' as any)({
  component: DatabasesContainer,
})
