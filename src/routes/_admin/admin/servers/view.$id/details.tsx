import { createFileRoute } from '@tanstack/react-router'
import { useContext } from 'react'
import { ServerContext } from '../view.$id'
import DetailsTab from '@/components/admin/server/DetailsTab'

export const Route = createFileRoute('/_admin/admin/servers/view/$id/details' as any)({
  component: () => {
    const { server, reloadServer } = useContext(ServerContext)
    return <DetailsTab server={server} onSaved={reloadServer} />
  },
})
