import { Button } from '@/components/ui/button';
import Can from '@/components/elements/can';
import AllocationRow from '@/components/server/network/allocation-row';
import SubdomainManagement from '@/components/server/network/subdomain-management';

import { useServerStore } from '@/store/server';
import { useServerAllocationsQuery, useCreateAllocationMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

const NetworkContainer = () => {
  const serverId = useServerStore((state) => state.server!.id);
  const allocationLimit = useServerStore((state) => state.server!.featureLimits.allocations);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:network');

  const { data, isLoading } = useServerAllocationsQuery(serverId);
  const createAllocation = useCreateAllocationMutation(serverId);

  const onCreateAllocation = () => {
    clearFlashes();
    createAllocation.mutate(undefined, {
      onError: (error) => clearAndAddHttpError(error),
    });
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-extrabold tracking-tight'>Networking</h2>
        <p className='text-sm text-neutral-400 leading-relaxed mt-1'>
          Configure network settings for your server. Manage subdomains, IP addresses and ports that your server can
          bind to for incoming connections.
        </p>
      </div>

      <div className='space-y-12'>
        <SubdomainManagement />

        <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-6 shadow-sm mt-8'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='text-xl font-extrabold tracking-tight'>Port Allocations</h3>
            {data && (
              <Can action='allocation.create'>
                <div className='flex items-center gap-4'>
                  {allocationLimit === null && (
                    <span className='text-sm text-zinc-400 bg-[#ffffff08] px-3 py-1 rounded-lg border border-[#ffffff15]'>
                      {data.length} allocations (unlimited)
                    </span>
                  )}
                  {allocationLimit > 0 && (
                    <span className='text-sm text-zinc-400 bg-[#ffffff08] px-3 py-1 rounded-lg border border-[#ffffff15]'>
                      {data.length} of {allocationLimit}
                    </span>
                  )}
                  {allocationLimit === 0 && (
                    <span className='text-sm text-red-400 bg-[#ffffff08] px-3 py-1 rounded-lg border border-[#ffffff15]'>
                      Allocations disabled
                    </span>
                  )}
                  {(allocationLimit === null || (allocationLimit > 0 && allocationLimit > data.length)) && (
                    <Button size='sm' onClick={onCreateAllocation}>
                      New Allocation
                    </Button>
                  )}
                </div>
              </Can>
            )}
          </div>

          {isLoading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='flex flex-col items-center gap-3'>
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-brand' />
                <p className='text-sm text-neutral-400'>Loading allocations...</p>
              </div>
            </div>
          ) : data && data.length > 0 ? (
            <div className='space-y-2'>
              {data.map((allocation: any) => (
                <AllocationRow key={`${allocation.ip}:${allocation.port}`} allocation={allocation} />
              ))}
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center py-12'>
              <div className='text-center'>
                <div className='w-12 h-12 mx-auto mb-4 rounded-full bg-[#ffffff11] flex items-center justify-center'>
                  <svg className='w-6 h-6 text-zinc-400' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <h4 className='text-lg font-medium text-zinc-200 mb-2'>
                  {allocationLimit === 0 ? 'Allocations unavailable' : 'No allocations found'}
                </h4>
                <p className='text-sm text-zinc-400 max-w-sm text-center'>
                  {allocationLimit === 0
                    ? 'Network allocations cannot be created for this server.'
                    : 'Create your first allocation to get started.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkContainer;
