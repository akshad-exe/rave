---
name: rave-frontend-traps
description: Version-specific API traps in this stack that fail silently or with misleading errors — base-ui 1.8 part renames, TanStack Form v1 having no getFieldControls, oRPC queryOptions needing an input wrapper, and the lint-vs-typecheck-vs-build distinction. Use before writing any @rave/ui component, any form field, or any orpc query in apps/web.
user-invocable: true
---

# Frontend traps in this stack

Every item here cost real debugging time and none is documented in the repo. The
pinned versions are `@base-ui/react@1.8.0`, `@tanstack/react-form@1.33.5`,
`@tanstack/react-router@1.170.x`, `@orpc/client@1.15.3`, `better-auth@1.7.5`.

## `bun check` is not `check-types` is not `build`

Three different tools, three different questions, and passing one says nothing
about the others.

| Tool | Question | Can pass while… |
|---|---|---|
| `bun check` (Biome) | syntax, lint, format | the types are wrong |
| `check-types` (`tsc`) | types | the route tree is stale |
| `turbo run build` | the app bundles | it bundles the **wrong** app |

The build one is the dangerous case: the TanStack generator runs in a Vite plugin
hook, so a route file that fails to parse leaves `routeTree.gen.ts` stale while
Vite still exits 0. After touching route files, confirm the route count:

```bash
grep -c "'/" apps/web/src/routeTree.gen.ts   # 21 when healthy
```

And note `check-types` is topological — a dependency failing silently skips the
packages after it, so "no errors reported" can mean "never ran".

## base-ui 1.8 renamed the Dialog parts

Written against Radix or an older base-ui, this component will not compile:

| You will reach for | Actually is |
|---|---|
| `Dialog.Overlay` | `Dialog.Backdrop` |
| `Dialog.Content` | `Dialog.Popup` |
| `data-[state=open]:` | `data-open:` / `data-closed:` |

`Dialog.Root` is a **headless state provider**: it renders no element, so it
accepts neither `className` nor `data-slot`. Styling belongs on `DialogContent`
(which renders the popup). Consequently
`React.ComponentProps<typeof DialogPrimitive.Root>` resolves to `Props<unknown>` —
type `Dialog` with `DialogRootProps` instead.

`Dialog.Title` / `Dialog.Description` should be the base-ui primitives, not plain
`div`s; they are what give the popup an accessible name.

For the parts that are ordinary `ForwardRefExoticComponent`s, read props with
`React.ComponentProps<typeof X>` — the `X.Props` namespace style resolves to
`Props<unknown>`. `packages/ui/src/components/progress.tsx` is the reference.

Repo style is `base-lyra`: base-ui, **not** Radix. Check
`packages/ui/components.json` before copying anything from a Radix tutorial.

## TanStack Form v1 has no `getFieldControls`

`form.getFieldControls("name")` does not exist. The v1 equivalents:

- `form.getFieldValue(name)` → value
- `form.getFieldMeta(name)` → `{ errors, isTouched, isValid, ... }`
- `form.setFieldValue(name, updater)` → write
- `form.setFieldMeta(name, updater)` → touch/validate

The idiomatic v1 shape is the `<form.Field name="x">` render prop, which hands
you a `FieldApi`. This repo instead routes through an adapter,
`fieldControls(form, name)` in `apps/web/src/components/form-field.tsx`, so call
sites keep the `controls={fieldControls(form, "name")}` shape. Prefer the adapter
over re-deriving field plumbing per page.

Two typing traps:

- `ReturnType<typeof useForm>` erases the generic to `unknown`. Child components
  take `AnyFormApi` (exported from `@tanstack/react-form`, which re-exports
  form-core) — never a hand-rolled structural stand-in, which will not be
  assignable to the real API.
- `FormField` renders a text input/textarea only when given no `children`. Array,
  boolean and enum fields pass `children` and write through
  `form.setFieldValue` themselves.

## oRPC `queryOptions` needs an `input` wrapper

```ts
orpc.events.list.queryOptions({ input: { limit: 10 } })
```

`input` is only *optional* when the input type is fully optional (every field has
a default), which is why some call sites accept the flat form and others do not.
`enabled` and the other query options are **siblings of `input`**, not a second
argument:

```ts
orpc.scoring.getMyScore.queryOptions({
  input: { assignmentId },
  enabled: assignmentId !== null,
})
```

## `authClient.getProfile()` does not exist

Better Auth 1.7.5 has no such client method (grep the whole dist: zero hits), and
`@rave/auth` sets `plugins: []`. There is also nothing to return: `role` lives in
the separate `user_profile` table, so the session user carries no role, and no
oRPC procedure exposes the caller's role.

Anything gating on role needs that endpoint first. Until then, do not paper over
it by asserting a role that is not verified.

## Biome rules that will bite

`bun run check` is Biome via ultracite, and it is strict:

- `noLeakedRender` — `{value && <X/>}` renders `0` or `""` when falsy. Use a
  ternary returning `null`.
- `noJsxPropsBind` — no inline arrows in JSX props. Hoist to `useCallback`; for
  map-scoped values, put the id in a `data-*` attribute and read
  `event.currentTarget.dataset` in one stable handler.
- `noArrayIndexKey` — key by a stable value, not the index.
- `useHookAtTopLevel` — no `useQuery` after an early return. Do the
  `enabled:`-guard pattern instead.
- `noExcessiveCognitiveComplexity` — max 20. Extract render helpers (a
  `renderXBody(props)` function works well) and hoist module-level constants such
  as zod schemas.
- `noUnnecessaryConditions` — with `@tanstack/react-query` v5, `isLoading` can
  infer as always-falsy; prefer `status === "pending"`.

`bun run fix` applies only safe fixes and will clear almost none of these; they
need editing.

## When editing in bulk

Do not transform many files with a regex script. Parse with a real tool
(comby, jscodeshift, or an AST pass), or edit per occurrence — a script that
mangles one file can silently truncate others, and the damage is not obvious
until a later gate fails. Back up before any bulk edit and re-run all three gates
afterwards, not just the one you were targeting.
