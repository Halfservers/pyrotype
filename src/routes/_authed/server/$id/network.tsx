import { createFileRoute } from '@tanstack/react-router'
import NetworkContainer from '@/components/server/network/network-container'

export const Route = createFileRoute('/_authed/server/$id/network' as any)({
  component: NetworkContainer,
})
