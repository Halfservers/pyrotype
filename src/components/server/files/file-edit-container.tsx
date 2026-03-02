import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';

import { PageContentBlock } from '@/components/layout/page-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import FileManagerBreadcrumbs from '@/components/server/files/file-manager-breadcrumbs';
import FileNameModal from '@/components/server/files/file-name-modal';
import { useFlash, usePermissions } from '@/lib/hooks';
import { useServerStore } from '@/store/server';

import { httpErrorToHuman } from '@/lib/api/http';
import { getFileContents, saveFileContents } from '@/lib/api/server/files';

const Editor = lazy(() => import('@/components/elements/editor/Editor').catch(() => ({ default: () => <></> as any })));

const FileEditContainer = () => {
  const [error, setError] = useState('');
  const params = useParams({ strict: false }) as { id?: string; action?: string; _splat?: string };
  const action = params.action ?? 'edit';
  const rawFilename = params._splat ?? '';
  const [_loading, setLoading] = useState(action === 'edit');
  const [content, setContent] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [language, setLanguage] = useState<any>();

  const [filename, setFilename] = useState('');

  useEffect(() => {
    setFilename(decodeURIComponent(rawFilename));
  }, [rawFilename]);

  const navigate = useNavigate();
  const id = useServerStore((state) => state.server?.id ?? '');
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const instance = useServerStore((state) => state.socketInstance);
  const setDirectory = useServerStore((state) => state.setFileDirectory);
  const { addError, clearFlashes } = useFlash();

  const [canUpdate] = usePermissions(['file.update']);
  const [canCreate] = usePermissions(['file.create']);

  let fetchFileContent: null | (() => Promise<string>) = null;

  useEffect(() => {
    if (action === 'new' || filename === '') return;

    setError('');
    setLoading(true);
    const dir = filename.split('/').slice(0, -1).join('/') || '/';
    setDirectory(dir);
    getFileContents(uuid, filename)
      .then(setContent)
      .catch((err: unknown) => {
        console.error(err);
        setError(httpErrorToHuman(err));
      })
      .then(() => setLoading(false));
  }, [action, uuid, filename]);

  const save = (name?: string) => {
    return new Promise<void>((resolve, reject) => {
      setLoading(true);
      toast.success(`Saving ${name ?? filename}...`);
      clearFlashes('files:view');
      if (fetchFileContent) {
        fetchFileContent()
          .then((content) => saveFileContents(uuid, name ?? filename, content))
          .then(() => {
            toast.success(`Saved ${name ?? filename}!`);
            if (name) {
              const encoded = name.split('/').map((s) => encodeURIComponent(s)).join('/');
              navigate({ to: `/server/${id}/files/edit/${encoded}` });
            }
            resolve();
          })
          .catch((error) => {
            console.error(error);
            addError({ message: httpErrorToHuman(error), key: 'files:view' });
            reject(error);
          })
          .finally(() => setLoading(false));
      }
    });
  };

  const saveAndRestart = async (name?: string) => {
    try {
      await save(name);
      if (instance) {
        setTimeout(() => {
          toast.success('Your server is restarting.');
        }, 500);
        instance.send('set state', 'restart');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (error) {
    return <div className='p-4 text-red-400'>An error occurred: {error}</div>;
  }

  return (
    <PageContentBlock title={action === 'edit' ? `Editing ${filename}` : 'New File'}>
      <div className='flex py-6 bg-[#ffffff11] rounded-md rounded-b-none border border-[#ffffff07] border-b-0'>
        <FileManagerBreadcrumbs withinFileEditor isNewFile={action !== 'edit'} />
      </div>

      {filename === '.pyroignore' && (
        <div className='mb-4 p-4 border-l-4 bg-neutral-900 rounded-sm border-cyan-400'>
          <p className='text-neutral-300 text-sm'>
            You&apos;re editing a <code className='font-mono bg-black rounded-sm py-px px-1'>.pyroignore</code> file.
            Any files or directories listed in here will be excluded from backups.
          </p>
        </div>
      )}

      {modalVisible && (
        <FileNameModal
          onClose={() => setModalVisible(false)}
          onFileNamed={(name) => {
            setModalVisible(false);
            save(name);
          }}
        />
      )}

      <div className='h-full relative bg-[#ffffff11] border border-[#ffffff07] border-t-0 w-full flex-grow min-h-[400px]'>
        <Suspense fallback={<div className='h-full animate-pulse bg-zinc-800 rounded' />}>
          <Editor
            filename={filename}
            initialContent={content}
            language={language}
            onLanguageChanged={(l: any) => setLanguage(l)}
            fetchContent={(value: any) => { fetchFileContent = value; }}
            onContentSaved={() => {
              if (action !== 'edit') {
                setModalVisible(true);
              } else {
                save();
              }
            }}
            className='w-full h-full'
          />
        </Suspense>
      </div>

      <div className='flex flex-row items-center gap-4 mt-4'>
        {action === 'edit' ? (
          canUpdate && (
            <div className='flex gap-1 items-center justify-center'>
              <Button onClick={() => save()}>
                Save <span className='ml-2 font-mono text-xs font-bold uppercase lg:inline-block hidden'>CTRL + S</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='secondary' size='sm'>
                    <svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='m6 9 6 6 6-6' />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent sideOffset={8}>
                  <DropdownMenuItem onSelect={() => saveAndRestart()}>Save & Restart</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        ) : (
          canCreate && (
            <Button variant='secondary' onClick={() => setModalVisible(true)}>
              Create File
            </Button>
          )
        )}
      </div>
    </PageContentBlock>
  );
};

export default FileEditContainer;
