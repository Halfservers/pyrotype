import type { StateCreator } from 'zustand';

export interface ProgressSlice {
  continuous: boolean;
  progress: number | undefined;
  startContinuous: () => void;
  setProgress: (progress: number | undefined) => void;
  setComplete: () => void;
}

export const createProgressSlice: StateCreator<ProgressSlice> = (set) => ({
  continuous: false,
  progress: undefined,

  startContinuous: () => set({ continuous: true }),

  setProgress: (progress) => set({ progress }),

  setComplete: () =>
    set((state) => ({
      progress: state.progress ? 100 : state.progress,
      continuous: false,
    })),
});
