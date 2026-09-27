"use client";

import { Button } from "@rave/ui/components/button";
import { Separator } from "@rave/ui/components/separator";
import { cn } from "@rave/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import {
  CalendarIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";

const navigation = [
  { icon: LayoutDashboardIcon, label: "Overview", to: "/organizer" },
  { icon: CalendarIcon, label: "Events", to: "/organizer/events" },
] as const;

export function OrganizerSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const handleOpenSidebar = useCallback(() => setIsOpen(true), []);
  const handleCloseSidebar = useCallback(() => setIsOpen(false), []);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.target === event.currentTarget) {
        handleCloseSidebar();
      }
    },
    [handleCloseSidebar]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Escape") {
        handleCloseSidebar();
      }
    },
    [handleCloseSidebar]
  );

  const handleSignOut = useCallback(() => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  }, []);

  return (
    <>
      <button
        aria-label="Open sidebar"
        className="fixed top-20 left-4 z-50 size-9 rounded-md border border-border bg-background text-muted-foreground hover:bg-muted lg:hidden"
        onClick={handleOpenSidebar}
        type="button"
      >
        <LayoutDashboardIcon className="size-5" />
      </button>

      {isOpen ? (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={handleOverlayClick}
          onKeyDown={handleKeyDown}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-border border-r bg-background transition-transform duration-300 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-border border-b px-4 lg:justify-center">
          <Link
            aria-label="Rave organizer"
            className="flex items-center gap-2"
            to="/organizer"
          >
            <svg
              aria-hidden="true"
              className="size-8 text-primary"
              fill="none"
              viewBox="0 0 32 32"
            >
              <rect fill="currentColor" height="32" rx="8" width="32" />
              <path
                d="M8 16C8 11.5817 11.5817 8 16 8C20.4183 8 24 11.5817 24 16C24 20.4183 20.4183 24 16 24C11.5817 24 8 20.4183 8 16Z"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M16 8V16L20 20"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span className="font-bold font-display text-foreground text-xl">
              rave
            </span>
            <span className="ml-1 rounded bg-primary/10 px-2 py-0.5 text-primary text-xs">
              Organizer
            </span>
          </Link>
          <button
            aria-label="Close sidebar"
            className="size-9 rounded-md text-muted-foreground hover:bg-muted lg:hidden"
            onClick={handleCloseSidebar}
            type="button"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <nav
          aria-label="Organizer navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
        >
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 font-medium text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                key={item.to}
                to={item.to}
              >
                <Icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-border border-t p-4">
          <Separator className="mb-4" />
          <Link to="/settings">
            <Button className="w-full justify-start gap-3" variant="ghost">
              <SettingsIcon className="size-5" />
              Settings
            </Button>
          </Link>
          <form className="mt-2" onSubmit={handleSignOut}>
            <Button
              className="w-full justify-start gap-3 text-error hover:text-error"
              type="submit"
              variant="ghost"
            >
              <LogOutIcon className="size-5" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
