import type { Context as ApiContext } from "@rave/api/context";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";
import { services } from "./services";
import { auth, db } from "./singletons";

export async function createContext(
  request: FastifyRequest
): Promise<ApiContext> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  return {
    db,
    ipAddress:
      (request.headers["x-forwarded-for"] as string | undefined)
        ?.split(",")[0]
        ?.trim() ?? request.socket.remoteAddress,
    log: request.log.child({
      method: request.method,
      path: request.url,
    }),
    services,
    session,
    userAgent: request.headers["user-agent"],
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
