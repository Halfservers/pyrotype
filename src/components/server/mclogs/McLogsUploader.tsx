import { useCallback, useRef, useState } from 'react';
import { Copy, ExternalLink, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface McLogsResponse {
  success: boolean;
  id: string;
  url: string;
  raw: string;
}

interface McLogsUploaderProps {
  getConsoleOutput: () => string;
}

const MCLOGS_API = 'https://api.mclo.gs/1/log';

const McLogsUploader = ({ getConsoleOutput }: McLogsUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleUpload = useCallback(async () => {
    const content = getConsoleOutput();
    if (!content.trim()) {
      toast.error('No console output to upload.');
      return;
    }

    setUploading(true);
    abortRef.current = new AbortController();

    try {
      const body = new URLSearchParams({ content });
      const response = await fetch(MCLOGS_API, {
        method: 'POST',
        body,
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = (await response.json()) as McLogsResponse;
      if (!data.success) {
        throw new Error('MCLogs API returned unsuccessful response');
      }

      setResultUrl(data.url);
      setDialogOpen(true);
      toast.success('Log uploaded successfully.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('Failed to upload log to MCLogs.');
    } finally {
      setUploading(false);
      abortRef.current = null;
    }
  }, [getConsoleOutput]);

  const handleCopy = useCallback(async () => {
    if (!resultUrl) return;
    try {
      await navigator.clipboard.writeText(resultUrl);
      toast.success('URL copied to clipboard.');
    } catch {
      toast.error('Failed to copy URL.');
    }
  }, [resultUrl]);

  return (
    <>
      <Button
        variant='outline'
        size='sm'
        onClick={handleUpload}
        disabled={uploading}
      >
        <Upload className='size-4' />
        {uploading ? 'Uploading...' : 'Share via MCLogs'}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Uploaded</DialogTitle>
            <DialogDescription>
              Your log has been uploaded to MCLogs and is ready to share.
            </DialogDescription>
          </DialogHeader>

          <div className='flex items-center gap-2 rounded-md border bg-muted/50 p-3'>
            <code className='flex-1 truncate text-sm'>{resultUrl}</code>
            <Button variant='ghost' size='icon-sm' onClick={handleCopy}>
              <Copy className='size-4' />
            </Button>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <a href={resultUrl ?? '#'} target='_blank' rel='noopener noreferrer'>
                <ExternalLink className='size-4' />
                Open in Browser
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default McLogsUploader;
