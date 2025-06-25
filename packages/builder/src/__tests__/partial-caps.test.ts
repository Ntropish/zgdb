import { createBuilder, CapabilityMap } from "../";

describe("Builder Edge Cases: Partial Capabilities", () => {
  interface Product {
    steps: string[];
    applyReturns: any[];
  }

  interface EventMap {
    applyOnly(value: string): string;
    buildOnly(): void;
    fullCap(value: string): string;
    noOp(): void;
    withUndefined(): void;
  }

  const capabilities: CapabilityMap<Product, EventMap> = {
    applyOnly: {
      apply: (value: string) => {
        return `applied:${value}`;
      },
    },
    buildOnly: {
      build: (product: Product) => {
        product.steps.push("buildOnly:executed");
      },
    },
    fullCap: {
      apply: (value: string) => {
        return `fullCap:applied:${value}`;
      },
      build: (product: Product, applyReturn: string) => {
        product.steps.push("fullCap:executed");
        product.applyReturns.push(applyReturn);
      },
    },
    noOp: {},
    withUndefined: {
      apply: undefined,
      build: undefined,
    },
  };

  let product: Product;
  beforeEach(() => {
    product = { steps: [], applyReturns: [] };
  });

  it("should handle capability with only an apply method", async () => {
    const builder = createBuilder<Product, EventMap>(capabilities);
    const result = builder.apply("applyOnly", "test");
    await builder.build(product);

    expect(result).toBe("applied:test");
    expect(product.steps).toEqual([]);
  });

  it("should handle capability with only a build method", async () => {
    const builder = createBuilder<Product, EventMap>(capabilities);
    builder.apply("buildOnly");
    await builder.build(product);

    expect(product.steps).toEqual(["buildOnly:executed"]);
  });

  it("should correctly pass apply return value to build method", async () => {
    const builder = createBuilder<Product, EventMap>(capabilities);
    builder.apply("fullCap", "test");
    await builder.build(product);

    expect(product.steps).toEqual(["fullCap:executed"]);
    expect(product.applyReturns).toEqual(["fullCap:applied:test"]);
  });

  it("should handle a no-op capability", async () => {
    const builder = createBuilder<Product, EventMap>(capabilities);
    builder.apply("noOp");
    await builder.build(product);

    expect(product.steps).toEqual([]);
  });

  it("should handle a capability with undefined handlers", async () => {
    const builder = createBuilder<Product, EventMap>(capabilities);
    builder.apply("withUndefined");
    await builder.build(product);

    expect(product.steps).toEqual([]);
  });
});
