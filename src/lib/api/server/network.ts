import { api } from '@/lib/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { type Allocation, rawDataToServerAllocation } from '@/lib/api/transformers';

export const createServerAllocation = async (uuid: string): Promise<Allocation> => {
  const data: any = await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/network/allocations`,
  );
  return rawDataToServerAllocation(data);
};

export const deleteServerAllocation = async (uuid: string, id: number): Promise<void> => {
  await api.delete(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/network/allocations/${id}`,
  );
};

export const setPrimaryServerAllocation = async (
  uuid: string,
  id: number,
): Promise<Allocation> => {
  const data: any = await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/network/allocations/${id}/primary`,
  );
  return rawDataToServerAllocation(data);
};

export const setServerAllocationNotes = async (
  uuid: string,
  id: number,
  notes: string | null,
): Promise<Allocation> => {
  const data: any = await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/network/allocations/${id}`,
    { notes },
  );
  return rawDataToServerAllocation(data);
};

export interface SubdomainInfo {
  supported: boolean;
  current_subdomain?: {
    object: string;
    attributes: {
      subdomain: string;
      domain: string;
      domain_id: number;
      full_domain: string;
      is_active: boolean;
    };
  };
  available_domains: Array<{
    id: number;
    name: string;
    is_active: boolean;
  }>;
  message?: string;
}

export interface AvailabilityResponse {
  available: boolean;
  message: string;
}

export const getSubdomainInfo = async (uuid: string): Promise<SubdomainInfo> => {
  return api.get<SubdomainInfo>(`/api/client/servers/${uuid}/subdomain`);
};

export const setSubdomain = async (
  uuid: string,
  subdomain: string,
  domainId: number,
): Promise<void> => {
  await api.post(`/api/client/servers/${uuid}/subdomain`, {
    subdomain,
    domain_id: domainId,
  });
};

export const deleteSubdomain = async (uuid: string): Promise<void> => {
  await api.delete(`/api/client/servers/${uuid}/subdomain`);
};

export const checkSubdomainAvailability = async (
  uuid: string,
  subdomain: string,
  domainId: number,
): Promise<AvailabilityResponse> => {
  return api.post<AvailabilityResponse>(
    `/api/client/servers/${uuid}/subdomain/check-availability`,
    { subdomain, domain_id: domainId },
  );
};
