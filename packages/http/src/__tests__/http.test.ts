import * as http from "http";
import fetch from "node-fetch";
import { createHttpServer, HttpContext } from "../http";
import { s, validate, Schema } from "@tsmk/schema";
import { StepHandler, BREAK } from "@tsmk/kernel";
import axios from "axios";

const getPort = async () => {
  const server = http.createServer();
  return new Promise<number>((resolve) => {
    server.listen(0, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
  });
};

const createValidationStep = <T>(
  schema: Schema<any, any>,
  getTarget: (ctx: HttpContext) => T
): StepHandler<HttpContext> => {
  return async (ctx) => {
    const target = getTarget(ctx);
    const result = await validate(schema, target);
    if (!result.success) {
      ctx.res.statusCode = 400;
      ctx.res.setHeader("Content-Type", "application/json");
      ctx.res.end(JSON.stringify({ errors: result.error }));
      return BREAK; // Stop processing
    }
    // Mutate context with validated (and possibly coerced) data
    ctx.body = result.data;
  };
};

function createTestHandler(
  responseBody: any,
  statusCode = 200
): StepHandler<HttpContext> {
  return async (ctx) => {
    ctx.res.statusCode = statusCode;
    ctx.body = responseBody;
  };
}

describe("HTTP Server", () => {
  let serverInstance: http.Server | null = null;
  const port = 3005;
  const baseURL = `http://localhost:${port}`;

  afterEach((done) => {
    if (serverInstance) {
      serverInstance.close(() => {
        serverInstance = null;
        done();
      });
    } else {
      done();
    }
  });

  it("should create a server and respond to a GET request", async () => {
    const handler = createTestHandler({ message: "Hello, world!" });
    const server = createHttpServer((router) => {
      router.all("/", [handler]);
    });
    serverInstance = server.listen(port);

    const response = await axios.get(baseURL);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: "Hello, world!" });
  });

  it("should correctly parse JSON body for POST requests", async () => {
    const server = createHttpServer((router) => {
      router.all("/", [
        (ctx: HttpContext) => {
          ctx.res.statusCode = 200;
        },
      ]);
    });
    serverInstance = server.listen(port);

    const postData = { a: 1, b: "test" };
    const response = await axios.post(baseURL, postData, {
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status).toBe(200);
    expect(response.data).toEqual(postData);
  });

  it("should return a 404 for a route that does not exist", async () => {
    const server = createHttpServer((router) => {
      router.all("/exists", [createTestHandler({})]);
    });
    serverInstance = server.listen(port);

    await expect(axios.get(`${baseURL}/does-not-exist`)).rejects.toThrow(
      "Request failed with status code 404"
    );
  });

  it("should handle different HTTP methods on the same route", async () => {
    const getHandler = createTestHandler({ method: "GET" });
    const postHandler = createTestHandler({ method: "POST" });

    const server = createHttpServer((router) => {
      router.all("/", [
        (ctx) => {
          if (ctx.req.method === "GET") {
            return getHandler(ctx);
          }
          if (ctx.req.method === "POST") {
            return postHandler(ctx);
          }
        },
      ]);
    });
    serverInstance = server.listen(port);

    const getResponse = await axios.get(baseURL);
    expect(getResponse.data).toEqual({ method: "GET" });

    const postResponse = await axios.post(baseURL, {});
    expect(postResponse.data).toEqual({ method: "POST" });
  });

  it("should correctly handle query parameters", async () => {
    const server = createHttpServer((router) => {
      router.all("/", [
        (ctx) => {
          ctx.body = { query: Object.fromEntries(ctx.query.entries()) };
          ctx.res.statusCode = 200;
        },
      ]);
    });
    serverInstance = server.listen(port);

    const response = await axios.get(`${baseURL}?foo=bar&baz=qux`);
    expect(response.data.query).toEqual({ foo: "bar", baz: "qux" });
  });
});
