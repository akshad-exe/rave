import { ORPCError } from "@orpc/server";
import type { FastifyInstance, FastifyReply } from "fastify";

interface MaybeHttpError {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
}

/**
 * Works out the HTTP status for a thrown error.
 *
 * Service code raises `ORPCError`, which already knows its HTTP status. Fastify
 * itself sets `statusCode` for things like malformed JSON or a payload over the
 * body limit. Anything else is a bug and must not leak its message to a client.
 */
function statusFor(error: unknown): number {
  if (error instanceof ORPCError) {
    return error.status;
  }

  const candidate = error as MaybeHttpError | null;

  if (typeof candidate?.statusCode === "number") {
    return candidate.statusCode;
  }
  if (typeof candidate?.status === "number") {
    return candidate.status;
  }

  return 500;
}

function bodyFor(error: unknown, status: number): object {
  if (error instanceof ORPCError) {
    return { code: error.code, message: error.message };
  }

  if (status < 500) {
    const message = (error as MaybeHttpError | null)?.message;
    return {
      code: "REQUEST_ERROR",
      message: typeof message === "string" ? message : "Request failed",
    };
  }

  // Never expose stack traces or internal DB errors to clients.
  return { code: "INTERNAL_ERROR", message: "An unexpected error occurred" };
}

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error, _request, reply: FastifyReply) => {
    const status = statusFor(error);

    if (status >= 500) {
      fastify.log.error({ err: error }, "unhandled fastify error");
    } else {
      fastify.log.warn({ err: error, status }, "request rejected");
    }

    reply.status(status).send(bodyFor(error, status));
  });
}
