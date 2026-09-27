import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import { logger } from "./composition/singletons";
import { registerAuthRoute } from "./features/auth/route";
import { registerHealthRoute } from "./features/health/route";
import { registerCors } from "./plugins/cors";
import { registerErrorHandler } from "./plugins/error-handler";
import { registerOrpc } from "./plugins/orpc";
import { registerRateLimit } from "./plugins/rate-limit";

export interface BuildAppOptions {
  logger?: FastifyBaseLogger;
  skipRateLimit?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const fastify = Fastify({
    // Limit body size to 4 MB to prevent payload-based DoS
    bodyLimit: 4 * 1024 * 1024,
    loggerInstance: options.logger ?? logger,
  });

  registerRateLimit(fastify, { enabled: options.skipRateLimit !== true });
  registerErrorHandler(fastify);
  registerCors(fastify);
  registerOrpc(fastify);
  registerAuthRoute(fastify);
  registerHealthRoute(fastify);

  return fastify;
}
