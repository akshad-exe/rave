import { queryOptions } from "@tanstack/react-query";
import { authClient } from "./auth-client";

/**
 * The signed-in user, as a query rather than a bare `authClient.getSession()`
 * call at every guard.
 *
 * Guards run in `beforeLoad`, which fires on *every* navigation including each
 * sidebar click. Calling the session endpoint directly there meant two network
 * round-trips per navigation with nothing shared between them, so a slow or
 * flaky response read as "not signed in" and bounced the user to /login
 * mid-session — the "clicking another tab asks me to log in again" symptom.
 *
 * Cached behind a single query key, concurrent guards dedupe onto one request
 * and a navigation inside the stale window reads from cache.
 */

/**
 * Long enough that moving around the app does not re-ask, short enough that a
 * sign-out or a role change is picked up without a hard reload. A sign-out
 * clears the query explicitly; see `useSignOut` below.
 */
export const SESSION_STALE_MS = 5 * 60 * 1000;

export const SESSION_QUERY_KEY = ["session"] as const;

export function sessionQueryOptions() {
  return queryOptions({
    queryFn: async () => {
      const { data, error } = await authClient.getSession();
      // Distinguish "definitely signed out" from "could not reach the server".
      // Collapsing both to null turns a momentary network failure into a logout.
      if (error) {
        throw error;
      }
      return data?.user ?? null;
    },
    queryKey: SESSION_QUERY_KEY,
    staleTime: SESSION_STALE_MS,
  });
}
