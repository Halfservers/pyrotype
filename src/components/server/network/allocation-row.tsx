import { memo, useCallback, useEffect, useRef, useState } from 'react';
import isEqual from 'react-fast-compare';
import { Crown, Check, X, Trash2, Copy, Radio } from 'lucide-react';

import { Button } from '@/components/ui/button';
import Can from '@/components/elements/can';
import CopyOnClick from '@/components/elements/copy-on-click';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

import { useServerStore } from '@/store/server';
import type { ServerAllocation } from '@/store/server';
import {
  useSetPrimaryAllocationMutation,
  useDeleteAllocationMutation,
  useSetAllocationNotesMutation,
} from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

interface Props {
  allocation: ServerAllocation & { notes?: string | null };
}

function formatIp(ip: string): string {
  return ip === '0.0.0.0' ? '*' : ip;
}

const AllocationRow = ({ allocation }: Props) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(allocation.notes || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:network');

  const serverId = useServerStore((state) => state.server!.id);

  const setPrimaryMutation = useSetPrimaryAllocationMutation(serverId);
  const deleteMutation = useDeleteAllocationMutation(serverId);
  const setNotesMutation = useSetAllocationNotesMutation(serverId);

  const allocationString = allocation.alias
    ? `${allocation.alias}:${allocation.port}`
    : `${formatIp(allocation.ip)}:${allocation.port}`;

  useEffect(() => {
    setNotesValue(allocation.notes || '');
  }, [allocation.notes]);

  const saveNotes = useCallback(() => {
    clearFlashes();
    setNotesMutation.mutate(
      { id: allocation.id, notes: notesValue },
      {
        onSuccess: () => setIsEditingNotes(false),
        onError: (error) => clearAndAddHttpError(error),
      },
    );
  }, [allocation.id, notesValue]);

  const cancelEdit = useCallback(() => {
    setNotesValue(allocation.notes || '');
    setIsEditingNotes(false);
  }, [allocation.notes]);

  const startEdit = useCallback(() => {
    setIsEditingNotes(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const setPrimaryAllocation = () => {
    clearFlashes();
    setPrimaryMutation.mutate(allocation.id, {
      onError: (error) => clearAndAddHttpError(error),
    });
  };

  const deleteAllocation = () => {
    setShowDeleteDialog(false);
    clearFlashes();
    deleteMutation.mutate(allocation.id, {
      onError: (error) => clearAndAddHttpError(error),
    });
  };

  return (
    <div className='bg-[#ffffff06] border border-[#ffffff10] rounded-lg p-4 hover:border-[#ffffff15] transition-colors'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-3 mb-3'>
            <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-[#ffffff11] flex items-center justify-center'>
              <Radio className='w-4 h-4 text-zinc-400' />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center flex-wrap gap-2'>
                <CopyOnClick text={allocationString}>
                  <div className='flex items-center gap-2 cursor-pointer hover:text-zinc-50 transition-colors group'>
                    <h3 className='text-base font-medium text-zinc-100 font-mono truncate'>
                      {allocation.alias ? allocation.alias : formatIp(allocation.ip)}:{allocation.port}
                    </h3>
                    <Copy className='w-4 h-4 text-zinc-500 group-hover:text-zinc-400 transition-colors' />
                  </div>
                </CopyOnClick>
                {allocation.isDefault && (
                  <span className='flex items-center gap-1 text-xs text-brand font-medium bg-brand/10 px-2 py-1 rounded'>
                    <Crown className='w-3 h-3' />
                    Primary
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className='mt-3'>
            <p className='text-xs text-zinc-500 uppercase tracking-wide mb-2'>Notes</p>

            {isEditingNotes ? (
              <div className='space-y-2'>
                <Textarea
                  ref={textareaRef}
                  className='w-full bg-[#ffffff06] border border-[#ffffff08] rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-500 resize-none'
                  placeholder='Add notes for this allocation...'
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.currentTarget.value)}
                  rows={3}
                />
                <div className='flex items-center gap-2'>
                  <Button size='sm' onClick={saveNotes} disabled={setNotesMutation.isPending}>
                    <Check className='w-3 h-3 mr-1' />
                    Save
                  </Button>
                  <Button variant='outline' size='sm' onClick={cancelEdit} disabled={setNotesMutation.isPending}>
                    <X className='w-3 h-3 mr-1' />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Can action='allocation.update'>
                <div
                  className={`min-h-[2.5rem] p-3 rounded-lg border border-[#ffffff08] bg-[#ffffff03] cursor-pointer hover:border-[#ffffff15] transition-colors ${allocation.notes ? 'text-sm text-zinc-300' : 'text-sm text-zinc-500 italic'}`}
                  onClick={startEdit}
                >
                  {allocation.notes || 'Click to add notes...'}
                </div>
              </Can>
            )}
          </div>
        </div>

        <div className='flex items-center justify-center gap-2 sm:flex-col sm:gap-3'>
          <Can action='allocation.update'>
            <Button
              variant='outline'
              size='sm'
              onClick={setPrimaryAllocation}
              disabled={allocation.isDefault}
              title={allocation.isDefault ? 'This is already the primary allocation' : 'Make this the primary allocation'}
            >
              <Crown className='w-4 h-4 mr-1' />
              <span className='hidden sm:inline'>Make Primary</span>
              <span className='sm:hidden'>Primary</span>
            </Button>
          </Can>
          <Can action='allocation.delete'>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => setShowDeleteDialog(true)}
              disabled={allocation.isDefault || deleteMutation.isPending}
              title={allocation.isDefault ? 'Cannot delete the primary allocation' : 'Delete this allocation'}
            >
              <Trash2 className='w-4 h-4 mr-1' />
              <span className='hidden sm:inline'>Delete</span>
            </Button>
          </Can>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this allocation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAllocation}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default memo(AllocationRow, isEqual);
