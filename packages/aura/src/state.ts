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

  let shapeVersion = 0;
  const shapeSignal = createSignal(shapeVersion);

  // A map to store signals for array methods that cause mutation
  let arrayVersion = 0;
  const arrayMutationSignal = createSignal(arrayVersion);
  const arrayMutatingMethods = new Set([
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
  ]);

  const handler: ProxyHandler<T> = {
    get(target, key) {
      if (key === IS_AURA_PROXY) {
        return true;
      }

      shapeSignal.read();

      // If the target is an array and the key is a mutating method,
      // we need to wrap it to trigger updates.
      if (Array.isArray(target) && arrayMutatingMethods.has(key as string)) {
        arrayMutationSignal.read(); // Depend on the mutation signal
        return (...args: any[]) => {
          const result = (target as any)[key](...args);
          arrayMutationSignal.write(++arrayVersion);
          return result;
        };
      }

      // For arrays, the 'length' property is also reactive
      if (Array.isArray(target) && key === "length") {
        arrayMutationSignal.read();
      }

      const signal = signals.get(key);
      if (signal) {
        return signal.read();
      }

      // Fallback for non-reactive properties or methods.
      // This is crucial for things like array reads by index.
      return Reflect.get(target, key);
    },
    set(target, key, value) {
      let signal = signals.get(key);

      if (signal) {
        // If we are updating a property, the new value must also be made reactive.
        const valueToStore =
          typeof value === "object" && value !== null ? aura(value) : value;
        signal.write(valueToStore);
        Reflect.set(target, key, value); // Ensure the underlying object is updated.
      } else {
        // A new property is being added. Make it reactive.
        if (typeof value === "object" && value !== null) {
          signal = createSignal(aura(value));
        } else {
          signal = createSignal(value);
        }
        signals.set(key, signal);
        Reflect.set(target, key, value); // Update the underlying target as well.

        shapeSignal.write(++shapeVersion);

        // If we're setting an index on an array, we need to trigger the mutation signal
        if (Array.isArray(target)) {
          arrayMutationSignal.write(++arrayVersion);
        }
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
      if (typeof value === "object" && value !== null) {
        signals.set(key, createSignal(aura(value)));
      } else {
        signals.set(key, createSignal(value));
      }
    }
  }

  return proxy;
}
