import { createFileRoute } from '@tanstack/react-router'
import ScheduleContainer from '@/components/server/schedules/schedule-container'

export const Route = createFileRoute('/_authed/server/$id/schedules' as any)({
  component: ScheduleContainer,
})
