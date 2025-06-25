import { createBuilder, CapabilityMap, BuilderPipeline } from "./index";

export type FluentBuilder<
  TProduct extends object,
  TEventMap extends Record<string, any>
> = {
  [key in keyof TEventMap]: (
    ...args: Parameters<TEventMap[key]>
  ) => FluentBuilder<TProduct, TEventMap>;
} & {
  build: BuilderPipeline<TProduct>;
};

/**
 * A marker interface for a fluent, chainable builder.
 * To achieve full type-safety for nested builders, it is recommended
 * to provide an explicit type for the builder instance.
 *
 * @example
 * const builder: FluentBuilder<HtmlElement> = createFluentBuilder(caps);
 */

// Internal function to wrap a core builder instance in a fluent proxy.
function createFluentProxy<
  TProduct extends object,
  TEventMap extends Record<string, any>
>(
  builder: ReturnType<typeof createBuilder<TProduct, TEventMap>>
): FluentBuilder<TProduct, TEventMap> {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (typeof prop === "symbol") {
        throw new Error("Symbol is not allowed as a capability name.");
      }

      if (prop === "capabilities") {
        return target.capabilities;
      }

      if (prop === "build") {
        return target.build;
      }

      if (prop === "apply") {
        return target.apply;
      }

      const capability = target.capabilities[prop as string];

      if (!capability) {
        throw new Error(`Capability "${String(prop)}" not found.`);
      }

      type EventHandler = TEventMap[typeof prop];
      type EventArgs = Parameters<EventHandler>;

      return (...args: EventArgs[]) => {
        const lastArg = args[args.length - 1];
        const hasCallback = typeof lastArg === "function";
        const applyArgs = hasCallback ? args.slice(0, -1) : args;

        const result = target.apply(prop as string, ...applyArgs);

        if (result && typeof result.build === "function") {
          return createFluentProxy(result);
        }

        return receiver;
      };
    },
  }) as FluentBuilder<TProduct, TEventMap>;
}

/**
 * Creates a new fluent builder instance.
 *
 * This function wraps the standard builder in a Proxy to provide a more ergonomic,
 * method-based API where each capability becomes a callable method.
 *
 * @param capabilities A map of capabilities to be made available on the builder.
 * @returns A fluent, chainable builder.
 */
export function createFluentBuilder<
  TProduct extends object,
  TEventMap extends Record<string, any>
>(
  capabilities: CapabilityMap<TProduct, TEventMap>
): FluentBuilder<TProduct, TEventMap> {
  const builder = createBuilder(capabilities);
  return createFluentProxy(builder);
}
