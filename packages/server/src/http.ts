import { Orchestrator, LoggerPlugins } from "@tsmk/kernel";
import {
  createServer,
  IncomingMessage,
  ServerResponse,
  Server as NodeHttpServer,
} from "http";
import { ServerContext, TransportAdapter } from "./types";

/**
 * An HTTP-specific context that extends the base ServerContext.
 */
export interface HttpContext extends ServerContext {
  readonly req: IncomingMessage;
  res: ServerResponse;
}

/**
 * A transport adapter for the Node.js HTTP server.
 */
export class HttpAdapter<TContext extends HttpContext>
  implements TransportAdapter<TContext>
{
  private server: NodeHttpServer | null = null;
  private port: number;
  private sockets = new Set<any>();
  private logger?: LoggerPlugins;

  constructor(options: { port: number; loggerPlugins?: LoggerPlugins }) {
    this.port = options.port;
    this.logger = options.loggerPlugins;
  }

  public start(engine: Orchestrator.Kernel<TContext>): NodeHttpServer {
    this.server = createServer(async (req, res) => {
      const context = {
        req,
        res,
        request: req,
        response: {
          headers: {},
        },
        state: new Map(),
      } as TContext;

      try {
        await engine.run(context);

        if (!res.writableEnded) {
          const body = context.response.body;
          const headers = context.response.headers || {};
          let responseBody: string | Buffer;

          if (
            typeof body === "object" &&
            body !== null &&
            !Buffer.isBuffer(body)
          ) {
            headers["Content-Type"] =
              headers["Content-Type"] || "application/json";
            responseBody = JSON.stringify(body);
          } else {
            responseBody = body || "";
          }

          res.writeHead(
            context.response.statusCode || (body ? 200 : 404),
            headers
          );
          res.end(responseBody);
        }
      } catch (e) {
        const error =
          e instanceof Error
            ? { message: e.message, stack: e.stack, name: e.name }
            : e;
        if (this.logger?.error) {
          for (const log of this.logger.error) {
            await log({
              message: "Unhandled error in HttpAdapter",
              error: error,
            });
          }
        }
        console.error("Error in HttpAdapter:", e);
        // The orchestrator will have already logged the error,
        // but we catch here to prevent the server from crashing.
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      }
    });

    this.server.on("connection", (socket) => {
      this.sockets.add(socket);
      socket.on("close", () => {
        this.sockets.delete(socket);
      });
    });

    this.server.listen(this.port);
    return this.server;
  }

  public close(): Promise<void> {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();

    return new Promise((resolve, reject) => {
      if (!this.server) {
        return resolve();
      }
      this.server.close((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
}
