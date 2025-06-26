import { createBuilder, CapabilityMap } from "../index.js";
import { describe, it, expect } from "vitest";

type Builder<
  TProduct extends object,
  TEventMap extends Record<string, any>
> = ReturnType<typeof createBuilder<TProduct, TEventMap>>;

describe("Builder Edge Cases: Circular Dependency", () => {
  it("should throw an error for direct circular dependencies", async () => {
    interface Product {
      steps: string[];
    }

    type CirularBuilder = Builder<Product, { recurse: () => CirularBuilder }>;

    const capabilities: CapabilityMap<
      Product,
      { recurse: () => CirularBuilder }
    > = {
      recurse: {
        apply: () => {
          const builder = createBuilder(capabilities);
          builder.apply("recurse");
          return builder;
        },
        build: async (product: Product, childBuilder: CirularBuilder) => {
          product.steps.push("entering build");
          await childBuilder.build(product);
        },
      },
    };

    const builder = createBuilder(capabilities);

    expect(() => builder.apply("recurse")).toThrow(
      "Maximum call stack size exceeded"
    );
  });
});
