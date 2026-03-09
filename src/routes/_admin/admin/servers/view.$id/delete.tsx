import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useContext } from 'react'
import { ServerContext } from '../view.$id'
import DeleteTab from '@/components/admin/server/DeleteTab'

export const Route = createFileRoute('/_admin/admin/servers/view/$id/delete' as any)({
  component: () => {
    const navigate = useNavigate()
    const { server } = useContext(ServerContext)
    return <DeleteTab server={server} onDeleted={() => navigate({ to: '/admin/servers' })} />
  },
})
