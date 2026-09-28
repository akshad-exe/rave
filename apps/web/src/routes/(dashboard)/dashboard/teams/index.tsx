import { Alert } from "@rave/ui/components/alert";
import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import { Card } from "@rave/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rave/ui/components/dialog";
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rave/ui/components/empty";
import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import { Separator } from "@rave/ui/components/separator";
import { Skeleton } from "@rave/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
  CheckCircleIcon,
  CopyIcon,
  LinkIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { type client, orpc } from "@/utils/orpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type TeamRow = Awaited<ReturnType<typeof client.teams.listByEvent>>[number];

// ─── Route ────────────────────────────────────────────────────────────────────

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/(dashboard)/dashboard/teams/")({
  validateSearch: searchSchema,
  component: TeamsComponent,
});

// ─── Root Component ───────────────────────────────────────────────────────────

function TeamsComponent() {
  const { token } = useSearch({ from: "/(dashboard)/dashboard/teams/" });
  const queryClient = useQueryClient();

  const { data: myTeams, status } = useQuery(
    orpc.teams.listByEvent.queryOptions({ input: { eventId: "" } })
  );

  const acceptInvitation = useMutation(
    orpc.teams.acceptInvitation.mutationOptions()
  );

  // Auto-accept when arriving via invite link (?token=…)
  useEffect(() => {
    if (!token) {
      return;
    }
    acceptInvitation
      .mutateAsync({ token })
      .then(() => {
        toast.success("You joined the team!");
        queryClient
          .invalidateQueries(
            orpc.teams.listByEvent.queryOptions({ input: { eventId: "" } })
          )
          .catch(() => undefined);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Could not accept invite";
        toast.error(msg);
      });
    // Only run once on first render when token is present
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalidateTeams = useCallback(() => {
    queryClient
      .invalidateQueries(
        orpc.teams.listByEvent.queryOptions({ input: { eventId: "" } })
      )
      .catch(() => undefined);
  }, [queryClient]);

  const skeletonKeys = ["a", "b", "c"] as const;

  if (status === "pending") {
    return (
      <div className="space-y-6">
        <TeamsPageHeader onTeamCreated={invalidateTeams} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skeletonKeys.map((k) => (
            <TeamCardSkeleton key={k} />
          ))}
        </div>
      </div>
    );
  }

  const hasTeams = Boolean(myTeams && myTeams.length > 0);

  if (!hasTeams) {
    return (
      <div className="space-y-6">
        <TeamsPageHeader onTeamCreated={invalidateTeams} />
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <UsersIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No teams yet</EmptyTitle>
            <EmptyDescription>
              Create a team or accept an invite link to start collaborating
            </EmptyDescription>
          </EmptyHeader>
          <EmptyAction>
            <CreateTeamDialog onSuccess={invalidateTeams} />
          </EmptyAction>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TeamsPageHeader onTeamCreated={invalidateTeams} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {myTeams?.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────

function TeamsPageHeader({ onTeamCreated }: { onTeamCreated: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-bold font-display text-3xl text-foreground">
          My Teams
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your hackathon teams
        </p>
      </div>
      <CreateTeamDialog onSuccess={onTeamCreated} />
    </div>
  );
}

// ─── Create Team Dialog ───────────────────────────────────────────────────────

function CreateTeamDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createTeam = useMutation(orpc.teams.create.mutationOptions());

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    []
  );
  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value),
    []
  );

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }
    try {
      await createTeam.mutateAsync({
        eventId: "",
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Team created");
      setOpen(false);
      setName("");
      setDescription("");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create team";
      toast.error(msg);
    }
  }, [name, description, createTeam, onSuccess]);

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) {
      setName("");
      setDescription("");
    }
  }, []);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <PlusIcon className="size-4" />
            Create Team
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Team</DialogTitle>
          <DialogDescription>
            Give your team a name and optional description, then invite members
            with a link.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              maxLength={80}
              onChange={handleNameChange}
              placeholder="e.g. NorthKiln"
              value={name}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-desc">Description (optional)</Label>
            <Input
              id="team-desc"
              maxLength={500}
              onChange={handleDescChange}
              placeholder="What are you building?"
              value={description}
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <Button
            disabled={createTeam.isPending || !name.trim()}
            onClick={handleCreate}
          >
            {createTeam.isPending ? "Creating…" : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({ team }: { team: TeamRow }) {
  const hasDescription = Boolean(team.description);
  const [inviteOpen, setInviteOpen] = useState(false);

  const handleOpenChange = useCallback((v: boolean) => {
    setInviteOpen(v);
  }, []);

  return (
    <Card className="p-5" variant="default">
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{team.name}</h3>
        {hasDescription && (
          <p className="mt-1 text-muted-foreground text-sm">
            {team.description}
          </p>
        )}
      </div>

      <Separator className="my-4" />

      <InviteSection
        onOpenChange={handleOpenChange}
        open={inviteOpen}
        team={team}
      />
    </Card>
  );
}

// ─── Invite Section ───────────────────────────────────────────────────────────

function InviteSection({
  team,
  open,
  onOpenChange,
}: {
  team: TeamRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createInvitation = useMutation(
    orpc.teams.createInvitation.mutationOptions()
  );

  const handleGenerate = useCallback(async () => {
    try {
      const result = await createInvitation.mutateAsync({ teamId: team.id });
      const url = new URL(window.location.href);
      url.pathname = "/dashboard/teams";
      url.search = "";
      url.searchParams.set("token", result.token);
      setInviteLink(url.toString());
      onOpenChange(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create invite";
      toast.error(msg);
    }
  }, [team.id, createInvitation, onOpenChange]);

  const handleCopy = useCallback(() => {
    if (!inviteLink) {
      return;
    }
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  }, [inviteLink]);

  return (
    <>
      <Button
        className="w-full gap-2"
        disabled={createInvitation.isPending}
        onClick={handleGenerate}
        size="sm"
        variant="outline"
      >
        <LinkIcon className="size-4" />
        {createInvitation.isPending ? "Generating…" : "Invite members"}
      </Button>

      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to {team.name}</DialogTitle>
            <DialogDescription>
              Share this link. Anyone with it can join your team. The link
              expires in 72 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {inviteLink ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <code className="min-w-0 flex-1 truncate text-sm">
                    {inviteLink}
                  </code>
                  <Button
                    className="shrink-0 gap-1.5"
                    onClick={handleCopy}
                    size="sm"
                    variant="ghost"
                  >
                    {copied ? (
                      <>
                        <CheckCircleIcon className="size-4 text-success" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Alert
                  description="Anyone with this link can join the team as a member."
                  title="Share carefully"
                  variant="warning"
                />
              </>
            ) : (
              <Badge variant="subtle">Generating…</Badge>
            )}
          </div>

          <DialogFooter className="mt-6">
            <DialogClose render={<Button variant="outline">Close</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TeamCardSkeleton() {
  return (
    <Card className="p-5" variant="default">
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </Card>
  );
}
