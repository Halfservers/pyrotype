import { createFileRoute } from '@tanstack/react-router'
import { useContext } from 'react'
import { ServerContext } from '../view.$id'
import StartupTab from '@/components/admin/server/StartupTab'

export const Route = createFileRoute('/_admin/admin/servers/view/$id/startup' as any)({
  component: () => {
    const { server, reloadServer } = useContext(ServerContext)
    return <StartupTab server={server} onSaved={reloadServer} />
  },
})
