import { Fragment, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';

import { useServerStore } from '@/store/server';

interface Props {
  renderLeft?: React.ReactNode;
  withinFileEditor?: boolean;
  isNewFile?: boolean;
}

const encodePathSegments = (path: string): string =>
  path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');

const FileManagerBreadcrumbs = ({ renderLeft, withinFileEditor, isNewFile }: Props) => {
  const id = useServerStore((state) => state.server?.id ?? '');
  const directory = useServerStore((state) => state.fileDirectory);

  const [file, setFile] = useState<string>();

  useEffect(() => {
    if (!withinFileEditor || isNewFile) return;
    if (withinFileEditor && !isNewFile) {
      const path = window.location.pathname;
      const decoded = decodeURIComponent(path);
      setFile(decoded.split('/').pop());
    }
  }, [withinFileEditor, isNewFile]);

  const breadcrumbs = (): { name: string; path?: string }[] => {
    if (directory === '.') return [];

    return directory
      .split('/')
      .filter((d) => !!d)
      .map((d, index, dirs) => {
        if (!withinFileEditor && index === dirs.length - 1) {
          return { name: d };
        }
        return { name: d, path: `/${dirs.slice(0, index + 1).join('/')}` };
      });
  };

  return (
    <div className='group select-none flex grow-0 items-center text-sm overflow-x-hidden'>
      {renderLeft || <div className='w-12' />}
      <Link to='/server/$id/files' params={{ id }} className='px-1 text-zinc-200 no-underline hover:text-zinc-100'>
        root
      </Link>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={1.5}
        stroke='currentColor'
        className='w-3 h-3'
      >
        <path strokeLinecap='round' strokeLinejoin='round' d='m8.25 4.5 7.5 7.5-7.5 7.5' />
      </svg>
      {breadcrumbs().map((crumb, index) =>
        crumb.path ? (
          <Fragment key={index}>
            <Link
              to='/server/$id/files'
              params={{ id }}
              hash={encodePathSegments(crumb.path)}
              className='px-1 text-zinc-200 no-underline hover:text-zinc-100'
            >
              {crumb.name}
            </Link>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={1.5}
              stroke='currentColor'
              className='w-3 h-3'
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='m8.25 4.5 7.5 7.5-7.5 7.5' />
            </svg>
          </Fragment>
        ) : (
          <span key={index} className='px-1 text-zinc-300'>
            {crumb.name}
          </span>
        ),
      )}
      {file && (
        <span className='px-1 text-zinc-300'>{file}</span>
      )}
    </div>
  );
};

export default FileManagerBreadcrumbs;
