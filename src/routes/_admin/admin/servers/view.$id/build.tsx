import { createFileRoute } from '@tanstack/react-router'
import { useContext } from 'react'
import { ServerContext } from '../view.$id'
import BuildTab from '@/components/admin/server/BuildTab'

export const Route = createFileRoute('/_admin/admin/servers/view/$id/build' as any)({
  component: () => {
    const { server, reloadServer } = useContext(ServerContext)
    return <BuildTab server={server} onSaved={reloadServer} />
  },
})
