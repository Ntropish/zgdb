import { expectType, expectError } from "tsd";
import { Reactor, Orchestrator, Simulator, StepHandler } from "./";

// ===================================================================
//
//                        Reactor Type Tests
//
// ===================================================================

// Define a sample event map
type TestEvents = {
  "user:created": { userId: string; name: string };
  "user:deleted": { userId: string };
};

// Define a valid plugin data structure
const myEventMap: Reactor.EventMap<TestEvents> = {
  "user:created": [
    (ctx) => {
      expectType<TestEvents["user:created"]>(ctx);
    },
  ],
  "user:deleted": [
    (ctx) => {
      expectType<TestEvents["user:deleted"]>(ctx);
    },
  ],
};

const reactorKernel = Reactor.create<TestEvents>({ eventMap: myEventMap });
expectType<Reactor.Kernel<TestEvents>>(reactorKernel);

// Test 'trigger' method
reactorKernel.trigger("user:deleted", { userId: "user-123" });

// === Expect Type Errors ===

// @ts-expect-error - Kernel no longer has a public `on` method.
reactorKernel.on("user:created", () => {});

// @ts-expect-error - Kernel no longer has a public `use` method.
reactorKernel.use(myEventMap);

// @ts-expect-error - Unknown event name for 'trigger'
reactorKernel.trigger("unknown:event", {});

// @ts-expect-error - Wrong property type for 'trigger'
reactorKernel.trigger("user:deleted", { userId: 123 });

// ===================================================================
//
//                     Orchestrator Type Tests
//
// ===================================================================

// Define a sample context type
type TestContext = {
  value: number;
};

// Define a valid step
const myStep: StepHandler<TestContext> = (ctx) => {
  ctx.value = (ctx.value || 0) + 1;
};

// Test Kernel Creation
const orchestratorKernel = Orchestrator.create<TestContext>([myStep]);
expectType<Orchestrator.Kernel<TestContext>>(orchestratorKernel);

// Test 'run' method
orchestratorKernel.run({ value: 10 });

// === Expect Type Errors ===

// @ts-expect-error - 'run' is called with a property of the wrong type
orchestratorKernel.run({ request: { url: 123 } });

// @ts-expect-error - Kernel no longer has a 'registerStep' method
orchestratorKernel.registerStep("bad-step", () => {});

// @ts-expect-error - Kernel no longer has a 'use' method
orchestratorKernel.use({});

// ===================================================================
//
// Type definition tests for the Orchestrator.
//
// ===================================================================

type LoginContext = { userId: string; name: string };
type LogoutContext = { userId: string };

Orchestrator.create<LoginContext>([
  (ctx) => {
    expectType<{ userId: string; name: string }>(ctx);
  },
]);

Orchestrator.create<LogoutContext>([
  (ctx) => {
    expectType<{ userId: string }>(ctx);
  },
]);

/*
// @ts-expect-error - Mismatched handler payload
Orchestrator.create<LoginContext>([
  (ctx: LogoutContext) => {
    console.log(ctx.userId);
  },
]);
*/

// ===================================================================
//
// Type definition tests for the Reactor.
//
// ===================================================================
