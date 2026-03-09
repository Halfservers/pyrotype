import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

interface DownloadProps {
  url: string;
  serverUuid: string;
  directory?: string;
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

const DownloadModrinth = ({ url, serverUuid, directory = 'mods' }: DownloadProps) => {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const downloadAndUploadFile = async () => {
    setLoading(true);
    try {
      toast.info('Downloading file from Modrinth...');

      const downloadResponse = await fetch(url);
      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.status}`);
      }
      const blob = await downloadResponse.blob();
      const fileName = url.split('/').pop() || 'modrinth-file.jar';
      const file = new Blob([blob], {
        type: downloadResponse.headers.get('content-type') || 'application/java-archive',
      });

      const formData = new FormData();
      formData.append('files', file, fileName);

      toast.info(`Uploading ${fileName} to server...`);

      const headers: Record<string, string> = {};
      const csrfToken = getCookie('XSRF-TOKEN');
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
      }

      const uploadUrl =
        `/api/client/servers/${serverUuid}/files/upload?` +
        new URLSearchParams({ directory: `/container/${directory}` }).toString();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      setProgress(100);
      toast.success(`${fileName} uploaded successfully!`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.warning('Request cancelled.');
      } else {
        toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-4'>
      <Button onClick={downloadAndUploadFile} disabled={loading}>
        {loading ? 'Processing...' : 'Download & Upload'}
      </Button>
      {progress > 0 && <p className='mt-2 text-sm'>Upload Progress: {progress}%</p>}
    </div>
  );
};

export default DownloadModrinth;
