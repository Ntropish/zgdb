import { AuraStore } from "./store";

const IS_AURA_PROXY = Symbol("isAuraProxy");

function createProxy<T extends object>(
  store: AuraStore<T>,
  path: string[] = []
): T {
  const proxy = new Proxy(
    {},
    {
      get(_, key) {
        if (key === IS_AURA_PROXY) {
          return true;
        }

        const newPath = [...path, key as string];
        const pathString = newPath.join(".");

        const value = store.get(pathString);

        if (typeof value === "object" && value !== null) {
          return createProxy(store, newPath);
        }

        return value;
      },
      set(_, key, value) {
        const newPath = [...path, key as string];
        const pathString = newPath.join(".");
        store.set(pathString, value);
        return true;
      },
    }
  );

  return proxy as T;
}

export function aura<T extends object>(initialState: T): T {
  if (initialState && (initialState as any)[IS_AURA_PROXY]) {
    return initialState;
  }
  const store = new AuraStore(initialState);
  return createProxy(store);
}
