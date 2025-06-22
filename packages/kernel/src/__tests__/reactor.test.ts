import { Reactor } from "../reactor";
import { Orchestrator } from "../orchestrator";

describe("Reactor", () => {
  it("should create a kernel", () => {
    const kernel = Reactor.create({ eventMap: {} });
    expect(kernel).toBeDefined();
  });

  it("should register and trigger an event from a plugin object", async () => {
    const testEventSpy = jest.fn();
    const otherEventSpy = jest.fn();
    const emptyEventSpy = jest.fn();

    const reactor = Reactor.fromEventMap({
      testEvent: [(ctx: { foo: string }) => testEventSpy(ctx)],
      otherEvent: [(ctx: { val: number }) => otherEventSpy(ctx)],
      emptyEvent: [() => emptyEventSpy()],
    });

    await reactor.trigger("testEvent", { foo: "bar" });
    await reactor.trigger("otherEvent", { val: 42 });
    await reactor.trigger("emptyEvent");

    expect(testEventSpy).toHaveBeenCalledWith({ foo: "bar" });
    expect(otherEventSpy).toHaveBeenCalledWith({ val: 42 });
    expect(emptyEventSpy).toHaveBeenCalledWith();
  });

  it("should handle multiple handlers for one event", async () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    const reactor = Reactor.fromEventMap({
      myEvent: [
        (ctx: { val: number }) => listener1(ctx),
        (ctx: { val: number }) => listener2(ctx),
      ],
    });

    await reactor.trigger("myEvent", { val: 42 });

    expect(listener1).toHaveBeenCalledWith({ val: 42 });
    expect(listener2).toHaveBeenCalledWith({ val: 42 });
  });
});
