import { Orchestrator, LoggerPlugins, StepHandler } from "@tsmk/kernel";
import { Handler, ServerContext, TransportAdapter } from "./types";

/**
 * The main server class. It is a transport-agnostic middleware engine.
 */
export class Server<TContext extends ServerContext> {
  private transport: TransportAdapter<TContext>;
  private middleware: StepHandler<TContext>[] = [];
  private loggerPlugins?: LoggerPlugins;

  constructor(
    transport: TransportAdapter<TContext>,
    options?: { loggerPlugins?: LoggerPlugins }
  ) {
    this.transport = transport;
    this.loggerPlugins = options?.loggerPlugins;
  }

  /**
   * Registers a middleware handler to be executed for each request.
   * @param fn The handler function.
   */
  public use(step: StepHandler<TContext>): this {
    this.middleware.push(step);
    return this;
  }

  /**
   * Starts the server by initializing the orchestrator and passing it
   * to the transport adapter.
   */
  public listen(): any {
    const engine = Orchestrator.create<TContext>(
      this.middleware,
      this.loggerPlugins
    );
    return this.transport.start(engine);
  }

  /**
   * Stops the server.
   */
  public close(): Promise<void> {
    return this.transport.close();
  }
}
