import { createFileRoute } from '@tanstack/react-router'
import { useContext } from 'react'
import { ServerContext } from '../view.$id'
import MountsTab from '@/components/admin/server/MountsTab'

export const Route = createFileRoute('/_admin/admin/servers/view/$id/mounts' as any)({
  component: () => {
    const { server } = useContext(ServerContext)
    return <MountsTab serverId={server.id} />
  },
})
