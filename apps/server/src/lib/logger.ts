import { ORPCError } from "@orpc/server";
import {
  type DestinationStream,
  type Logger,
  type LoggerOptions,
  pino,
} from "pino";

export const LOG_LEVELS = [
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "silent",
] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const EXPECTED_ERROR_STATUSES = new Set([
  400, 401, 403, 404, 409, 422, 429,
]);

const REDACTION_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "authorization",
  "*.authorization",
  "password",
  "*.password",
  "token",
  "*.token",
  "accessToken",
  "*.accessToken",
  "refreshToken",
  "*.refreshToken",
  "sessionToken",
  "*.sessionToken",
  "apiKey",
  "*.apiKey",
  "secret",
  "*.secret",
];

interface LoggerEnv {
  LOG_LEVEL?: string;
  NODE_ENV?: string;
}

interface ReqLike {
  method?: string;
  url?: string;
}

interface ResLike {
  statusCode?: number;
}

interface LogLike {
  debug: (bindings: object, message?: string) => void;
  error: (bindings: object, message?: string) => void;
  info: (bindings: object, message?: string) => void;
  warn: (bindings: object, message?: string) => void;
}

function resolveLogLevel(level: string | undefined): LogLevel {
  if (level && (LOG_LEVELS as readonly string[]).includes(level)) {
    return level as LogLevel;
  }
  return "info";
}

export function createLoggerOptions(env: LoggerEnv): LoggerOptions {
  const options: LoggerOptions = {
    level: resolveLogLevel(env.LOG_LEVEL),
    redact: {
      censor: "[REDACTED]",
      paths: REDACTION_PATHS,
    },
    serializers: {
      req: (request: ReqLike) => ({ method: request.method, url: request.url }),
      res: (reply: ResLike) => ({ statusCode: reply.statusCode }),
    },
  };

  if (env.NODE_ENV !== "production") {
    options.transport = {
      options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "HH:MM:ss.l",
      },
      target: "pino-pretty",
    };
  }

  return options;
}

export function createLogger(
  options: LoggerOptions,
  destination?: DestinationStream
): Logger {
  return pino(options, destination);
}

export function isExpectedError(
  error: unknown
): error is ORPCError<string, unknown> {
  return (
    error instanceof ORPCError && EXPECTED_ERROR_STATUSES.has(error.status)
  );
}

export function logHandlerError(
  log: LogLike | undefined,
  error: unknown
): void {
  if (!log) {
    return;
  }
  if (isExpectedError(error)) {
    log.warn(
      { code: error.code, statusCode: error.status },
      "request rejected"
    );
  } else {
    log.error({ err: error }, "request failed");
  }
}

type BetterAuthLevel = "debug" | "info" | "warn" | "error";

export interface BetterAuthLoggerOptions {
  LOG_LEVEL?: string;
}

export function createBetterAuthLogger(
  logger: Logger,
  options: BetterAuthLoggerOptions
) {
  const level = resolveLogLevel(options.LOG_LEVEL);
  const betterAuthLevel: BetterAuthLevel =
    level === "debug" || level === "warn" || level === "info" ? level : "error";

  const methods = {
    debug: logger.debug.bind(logger),
    error: logger.error.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
  };

  return {
    disableColors: true,
    disabled: false,
    level: betterAuthLevel,
    log: (
      messageLevel: BetterAuthLevel,
      message: string,
      ...args: unknown[]
    ): void => {
      const method = methods[messageLevel];
      if (args.length === 0) {
        method(message);
      } else if (args.length === 1 && args[0] instanceof Error) {
        method({ err: args[0] }, message);
      } else {
        method({ payload: args.length === 1 ? args[0] : args }, message);
      }
    },
  };
}
