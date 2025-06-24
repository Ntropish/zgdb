import { _getInstanceCount as getReconcilerInstanceCount } from "@tsmk/reconciler";
import { _getInstanceCount as getLoomInstanceCount } from "..";

describe("Singleton Verification", () => {
  it("should only have a single instance of the reconciler module", () => {
    // This test ensures that when we import the reconciler through different
    // packages, we are always getting the same instance. This is critical
    // for hooks to work correctly.
    expect(getReconcilerInstanceCount()).toBe(1);
    expect(getLoomInstanceCount()).toBe(1);
  });
});
