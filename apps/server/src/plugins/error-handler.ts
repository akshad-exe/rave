import type { FastifyInstance } from "fastify";

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error, _request, reply) => {
    // Never expose stack traces or internal DB errors to clients
    fastify.log.error({ err: error }, "unhandled fastify error");
    reply.status(500).send({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  });
}
