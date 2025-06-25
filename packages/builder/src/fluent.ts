import { createBuilder, CapabilityMap, BuilderPipeline } from "./index";

/**
 * A marker interface for a fluent, chainable builder.
 * To achieve full type-safety for nested builders, it is recommended
 * to provide an explicit type for the builder instance.
 *
 * @example
 * const builder: FluentBuilder<HtmlElement> = createFluentBuilder(caps);
 */
export interface FluentBuilder<TProduct extends object> {
  [key: string]: ((...args: any[]) => this) | any;
  getPipeline(): BuilderPipeline<TProduct>;
}

// Internal function to wrap a core builder instance in a fluent proxy.
function createFluentProxy<TProduct extends object>(
  builder: ReturnType<typeof createBuilder<any>>
): FluentBuilder<TProduct> {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop === "getPipeline") {
        return target.getPipeline;
      }

      return (...args: any[]) => {
        const lastArg = args[args.length - 1];
        const hasCallback = typeof lastArg === "function";
        const applyArgs = hasCallback ? args.slice(0, -1) : args;

        const result = target.apply(prop as string, ...applyArgs);

        // If a callback is provided for nesting, call it with the new builder proxy.
        if (hasCallback) {
          if (result && typeof result.apply === "function") {
            const subBuilderProxy = createFluentProxy(result);
            lastArg(subBuilderProxy);
          }
          // Return the original proxy to allow chaining on the parent.
          return receiver;
        }

        // If no callback, handle standard chaining.
        if (result === target) {
          return receiver;
        }
        if (result && typeof result.apply === "function") {
          return createFluentProxy(result);
        }

        return result;
      };
    },
  }) as FluentBuilder<TProduct>;
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
export function createFluentBuilder<TProduct extends object>(
  capabilities: CapabilityMap<TProduct>
): FluentBuilder<TProduct> {
  const builder = createBuilder(capabilities);
  return createFluentProxy(builder);
}
