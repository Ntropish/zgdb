import { createBuilder } from "../index.js";

describe("Builder Edge Cases: Error Handling", () => {
  it("should halt the build process on the first error encountered", async () => {
    interface Product {
      steps: string[];
    }

    const capabilities = {
      step1: {
        build: (product: Product) => {
          product.steps.push("step1-executed");
        },
      },
      step2_fails: {
        build: () => {
          throw new Error("Step 2 failed");
        },
      },
      step3: {
        build: (product: Product) => {
          product.steps.push("step3-should-not-execute");
        },
      },
    };

    const builder = createBuilder(capabilities);
    builder.apply("step1");
    builder.apply("step2_fails");
    builder.apply("step3");

    const product: Product = { steps: [] };

    await expect(builder.build(product)).rejects.toThrow("Step 2 failed");

    expect(product.steps).toEqual(["step1-executed"]);
  });
});
