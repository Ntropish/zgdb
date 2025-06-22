import { Reactor } from "@tsmk/kernel";
import {
  createSignalEventMap,
  SignalContextMap,
  SignalUpdateContext,
} from "../index";

describe("TSMK Signals Pattern", () => {
  it("should create a valid, empty SignalEventMap", () => {
    const signalMap = createSignalEventMap<number>();
    expect(signalMap).toHaveProperty("update");
    expect(Array.isArray(signalMap.update)).toBe(true);
    expect(signalMap.update.length).toBe(0);
  });

  it("should allow a handler to be added and triggered via a Reactor", (done) => {
    // 1. Create the EventMap for the signal.
    const signalMap = createSignalEventMap<number>();

    // 2. Define the handler (the subscriber).
    const handler = (ctx: SignalUpdateContext<number>) => {
      expect(ctx.value).toBe(10);
      expect(ctx.oldValue).toBe(0);
      done();
    };

    // 3. Add the handler to the event map.
    signalMap.update.push(handler);

    // 4. Create a reactor kernel with the event map.
    const signalReactor = Reactor.create<SignalContextMap<number>>({
      eventMap: signalMap,
    });

    // 5. Trigger the event.
    signalReactor.trigger("update", { value: 10, oldValue: 0 });
  });
});
