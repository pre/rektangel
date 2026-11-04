import { rectEquals, type Rect, type WindowHistory } from '@rektangel/core';

/** The part of Meta.Window that the store uses. */
export interface TrackableWindow {
  get_id(): number;
  get_frame_rect(): Rect;
  connect(signal: string, callback: () => void): number;
  disconnect(id: number): void;
}

interface Entry {
  window: TrackableWindow;
  history: WindowHistory;
  unmanagedSignal: number;
  /** The handlers that wait for the frame after the last change. */
  frameSignals: number[];
}

/**
 * Keeps one WindowHistory per window. As Rectangle does, it records the
 * frame that the window really has after a change. Mutter can give a
 * different frame than the requested one (size hints, size increments),
 * and on Wayland the new frame comes later, when the client acknowledges it.
 */
export class HistoryStore {
  /** Keyed by window id. */
  private readonly entries = new Map<number, Entry>();

  get(window: TrackableWindow): WindowHistory | undefined {
    return this.entries.get(window.get_id())?.history;
  }

  /** Stores the history. Undefined forgets the window. */
  set(window: TrackableWindow, history: WindowHistory | undefined): void {
    const id = window.get_id();
    const entry = this.entries.get(id);
    if (history === undefined) {
      this.forget(id);
    } else if (entry !== undefined) {
      disconnectFrameSignals(entry);
      entry.history = history;
    } else {
      const unmanagedSignal = window.connect('unmanaged', () => this.forget(id));
      this.entries.set(id, { window, history, unmanagedSignal, frameSignals: [] });
    }
  }

  /**
   * Call after a frame change is applied. When the window does not have the
   * requested frame yet, the next size or position change of the window
   * sets the frame of the last action.
   */
  recordFrameAfterChange(window: TrackableWindow, requested: Rect): void {
    const entry = this.entries.get(window.get_id());
    if (entry === undefined || rectEquals(window.get_frame_rect(), requested)) {
      return;
    }
    const record = (): void => {
      disconnectFrameSignals(entry);
      const { lastAction } = entry.history;
      if (lastAction !== undefined) {
        const { x, y, width, height } = window.get_frame_rect();
        entry.history = { ...entry.history, lastAction: { ...lastAction, rect: { x, y, width, height } } };
      }
    };
    entry.frameSignals = [window.connect('size-changed', record), window.connect('position-changed', record)];
  }

  clear(): void {
    for (const id of [...this.entries.keys()]) {
      this.forget(id);
    }
  }

  private forget(id: number): void {
    const entry = this.entries.get(id);
    if (entry !== undefined) {
      disconnectFrameSignals(entry);
      entry.window.disconnect(entry.unmanagedSignal);
      this.entries.delete(id);
    }
  }
}

function disconnectFrameSignals(entry: Entry): void {
  for (const signal of entry.frameSignals) {
    entry.window.disconnect(signal);
  }
  entry.frameSignals = [];
}
