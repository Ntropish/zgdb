import { Orchestrator } from "../orchestrator";
import { BREAK } from "../types";

type TestContext = {
  initialValue: number;
  step1Completed?: boolean;
  step2Value?: string;
};

describe("Orchestrator", () => {
  it("should create an orchestrator with no steps", () => {
    const orchestrator = Orchestrator.create<TestContext>([]);
    expect(orchestrator).toBeDefined();
  });

  it("should execute a series of steps in order", async () => {
    const step1 = jest.fn();
    const step2 = jest.fn();
    const orchestrator = Orchestrator.create<TestContext>([step1, step2]);

    await orchestrator.run({ initialValue: 0 });
    expect(step1).toHaveBeenCalled();
    expect(step2).toHaveBeenCalled();
  });

  it("should pass context between steps", async () => {
    const steps = [
      (ctx: TestContext) => {
        ctx.step1Completed = true;
      },
    ];
    const orchestrator = Orchestrator.create<TestContext>(steps);

    const result = await orchestrator.run({ initialValue: 1 });
    expect((result as TestContext).step1Completed).toBe(true);
  });

  it("should handle asynchronous steps", async () => {
    const asyncStep = jest.fn().mockResolvedValue(undefined);
    const orchestrator = Orchestrator.create<TestContext>([asyncStep]);

    await orchestrator.run({ initialValue: 1 });
    expect(asyncStep).toHaveBeenCalled();
  });

  it("should break execution if a step returns BREAK", async () => {
    const step1 = jest.fn();
    const breakStep = () => BREAK;
    const step2 = jest.fn();
    const orchestrator = Orchestrator.create<TestContext>([
      step1,
      breakStep,
      step2,
    ]);

    await orchestrator.run({ initialValue: 1 });
    expect(step1).toHaveBeenCalled();
    expect(step2).not.toHaveBeenCalled();
  });

  it("should clone the orchestrator with its steps", async () => {
    const step1 = jest.fn();
    const orchestrator = Orchestrator.create<TestContext>([step1]);
    const clonedOrchestrator = orchestrator.clone();

    await clonedOrchestrator.run({ initialValue: 1 });
    expect(step1).toHaveBeenCalled();
    expect(clonedOrchestrator).not.toBe(orchestrator);
  });
});
