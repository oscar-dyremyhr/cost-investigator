import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False on the server and during hydration, true afterwards. Gates anything that reads local storage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
