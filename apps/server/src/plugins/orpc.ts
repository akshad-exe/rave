import type { OpenAPIGeneratorGenerateOptions } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fastify";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fastify";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { Context as ApiContext } from "@rave/api/context";
import { appRouter } from "@rave/api/routers/index";
import type { FastifyInstance } from "fastify";
import { createContext } from "../composition/context";
import { logHandlerError } from "../lib/logger";

// Tag group metadata for the Scalar reference UI. `x-tagGroups` is a
// widely-supported vendor extension (not part of the OpenAPI 3.1 types).
export const OPENAPI_SPEC_OPTIONS = {
  "x-tagGroups": [
    {
      name: "Admin & Operations",
      tags: ["Admin", "Exports", "Meta"],
    },
    {
      name: "Events & Configuration",
      tags: ["Events", "Tracks", "Prizes", "Rubrics"],
    },
    {
      name: "Participants",
      tags: ["Teams", "Submissions", "Voting", "Comments"],
    },
    {
      name: "Judging & Scoring",
      tags: ["Assignments", "Scoring", "Results"],
    },
  ],
} as unknown as OpenAPIGeneratorGenerateOptions;

const observeProcedureErrors = (
  error: unknown,
  options: { context: ApiContext }
) => {
  logHandlerError(options.context.log, error);
};

export function registerOrpc(fastify: FastifyInstance): void {
  const rpcHandler = new RPCHandler(appRouter, {
    clientInterceptors: [onError(observeProcedureErrors)],
  });

  const apiHandler = new OpenAPIHandler(appRouter, {
    clientInterceptors: [onError(observeProcedureErrors)],
    plugins: [
      new OpenAPIReferencePlugin({
        schemaConverters: [new ZodToJsonSchemaConverter()],
        specGenerateOptions: OPENAPI_SPEC_OPTIONS,
      }),
    ],
  });

  fastify.register((rpcApp) => {
    rpcApp.addContentTypeParser("*", (_, _payload, done) => {
      done(null, undefined);
    });

    rpcApp.all("/rpc/*", async (request, reply) => {
      const { matched } = await rpcHandler.handle(request, reply, {
        context: await createContext(request),
        prefix: "/rpc",
      });
      if (!matched) {
        reply.status(404).send();
      }
    });

    rpcApp.all("/api-reference/*", async (request, reply) => {
      const { matched } = await apiHandler.handle(request, reply, {
        context: await createContext(request),
        prefix: "/api-reference",
      });
      if (!matched) {
        reply.status(404).send();
      }
    });
  });
}
