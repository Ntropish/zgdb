import { Server, HttpAdapter } from "@tsmk/server";
import request from "supertest";
import { createLogger } from "@tsmk/log";
import { createScribeTransport } from "@tsmk/scribe";

describe("Simple Test", () => {
  it("should work", async () => {
    const transport = createScribeTransport();
    const { plugins } = createLogger({ transport });

    const adapter = new HttpAdapter({ port: 0 });
    const server = new Server(adapter, { loggerPlugins: plugins });

    server.use((ctx) => {
      ctx.response.body = "hello";
    });

    try {
      const response = await request(server.listen()).get("/");
      expect(response.status).toBe(200);
      expect(response.text).toBe("hello");
    } finally {
      await server.close();
    }
  });
});
