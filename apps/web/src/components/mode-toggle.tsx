import { Button } from "@rave/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rave/ui/components/dropdown-menu";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

const OPTIONS = [
  { icon: SunIcon, label: "Light", value: "light" },
  { icon: MoonIcon, label: "Dark", value: "dark" },
  { icon: MonitorIcon, label: "System", value: "system" },
] as const;

export function ModeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  // useTheme() reports undefined until mounted, because the theme is not
  // knowable before the client reads storage. Rendering the active-theme
  // indicator before then would either flash the wrong one or mismatch, so the
  // control renders a neutral placeholder until it is mounted.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // `theme` is the stored choice, which may be "system"; `resolvedTheme` is
  // what was actually applied. Marking System active while showing Dark's
  // swatch would be the honest reading of the former.
  const activeValue = mounted ? (theme ?? "light") : null;

  const select = useCallback(
    (value: string) => {
      setTheme(value);
    },
    [setTheme]
  );

  return (
    <DropdownMenu>
      {/* `asChild` with the button as the child, not `render={<Button />}`. The
          dropdown wrapper derives base-ui's `render` from Children.only(children),
          so a bare render prop left the trigger with no children and the button
          rendered as an empty box in both themes. */}
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Theme: ${mounted ? (theme ?? "light") : "loading"}`}
          className="relative"
          size="icon"
          variant="outline"
        >
          <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ icon: Icon, label, value }) => (
          <DropdownMenuItem
            // Radix-style escape hatch, which is what this wrapper implements.
            asChild
            key={value}
            onClick={selectDropdownItem(select, value)}
          >
            <button className="flex w-full items-center gap-2" type="button">
              <Icon className="size-4" />
              {label}
              {activeValue === value ? (
                <CheckIcon className="ml-auto size-4" />
              ) : null}
            </button>
          </DropdownMenuItem>
        ))}
        {mounted ? null : (
          <p className="px-2 py-1.5 text-muted-foreground text-xs">
            {resolvedTheme === undefined ? "Detecting theme…" : null}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function selectDropdownItem(select: (value: string) => void, value: string) {
  return () => {
    select(value);
  };
}
