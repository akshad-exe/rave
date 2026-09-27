"use client";

import { Button } from "@rave/ui/components/button";
import { Link, useLocation } from "@tanstack/react-router";
import { MenuIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const navigation = [
  { label: "Hackathons", to: "/hackathons" },
  { label: "Submit", to: "/submit" },
  { label: "Gallery", to: "/gallery" },
] as const;

const authLinks = [
  { label: "Sign in", to: "/login", variant: "ghost" as const },
  { label: "Get started", to: "/register", variant: "default" as const },
] as const;

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleOpenMenu = useCallback(() => setMobileMenuOpen(true), []);
  const handleCloseMenu = useCallback(() => setMobileMenuOpen(false), []);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.target === event.currentTarget) {
        handleCloseMenu();
      }
    },
    [handleCloseMenu]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseMenu();
      }
    },
    [handleCloseMenu]
  );

  useEffect(() => {
    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileMenuOpen, handleKeyDown]);

  return (
    <header className="sticky top-0 z-20 w-full border-border border-b bg-background/80 backdrop-blur-sm">
      <nav
        aria-label="Main navigation"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              aria-label="Rave home"
              className="flex items-center gap-2"
              to="/"
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
            </Link>

            <div className="hidden md:flex md:gap-1">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <Link
                    className={`rounded-md px-3 py-2 font-medium text-sm transition-colors ${
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    key={item.to}
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              {authLinks.map((link) => (
                <Link key={link.to} to={link.to}>
                  <Button size="sm" variant={link.variant}>
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <ModeToggle />
              <UserMenu />
            </div>

            <button
              aria-expanded={mobileMenuOpen}
              aria-label="Open menu"
              className="size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
              onClick={handleOpenMenu}
              type="button"
            >
              <MenuIcon className="size-5" />
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
        >
          <button
            aria-label="Close menu"
            className="fixed inset-0 bg-black/50"
            onClick={handleOverlayClick}
            type="button"
          />
          <div className="slide-in-from-right fixed top-0 right-0 h-full w-full max-w-sm animate-in border-border border-l bg-background shadow-xl">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-border border-b px-4">
                <span className="font-medium">Menu</span>
                <button
                  aria-label="Close menu"
                  className="size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={handleCloseMenu}
                  type="button"
                >
                  <XIcon className="size-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
                {navigation.map((item) => {
                  const isActive = location.pathname.startsWith(item.to);
                  return (
                    <Link
                      className={`flex items-center rounded-md px-3 py-3 font-medium text-base transition-colors ${
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      key={item.to}
                      to={item.to}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="border-border border-t pt-4" />
                <div className="flex flex-col gap-2">
                  {authLinks.map((link) => (
                    <Link key={link.to} to={link.to}>
                      <Button
                        className="w-full justify-center"
                        variant={link.variant}
                      >
                        {link.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
