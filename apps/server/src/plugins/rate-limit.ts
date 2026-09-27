import fastifyRateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export interface RateLimitOptions {
  enabled?: boolean;
}

export function registerRateLimit(
  fastify: FastifyInstance,
  options: RateLimitOptions = {}
): void {
  if (options.enabled === false) {
    return;
  }

  fastify.register(fastifyRateLimit, {
    errorResponseBuilder: () => ({
      code: "RATE_LIMITED",
      message: "Too many requests, please slow down",
    }),
    global: true,
    keyGenerator: (request) => {
      const ip =
        (request.headers["x-forwarded-for"] as string | undefined)
          ?.split(",")[0]
          ?.trim() ??
        request.socket.remoteAddress ??
        "unknown";
      return ip;
    },
    max: 200,
    timeWindow: "1 minute",
  });
}
