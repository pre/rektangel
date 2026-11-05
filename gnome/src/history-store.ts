import { rectEquals, type Rect, type WindowHistory } from '@rektangel/core';

/** The part of Meta.Window that the store uses. */
export interface TrackableWindow {
  get_id(): number;
  get_frame_rect(): Rect;
  connect(signal: string, callback: () => void): number;
  disconnect(id: number): void;
}

/** The part of Meta.Display that the store uses. */
export interface GrabDisplay {
  connect(signal: 'grab-op-begin', callback: (display: unknown, window: TrackableWindow) => void): number;
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
  private display: GrabDisplay | null = null;
  private grabSignal = 0;

  /**
   * When the user starts to move or resize a window by hand, the frame
   * of the last action does not come any more, so the store stops the
   * wait. One handler on the display serves all windows.
   */
  enable(display: GrabDisplay): void {
    this.display = display;
    this.grabSignal = display.connect('grab-op-begin', (_display, window) => {
      const entry = this.entries.get(window.get_id());
      if (entry !== undefined) {
        disconnectFrameSignals(entry);
      }
    });
  }

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

  /** Forgets all windows and disconnects all handlers. */
  disable(): void {
    for (const id of [...this.entries.keys()]) {
      this.forget(id);
    }
    this.display?.disconnect(this.grabSignal);
    this.display = null;
    this.grabSignal = 0;
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
