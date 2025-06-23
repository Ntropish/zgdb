import { createHttpServer } from "@tsmk/http";
import { Route } from "@tsmk/router";
import request from "supertest";
import * as http from "http";

describe("VNode Test", () => {
  let server: http.Server;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("should handle a simple route", async () => {
    const app = {
      factory: Route,
      props: {
        path: "/",
        handler: () => ({
          factory: "div",
          props: {
            body: { message: "hello" },
          },
        }),
      },
    };

    server = await createHttpServer(app);

    const response = await request(server).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "hello" });
  });
});
