import type { StateCreator } from 'zustand';

// TODO: import from @/types when available
export type FlashMessageType = 'success' | 'info' | 'warning' | 'error';

export interface FlashMessage {
  id?: string;
  key?: string;
  type: FlashMessageType;
  title?: string;
  message: string;
}

export interface FlashSlice {
  flashes: FlashMessage[];
  addFlash: (flash: FlashMessage) => void;
  addError: (opts: { message: string; key?: string }) => void;
  clearAndAddHttpError: (opts: { error?: unknown; key?: string }) => void;
  clearFlashes: (key?: string) => void;
}

function httpErrorToHuman(error: unknown): string {
  if (error instanceof Error) {
    // Axios-style error with response
    const axiosError = error as Error & { response?: { data?: { errors?: Array<{ detail?: string }> } } };
    const detail = axiosError.response?.data?.errors?.[0]?.detail;
    if (detail) return detail;
    return error.message;
  }
  if (typeof error === 'string') return error;
  return 'An unexpected error was encountered while processing this request.';
}

export const createFlashSlice: StateCreator<FlashSlice> = (set) => ({
  flashes: [],

  addFlash: (flash) =>
    set((state) => ({ flashes: [...state.flashes, flash] })),

  addError: (opts) =>
    set((state) => ({
      flashes: [...state.flashes, { type: 'error' as const, title: 'Error', ...opts }],
    })),

  clearAndAddHttpError: (opts) =>
    set(() => {
      if (!opts.error) {
        return { flashes: [] };
      }
      console.error(opts.error);
      return {
        flashes: [
          {
            type: 'error' as const,
            title: 'Error',
            key: opts.key,
            message: httpErrorToHuman(opts.error),
          },
        ],
      };
    }),

  clearFlashes: (key) =>
    set((state) => ({
      flashes: key ? state.flashes.filter((f) => f.key !== key) : [],
    })),
});
