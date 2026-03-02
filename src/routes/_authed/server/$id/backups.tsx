import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/server/$id/backups' as any)({
  component: BackupsPage,
})

function BackupsPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Backups</h2>
      <p className="text-zinc-400">Coming soon</p>
    </div>
  )
}
