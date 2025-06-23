import { StepHandler } from "@tsmk/kernel";

export * from "./signal";
export type { Signal } from "./signal";
export { createSignal, createEffect, effectStack, type Effect } from "./signal";

// ===================================================================
//
//              TSMK Signals (Pure Event Map)
//
// ===================================================================

/** The context passed when a signal's 'update' event is triggered. */
export type SignalUpdateContext<T> = {
  value: T;
  oldValue: T;
};

/** The ContextMap shape for a signal, used by the Reactor. */
export type SignalContextMap<T> = {
  update: SignalUpdateContext<T>;
};

/**
 * The EventMap shape for a signal. This is the core of the TSMK signal
 * pattern. It maps the 'update' event to a list of StepHandlers.
 */
export type SignalEventMap<T> = {
  update: StepHandler<SignalUpdateContext<T>>[];
};

/**
 * Factory function that creates a typed, empty EventMap for a signal.
 * This is the primary export of the signals package.
 *
 * @returns An EventMap with an empty 'update' handler array.
 */
export function createSignalEventMap<T>(): SignalEventMap<T> {
  return {
    update: [],
  };
}
