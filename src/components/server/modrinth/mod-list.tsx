import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import Spinner from '@/components/elements/spinner';
import { ModCard } from './mod-card';
import { ModrinthService, useGlobalStateContext } from './config';

interface ModListProps {
  showInstalled?: boolean;
  showDependencies?: boolean;
}

export const ModList = ({ showInstalled = false }: ModListProps) => {
  const { mods, setMods, selectedLoaders, selectedVersions, searchQuery } = useGlobalStateContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [_hasMore, setHasMore] = useState(true);

  const fetchMods = async (resetPagination = false) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      const currentPage = resetPagination ? 0 : page;
      const facets: string[][] = [['project_type:mod']];

      if (selectedLoaders.length > 0) {
        selectedLoaders.forEach((loader) => facets.push([`categories:${loader}`]));
      }
      if (selectedVersions.length > 0) {
        selectedVersions.forEach((version) => facets.push([`versions:${version}`]));
      }
      facets.push(['server_side:required', 'server_side:optional']);

      const { data } = await ModrinthService.searchMods({
        query: searchQuery || undefined,
        facets,
        limit: 20,
        offset: currentPage,
        index: 'relevance',
      });

      if (resetPagination) {
        setMods(data);
        setPage(0);
      } else {
        setMods((prev) => [...prev, ...data]);
      }
      setHasMore(data.length >= 20);
    } catch (err) {
      setError('Failed to load mods. Please try again later.');
      toast.error(err instanceof Error ? err.message : 'Failed to fetch mods');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMods(true);
  }, [selectedLoaders.join(','), selectedVersions.join(','), searchQuery]);

  if (isLoading && mods.length === 0) {
    return (
      <div className='flex justify-center py-8'>
        <Spinner size='large' centered />
      </div>
    );
  }

  if (error) {
    return <div className='text-red-500 p-4'>{error}</div>;
  }

  if (mods.length === 0) {
    return <div className='text-gray-400 p-4 text-center'>No mods found matching your criteria</div>;
  }

  return (
    <div className='space-y-6'>
      <div className='text-sm text-gray-400 px-2 py-1 bg-gray-800/50 rounded-lg inline-block'>
        Showing {mods.length} {showInstalled ? 'plugins' : 'mods'}
        {searchQuery && (
          <span className='text-gray-300'>
            {' '}for &quot;<span className='text-blue-400'>{searchQuery}</span>&quot;
          </span>
        )}
        {(selectedLoaders.length > 0 || selectedVersions.length > 0) && (
          <span className='text-gray-300'>{' with filters'}</span>
        )}
      </div>

      <div className='grid gap-4'>
        {mods.map((mod) => (
          <ModCard key={`${mod.id}-${mod.latest_version}`} mod={mod} />
        ))}
      </div>
    </div>
  );
};

export default ModList;
