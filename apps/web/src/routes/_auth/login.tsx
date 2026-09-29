import { createFileRoute } from "@tanstack/react-router";

import SignInForm from "@/components/sign-in-form";

/**
 * Sign-in is the default auth view. It used to be the other way round: both
 * forms shared this route and sign-up rendered first, so a returning visitor
 * who asked to "log in" was shown a registration form. Each mode now has its
 * own URL so the browser back button, a shared link and a password manager's
 * saved-credentials list all address the right one.
 */
export const Route = createFileRoute("/_auth/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SignInForm />;
}
