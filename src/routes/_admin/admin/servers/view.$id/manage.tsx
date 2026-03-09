import { createFileRoute } from '@tanstack/react-router'
import { useContext } from 'react'
import { ServerContext } from '../view.$id'
import ManageTab from '@/components/admin/server/ManageTab'

export const Route = createFileRoute('/_admin/admin/servers/view/$id/manage' as any)({
  component: () => {
    const { server, reloadServer } = useContext(ServerContext)
    return <ManageTab server={server} onSaved={reloadServer} />
  },
})
