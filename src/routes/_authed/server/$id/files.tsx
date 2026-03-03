import { createFileRoute } from '@tanstack/react-router'
import FileManagerContainer from '@/components/server/files/file-manager-container'

export const Route = createFileRoute('/_authed/server/$id/files' as any)({
  component: FileManagerContainer,
})
