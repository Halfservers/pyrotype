import http from '@/lib/api/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { type Allocation, rawDataToServerAllocation } from '@/lib/api/transformers';

export const createServerAllocation = async (uuid: string): Promise<Allocation> => {
  const { data } = await http.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/network/allocations`,
  );
  return rawDataToServerAllocation(data);
};

export const deleteServerAllocation = async (uuid: string, id: number): Promise<void> => {
  await http.delete(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/network/allocations/${id}`,
  );
};

export const setPrimaryServerAllocation = async (
  uuid: string,
  id: number,
): Promise<Allocation> => {
  const { data } = await http.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/network/allocations/${id}/primary`,
  );
  return rawDataToServerAllocation(data);
};

export const setServerAllocationNotes = async (
  uuid: string,
  id: number,
  notes: string | null,
): Promise<Allocation> => {
  const { data } = await http.post(
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

export const getSubdomainInfo = (uuid: string): Promise<SubdomainInfo> => {
  return new Promise((resolve, reject) => {
    http
      .get(`/api/client/servers/${uuid}/subdomain`)
      .then(({ data }) => resolve(data))
      .catch(reject);
  });
};

export const setSubdomain = (
  uuid: string,
  subdomain: string,
  domainId: number,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/servers/${uuid}/subdomain`, {
        subdomain,
        domain_id: domainId,
      })
      .then(() => resolve())
      .catch(reject);
  });
};

export const deleteSubdomain = (uuid: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .delete(`/api/client/servers/${uuid}/subdomain`)
      .then(() => resolve())
      .catch(reject);
  });
};

export const checkSubdomainAvailability = (
  uuid: string,
  subdomain: string,
  domainId: number,
): Promise<AvailabilityResponse> => {
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/servers/${uuid}/subdomain/check-availability`, {
        subdomain,
        domain_id: domainId,
      })
      .then(({ data }) => resolve(data))
      .catch(reject);
  });
};
