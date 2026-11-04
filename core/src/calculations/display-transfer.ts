import type { Rect } from '../geometry.js';

// Rectangle DisplayTransfer: moves a window to another work area. On each
// axis, a window that touches one edge keeps that edge and its size, a
// window that touches both edges spans the destination, and a window that
// touches no edge keeps its size and its relative position.

/** Rectangle `DisplayTransfer.edgeTolerance` with no gaps. */
export const defaultEdgeTolerance = 4;

type Span = { origin: number; length: number };
type Contact = 'neither' | 'start' | 'end' | 'both';

const clamp = (value: number, lower: number, upper: number): number => Math.min(Math.max(value, lower), upper);

function transfer(window: Span, source: Span, destination: Span, edgeTolerance: number): { span: Span; contact: Contact } {
  const startInset = window.origin - source.origin;
  const endInset = source.origin + source.length - (window.origin + window.length);
  const againstStart = startInset <= edgeTolerance;
  const againstEnd = endInset <= edgeTolerance;

  if (againstStart && againstEnd) {
    const start = clamp(startInset, 0, destination.length / 2);
    const end = clamp(endInset, 0, destination.length / 2);
    return { span: { origin: destination.origin + start, length: destination.length - start - end }, contact: 'both' };
  }
  const length = Math.min(window.length, destination.length);
  const slack = destination.length - length;
  if (againstStart) {
    return { span: { origin: destination.origin + clamp(startInset, 0, slack), length }, contact: 'start' };
  }
  if (againstEnd) {
    return {
      span: { origin: destination.origin + destination.length - length - clamp(endInset, 0, slack), length },
      contact: 'end',
    };
  }
  const centerFraction = (window.origin + window.length / 2 - source.origin) / source.length;
  const origin = destination.origin + centerFraction * destination.length - length / 2;
  return { span: { origin: clamp(origin, destination.origin, destination.origin + slack), length }, contact: 'neither' };
}

function changesOrientation(source: Rect, destination: Rect): boolean {
  return (
    (source.width > source.height && destination.height > destination.width) ||
    (source.height > source.width && destination.width > destination.height)
  );
}

/** Centers `length` on the destination when it is shorter than the span it would get. */
function centered(length: number, spanned: Span, destination: Span): Span {
  if (length >= spanned.length) {
    return spanned;
  }
  return { origin: destination.origin + (destination.length - length) / 2, length };
}

const isOneEdge = (contact: Contact): boolean => contact === 'start' || contact === 'end';

export function transferredRect(
  window: Rect,
  source: Rect,
  destination: Rect,
  edgeTolerance = defaultEdgeTolerance,
): { rect: Rect; touchesAllEdges: boolean } {
  if (source.width <= 0 || source.height <= 0 || destination.width <= 0 || destination.height <= 0) {
    return { rect: window, touchesAllEdges: false };
  }
  const horizontal = transfer(
    { origin: window.x, length: window.width },
    { origin: source.x, length: source.width },
    { origin: destination.x, length: destination.width },
    edgeTolerance,
  );
  const vertical = transfer(
    { origin: window.y, length: window.height },
    { origin: source.y, length: source.height },
    { origin: destination.y, length: destination.height },
    edgeTolerance,
  );

  // A half of a landscape monitor that goes to a portrait monitor (or the
  // other way) would become a long thin strip. It keeps its length and is
  // centered along the edge that it touches.
  if (changesOrientation(source, destination)) {
    if (horizontal.contact === 'both' && isOneEdge(vertical.contact)) {
      horizontal.span = centered(window.width, horizontal.span, { origin: destination.x, length: destination.width });
    } else if (vertical.contact === 'both' && isOneEdge(horizontal.contact)) {
      vertical.span = centered(window.height, vertical.span, { origin: destination.y, length: destination.height });
    }
  }

  return {
    rect: { x: horizontal.span.origin, y: vertical.span.origin, width: horizontal.span.length, height: vertical.span.length },
    touchesAllEdges: horizontal.contact === 'both' && vertical.contact === 'both',
  };
}
