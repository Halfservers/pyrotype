import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

import { useGlobalStateContext } from './config';

export const VersionSelector = () => {
  const { gameVersions, selectedVersions, setSelectedVersions } = useGlobalStateContext();
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVersions = useMemo(() => {
    let versions = showSnapshots ? gameVersions : gameVersions.filter((v) => v.type !== 'snapshot');
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      versions = versions.filter(
        (version) =>
          version.name.toLowerCase().includes(query) ||
          version.id.toLowerCase().includes(query) ||
          version.type.toLowerCase().includes(query),
      );
    }
    return versions;
  }, [gameVersions, showSnapshots, searchQuery]);

  const { releases, snapshots, betas } = useMemo(() => ({
    releases: filteredVersions.filter((v) => v.type === 'release'),
    snapshots: filteredVersions.filter((v) => v.type === 'snapshot'),
    betas: filteredVersions.filter((v) => v.type === 'beta'),
  }), [filteredVersions]);

  const hasSearchResults = filteredVersions.length > 0;

  const renderVersionGroup = (versions: typeof filteredVersions, label?: string) => (
    <div className='space-y-1'>
      {!searchQuery && label && <p className='text-xs text-gray-500 font-medium'>{label}</p>}
      {versions.map((version) => (
        <div key={version.id} className='flex items-center space-x-2'>
          <Checkbox
            id={`version-${version.id}`}
            checked={selectedVersions.includes(version.id)}
            onCheckedChange={(checked) => {
              const newSelected = checked
                ? [...selectedVersions, version.id]
                : selectedVersions.filter((id) => id !== version.id);
              setSelectedVersions(newSelected);
            }}
          />
          <label htmlFor={`version-${version.id}`} className='text-sm cursor-pointer'>
            {version.name}
          </label>
        </div>
      ))}
    </div>
  );

  return (
    <div className='space-y-3'>
      <div className='relative'>
        <Input
          type='text'
          placeholder='Search versions...'
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

      {gameVersions.length === 0 ? (
        <p className='text-sm text-gray-500'>No versions available</p>
      ) : !hasSearchResults ? (
        <p className='text-sm text-gray-500 text-center py-2'>No versions found matching &quot;{searchQuery}&quot;</p>
      ) : (
        <>
          <div className='space-y-1 max-h-60 overflow-y-auto'>
            {releases.length > 0 && renderVersionGroup(releases, 'Releases')}
            {(showSnapshots || searchQuery) && snapshots.length > 0 && renderVersionGroup(snapshots, 'Snapshots')}
            {betas.length > 0 && renderVersionGroup(betas, 'Betas')}
          </div>

          <div className='flex justify-between items-center pt-1 border-t border-gray-700'>
            <span className='text-xs text-gray-500'>{selectedVersions.length} selected</span>
          </div>

          {!searchQuery && (
            <button
              onClick={() => setShowSnapshots((prev) => !prev)}
              className='w-full text-xs text-white hover:text-gray-300 font-medium py-1 flex items-center justify-center gap-1'
            >
              <span>{showSnapshots ? '-' : '+'}</span>
              {showSnapshots ? 'Hide Snapshots' : 'Show Snapshots'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default VersionSelector;
