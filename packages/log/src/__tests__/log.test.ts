import { Orchestrator } from "@tsmk/kernel";
import { createLogger, memoryTransport, LogRecord } from "../";

describe("Logger", () => {
  it("should log messages at or above the minimum level", async () => {
    const transport = memoryTransport();
    const { plugins } = createLogger({ minLevel: "info", transport });

    const infoOrchestratorSteps = plugins.info;
    const infoContext = { message: "Hello world", data: { custom: "data" } };
    await Orchestrator.create(infoOrchestratorSteps).run(infoContext);

    const messages = transport.getMessages();
    expect(messages.length).toBe(1);
    const logged = JSON.parse(messages[0]) as LogRecord;
    expect(logged.level).toBe("info");
    expect(logged.message).toBe("Hello world");
    expect(logged.data).toEqual({ custom: "data" });
  });

  it("should not create steps for messages below the minimum level", async () => {
    const transport = memoryTransport();
    // Ask for 'error' level, which is higher than 'info' and 'warn'
    const { plugins } = createLogger({ minLevel: "error", transport });

    // The plugins for 'info' and 'warn' should be empty arrays
    expect(plugins.info).toEqual([]);
    expect(plugins.warn).toEqual([]);
    // The plugin for 'error' should have steps
    expect(plugins.error).toBeDefined();
    expect(plugins.error!.length).toBeGreaterThan(0);
  });

  it("should handle and serialize errors", async () => {
    const transport = memoryTransport();
    const { plugins } = createLogger({ transport }); // Default level is 'info'
    const error = new Error("Something went wrong");

    const errorOrchestratorSteps = plugins.error;
    const errorContext = {
      message: "A critical error occurred",
      error: error,
    };
    await Orchestrator.create(errorOrchestratorSteps).run(errorContext);

    const messages = transport.getMessages();
    expect(messages.length).toBe(1);
    const logged = JSON.parse(messages[0]) as LogRecord;
    expect(logged.level).toBe("error");
    expect(logged.error).toBeDefined();
    expect(logged.error!.name).toBe("Error");
    expect(logged.error!.message).toBe("Something went wrong");
    expect(logged.error!.stack).toBeDefined();
  });
});
