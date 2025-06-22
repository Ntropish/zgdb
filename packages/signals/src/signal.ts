import { Reactor } from "@tsmk/kernel";

export type Signal<T> = {
  read: () => T;
  write: (value: T) => void;
  subscribe: (callback: (value: T) => void) => () => void;
};

type SignalContextMap<T> = {
  update: { value: T };
};

export function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<(value: T) => void>();

  const reactor = Reactor.create<SignalContextMap<T>>({
    eventMap: {
      update: [
        (ctx) => {
          subscribers.forEach((callback) => callback(ctx.value));
        },
      ],
    },
  });

  return {
    read: () => value,
    write: (newValue: T) => {
      value = newValue;
      reactor.trigger("update", { value });
    },
    subscribe: (callback: (value: T) => void) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
}
