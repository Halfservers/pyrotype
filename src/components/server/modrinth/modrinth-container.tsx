import debounce from 'debounce';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import Can from '@/components/elements/can';

import LoaderSelector from './loader-selector';
import { ModList } from './mod-list';
import VersionSelector from './version-selector';
import { GlobalStateProvider, ModrinthService, getAppVersion, useGlobalStateContext } from './config';

const ModrinthContainerInner = () => {
  const {
    loaders: _loaders,
    gameVersions: _gameVersions,
    searchQuery,
    setSearchQuery,
    updateGameVersions,
    updateLoaders,
  } = useGlobalStateContext();

  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [isLoadingLoader, setLoaderLoading] = useState(true);
  const [isLoadingVersion, setVersionLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => setSearchQuery(value), 500),
    [setSearchQuery],
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    debouncedSetSearchTerm(value);
  };

  useEffect(() => {
    const initialize = async () => {
      if (isInitialized) return;

      const initialized = await ModrinthService.init(getAppVersion());
      if (!initialized) {
        toast.error('Failed to initialize Modrinth API');
        return;
      }

      try {
        const [loaderResponse, versionResponse] = await Promise.all([
          ModrinthService.fetchLoaders(),
          ModrinthService.fetchGameVersions(),
        ]);

        updateLoaders(loaderResponse.data);
        updateGameVersions(versionResponse.data);
        setLoaderLoading(false);
        setVersionLoading(false);
        setIsInitialized(true);
      } catch (error) {
        console.error('Initial fetch error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to fetch initial data');
        setLoaderLoading(false);
        setVersionLoading(false);
      }
    };

    initialize();
  }, [isInitialized, updateLoaders, updateGameVersions]);

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-neutral-100'>Mods/Plugins</h2>
      </div>

      <div className='p-8 bg-[#ffffff09] border border-[#ffffff11] shadow-sm rounded-xl'>
        {/* Placeholder for future nav between Downloaded, Download, and Dependency resolver */}
      </div>

      <div className='flex flex-wrap gap-4'>
        <div className='p-6 bg-[#ffffff09] border border-[#ffffff11] shadow-sm rounded-xl w-full md:w-1/6 space-y-4'>
          <h3 className='text-sm font-semibold text-neutral-200'>Settings</h3>
          <Can action='modrinth.loader'>
            <div>
              <h4 className='text-xs font-medium text-neutral-400 mb-2'>Loader</h4>
              {isLoadingLoader ? <p className='text-sm text-neutral-500'>Loading loaders...</p> : <LoaderSelector />}
            </div>
          </Can>
          <Can action='modrinth.version'>
            <div>
              <h4 className='text-xs font-medium text-neutral-400 mb-2'>Version</h4>
              {isLoadingVersion ? <p className='text-sm text-neutral-500'>Loading versions...</p> : <VersionSelector />}
            </div>
          </Can>
        </div>

        <div className='p-6 bg-[#ffffff09] border border-[#ffffff11] shadow-sm rounded-xl w-full md:w-4/5'>
          <h3 className='text-sm font-semibold text-neutral-200 mb-4'>Downloader</h3>
          <div className='relative w-full mb-4'>
            <Search className='w-5 h-5 absolute top-1/2 -translate-y-1/2 left-5 opacity-40' />
            <input
              className='pl-14 pr-4 py-4 w-full rounded-lg bg-[#ffffff11] text-sm font-bold'
              type='text'
              placeholder='Search'
              value={searchTerm}
              onChange={handleInputChange}
            />
          </div>
          <ModList />
        </div>
      </div>
    </div>
  );
};

const ModrinthContainer = () => {
  return (
    <GlobalStateProvider>
      <ModrinthContainerInner />
    </GlobalStateProvider>
  );
};

export default ModrinthContainer;
