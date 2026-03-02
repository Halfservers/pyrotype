import { useVirtualizer } from '@tanstack/react-virtual';
import debounce from 'debounce';
import { useEffect, useRef, useState } from 'react';

import { ServerContentBlock } from '@/components/layout/page-header';
import { Checkbox } from '@/components/ui/checkbox';
import FileManagerBreadcrumbs from '@/components/server/files/file-manager-breadcrumbs';
import FileObjectRow from '@/components/server/files/file-object-row';
import MassActionsBar from '@/components/server/files/mass-actions-bar';
import UploadButton from '@/components/server/files/upload-button';
import { useFlash, usePermissions } from '@/lib/hooks';
import { useServerStore } from '@/store/server';
import { useFileManagerQuery } from '@/lib/queries/hooks';

import type { FileObject } from '@/lib/api/server/files';

const sortFiles = (files: FileObject[]): FileObject[] => {
  const sorted = files
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort((a, b) => (a.isFile === b.isFile ? 0 : a.isFile ? 1 : -1));
  return sorted.filter((file, index) => index === 0 || file.name !== sorted[index - 1]?.name);
};

const FileManagerContainer = () => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const id = useServerStore((state) => state.server?.id ?? '');
  const directory = useServerStore((state) => state.fileDirectory);
  const setDirectory = useServerStore((state) => state.setFileDirectory);
  const setSelectedFiles = useServerStore((state) => state.setSelectedFiles);
  const selectedFilesLength = useServerStore((state) => state.selectedFiles.length);
  const { clearFlashes } = useFlash();
  const [canCreate] = usePermissions(['file.create']);

  const { data: files, error, refetch } = useFileManagerQuery(id, directory);

  useEffect(() => {
    clearFlashes('files');
    setSelectedFiles([]);
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setDirectory(decodeURIComponent(hash));
    } else {
      setDirectory('/');
    }
  }, [window.location.hash]);

  useEffect(() => {
    refetch();
  }, [directory]);

  const onSelectAllClick = () => {
    setSelectedFiles(
      selectedFilesLength === (files?.length === 0 ? -1 : files?.length)
        ? []
        : files?.map((file) => file.name) || [],
    );
  };

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = debounce(setSearchTerm, 50);

  const filesArray = sortFiles(files ?? []).filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    setSearchTerm('');
    if (searchInputRef.current) searchInputRef.current.value = '';
  }, [window.location.hash, directory]);

  const rowVirtualizer = useVirtualizer({
    count: filesArray.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 54,
  });

  if (error) {
    return (
      <ServerContentBlock title='File Manager'>
        <div className='p-4 text-red-400'>Something went wrong loading files.</div>
      </ServerContentBlock>
    );
  }

  return (
    <ServerContentBlock title='File Manager'>
      <div className='px-2 sm:px-14 pt-2 h-full sm:pt-14'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-bold'>Files</h2>
          {canCreate && (
            <div className='flex flex-row gap-1'>
              <UploadButton />
            </div>
          )}
        </div>

        <div className='flex flex-wrap-reverse md:flex-nowrap mb-4'>
          <FileManagerBreadcrumbs
            renderLeft={
              <Checkbox
                className='ml-5 mr-4'
                checked={selectedFilesLength === (files?.length === 0 ? -1 : files?.length)}
                onCheckedChange={() => onSelectAllClick()}
              />
            }
          />
        </div>
      </div>

      {!files ? null : (
        <>
          {!files.length ? (
            <p className='text-sm text-zinc-400 text-center'>This folder is empty.</p>
          ) : (
            <>
              <div className='relative p-1 border border-[#ffffff12] rounded-md sm:ml-12 sm:mr-12 mx-2'>
                <div className='absolute left-4 top-1/2 pl-2 -translate-y-1/2 pointer-events-none'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={1.5}
                    stroke='currentColor'
                    className='w-5 h-5 opacity-40'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z'
                    />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  className='pl-14 py-4 w-full rounded-lg bg-[#ffffff11] text-sm font-bold outline-none'
                  type='text'
                  placeholder='Search...'
                  onChange={(event) => debouncedSearchTerm(event.target.value)}
                />
              </div>

              <div ref={parentRef} className='max-h-screen min-h-screen overflow-auto'>
                <div
                  className='p-1 border border-[#ffffff12] rounded-xl sm:ml-12 sm:mr-12 mx-2 bg-[radial-gradient(124.75%_124.75%_at_50.01%_-10.55%,_rgb(16,16,16)_0%,rgb(4,4,4)_100%)]'
                  style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                >
                  <div
                    className='w-full overflow-hidden rounded-lg gap-0.5 flex flex-col'
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((item) => {
                      const file = filesArray[item.index];
                      if (!file) return null;
                      return (
                        <div
                          key={item.key}
                          className='w-full absolute left-0 top-0'
                          style={{
                            height: `${item.size}px`,
                            transform: `translateY(${item.start}px)`,
                          }}
                        >
                          <FileObjectRow file={file} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <MassActionsBar />
            </>
          )}
        </>
      )}
    </ServerContentBlock>
  );
};

export default FileManagerContainer;
