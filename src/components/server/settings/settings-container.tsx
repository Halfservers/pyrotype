import Can from '@/components/elements/can';
import CopyOnClick from '@/components/elements/copy-on-click';
import RenameServerBox from '@/components/server/settings/rename-server-box';
import ReinstallServerBox from '@/components/server/settings/reinstall-server-box';
import { Button } from '@/components/ui/button';

import { useServerStore } from '@/store/server';
import { useAppStore } from '@/store';

const formatIp = (ip: string): string => {
  if (ip.includes(':')) return `[${ip}]`;
  return ip;
};

const SettingsContainer = () => {
  const username = useAppStore((state) => state.userData?.username ?? '');
  const id = useServerStore((state) => state.server!.id);
  const uuid = useServerStore((state) => state.server!.uuid);
  const node = useServerStore((state) => state.server!.node);
  const sftp = useServerStore((state) => state.server!.sftpDetails);

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-neutral-100'>Settings</h2>
        <p className='text-sm text-neutral-400 leading-relaxed mt-1'>
          Configure your server settings, manage SFTP access, and access debug information.
        </p>
      </div>

      <Can action='settings.rename'>
        <RenameServerBox />
      </Can>

      <div className='w-full h-full flex flex-col gap-8'>
        <Can action='settings.reinstall'>
          <ReinstallServerBox />
        </Can>

        <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
          <h3 className='text-lg font-semibold text-neutral-200 mb-4'>Debug Information</h3>
          <div className='flex items-center justify-between text-sm'>
            <p>Node</p>
            <code className='font-mono bg-zinc-900 rounded-sm py-1 px-2'>{node}</code>
          </div>
          <CopyOnClick text={uuid}>
            <div className='flex items-center justify-between mt-2 text-sm'>
              <p>Server ID</p>
              <code className='font-mono bg-zinc-900 rounded-sm py-1 px-2'>{uuid}</code>
            </div>
          </CopyOnClick>
        </div>

        <Can action='file.sftp'>
          <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
            <h3 className='text-lg font-semibold text-neutral-200 mb-4'>SFTP Details</h3>
            <div className='flex items-center justify-between text-sm'>
              <p>Server Address</p>
              <CopyOnClick text={`sftp://${formatIp(sftp.ip)}:${sftp.port}`}>
                <code className='font-mono bg-zinc-900 rounded-sm py-1 px-2'>
                  {`sftp://${formatIp(sftp.ip)}:${sftp.port}`}
                </code>
              </CopyOnClick>
            </div>
            <div className='mt-2 flex items-center justify-between text-sm'>
              <p>Username</p>
              <CopyOnClick text={`${username}.${id}`}>
                <code className='font-mono bg-zinc-900 rounded-sm py-1 px-2'>
                  {`${username}.${id}`}
                </code>
              </CopyOnClick>
            </div>
            <div className='mt-6 flex items-center'>
              <div className='flex-1'>
                <div className='border-l-4 border-blue-500 p-3'>
                  <p className='text-xs text-zinc-200'>
                    Your SFTP password is the same as the password you use to access this panel.
                  </p>
                </div>
              </div>
              <div className='ml-4'>
                <a href={`sftp://${username}.${id}@${formatIp(sftp.ip)}:${sftp.port}`}>
                  <Button variant='outline'>Launch SFTP</Button>
                </a>
              </div>
            </div>
          </div>
        </Can>
      </div>
    </div>
  );
};

export default SettingsContainer;
