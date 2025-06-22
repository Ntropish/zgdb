import { HttpContext, HttpAdapter, Server } from "@tsmk/server";
import { s } from "@tsmk/schema";
import { rest } from "../facade";
import request from "supertest";
import { createLogger, memoryTransport } from "@tsmk/log";
import { Orchestrator, StepHandler } from "@tsmk/kernel";
import { createRouter, RouteContext } from "@tsmk/router";
import { bodyParser, RequestWithBody } from "../middleware/body-parser";
import { compression } from "../middleware/compression";

type TestContext = HttpContext & RouteContext & RequestWithBody;

describe("REST Facade", () => {
  let server: Server<TestContext>;

  afterEach(async () => {
    if (server) {
      await server.close();
    }
  });

  describe("POST /echo", () => {
    it("should create a POST endpoint, validate body, and return it", async () => {
      const transport = memoryTransport();
      const { plugins } = createLogger({ transport });
      const app = rest<TestContext>({ logger: plugins }).post("/echo", (r) => {
        r.body(
          s.object({
            name: s.string,
          })
        ).handler((ctx: TestContext) => {
          return { received: ctx.body };
        });
      });

      const adapter = new HttpAdapter<TestContext>({
        port: 0,
        loggerPlugins: plugins,
      });
      const builtApp = app.build();
      const router = createRouter<TestContext>({ logger: plugins });
      builtApp(router);

      const root = Orchestrator.create<TestContext>(
        [
          bodyParser(),
          (ctx) => {
            ctx.path = new URL(
              ctx.req.url!,
              `http://${ctx.req.headers.host}`
            ).pathname;
            ctx.params = {};
          },
          router.kernel().run,
          compression(),
        ],
        plugins
      );

      server = new Server(adapter, { loggerPlugins: plugins }).use(root.run);

      const response = await request(server.listen())
        .post("/echo")
        .send({ name: "world" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: { name: "world" } });
    });

    it("should return 400 if body validation fails, and log a warning", async () => {
      const transport = memoryTransport();
      const { plugins } = createLogger({ transport });

      const app = rest<TestContext>({ logger: plugins }).post("/echo", (r) => {
        r.body(
          s.object({
            name: s.string,
          })
        ).handler((ctx: TestContext) => {
          return { received: ctx.body };
        });
      });

      const adapter = new HttpAdapter<TestContext>({
        port: 0,
        loggerPlugins: plugins,
      });
      const builtApp = app.build();
      const router = createRouter<TestContext>({ logger: plugins });
      builtApp(router);

      const root = Orchestrator.create<TestContext>(
        [
          bodyParser(),
          (ctx) => {
            ctx.path = new URL(
              ctx.req.url!,
              `http://${ctx.req.headers.host}`
            ).pathname;
            ctx.params = {};
          },
          router.kernel().run,
          compression(),
        ],
        plugins
      );

      server = new Server(adapter, { loggerPlugins: plugins }).use(root.run);

      const response = await request(server.listen())
        .post("/echo")
        .send({ name: 123 });

      expect(response.status).toBe(400);
    });
  });
});
