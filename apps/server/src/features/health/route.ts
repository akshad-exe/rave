import type { FastifyInstance } from "fastify";

export function registerHealthRoute(fastify: FastifyInstance): void {
  fastify.get("/", { logLevel: "warn" }, async () => "OK");
}
