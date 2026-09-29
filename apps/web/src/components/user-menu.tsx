import { Button } from "@rave/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rave/ui/components/dropdown-menu";
import { Skeleton } from "@rave/ui/components/skeleton";
import { Link, useNavigate } from "@tanstack/react-router";
import { UserIcon } from "lucide-react";
import { useCallback } from "react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = useCallback(() => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({
            to: "/",
          });
        },
      },
    });
  }, [navigate]);

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Link to="/login">
        <Button variant="outline">Sign In</Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      {/* `asChild` + the button as child, not `render={<Button />}`. The
          wrapper derives base-ui's `render` from Children.only(children), so a
          bare render prop left the trigger childless and the account control
          rendered as an empty box in both themes. */}
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" variant="outline">
          <UserIcon className="size-4" />
          <span className="hidden sm:inline">{session.user.name}</span>
          <span className="sm:hidden">
            {session.user.name?.charAt(0) ?? "?"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
