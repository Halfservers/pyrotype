import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinkIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { useServerStore } from '@/store/server';
import { useSetSubdomainMutation, useDeleteSubdomainMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';
import http from '@/lib/api/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

interface SubdomainInfo {
  supported: boolean;
  available_domains: { id: number; name: string; is_active: boolean; is_default: boolean }[];
  current_subdomain: {
    attributes: {
      subdomain: string;
      domain_id: number;
      full_domain: string;
      is_active: boolean;
    };
  } | null;
}

const subdomainSchema = z.object({
  subdomain: z
    .string()
    .min(1, 'A subdomain name is required.')
    .max(63, 'Subdomain cannot exceed 63 characters.')
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i,
      'Subdomain can only contain lowercase letters, numbers, and hyphens.',
    ),
  domain_id: z.string().min(1, 'A domain must be selected.'),
});

type SubdomainFormValues = z.infer<typeof subdomainSchema>;

const SubdomainManagement = () => {
  const [subdomainInfo, setSubdomainInfo] = useState<SubdomainInfo | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const serverId = useServerStore((state) => state.server!.id);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:network:subdomain');

  const setSubdomainMutation = useSetSubdomainMutation(serverId);
  const deleteSubdomainMutation = useDeleteSubdomainMutation(serverId);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<SubdomainFormValues>({
    resolver: zodResolver(subdomainSchema),
    defaultValues: { subdomain: '', domain_id: '' },
  });

  useEffect(() => {
    loadSubdomainInfo();
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  const loadSubdomainInfo = async () => {
    try {
      clearFlashes();
      const daemonType = getGlobalDaemonType();
      const { data } = await http.get(`/api/client/servers/${daemonType}/${serverId}/network/subdomain`);
      const info = data as SubdomainInfo;
      setSubdomainInfo(info);

      const defaultDomain = info.available_domains?.find((d) => d.is_default) || info.available_domains?.[0];
      form.reset({
        subdomain: info.current_subdomain?.attributes?.subdomain || '',
        domain_id: info.current_subdomain?.attributes?.domain_id?.toString() || defaultDomain?.id.toString() || '',
      });
    } catch (error) {
      clearAndAddHttpError(error);
    }
  };

  const checkAvailability = useCallback(
    async (subdomain: string, domainId: string) => {
      if (!subdomain?.trim() || !domainId) {
        setAvailabilityStatus(null);
        return;
      }

      if (
        subdomainInfo?.current_subdomain &&
        subdomainInfo.current_subdomain.attributes.subdomain === subdomain.trim() &&
        subdomainInfo.current_subdomain.attributes.domain_id.toString() === domainId
      ) {
        setAvailabilityStatus(null);
        return;
      }

      try {
        setCheckingAvailability(true);
        const daemonType = getGlobalDaemonType();
        const { data } = await http.post(
          `/api/client/servers/${daemonType}/${serverId}/network/subdomain/check`,
          { subdomain: subdomain.trim(), domain_id: parseInt(domainId) },
        );
        setAvailabilityStatus({
          checked: true,
          available: data.available,
          message: data.message,
        });
      } catch {
        setAvailabilityStatus({
          checked: true,
          available: false,
          message: 'Failed to check availability. Please try again.',
        });
      } finally {
        setCheckingAvailability(false);
      }
    },
    [serverId, subdomainInfo?.current_subdomain],
  );

  const debouncedCheckAvailability = useCallback(
    (subdomain: string, domainId: string) => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => {
        checkAvailability(subdomain, domainId);
      }, 500);
    },
    [checkAvailability],
  );

  const onSubmit = async (values: SubdomainFormValues) => {
    clearFlashes();
    try {
      await setSubdomainMutation.mutateAsync({
        subdomain: values.subdomain.trim(),
        domainId: parseInt(values.domain_id),
      });
      await loadSubdomainInfo();
      setAvailabilityStatus(null);
      if (isEditing) setIsEditing(false);
    } catch (error) {
      clearAndAddHttpError(error);
    }
  };

  const handleDeleteSubdomain = async () => {
    if (!confirm('Are you sure you want to delete this subdomain? This will remove all associated DNS records.')) {
      return;
    }
    clearFlashes();
    try {
      await deleteSubdomainMutation.mutateAsync();
      await loadSubdomainInfo();
      setAvailabilityStatus(null);
    } catch (error) {
      clearAndAddHttpError(error);
    }
  };

  if (!subdomainInfo) {
    return (
      <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-6 shadow-sm'>
        <div className='flex items-center justify-center py-12'>
          <div className='flex flex-col items-center gap-3'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-brand' />
            <p className='text-sm text-neutral-400'>Loading subdomain configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!subdomainInfo.supported) return null;

  if (!subdomainInfo.available_domains || subdomainInfo.available_domains.length === 0) {
    return (
      <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-6 shadow-sm'>
        <h3 className='text-xl font-extrabold tracking-tight mb-6'>Subdomain Management</h3>
        <div className='flex flex-col items-center justify-center py-12'>
          <h4 className='text-md font-medium text-zinc-200 mb-1'>No domains configured</h4>
          <p className='text-sm text-zinc-400 max-w-sm text-center'>
            Contact your administrator to configure subdomain support for this server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-6 shadow-sm'>
      <div className='flex items-center gap-3 mb-6'>
        <LinkIcon className='w-6 h-6 text-zinc-400' />
        <h3 className='text-xl font-extrabold tracking-tight'>Subdomain Management</h3>
        {subdomainInfo.current_subdomain && (
          <div className='flex items-center gap-2 text-sm ml-auto'>
            <div
              className={`w-2 h-2 rounded-full ${subdomainInfo.current_subdomain.attributes.is_active ? 'bg-green-400' : 'bg-red-400'}`}
            />
            <span className={subdomainInfo.current_subdomain.attributes.is_active ? 'text-green-400' : 'text-red-400'}>
              {subdomainInfo.current_subdomain.attributes.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        )}
      </div>

      {subdomainInfo.current_subdomain && !isEditing ? (
        <div className='space-y-4'>
          <div className='bg-[#ffffff08] border border-[#ffffff15] rounded-lg p-4'>
            <p className='text-sm text-zinc-400 mb-2'>Current Subdomain</p>
            <p className='text-lg font-medium text-white font-mono'>
              {subdomainInfo.current_subdomain.attributes.full_domain}
            </p>
          </div>
          <div className='flex items-center justify-end gap-3 pt-4 border-t border-[#ffffff15]'>
            <Button variant='destructive' size='sm' onClick={handleDeleteSubdomain} disabled={deleteSubdomainMutation.isPending}>
              {deleteSubdomainMutation.isPending ? 'Deleting...' : 'Delete Subdomain'}
            </Button>
            <Button size='sm' onClick={() => setIsEditing(true)}>
              Edit Subdomain
            </Button>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <div className='space-y-4'>
              <FormField
                control={form.control}
                name='subdomain'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subdomain</FormLabel>
                    <div className='flex items-center border border-[#ffffff15] rounded-lg overflow-hidden'>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder='myserver'
                          className='flex-1 border-0 rounded-none focus-visible:ring-0'
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            field.onChange(value);
                            const domainId = form.getValues('domain_id');
                            if (domainId && value.trim()) {
                              debouncedCheckAvailability(value, domainId);
                            } else {
                              setAvailabilityStatus(null);
                            }
                          }}
                        />
                      </FormControl>
                      <div className='border-l border-[#ffffff15]'>
                        <FormField
                          control={form.control}
                          name='domain_id'
                          render={({ field: domainField }) => (
                            <Select
                              value={domainField.value}
                              onValueChange={(value) => {
                                domainField.onChange(value);
                                const subdomain = form.getValues('subdomain');
                                if (subdomain?.trim()) {
                                  debouncedCheckAvailability(subdomain, value);
                                }
                              }}
                            >
                              <SelectTrigger className='min-w-[140px] border-0 rounded-none'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {subdomainInfo.available_domains.map((domain) => (
                                  <SelectItem key={domain.id} value={domain.id.toString()}>
                                    .{domain.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(checkingAvailability || availabilityStatus) && (
                <div
                  className={`rounded-lg p-4 border ${checkingAvailability ? 'bg-blue-500/10 border-blue-500/20' : availabilityStatus?.available ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}
                >
                  {checkingAvailability ? (
                    <div className='flex items-center text-sm text-blue-300'>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-3' />
                      Checking availability...
                    </div>
                  ) : (
                    availabilityStatus && (
                      <div
                        className={`text-sm flex items-center font-medium ${availabilityStatus.available ? 'text-green-300' : 'text-red-300'}`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full mr-3 ${availabilityStatus.available ? 'bg-green-400' : 'bg-red-400'}`}
                        />
                        {availabilityStatus.message}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className='flex items-center justify-end gap-3 pt-6 border-t border-[#ffffff15]'>
              {isEditing && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setIsEditing(false);
                    form.reset();
                    setAvailabilityStatus(null);
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                type='submit'
                size='sm'
                disabled={
                  form.formState.isSubmitting ||
                  !form.formState.isValid ||
                  (availabilityStatus?.checked === true && !availabilityStatus.available)
                }
              >
                {isEditing
                  ? form.formState.isSubmitting
                    ? 'Saving...'
                    : 'Save Changes'
                  : form.formState.isSubmitting
                    ? 'Creating...'
                    : 'Create Subdomain'}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default SubdomainManagement;
