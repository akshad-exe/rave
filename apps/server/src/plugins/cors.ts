import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import { ENV } from "../env";

export function registerCors(fastify: FastifyInstance): void {
  fastify.register(fastifyCors, {
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86_400,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    origin: ENV.CORS_ORIGIN,
  });
}
