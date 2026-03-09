import { api } from '@/lib/http';
import type { PaginatedResult } from '@/types/api';
import { type QueryBuilderParams, getPaginationSet, withQueryBuilderParams } from '@/lib/fractal';

export type ActivityLogFilters = QueryBuilderParams<'ip' | 'event', 'timestamp'>;

export interface ActivityLog {
  id: string;
  batch: string | null;
  event: string;
  isApi: boolean;
  ip: string | null;
  description: string | null;
  properties: Record<string, string>;
  hasAdditionalMetadata: boolean;
  timestamp: Date;
  actor?: {
    uuid: string;
    email: string;
    username: string;
  };
}

function toActivityLog(data: any): ActivityLog {
  return {
    id: data.id,
    batch: data.batch,
    event: data.event,
    isApi: data.is_api,
    ip: data.ip,
    description: data.description,
    properties: data.properties || {},
    hasAdditionalMetadata: data.has_additional_metadata,
    timestamp: new Date(data.timestamp),
    actor: data.relationships?.actor?.attributes
      ? {
          uuid: data.relationships.actor.attributes.uuid,
          email: data.relationships.actor.attributes.email,
          username: data.relationships.actor.attributes.username,
        }
      : undefined,
  };
}

export const getAccountActivity = async (
  filters?: ActivityLogFilters,
): Promise<PaginatedResult<ActivityLog>> => {
  const data: any = await api.get('/api/client/account/activity', {
    ...withQueryBuilderParams(filters),
    include: 'actor',
  });

  return {
    items: (data.data || []).map((item: any) => toActivityLog(item.attributes)),
    pagination: getPaginationSet(data.meta.pagination),
  };
};
