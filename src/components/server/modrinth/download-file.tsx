import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

interface DownloadProps {
  url: string;
  serverUuid: string;
  directory?: string;
}

const DownloadModrinth = ({ url, serverUuid, directory = 'mods' }: DownloadProps) => {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const downloadAndUploadFile = async () => {
    setLoading(true);
    try {
      toast.info('Downloading file from Modrinth...');

      const downloadResponse = await axios.get(url, { responseType: 'blob' });
      const fileName = url.split('/').pop() || 'modrinth-file.jar';
      const file = new Blob([downloadResponse.data], {
        type: downloadResponse.headers['content-type'] || 'application/java-archive',
      });

      const formData = new FormData();
      formData.append('files', file, fileName);

      toast.info(`Uploading ${fileName} to server...`);
      await axios.post(`/api/client/servers/${serverUuid}/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { directory: `/container/${directory}` },
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });

      toast.success(`${fileName} uploaded successfully!`);
    } catch (error) {
      if (axios.isCancel(error)) {
        toast.warning('Request cancelled.');
      } else if (axios.isAxiosError(error) && error.response) {
        toast.error(`Server error! Status: ${error.response.status}`);
      } else if (axios.isAxiosError(error) && error.request) {
        toast.error('No response from server.');
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
