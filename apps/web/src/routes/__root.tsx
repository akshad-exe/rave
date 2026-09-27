import { Toaster } from "@rave/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import type { orpc } from "@/utils/orpc";

import "../index.css";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "rave — Hackathon Platform",
      },
      {
        name: "description",
        content:
          "A hackathon platform for builders, by builders. Discover events, form teams, build projects, win prizes.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.svg",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="rave-theme"
      >
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <footer className="border-border border-t bg-muted/30">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <p className="text-center text-muted-foreground text-sm">
                Built for hackers, by hackers.
              </p>
            </div>
          </footer>
        </div>
        <Toaster position="top-right" richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
    </>
  );
}
