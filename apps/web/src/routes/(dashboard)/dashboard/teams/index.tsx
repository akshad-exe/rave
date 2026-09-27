import { Button } from "@rave/ui/components/button";
import { Card } from "@rave/ui/components/card";
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rave/ui/components/empty";
import { Skeleton } from "@rave/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRightIcon, MailIcon, PlusIcon, UsersIcon } from "lucide-react";
import { orpc } from "@/utils/orpc";

function TeamsComponent() {
  const { data: myTeams, status } = useQuery(
    orpc.teams.listByEvent.queryOptions({ input: { eventId: "" } })
  );

  const skeletonKeys = Array.from({ length: 3 }, (_, i) => `skeleton-${i}`);

  if (status === "pending") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold font-display text-3xl text-foreground">
              My Teams
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your hackathon teams
            </p>
          </div>
          <Button className="gap-2">
            <PlusIcon className="size-4" />
            Create Team
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skeletonKeys.map((key) => (
            <TeamCardSkeleton key={key} />
          ))}
        </div>
      </div>
    );
  }

  const hasTeams = Boolean(myTeams && myTeams.length > 0);

  if (!hasTeams) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold font-display text-3xl text-foreground">
              My Teams
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your hackathon teams
            </p>
          </div>
          <Button className="gap-2">
            <PlusIcon className="size-4" />
            Create Team
          </Button>
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <UsersIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No teams yet</EmptyTitle>
            <EmptyDescription>
              Create a team or join one to start collaborating
            </EmptyDescription>
          </EmptyHeader>
          <EmptyAction>
            <Button>Create Team</Button>
          </EmptyAction>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold font-display text-3xl text-foreground">
            My Teams
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your hackathon teams
          </p>
        </div>
        <Button className="gap-2">
          <PlusIcon className="size-4" />
          Create Team
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {myTeams?.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}

function TeamCard({
  team,
}: {
  team: {
    id: string;
    name: string;
    description: string | null;
    eventId: string;
    ownerId: string;
    members?: Array<{ userId: string; joinedAt: string }>;
  };
}) {
  const memberCount = team.members?.length ?? 1;
  const hasDescription = Boolean(team.description);

  return (
    <Card className="p-5" variant="default">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{team.name}</h3>
          {hasDescription && (
            <p className="mt-1 text-muted-foreground text-sm">
              {team.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-muted-foreground text-sm">
            <span className="flex items-center gap-1.5">
              <UsersIcon className="size-4" />
              <span>
                {memberCount} member{memberCount === 1 ? "" : "s"}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <MailIcon className="size-4" />
              <span>Invite members</span>
            </span>
          </div>
        </div>
        <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
      </div>
    </Card>
  );
}

function TeamCardSkeleton() {
  return (
    <Card className="p-5" variant="default">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </Card>
  );
}

export const Route = createFileRoute("/(dashboard)/dashboard/teams/")({
  component: TeamsComponent,
});
