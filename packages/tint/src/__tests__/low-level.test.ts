import { Orchestrator, BREAK } from "@tsmk/kernel";
import { red, bold, render, TintContext } from "../low-level";

describe("Tint Low-Level API", () => {
  it("should correctly compose steps to style a string", async () => {
    const pipeline = [bold, red, render];
    const kernel = Orchestrator.create<TintContext>(pipeline);
    const result = await kernel.run({ text: "hello", styles: [] });
    if (result === BREAK) throw new Error("Kernel broke unexpectedly");
    const expected = "\u001b[1m\u001b[31mhello\u001b[39m\u001b[22m";
    expect(result.rendered).toBe(expected);
  });

  it("should handle a single style", async () => {
    const pipeline = [bold, render];
    const kernel = Orchestrator.create<TintContext>(pipeline);
    const result = await kernel.run({ text: "world", styles: [] });
    if (result === BREAK) throw new Error("Kernel broke unexpectedly");
    const expected = "\u001b[1mworld\u001b[22m";
    expect(result.rendered).toBe(expected);
  });

  it("should do nothing for no styles", async () => {
    const pipeline = [render];
    const kernel = Orchestrator.create<TintContext>(pipeline);
    const result = await kernel.run({ text: "plain", styles: [] });
    if (result === BREAK) throw new Error("Kernel broke unexpectedly");
    expect(result.rendered).toBe("plain");
  });
});
