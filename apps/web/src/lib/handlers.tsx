import type * as React from "react";

/**
 * Handler factories shared by feature components.
 *
 * These exist because the Biome rule `noJsxPropsBind` forbids an arrow function
 * inline in a JSX prop. The usual workaround is a factory per call site, and
 * that pattern was copy-pasted into six route files: `handleAsync` and `fire`
 * alone had three definitions each before this module.
 *
 * Each factory returns a stable handler so the referential equality survives
 * renders and the child's memoization still works.
 */

/**
 * Run an async handler from a void-returning event prop. The promise is not
 * awaited, so a rejection would otherwise surface as an unhandled rejection;
 * swallowing it keeps the click handler total, and callers are expected to
 * surface their own failure with a toast.
 */
export function handleAsync(fn: () => Promise<unknown>) {
  return () => {
    fn().catch(() => undefined);
  };
}

/**
 * Close-on-dismiss handler for a controlled dialog. Only fires on the closing
 * transition, so a dialog that opens never calls the closer.
 */
export function handleDialogClose(onClose: () => void) {
  return (open: boolean) => {
    if (!open) {
      onClose();
    }
  };
}

/** Read a controlled input's value through a plain setter. */
export function handleInputChange<
  T extends HTMLInputElement | HTMLTextAreaElement,
>(setter: (value: string) => void) {
  return (event: React.ChangeEvent<T>) => {
    setter(event.target.value);
  };
}

/** Parse a numeric input, falling back when the field is cleared or invalid. */
export function handleNumberInput(setter: (value: number | null) => void) {
  return (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10);
    setter(Number.isNaN(parsed) ? null : parsed);
  };
}

/**
 * Move a page cursor, clamped at the lower bound. Takes the setter rather than
 * a callback so it can use the updater form: reading the current page from a
 * captured value would go stale when two clicks land before a re-render.
 */
export function changePage(
  setPage: React.Dispatch<React.SetStateAction<number>>,
  delta: number
) {
  return () => {
    setPage((current) => Math.max(1, current + delta));
  };
}

/**
 * Reset a nullable piece of dialog state. Generic over the element so one
 * factory serves `setPendingDelete(null)`, `setPendingRemove(null)` and the
 * rest, rather than a `clearX` closure per dialog.
 */
export function handleClear<T>(setter: (value: T) => void) {
  return () => {
    setter(null as T);
  };
}
