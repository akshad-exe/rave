import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Pathless group holding the signed-out pages.
 *
 * Deliberately has no session guard. Its children are /login and /signup, so
 * requiring a session here would redirect /login to /login forever. It exists
 * only to centre and constrain the auth forms, which is what was missing when
 * they were top-level routes: the inputs stretched the full viewport width
 * because no wrapper ever applied a max-width.
 */
export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
