import type { FastifyInstance } from "fastify";
import { auth } from "../../composition/singletons";
import { createAuthEvent } from "../../lib/auth-events";

const AUTH_PATH_PREFIX = /^\/api\/auth\//;

export function registerAuthRoute(fastify: FastifyInstance): void {
  fastify.route({
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = new Headers();
        for (const [key, value] of Object.entries(request.headers)) {
          if (value) {
            headers.append(key, value.toString());
          }
        }
        const req = new Request(url.toString(), {
          body: request.body ? JSON.stringify(request.body) : undefined,
          headers,
          method: request.method,
        });
        const response = await auth.handler(req);
        const rawBody = response.body ? await response.text() : undefined;

        const authEvent = createAuthEvent(
          url.pathname.replace(AUTH_PATH_PREFIX, ""),
          response.status,
          rawBody
        );
        if (authEvent) {
          request.log.info(
            {
              event: authEvent.event,
              ...(authEvent.userId ? { userId: authEvent.userId } : {}),
              ...(authEvent.reason ? { reason: authEvent.reason } : {}),
            },
            "auth event"
          );
        }

        reply.status(response.status);
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });
        reply.send(rawBody ?? null);
      } catch (error) {
        fastify.log.error({ err: error }, "Authentication Error");
        reply.status(500).send({
          code: "AUTH_FAILURE",
          error: "Internal authentication error",
        });
      }
    },
    method: ["GET", "POST"],
    url: "/api/auth/*",
  });
}
