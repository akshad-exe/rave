import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { ORPCError } from "@orpc/server";
import type { DestinationStream } from "pino";
import { describe, expect, it } from "vitest";

import { buildApp } from "../app";
import { createAuthEvent } from "./auth-events";
import {
  createBetterAuthLogger,
  createLogger,
  createLoggerOptions,
  logHandlerError,
} from "./logger";

interface LogRecord {
  [key: string]: unknown;
}

function createSink() {
  const records: LogRecord[] = [];
  const destination: DestinationStream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      records.push(JSON.parse(chunk.toString()) as LogRecord);
      callback();
    },
  });
  return { destination, records };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

function createTestLogger(env: { LOG_LEVEL?: string } = {}) {
  const { destination, records } = createSink();
  const logger = createLogger(
    createLoggerOptions({ NODE_ENV: "production", ...env }),
    destination
  );
  return { logger, records };
}

function getSingleRecord(records: LogRecord[], level: number): LogRecord {
  const record = records.find((entry) => entry.level === level);
  assert(record, "expected a log record at this level");
  return record;
}

describe("createLoggerOptions", () => {
  it("defaults to info level", () => {
    expect(createLoggerOptions({}).level).toBe("info");
  });

  it("respects LOG_LEVEL and falls back to info for invalid values", () => {
    expect(createLoggerOptions({ LOG_LEVEL: "debug" }).level).toBe("debug");
    expect(createLoggerOptions({ LOG_LEVEL: "silent" }).level).toBe("silent");
    expect(createLoggerOptions({ LOG_LEVEL: "verbose" }).level).toBe("info");
  });
});

describe("logHandlerError", () => {
  it("logs expected errors as warn request rejected without a stack", async () => {
    const { logger, records } = createTestLogger();

    logHandlerError(logger, new ORPCError("UNAUTHORIZED"));

    await flush();

    const warning = getSingleRecord(records, 40);
    expect(warning.msg).toBe("request rejected");
    expect(warning.code).toBe("UNAUTHORIZED");
    expect(warning.statusCode).toBe(401);
    expect(warning.err).toBeUndefined();
  });

  it("logs unexpected errors as error request failed with the cause attached", async () => {
    const { logger, records } = createTestLogger();

    logHandlerError(logger, new Error("boom"));

    await flush();

    const error = getSingleRecord(records, 50);
    expect(error.msg).toBe("request failed");
    expect((error.err as { message?: string }).message).toBe("boom");
  });
});

describe("redaction", () => {
  it("redacts sensitive fields before they reach the output stream", async () => {
    const { logger, records } = createTestLogger();

    logger.info(
      {
        headers: {
          authorization: "Bearer hunter3",
          cookie: "session=abc123",
        },
        password: "hunter2",
        token: "access-token-value",
      },
      "sensitive"
    );

    await flush();

    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("hunter3");
    expect(serialized).not.toContain("access-token-value");
    expect(serialized).not.toContain("abc123");
    expect(serialized).toContain("[REDACTED]");
  });
});

describe("buildApp integration", () => {
  it("logs rejected protected procedure access with request context", async () => {
    const { destination, records } = createSink();
    const app = buildApp({
      logger: createLogger(
        createLoggerOptions({ NODE_ENV: "production" }),
        destination
      ),
    });

    await app.inject({
      method: "POST",
      payload: {
        arguments: [],
        procedure: "privateData",
      },
      url: "/rpc/privateData",
    });

    await flush();
    await app.close();

    const rejected = records.find((entry) => entry.msg === "request rejected");
    assert(rejected, "expected a request rejected log");
    expect(rejected.code).toBe("UNAUTHORIZED");
    expect(rejected.statusCode).toBe(401);
    expect(rejected.reqId).toBeTypeOf("string");
    expect(rejected.method).toBe("POST");
    expect(rejected.path).toBe("/rpc/privateData");

    const failed = records.filter((entry) => entry.msg === "request failed");
    expect(failed).toHaveLength(0);
  });
});

describe("createAuthEvent", () => {
  it("maps sign-in success to a structured auth.sign_in event", () => {
    const event = createAuthEvent(
      "sign-in/email",
      200,
      JSON.stringify({ user: { id: "u1" } })
    );
    expect(event).toEqual({ event: "auth.sign_in", userId: "u1" });
  });

  it("maps failed sign-in to an auth.sign_in_failed event with reason", () => {
    const event = createAuthEvent(
      "sign-in/email",
      401,
      JSON.stringify({ message: "Invalid email or password" })
    );
    expect(event).toEqual({
      event: "auth.sign_in_failed",
      reason: "Invalid email or password",
    });
  });

  it("returns undefined for unmatched actions", () => {
    expect(createAuthEvent("sign-up/email", 401)).toBeUndefined();
  });
});

describe("createBetterAuthLogger", () => {
  it("routes better-auth messages into the pino logger", async () => {
    const { logger, records } = createTestLogger();
    const betterAuthLogger = createBetterAuthLogger(logger, {});

    betterAuthLogger.log("warn", "better auth warning");
    betterAuthLogger.log("error", "better auth error", new Error("boom"));

    await flush();

    const warning = getSingleRecord(records, 40);
    const error = getSingleRecord(records, 50);
    expect(warning.msg).toBe("better auth warning");
    expect(error.msg).toBe("better auth error");
    expect((error.err as { message?: string }).message).toBe("boom");
  });
});
