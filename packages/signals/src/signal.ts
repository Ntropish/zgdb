import { Reactor } from "@tsmk/kernel";

export type Signal<T> = {
  read: () => T;
  write: (value: T) => void;
  subscribe: (callback: (value: T) => void) => () => void;
};

export type Effect = () => void;
export const effectStack: Effect[] = [];

export function createEffect(effect: Effect) {
  effectStack.push(effect);
  try {
    effect();
  } finally {
    effectStack.pop();
  }
}

type SignalContextMap<T> = {
  update: { value: T };
};

export function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<(value: T) => void>();
  const effectWrappers = new WeakMap<Effect, (value: T) => void>();

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
    read: () => {
      const currentEffect = effectStack[effectStack.length - 1];
      if (currentEffect) {
        if (!effectWrappers.has(currentEffect)) {
          effectWrappers.set(currentEffect, () => currentEffect());
        }
        subscribers.add(effectWrappers.get(currentEffect)!);
      }
      return value;
    },
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
