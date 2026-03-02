import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/server/$id/' as any)({
  component: ServerConsolePage,
})

function ServerConsolePage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Console</h2>
      <p className="text-zinc-400">Coming soon</p>
    </div>
  )
}
