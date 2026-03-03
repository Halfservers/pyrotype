import { createFileRoute } from '@tanstack/react-router'
import ModrinthContainer from '@/components/server/modrinth/modrinth-container'

export const Route = createFileRoute('/_authed/server/$id/mods' as any)({
  component: ModrinthContainer,
})
