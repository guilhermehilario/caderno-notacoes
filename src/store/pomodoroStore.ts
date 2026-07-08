import { create } from 'zustand';

export type TimerMode = 'focus' | 'break';
export type TimerState = 'idle' | 'running' | 'paused';

export const POMODORO_DURATION = 25; // minutes
export const BREAK_DURATION = 5; // minutes

interface PomodoroState {
  timerMode: TimerMode;
  timerState: TimerState;
  timeLeft: number; // seconds
  taskName: string;
  currentSessionId: string | null;
  intervalId: ReturnType<typeof setInterval> | null;

  // Actions
  setTaskName: (name: string) => void;
  setTimerMode: (mode: TimerMode) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setCurrentSessionId: (id: string | null) => void;
  setTimeLeft: (seconds: number) => void;
  setTimerState: (state: TimerState) => void;
  tick: () => boolean; // returns true if timer reached zero
  cleanup: () => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  timerMode: 'focus',
  timerState: 'idle',
  timeLeft: POMODORO_DURATION * 60,
  taskName: '',
  currentSessionId: null,
  intervalId: null,

  setTaskName: (name) => set({ taskName: name }),
  setTimerMode: (mode) => set({ timerMode: mode }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setTimeLeft: (seconds) => set({ timeLeft: seconds }),
  setTimerState: (state) => set({ timerState: state }),

  startTimer: () => {
    const state = get();
    // Clear existing interval if any
    if (state.intervalId) clearInterval(state.intervalId);

    set({ timerState: 'running' });

    const intervalId = setInterval(() => {
      const result = get().tick();
      if (result) {
        // Timer reached zero — clear interval
        clearInterval(intervalId);
        set({ intervalId: null });
      }
    }, 1000);

    set({ intervalId });
  },

  pauseTimer: () => {
    const { intervalId } = get();
    if (intervalId) {
      clearInterval(intervalId);
    }
    set({ intervalId: null, timerState: 'paused' });
  },

  resetTimer: () => {
    const { intervalId } = get();
    if (intervalId) {
      clearInterval(intervalId);
    }
    set({
      intervalId: null,
      timerMode: 'focus',
      timeLeft: POMODORO_DURATION * 60,
      timerState: 'idle',
      currentSessionId: null,
      taskName: '',
    });
  },

  tick: () => {
    const { timeLeft } = get();
    if (timeLeft <= 1) {
      set({ timeLeft: 0, timerState: 'idle' });
      return true; // timer completed
    }
    set({ timeLeft: timeLeft - 1 });
    return false;
  },

  cleanup: () => {
    const { intervalId } = get();
    if (intervalId) {
      clearInterval(intervalId);
    }
    set({ intervalId: null });
  },
}));

/**
 * Helper to extract formatted time (MM:SS) from the store state.
 */
export function formatPomodoroTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
