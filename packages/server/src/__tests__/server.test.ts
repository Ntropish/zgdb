import { Server } from "../server";
import { HttpAdapter, HttpContext } from "../http";
import * as http from "http";
import request from "supertest";

describe("Server", () => {
  let serverInstance: http.Server;

  afterEach(() => {
    // Ensure the server is closed after each test
    if (serverInstance && serverInstance.listening) {
      serverInstance.close();
    }
  });

  it("should start an HTTP server and respond to requests", async () => {
    const adapter = new HttpAdapter({ port: 0 }); // Use port 0 for a random available port
    const server = new Server<HttpContext>(adapter);

    server.use((ctx) => {
      ctx.response.body = "Hello, World!";
      ctx.response.statusCode = 200;
    });

    serverInstance = server.listen();

    const response = await request(serverInstance).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello, World!");
  });
});
