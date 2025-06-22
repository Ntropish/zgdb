import { createServer, Server } from "http";
import request from "supertest";
import { r } from "../dsl/r";
import { run } from "../dsl/runner";
import { Context as BaseContext } from "vm";
import { HttpContext } from "@tsmk/server";
import { RouteContext } from "@tsmk/router";
import { StepHandler, LoggerPlugins } from "@tsmk/kernel";
import { RequestWithBody } from "../middleware/body-parser";
import { gunzipSync } from "zlib";
import { createLogger } from "@tsmk/log";
import { createScribeTransport } from "@tsmk/scribe";

// We can augment the context for testing purposes
interface TestContext extends RequestWithBody, RouteContext, BaseContext {
  order: string[];
}

describe("DSL Runner", () => {
  let server: Server | null = null;
  let loggerPlugins: LoggerPlugins;

  beforeEach(() => {
    const transport = createScribeTransport();
    const { plugins } = createLogger({ transport });
    loggerPlugins = plugins;
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it("should start a server and handle a basic route", async () => {
    const basicHandler: StepHandler = (ctx) => {
      ctx.response.body = "world";
    };

    const serverDef = r`
      GET /hello {
        handler: ${basicHandler}
      }
    `;
    server = run(serverDef, { port: 0, loggerPlugins });
    const response = await request(server!).get("/hello");

    expect(response.status).toBe(200);
    expect(response.text).toBe("world");
  });

  it("should throw a clear error for malformed DSL syntax", () => {
    // This test ensures the parser, not the runner, catches syntax errors.
    expect(() => {
      r`
        group /api {
          GET /hello { # Mismatched closing brace
        }
      `;
    }).toThrow(/Invalid block: unbalanced braces/);
  });

  it("should execute deeply nested middleware in the correct order", async () => {
    const init: StepHandler<TestContext> = (ctx) => {
      ctx.order = [];
    };
    const middleware1: StepHandler<TestContext> = (ctx) => {
      ctx.order.push("m1");
    };
    const middleware2: StepHandler<TestContext> = (ctx) => {
      ctx.order.push("m2");
    };
    const handler: StepHandler<TestContext> = (ctx) => {
      ctx.order.push("h");
      ctx.response.body = { finalOrder: ctx.order };
    };

    const serverDef = r`
      @use ${init}
      @use ${middleware1}

      group /api {
        @use ${middleware2}

        GET /test {
          handler: ${handler}
        }
      }
    `;
    server = run(serverDef, { port: 0, loggerPlugins });
    const response = await request(server!).get("/api/test");

    expect(response.status).toBe(200);
    expect(response.body.finalOrder).toEqual(["m1", "m2", "h"]);
  });

  it("should handle a POST request with a JSON body", async () => {
    const handler: StepHandler<TestContext> = (ctx) => {
      ctx.response.statusCode = 200;
      ctx.response.body = { received: ctx.body };
    };
    const serverDef = r`
      POST /echo {
        handler: ${handler}
      }
    `;
    server = run(serverDef, { port: 0, loggerPlugins });
    const payload = { message: "hello" };
    const response = await request(server!)
      .post("/echo")
      .send(payload)
      .set("Content-Type", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: payload });
  });

  it("should handle a POST request with a form-urlencoded body", async () => {
    const handler: StepHandler<TestContext> = (ctx) => {
      ctx.response.statusCode = 200;
      ctx.response.body = { received: ctx.body };
    };
    const serverDef = r`
      POST /form {
        handler: ${handler}
      }
    `;
    server = run(serverDef, { port: 0, loggerPlugins });
    const response = await request(server!)
      .post("/form")
      .send("message=hello&name=tsmk")
      .set("Content-Type", "application/x-www-form-urlencoded");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      received: { message: "hello", name: "tsmk" },
    });
  });

  it("should compress the response body when gzip is accepted", async () => {
    const handler: StepHandler<TestContext> = (ctx) => {
      ctx.response.statusCode = 200;
      ctx.response.body = { message: "this should be compressed" };
    };
    const serverDef = r`
      GET /compressed {
        handler: ${handler}
      }
    `;
    server = run(serverDef, { port: 0, loggerPlugins });

    const response = await request(server!)
      .get("/compressed")
      .set("Accept-Encoding", "gzip");

    expect(response.status).toBe(200);
    expect(response.headers["content-encoding"]).toBe("gzip");

    // Supertest automatically decompresses, so we check the parsed body
    expect(response.body).toEqual({
      message: "this should be compressed",
    });
  });

  // TODO: Edge Case 2: Deeply Nested Middleware Execution Order
  // TODO: Edge Case 3: Route Precedence (Static vs. Parameterized)
  // TODO: Edge Case 4: Comprehensive Error Handling
  // TODO: Edge Case 5: Middleware Short-Circuiting
  // TODO: Edge Case 6: Configuration Propagation
  // TODO: Edge Case 7: Schema Validation Failure
});
