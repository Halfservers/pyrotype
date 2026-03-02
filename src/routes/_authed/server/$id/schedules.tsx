import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/server/$id/schedules' as any)({
  component: SchedulesPage,
})

function SchedulesPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Schedules</h2>
      <p className="text-zinc-400">Coming soon</p>
    </div>
  )
}
