import { createSignal, createEffect } from "../signal";

describe("Signal: Reactivity with Effects", () => {
  it("should run an effect immediately and when a dependency changes", () => {
    const signal = createSignal(10);
    let effectRunCount = 0;
    let latestValue = -1;

    createEffect(() => {
      effectRunCount++;
      latestValue = signal.read();
    });

    // Effect runs once on creation
    expect(effectRunCount).toBe(1);
    expect(latestValue).toBe(10);

    // Should not run if the value written is the same
    // NOTE: This behavior might be desirable to change later,
    // but for now, we expect it to re-run.
    signal.write(10);
    expect(effectRunCount).toBe(2);

    // Should run when the value changes
    signal.write(20);
    expect(effectRunCount).toBe(3);
    expect(latestValue).toBe(20);
  });

  it("should subscribe to multiple signals inside one effect", () => {
    const signalA = createSignal("A");
    const signalB = createSignal("B");
    let combined = "";
    let effectRunCount = 0;

    createEffect(() => {
      effectRunCount++;
      combined = `${signalA.read()}-${signalB.read()}`;
    });

    expect(effectRunCount).toBe(1);
    expect(combined).toBe("A-B");

    signalA.write("C");
    expect(effectRunCount).toBe(2);
    expect(combined).toBe("C-B");

    signalB.write("D");
    expect(effectRunCount).toBe(3);
    expect(combined).toBe("C-D");
  });

  it("should handle nested signals", () => {
    const nestedSignal = createSignal("initial");
    const rootSignal = createSignal(nestedSignal);
    let effectRunCount = 0;
    let latestValue = "";

    createEffect(() => {
      effectRunCount++;
      const innerSignal = rootSignal.read();
      latestValue = innerSignal.read();
    });

    expect(effectRunCount).toBe(1);
    expect(latestValue).toBe("initial");

    // Update the nested signal. The effect should re-run.
    nestedSignal.write("updated");
    expect(effectRunCount).toBe(2);
    expect(latestValue).toBe("updated");
  });
});
