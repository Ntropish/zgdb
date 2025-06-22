import * as http from "http";
import { createHttpServer, HttpContext } from "../http";
import { Route } from "@tsmk/router";
import { VNode, ComponentFactory } from "@tsmk/kernel";
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

const createTestHandler = (
  responseBody: any,
  statusCode = 200
): ComponentFactory<HttpContext> => {
  return (ctx) => {
    ctx.res.statusCode = statusCode;
    ctx.res.setHeader("Content-Type", "application/json");
    ctx.res.end(JSON.stringify(responseBody));
    return { factory: "handler", props: {} };
  };
};

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
    const app: VNode = {
      factory: Route,
      props: { path: "/", component: handler },
    };
    const server = await createHttpServer(app);
    serverInstance = server.listen(port);

    const response = await axios.get(baseURL);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: "Hello, world!" });
  });

  it("should correctly parse JSON body for POST requests", async () => {
    const handler: ComponentFactory<HttpContext> = (ctx) => {
      ctx.res.statusCode = 200;
      ctx.res.setHeader("Content-Type", "application/json");
      ctx.res.end(JSON.stringify(ctx.body));
      return { factory: "handler", props: {} };
    };

    const app: VNode = {
      factory: Route,
      props: { path: "/", component: handler },
    };
    const server = await createHttpServer(app);
    serverInstance = server.listen(port);

    const postData = { a: 1, b: "test" };
    const response = await axios.post(baseURL, postData, {
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status).toBe(200);
    expect(response.data).toEqual(postData);
  });

  it("should return a 404 for a route that does not exist", async () => {
    const handler = createTestHandler({});
    const app: VNode = {
      factory: Route,
      props: { path: "/exists", component: handler },
    };
    const server = await createHttpServer(app);
    serverInstance = server.listen(port);

    await expect(axios.get(`${baseURL}/does-not-exist`)).rejects.toThrow(
      "Request failed with status code 404"
    );
  });

  it("should handle different HTTP methods on the same route", async () => {
    const handler: ComponentFactory<HttpContext> = (ctx) => {
      const method = ctx.req.method;
      ctx.res.statusCode = 200;
      ctx.res.setHeader("Content-Type", "application/json");
      ctx.res.end(JSON.stringify({ method }));
      return { factory: "handler", props: {} };
    };

    const app: VNode = {
      factory: Route,
      props: { path: "/", component: handler },
    };
    const server = await createHttpServer(app);
    serverInstance = server.listen(port);

    const getResponse = await axios.get(baseURL);
    expect(getResponse.data).toEqual({ method: "GET" });

    const postResponse = await axios.post(baseURL, {});
    expect(postResponse.data).toEqual({ method: "POST" });
  });

  it("should correctly handle query parameters", async () => {
    const handler: ComponentFactory<HttpContext> = (ctx) => {
      const query = Object.fromEntries(ctx.query.entries());
      ctx.res.statusCode = 200;
      ctx.res.setHeader("Content-Type", "application/json");
      ctx.res.end(JSON.stringify({ query }));
      return { factory: "handler", props: {} };
    };

    const app: VNode = {
      factory: Route,
      props: { path: "/", component: handler },
    };
    const server = await createHttpServer(app);
    serverInstance = server.listen(port);

    const response = await axios.get(`${baseURL}?foo=bar&baz=qux`);
    expect(response.data.query).toEqual({ foo: "bar", baz: "qux" });
  });
});
