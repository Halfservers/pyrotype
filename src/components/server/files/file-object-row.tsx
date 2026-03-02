import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
import { memo } from 'react';
import type { ReactNode } from 'react';
import isEqual from 'react-fast-compare';
import { Link } from '@tanstack/react-router';

import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import SelectFileCheckbox from '@/components/server/files/select-file-checkbox';
import FileDropdownMenu from '@/components/server/files/file-dropdown-menu';
import { usePermissions } from '@/lib/hooks';
import { useServerStore } from '@/store/server';

import type { FileObject } from '@/lib/api/server/files';

const bytesToString = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
};

const encodePathSegments = (path: string): string =>
  path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');

function Clickable({ file, children }: { file: FileObject; children: ReactNode }) {
  const [canRead] = usePermissions(['file.read']);
  const [canReadContents] = usePermissions(['file.read-content']);
  const id = useServerStore((state) => state.server?.id ?? '');
  const directory = useServerStore((state) => state.fileDirectory);

  const isClickable =
    (file.isFile && file.isEditable?.() && canReadContents) || (!file.isFile && canRead);

  if (!isClickable) {
    return (
      <div className='flex items-center flex-1 min-w-0 py-2 cursor-default'>
        {children}
      </div>
    );
  }

  const filePath = `${directory}/${file.name}`.replace(/\/+/g, '/');

  if (file.isFile) {
    return (
      <Link
        to={'/server/$id/files/edit/$' as any}
        params={{ id, _splat: encodePathSegments(filePath) } as any}
        className='flex items-center flex-1 min-w-0 py-2 no-underline text-inherit'
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to='/server/$id/files'
      params={{ id }}
      hash={encodePathSegments(filePath)}
      className='flex items-center flex-1 min-w-0 py-2 no-underline text-inherit'
    >
      {children}
    </Link>
  );
}

const MemoizedClickable = memo(Clickable, isEqual);

const FileObjectRow = ({ file }: { file: FileObject }) => (
  <ContextMenu>
    <ContextMenuTrigger asChild>
      <div className='flex items-center w-full hover:bg-[#ffffff08] rounded-lg transition-colors duration-100' key={file.name}>
        <SelectFileCheckbox name={file.name} />
        <MemoizedClickable file={file}>
          <div className='flex-none text-zinc-400 mr-4 text-lg pl-3 mb-0.5'>
            {file.isFile ? (
              <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' />
                <path d='M14 2v4a2 2 0 0 0 2 2h4' />
              </svg>
            ) : (
              <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M2 9.5V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9.5H2ZM22 8V7a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v3h20Z' />
              </svg>
            )}
          </div>
          <div className='flex-1 truncate font-bold text-sm'>{file.name}</div>
          {file.isFile && (
            <div className='w-1/6 text-right mr-4 hidden sm:block text-xs'>{bytesToString(file.size)}</div>
          )}
          <div className='w-1/5 text-right mr-4 hidden md:block text-xs' title={file.modifiedAt.toString()}>
            {Math.abs(differenceInHours(file.modifiedAt, new Date())) > 48
              ? format(file.modifiedAt, 'MMM do, yyyy h:mma')
              : formatDistanceToNow(file.modifiedAt, { addSuffix: true })}
          </div>
        </MemoizedClickable>
      </div>
    </ContextMenuTrigger>
    <FileDropdownMenu file={file} />
  </ContextMenu>
);

export default memo(FileObjectRow, (prevProps, nextProps) => {
  const { isArchiveType, isEditable, ...prevFile } = prevProps.file;
  const { isArchiveType: _nextIsArchiveType, isEditable: _nextIsEditable, ...nextFile } = nextProps.file;
  return isEqual(prevFile, nextFile);
});
