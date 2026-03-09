import { createFileRoute } from '@tanstack/react-router'
import SettingsContainer from '@/components/server/settings/settings-container'

export const Route = createFileRoute('/_authed/server/$id/settings' as any)({
  component: SettingsContainer,
})
