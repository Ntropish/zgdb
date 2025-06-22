import { HttpContext, createHttpServer } from "@tsmk/http";
import { s } from "@tsmk/schema";
import { rest } from "../facade";
import request from "supertest";
import * as http from "http";

type TestContext = HttpContext;

describe("REST Facade", () => {
  let server: http.Server;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe("POST /echo", () => {
    it("should create a POST endpoint, validate body, and return it", async () => {
      const app = rest<TestContext>().post("/echo", (r) => {
        r.body(
          s.object({
            name: s.string,
          })
        ).handler((ctx: TestContext) => {
          return { received: ctx.body };
        });
      });

      server = await createHttpServer(app.build());

      const response = await request(server)
        .post("/echo")
        .send({ name: "world" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: { name: "world" } });
    });

    it("should return 400 if body validation fails", async () => {
      const app = rest<TestContext>().post("/echo", (r) => {
        r.body(
          s.object({
            name: s.string,
          })
        ).handler((ctx: TestContext) => {
          return { received: ctx.body };
        });
      });

      server = await createHttpServer(app.build());

      const response = await request(server).post("/echo").send({ name: 123 });

      expect(response.status).toBe(400);
    });
  });
});
