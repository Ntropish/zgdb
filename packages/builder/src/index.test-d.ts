import { expectType } from "tsd";
import { createBuilder, BuilderCapability, CapabilityMap } from "./index";

// Define a product type
interface TestProduct {
  version: string;
  steps: string[];
}

// Define a capability
const testCapability: BuilderCapability<TestProduct, [string], string> = {
  apply: (version: string) => `version-${version}`,
  build: (product, applyReturn, version) => {
    product.version = applyReturn;
    product.steps.push(`test-v${version}`);
  },
};

// Define a capability map
const testCapabilities: CapabilityMap<TestProduct> = {
  test: testCapability,
  other: {
    build: (product) => {
      product.steps.push("other");
    },
  },
};

// Test createBuilder and its return value
const builder: {
  apply: (capabilityName: "test" | "other", ...args: any[]) => any;
  build: (product: TestProduct) => Promise<TestProduct>;
} = createBuilder(testCapabilities);

// Test apply method
builder.apply("test", "1.0.0");

// Test getPipeline return value
const result = builder.build({ version: "", steps: [] });
expectType<Promise<TestProduct>>(result);

// @ts-expect-error - 'invalid' is not a valid capability name.
builder.apply("invalid");
