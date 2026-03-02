import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CopyOnClick from '@/components/elements/copy-on-click';
import Spinner from '@/components/elements/spinner';
import VariableBox from '@/components/server/startup/variable-box';

import { useServerStore } from '@/store/server';
import { useServerStartupQuery } from '@/lib/queries';
import {
  useUpdateStartupCommandMutation,
  useSetDockerImageMutation,
  useRevertDockerImageMutation,
} from '@/lib/queries';
import { processStartupCommand, resetStartupCommand } from '@/lib/api/server/startup';
import { useFlashKey } from '@/lib/hooks';
import { usePermissions } from '@/lib/hooks';

const StartupContainer = () => {
  const [loading, setLoading] = useState(false);
  const [commandLoading, setCommandLoading] = useState(false);
  const [editingCommand, setEditingCommand] = useState(false);
  const [commandValue, setCommandValue] = useState('');
  const [liveProcessedCommand, setLiveProcessedCommand] = useState('');
  const [revertModalVisible, setRevertModalVisible] = useState(false);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('startup:image');
  const [canEditCommand] = usePermissions(['startup.command']);
  const [canEditDockerImage] = usePermissions(['startup.docker-image']);

  const serverId = useServerStore((state) => state.server!.id);
  const uuid = useServerStore((state) => state.server!.uuid);
  const server = useServerStore((state) => state.server!);

  const { data, isLoading, error } = useServerStartupQuery(serverId);

  const updateCommandMutation = useUpdateStartupCommandMutation(serverId);
  const setDockerImageMutation = useSetDockerImageMutation(serverId);
  const revertDockerImageMutation = useRevertDockerImageMutation(serverId);

  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedVariables = data
    ? data.variables.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : [];

  const totalPages = data ? Math.ceil(data.variables.length / ITEMS_PER_PAGE) : 0;

  const isCustomImage =
    data &&
    !Object.values(data.dockerImages)
      .map((v) => v.toLowerCase())
      .includes(server.dockerImage.toLowerCase());

  const updateSelectedDockerImage = useCallback((image: string) => {
    setLoading(true);
    clearFlashes();

    setDockerImageMutation.mutate(image, {
      onError: (error) => clearAndAddHttpError(error),
      onSettled: () => setLoading(false),
    });
  }, [setDockerImageMutation, clearFlashes, clearAndAddHttpError]);

  const revertToEggDefault = useCallback(() => {
    setLoading(true);
    clearFlashes();

    revertDockerImageMutation.mutate(undefined, {
      onSuccess: () => setRevertModalVisible(false),
      onError: (error) => clearAndAddHttpError(error),
      onSettled: () => setLoading(false),
    });
  }, [revertDockerImageMutation, clearFlashes, clearAndAddHttpError]);

  const processCommandLive = async (rawCommand: string): Promise<string> => {
    try {
      return await processStartupCommand(uuid, rawCommand);
    } catch {
      return rawCommand;
    }
  };

  const updateCommand = () => {
    setCommandLoading(true);
    clearFlashes();

    updateCommandMutation.mutate(commandValue, {
      onSuccess: () => setEditingCommand(false),
      onError: (error) => clearAndAddHttpError(error),
      onSettled: () => setCommandLoading(false),
    });
  };

  const loadDefaultCommand = async () => {
    try {
      const defaultCommand = await resetStartupCommand(uuid);
      setCommandValue(defaultCommand);
      const processed = await processCommandLive(defaultCommand);
      setLiveProcessedCommand(processed);
    } catch (err) {
      console.error('Failed to load default command:', err);
    }
  };

  const startEditingCommand = async () => {
    const initialCommand = data?.rawStartupCommand || '';
    setCommandValue(initialCommand);
    const processed = await processCommandLive(initialCommand);
    setLiveProcessedCommand(processed);
    setEditingCommand(true);
  };

  const cancelEditingCommand = () => {
    setEditingCommand(false);
    setCommandValue('');
    setLiveProcessedCommand('');
  };

  const handleCommandChange = async (value: string) => {
    setCommandValue(value);
    const processed = await processCommandLive(value);
    setLiveProcessedCommand(processed);
  };

  if (!data) {
    if (isLoading || !error) {
      return (
        <div className='flex items-center justify-center min-h-[60vh]'>
          <div className='flex flex-col items-center gap-4'>
            <Spinner size='large' centered />
            <p className='text-sm text-neutral-400'>Loading startup configuration...</p>
          </div>
        </div>
      );
    }
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <p className='text-red-400'>Failed to load startup configuration.</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <AlertDialog open={revertModalVisible} onOpenChange={setRevertModalVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Docker Image</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3'>
                <p>
                  This will revert your server&apos;s Docker image back to the egg&apos;s default specification.
                </p>
                <div className='bg-gradient-to-b from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-3'>
                  <p className='text-sm text-amber-200'>
                    <span className='font-medium'>Warning:</span> You will not be able to set a custom image
                    back without contacting support.
                  </p>
                </div>
                <p className='text-sm text-neutral-400'>Are you sure you want to continue?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revertToEggDefault} disabled={loading}>
              Yes, revert to default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h2 className='text-2xl font-bold text-neutral-100'>Startup Settings</h2>
        <p className='text-sm text-neutral-400 leading-relaxed mt-1'>
          Configure how your server starts up. These settings control the startup command and environment variables.
          <span className='text-amber-400 font-medium'> Exercise caution when modifying these settings.</span>
        </p>
      </div>

      <div className='space-y-6'>
        {/* Startup Command Section */}
        <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
          <h3 className='text-lg font-semibold text-neutral-200 mb-4'>Startup Command</h3>
          <p className='text-sm text-neutral-400 leading-relaxed mb-6'>
            Configure the command that starts your server. You can edit the raw command or view the processed version with variables resolved.
          </p>

          {editingCommand ? (
            <div className='space-y-4'>
              <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6'>
                <div>
                  <label className='block text-sm font-medium text-neutral-300 mb-3'>Raw Command</label>
                  <textarea
                    className='w-full h-32 sm:h-36 md:h-40 px-3 py-3 sm:px-4 sm:py-4 text-sm sm:text-base font-mono bg-gradient-to-b from-[#ffffff12] to-[#ffffff08] border-2 border-blue-500/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 placeholder:text-neutral-500 transition-all'
                    value={commandValue}
                    onChange={(e) => handleCommandChange(e.target.value)}
                    placeholder='Enter startup command with variables like {{SERVER_MEMORY}} or {{SERVER_PORT}}...'
                    style={{ wordBreak: 'break-all', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-neutral-300 mb-3'>Live Preview</label>
                  <CopyOnClick text={liveProcessedCommand}>
                    <div className='cursor-pointer group'>
                      <div className='w-full h-32 sm:h-36 md:h-40 px-3 py-3 sm:px-4 sm:py-4 font-mono bg-gradient-to-b from-[#ffffff06] to-[#ffffff03] border-2 border-green-500/20 rounded-xl text-sm sm:text-base overflow-auto group-hover:border-green-500/40 transition-all'>
                        <span className='break-all text-green-200' style={{ wordBreak: 'break-all', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {liveProcessedCommand || 'Enter a command to see the live preview...'}
                        </span>
                      </div>
                    </div>
                  </CopyOnClick>
                </div>
              </div>
              <div className='flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-[#ffffff08]'>
                <Button onClick={updateCommand} disabled={commandLoading || !commandValue.trim()} className='sm:flex-1 lg:flex-none lg:min-w-[140px]'>
                  {commandLoading ? 'Saving...' : 'Save Command'}
                </Button>
                <Button variant='outline' onClick={loadDefaultCommand} disabled={commandLoading} className='sm:flex-1 lg:flex-none lg:min-w-[140px]'>
                  Load Default
                </Button>
                <Button variant='outline' onClick={cancelEditingCommand} disabled={commandLoading} className='sm:flex-1 lg:flex-none lg:min-w-[140px]'>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className='space-y-5'>
              {data.rawStartupCommand && (
                <div className='space-y-3'>
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                    <label className='text-sm font-medium text-neutral-300'>Raw Command</label>
                    {canEditCommand && (
                      <Button variant='outline' size='sm' onClick={startEditingCommand}>
                        Edit Command
                      </Button>
                    )}
                  </div>
                  <CopyOnClick text={data.rawStartupCommand}>
                    <div className='cursor-pointer group'>
                      <div className='font-mono bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] flex flex-row items-center border border-[#ffffff10] rounded-xl py-3 px-3 sm:py-4 sm:px-4 text-sm sm:text-base min-h-[3.5rem] sm:min-h-[4rem] overflow-auto group-hover:border-[#ffffff20] transition-all'>
                        <span className='break-all text-neutral-200' style={{ wordBreak: 'break-all', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {data.rawStartupCommand}
                        </span>
                      </div>
                    </div>
                  </CopyOnClick>
                </div>
              )}
              <div className='space-y-3'>
                <div className='flex flex-col items-center sm:flex-row gap-2'>
                  <label className='text-sm font-medium text-neutral-300'>Processed Command</label>
                  <span className='text-xs text-neutral-500 rounded w-fit'>Read-only</span>
                </div>
                <CopyOnClick text={data.invocation}>
                  <div className='cursor-pointer group'>
                    <div className='font-mono bg-gradient-to-b from-[#ffffff04] to-[#ffffff02] flex flex-row items-center border border-[#ffffff08] rounded-xl py-3 px-3 sm:py-4 sm:px-4 text-sm sm:text-base min-h-[3.5rem] sm:min-h-[4rem] overflow-auto group-hover:border-[#ffffff15] transition-all'>
                      <span className='break-all text-neutral-300' style={{ wordBreak: 'break-all', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {data.invocation}
                      </span>
                    </div>
                  </div>
                </CopyOnClick>
              </div>
            </div>
          )}
        </div>

        {/* Docker Image Section */}
        <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
          <h3 className='text-lg font-semibold text-neutral-200 mb-4'>Docker Image</h3>
          <p className='text-sm text-neutral-400 leading-relaxed mb-6'>
            The container image used to run your server. Different images provide different software versions and configurations.
          </p>

          {Object.keys(data.dockerImages).length > 1 && !isCustomImage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className='w-full flex items-center justify-between gap-3 font-medium text-sm sm:text-base px-3 py-3 sm:px-4 sm:py-3 rounded-md bg-gradient-to-b from-[#ffffff10] to-[#ffffff09] border border-[#ffffff15] hover:from-[#ffffff15] hover:to-[#ffffff10] hover:border-[#ffffff25] transition-all cursor-pointer'>
                  <span className='truncate text-left font-mono text-neutral-200'>
                    {Object.keys(data.dockerImages).find(
                      (key) => data.dockerImages[key] === server.dockerImage,
                    ) || server.dockerImage}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='z-[99999]' sideOffset={8}>
                <DropdownMenuRadioGroup
                  value={server.dockerImage}
                  onValueChange={updateSelectedDockerImage}
                >
                  {Object.keys(data.dockerImages).map((key) => (
                    <DropdownMenuRadioItem value={data.dockerImages[key] as string} key={data.dockerImages[key]}>
                      {key}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className='space-y-4'>
              <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff10] rounded-xl py-3 px-3 sm:py-4 sm:px-4 overflow-auto'>
                <span className='text-sm sm:text-base font-mono break-all text-neutral-200'>
                  {Object.keys(data.dockerImages).find(
                    (key) => data.dockerImages[key] === server.dockerImage,
                  ) || server.dockerImage}
                </span>
              </div>
              {isCustomImage && (
                <div className='bg-gradient-to-b from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-3 sm:p-4'>
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                    <div className='flex-1'>
                      <p className='text-sm text-amber-200'>
                        <span className='font-medium'>Notice:</span> This server&apos;s Docker image has been manually set by an administrator and cannot be changed through this interface.
                      </p>
                      {canEditDockerImage && (
                        <p className='text-xs text-amber-300/80 mt-2'>
                          You can revert to the egg&apos;s default image, but you won&apos;t be able to set it back without contacting support.
                        </p>
                      )}
                    </div>
                    {canEditDockerImage && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setRevertModalVisible(true)}
                        disabled={loading}
                        className='text-amber-200 border-amber-500/40 hover:border-amber-500/60 hover:text-amber-100'
                      >
                        Revert to Default
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Environment Variables */}
      {data.variables.length > 0 && (
        <div className='space-y-6'>
          <div className='space-y-3'>
            <h3 className='text-2xl font-extrabold text-neutral-200'>Environment Variables</h3>
            <p className='text-sm text-neutral-400 leading-relaxed'>
              Configure environment variables that will be available to your server.
            </p>
          </div>

          <div className='bg-gradient-to-b from-[#ffffff04] to-[#ffffff02] border border-[#ffffff08] rounded-xl p-4'>
            <div className='space-y-3'>
              <h4 className='text-sm font-medium text-neutral-300'>Global Server Variables</h4>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs'>
                {[
                  { label: 'SERVER_MEMORY', value: String(server.limits?.memory ?? 'null') },
                  { label: 'SERVER_IP', value: server.allocations?.find((a) => a.isDefault)?.ip || 'null' },
                  { label: 'SERVER_PORT', value: String(server.allocations?.find((a) => a.isDefault)?.port ?? 'null') },
                  { label: 'SERVER_UUID', value: uuid },
                  { label: 'SERVER_NAME', value: server.name || 'null' },
                  { label: 'SERVER_CPU', value: String(server.limits?.cpu ?? 'null') },
                ].map((item) => (
                  <div key={item.label} className='flex justify-between items-center gap-2 py-2 px-3 bg-[#ffffff06] rounded border border-[#ffffff08]'>
                    <span className='font-mono text-neutral-400'>{item.label}</span>
                    <CopyOnClick text={item.value}>
                      <span className='text-neutral-300 font-mono truncate'>{item.value}</span>
                    </CopyOnClick>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className='min-h-[40svh] flex flex-col justify-between'>
            <div className='grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'>
              {paginatedVariables.map((variable) => (
                <VariableBox key={variable.envVariable} variable={variable} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className='mt-6 pt-4 border-t border-[#ffffff10] flex items-center justify-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className='text-sm text-neutral-400'>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StartupContainer;
