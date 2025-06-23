import { createSignal, Signal } from "@tsmk/signals";

const IS_AURA_PROXY = Symbol("isAuraProxy");
const proxyCache = new WeakMap<object, any>();

/**
 * Creates a reactive state object from a plain JavaScript object.
 *
 * @param initialState The initial state object.
 * @returns A new reactive proxy object.
 */
export function aura<T extends object>(initialState: T): T {
  // If the object is already an aura proxy, return it directly.
  if ((initialState as any)[IS_AURA_PROXY]) {
    return initialState;
  }

  // If we've already created a proxy for this object, return it.
  if (proxyCache.has(initialState)) {
    return proxyCache.get(initialState);
  }

  const signals = new Map<string | symbol, Signal<any>>();

  const handler: ProxyHandler<T> = {
    get(target, key) {
      if (key === IS_AURA_PROXY) {
        return true;
      }

      const signal = signals.get(key);
      if (signal) {
        return signal.read();
      }

      // Fallback for non-reactive properties (e.g., methods on classes).
      return Reflect.get(target, key);
    },
    set(target, key, value) {
      let signal = signals.get(key);

      if (signal) {
        // Update an existing reactive property.
        signal.write(value);
      } else {
        // A new property is being added. Make it reactive.
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          signal = createSignal(aura(value));
        } else {
          signal = createSignal(value);
        }
        signals.set(key, signal);
        Reflect.set(target, key, value); // Update the underlying target as well.
      }
      return true;
    },
  };

  const proxy = new Proxy(initialState, handler);
  proxyCache.set(initialState, proxy);

  // Initialize signals for each property of the initial object.
  for (const key in initialState) {
    if (Object.prototype.hasOwnProperty.call(initialState, key)) {
      const value = initialState[key];
      // Recursively make nested objects reactive.
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        signals.set(key, createSignal(aura(value)));
      } else {
        signals.set(key, createSignal(value));
      }
    }
  }

  return proxy;
}
