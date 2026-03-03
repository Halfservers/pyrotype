import { createFileRoute } from '@tanstack/react-router'
import BackupContainer from '@/components/server/backups/backup-container'

export const Route = createFileRoute('/_authed/server/$id/backups' as any)({
  component: BackupContainer,
})
