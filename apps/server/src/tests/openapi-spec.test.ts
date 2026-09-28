import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app";

describe("openapi spec", () => {
  let app: ReturnType<typeof buildApp>;
  let spec: {
    paths: Record<string, Record<string, { tags?: string[] }>>;
    "x-tagGroups": Array<{ name: string; tags: string[] }>;
  };

  beforeAll(async () => {
    app = buildApp({ skipRateLimit: true });
    const res = await app.inject({
      method: "GET",
      url: "/api-reference/spec.json",
    });
    expect(res.statusCode).toBe(200);
    spec = res.json();
  });

  afterAll(async () => {
    await app.close();
  });

  it("uses real HTTP methods and tags every operation", () => {
    const paths = spec.paths ?? {};
    const methods: Record<string, number> = {};
    const tags = new Set<string>();
    const untagged: string[] = [];

    for (const [path, ops] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(ops)) {
        methods[method.toUpperCase()] =
          (methods[method.toUpperCase()] ?? 0) + 1;
        const opTags = op.tags ?? [];
        for (const tag of opTags) {
          tags.add(tag);
        }
        if (opTags.length === 0) {
          untagged.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }

    expect(untagged).toEqual([]);
    expect(tags.size).toBeGreaterThan(5);
    expect(methods.POST).toBe(21);
    expect(typeof methods.GET).toBe("number");
    expect(typeof methods.DELETE).toBe("number");
    expect(typeof methods.PATCH).toBe("number");
    expect(typeof methods.PUT).toBe("number");
  });

  it("groups tags into x-tagGroups sections", () => {
    const groups = spec["x-tagGroups"] ?? [];
    expect(groups.length).toBeGreaterThan(2);
    for (const group of groups) {
      expect(group.name.length).toBeGreaterThan(0);
      expect(group.tags.length).toBeGreaterThan(0);
    }
  });
});
