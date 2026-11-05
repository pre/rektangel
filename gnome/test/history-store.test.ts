import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import type { Rect, WindowHistory } from '@rektangel/core';
import { HistoryStore, type GrabDisplay, type TrackableWindow } from '../src/history-store.ts';

class FakeWindow implements TrackableWindow {
  frame: Rect = { x: 0, y: 0, width: 100, height: 100 };
  private readonly handlers = new Map<number, { signal: string; callback: () => void }>();
  private nextId = 1;

  get_id(): number {
    return 7;
  }

  get_frame_rect(): Rect {
    return { ...this.frame };
  }

  connect(signal: string, callback: () => void): number {
    const id = this.nextId++;
    this.handlers.set(id, { signal, callback });
    return id;
  }

  disconnect(id: number): void {
    this.handlers.delete(id);
  }

  emit(signal: string): void {
    for (const handler of [...this.handlers.values()]) {
      if (handler.signal === signal) {
        handler.callback();
      }
    }
  }

  connectedSignals(): string[] {
    return [...this.handlers.values()].map((handler) => handler.signal).sort();
  }
}

class FakeDisplay implements GrabDisplay {
  private readonly handlers = new Map<number, (display: unknown, window: TrackableWindow) => void>();
  private nextId = 1;

  connect(_signal: 'grab-op-begin', callback: (display: unknown, window: TrackableWindow) => void): number {
    const id = this.nextId++;
    this.handlers.set(id, callback);
    return id;
  }

  disconnect(id: number): void {
    this.handlers.delete(id);
  }

  beginGrab(window: TrackableWindow): void {
    for (const callback of [...this.handlers.values()]) {
      callback(this, window);
    }
  }

  handlerCount(): number {
    return this.handlers.size;
  }
}

const requested: Rect = { x: 0, y: 27, width: 1504, height: 1665 };
const actual: Rect = { x: 0, y: 27, width: 1500, height: 1665 };

function history(): WindowHistory {
  return {
    restoreRect: { x: 100, y: 200, width: 800, height: 600 },
    lastAction: { action: 'left-half', rect: requested, count: 1 },
  };
}

describe('HistoryStore', () => {
  let store: HistoryStore;
  let window: FakeWindow;
  let display: FakeDisplay;

  beforeEach(() => {
    store = new HistoryStore();
    window = new FakeWindow();
    display = new FakeDisplay();
    store.enable(display);
  });

  test('records the frame that Mutter gives after a size change', () => {
    store.set(window, history());
    store.recordFrameAfterChange(window, requested);

    window.frame = actual;
    window.emit('size-changed');

    assert.deepEqual(store.get(window)?.lastAction?.rect, actual);
  });

  test('records the frame after a position change', () => {
    store.set(window, history());
    store.recordFrameAfterChange(window, requested);

    window.frame = actual;
    window.emit('position-changed');

    assert.deepEqual(store.get(window)?.lastAction?.rect, actual);
  });

  test('records only the first change', () => {
    store.set(window, history());
    store.recordFrameAfterChange(window, requested);

    window.frame = actual;
    window.emit('size-changed');
    window.frame = { x: 5, y: 5, width: 5, height: 5 };
    window.emit('position-changed');

    assert.deepEqual(store.get(window)?.lastAction?.rect, actual);
    assert.deepEqual(window.connectedSignals(), ['unmanaged']);
  });

  test('does not wait when the window already has the requested frame', () => {
    window.frame = requested;
    store.set(window, history());

    store.recordFrameAfterChange(window, requested);

    assert.deepEqual(window.connectedSignals(), ['unmanaged']);
  });

  test('does not add a last action to a history without one', () => {
    store.set(window, { restoreRect: requested });
    store.recordFrameAfterChange(window, requested);

    window.frame = actual;
    window.emit('size-changed');

    assert.deepEqual(store.get(window), { restoreRect: requested });
  });

  test('a new history stops the wait for the previous change', () => {
    store.set(window, history());
    store.recordFrameAfterChange(window, requested);

    store.set(window, history());

    assert.deepEqual(window.connectedSignals(), ['unmanaged']);
  });

  test('forgets the window when it is unmanaged', () => {
    store.set(window, history());
    store.recordFrameAfterChange(window, requested);

    window.emit('unmanaged');

    assert.equal(store.get(window), undefined);
    assert.deepEqual(window.connectedSignals(), []);
  });

  test('forgets the window when the history is undefined', () => {
    store.set(window, history());

    store.set(window, undefined);

    assert.equal(store.get(window), undefined);
    assert.deepEqual(window.connectedSignals(), []);
  });

  test('a grab of the window stops the wait for the frame', () => {
    store.set(window, history());
    store.recordFrameAfterChange(window, requested);

    display.beginGrab(window);
    window.frame = actual;
    window.emit('size-changed');

    assert.deepEqual(window.connectedSignals(), ['unmanaged']);
    assert.deepEqual(store.get(window)?.lastAction?.rect, requested);
  });

  test('a grab of another window keeps the wait', () => {
    store.set(window, history());
    store.recordFrameAfterChange(window, requested);

    display.beginGrab(new (class extends FakeWindow {
      override get_id(): number {
        return 8;
      }
    })());

    assert.deepEqual(window.connectedSignals(), ['position-changed', 'size-changed', 'unmanaged']);
  });

  test('connects one grab handler for all windows', () => {
    store.set(window, history());
    store.recordFrameAfterChange(window, requested);

    assert.equal(display.handlerCount(), 1);
  });

  test('disable disconnects all handlers', () => {
    store.set(window, history());
    store.recordFrameAfterChange(window, requested);

    store.disable();

    assert.equal(store.get(window), undefined);
    assert.deepEqual(window.connectedSignals(), []);
    assert.equal(display.handlerCount(), 0);
  });
});
