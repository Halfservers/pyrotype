import { useAppStore } from '@/store/index.ts';

interface KeyedFlashStore {
  addError: (message: string, title?: string) => void;
  clearFlashes: () => void;
  clearAndAddHttpError: (error?: unknown) => void;
}

export const useFlash = () => {
  const addFlash = useAppStore((s) => s.addFlash);
  const addError = useAppStore((s) => s.addError);
  const clearAndAddHttpError = useAppStore((s) => s.clearAndAddHttpError);
  const clearFlashes = useAppStore((s) => s.clearFlashes);

  return { addFlash, addError, clearAndAddHttpError, clearFlashes };
};

export const useFlashKey = (key: string): KeyedFlashStore => {
  const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();

  return {
    addError: (message, title) => addFlash({ key, message, title, type: 'error' }),
    clearFlashes: () => clearFlashes(key),
    clearAndAddHttpError: (error) => clearAndAddHttpError({ key, error }),
  };
};
