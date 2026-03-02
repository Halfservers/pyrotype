import { useEffect, useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

import { useServerStore } from '@/store/server';
import { useGlobalStateContext } from './config';
import { getAvailableLoaders } from './eggfeatures';

const DEFAULT_LOADERS = ['paper', 'spigot', 'purpur', 'fabric', 'forge', 'quilt', 'bungeecord'];

interface LoaderSelectorProps {
  maxVisible?: number;
  featuredLoaders?: string[];
}

const capitalizeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const LoaderSelector = ({ maxVisible = 7, featuredLoaders = DEFAULT_LOADERS }: LoaderSelectorProps) => {
  const { loaders, selectedLoaders, setSelectedLoaders } = useGlobalStateContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const eggFeatures = useServerStore((state) => state.server?.eggFeatures || []);
  const availableLoaders = getAvailableLoaders(eggFeatures);

  useEffect(() => {
    if (availableLoaders.length > 0) {
      setSelectedLoaders([...new Set([...selectedLoaders, ...availableLoaders])]);
    }
  }, []);

  const { featured, other, filtered } = useMemo(() => {
    if (!loaders.length) return { featured: [], other: [], filtered: [] };

    const filteredLoaders = searchQuery
      ? loaders.filter((loader) =>
          loader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loader.id.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : loaders;

    const featured: typeof loaders = [];
    const other: typeof loaders = [];

    filteredLoaders.forEach((loader) => {
      if (featuredLoaders.includes(loader.id)) featured.push(loader);
      else other.push(loader);
    });

    featured.sort((a, b) => featuredLoaders.indexOf(a.id) - featuredLoaders.indexOf(b.id));
    other.sort((a, b) => a.name.localeCompare(b.name));

    return { featured, other, filtered: filteredLoaders };
  }, [loaders, searchQuery, featuredLoaders]);

  const loadersToShow = useMemo(() => {
    if (searchQuery) return filtered;
    if (showAll) return [...featured, ...other];
    return featured.slice(0, maxVisible);
  }, [featured, other, filtered, showAll, maxVisible, searchQuery]);

  const hasMoreLoaders = featured.length + other.length > maxVisible && !searchQuery;

  if (loaders.length === 0) {
    return <p className='text-sm text-gray-500'>No loaders available</p>;
  }

  return (
    <div className='space-y-3'>
      <div className='relative'>
        <Input
          type='text'
          placeholder='Search loaders...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='w-full text-sm'
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className='absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm'
          >
            x
          </button>
        )}
      </div>

      <div className='space-y-2 max-h-80 overflow-y-auto'>
        {loadersToShow.length === 0 ? (
          <p className='text-sm text-gray-500 text-center py-2'>No loaders matching &quot;{searchQuery}&quot;</p>
        ) : (
          loadersToShow.map((loader) => (
            <div key={loader.id} className='flex items-center space-x-2'>
              <Checkbox
                id={`loader-${loader.id}`}
                checked={selectedLoaders.includes(loader.id)}
                onCheckedChange={(checked) => {
                  const newSelected = checked
                    ? [...selectedLoaders, loader.id]
                    : selectedLoaders.filter((id) => id !== loader.id);
                  setSelectedLoaders(newSelected);
                }}
              />
              <label htmlFor={`loader-${loader.id}`} className='text-sm cursor-pointer'>
                {capitalizeFirstLetter(loader.name)}
              </label>
            </div>
          ))
        )}
      </div>

      <div className='flex justify-between items-center pt-2 border-t border-gray-700'>
        <span className='text-xs text-gray-500'>{selectedLoaders.length} selected</span>
      </div>

      {hasMoreLoaders && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className='w-full text-xs text-white hover:text-gray-300 py-2 flex items-center justify-center gap-1.5'
        >
          Show {featured.length + other.length - maxVisible} more loaders
        </button>
      )}

      {hasMoreLoaders && showAll && (
        <button
          onClick={() => setShowAll(false)}
          className='w-full text-xs text-white hover:text-gray-300 py-2 flex items-center justify-center gap-1.5'
        >
          Show less
        </button>
      )}
    </div>
  );
};

export default LoaderSelector;
