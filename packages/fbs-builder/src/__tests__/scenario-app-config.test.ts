import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";

describe("Scenario Test: QuantumLeap - Centralized App Configuration", () => {
  it("should generate a schema for a complex application configuration file", async () => {
    const builder = createFbsBuilder();
    const initialState = createInitialFbsFileState();

    /**
     * SCENARIO: The "QuantumLeap" application suite needs a robust,
     * versioned, and strongly-typed configuration file format. This format
     * must support various services (API, Worker, Admin) with different
     * settings, many of which should have sensible defaults to keep the
     * configuration files clean.
     *
     * FEATURES TESTED:
     * - `enum` for configuration profiles (Development, Staging, Production).
     * - Extensive use of default values for various scalar types.
     * - `bool`, `int`, `string` types.
     * - A root table that composes other tables for a structured config.
     * - Doc comments to explain each configuration setting.
     */

    builder.namespace("QuantumLeap.Config");

    // An enum to define the deployment environment.
    builder
      .enum("Profile", "byte")
      .docs("The deployment profile for the application.")
      .value("Development", 0)
      .value("Staging", 1)
      .value("Production", 2);

    // Configuration for the main API service.
    builder
      .table("ApiConfig")
      .docs("Configuration for the public-facing API service.")
      .field("host", "string", { defaultValue: "0.0.0.0" })
      .field("port", "ushort", { defaultValue: 8080 })
      .field("tls_enabled", "bool", { defaultValue: false })
      .field("threads", "ubyte", { defaultValue: 4 });

    // Configuration for the background worker service.
    builder
      .table("WorkerConfig")
      .docs("Configuration for the background worker service.")
      .field("queue_name", "string", { defaultValue: "default_queue" })
      .field("retries", "ubyte", { defaultValue: 3 })
      .field("timeout_ms", "uint", { defaultValue: 30000 });

    // The root configuration object that brings everything together.
    builder
      .table("AppConfig")
      .docs("The root configuration for the QuantumLeap application.")
      .field("profile", "Profile", { defaultValue: "Development" })
      .field("api", "ApiConfig")
      .field("worker", "WorkerConfig");

    builder.root_type("AppConfig");

    // Build and render the schema
    const finalState = await builder.build(initialState);
    const result = renderFbs(finalState);

    // The output will be compared against a snapshot.
    expect(result).toMatchSnapshot();
  });
});
