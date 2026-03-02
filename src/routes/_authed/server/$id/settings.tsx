import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/server/$id/settings' as any)({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
      <p className="text-zinc-400">Coming soon</p>
    </div>
  )
}
