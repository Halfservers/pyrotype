import { createFileRoute } from '@tanstack/react-router'
import { useContext } from 'react'
import { ServerContext } from '../view.$id'
import AboutTab from '@/components/admin/server/AboutTab'

export const Route = createFileRoute('/_admin/admin/servers/view/$id/' as any)({
  component: () => {
    const { server } = useContext(ServerContext)
    return <AboutTab server={server} />
  },
})
