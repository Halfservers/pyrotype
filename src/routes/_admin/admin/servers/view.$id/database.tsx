import { createFileRoute } from '@tanstack/react-router'
import { useContext } from 'react'
import { ServerContext } from '../view.$id'
import DatabaseTab from '@/components/admin/server/DatabaseTab'

export const Route = createFileRoute('/_admin/admin/servers/view/$id/database' as any)({
  component: () => {
    const { server } = useContext(ServerContext)
    return <DatabaseTab serverId={server.id} />
  },
})
