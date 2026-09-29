import { Alert } from "@rave/ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rave/ui/components/alert-dialog";
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
  BanIcon,
  CheckCircleIcon,
  CopyIcon,
  LinkIcon,
  PlusIcon,
  UserMinusIcon,
  UsersIcon,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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

  const invalidateTeams = useCallback(() => {
    queryClient
      .invalidateQueries(
        orpc.teams.listByEvent.queryOptions({ input: { eventId: "" } })
      )
      .catch(() => undefined);
  }, [queryClient]);

  const acceptedTokenRef = useRef<string | null>(null);

  // Auto-accept when arriving via invite link (?token=…). Dependencies are
  // declared honestly so a token that arrives after first render is still
  // accepted; the ref stops the same token being accepted twice.
  useEffect(() => {
    if (!token || acceptedTokenRef.current === token) {
      return;
    }
    acceptedTokenRef.current = token;
    acceptInvitation.mutate(
      { token },
      {
        onSuccess: () => {
          toast.success("You joined the team!");
          invalidateTeams();
        },
        onError: (err: unknown) => {
          toast.error(
            err instanceof Error ? err.message : "Could not accept invite"
          );
        },
      }
    );
  }, [token, acceptInvitation, invalidateTeams]);

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
          <TeamCard key={team.id} onTeamChanged={invalidateTeams} team={team} />
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

function TeamCard({
  team,
  onTeamChanged,
}: {
  onTeamChanged: () => void;
  team: TeamRow;
}) {
  const hasDescription = Boolean(team.description);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

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

      <div className="flex flex-wrap gap-2">
        <Button onClick={openManage(setManageOpen)} size="sm" variant="outline">
          Manage
        </Button>
      </div>

      <InviteSection
        onOpenChange={handleOpenChange}
        open={inviteOpen}
        team={team}
      />
      <TeamManageDialog
        onChanged={onTeamChanged}
        onOpenChange={setManageOpen}
        open={manageOpen}
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

// ─── Team management ──────────────────────────────────────────────────────────

type TeamDetail = Awaited<ReturnType<typeof client.teams.get>>;
type TeamInvitation = Awaited<
  ReturnType<typeof client.teams.listInvitations>
>[number];

const INVITATION_TONE: Record<string, "default" | "outline" | "success"> = {
  accepted: "success",
  declined: "outline",
  expired: "outline",
  pending: "default",
  revoked: "outline",
};

function openManage(setOpen: (v: boolean) => void) {
  return () => {
    setOpen(true);
  };
}

function TeamManageDialog({
  team,
  open,
  onChanged,
  onOpenChange,
}: {
  onChanged: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  team: TeamRow;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(team.name);
  const [pendingMember, setPendingMember] = useState<string | null>(null);
  const [pendingInvitation, setPendingInvitation] =
    useState<TeamInvitation | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const meQuery = useQuery(orpc.me.queryOptions());
  // `enabled` is a sibling of `input`, not a second argument.
  const detailQuery = useQuery(
    orpc.teams.get.queryOptions({ enabled: open, input: { teamId: team.id } })
  );
  const invitationsQuery = useQuery(
    orpc.teams.listInvitations.queryOptions({
      enabled: open,
      input: { teamId: team.id },
    })
  );

  const rename = useMutation(orpc.teams.update.mutationOptions());
  const removeMember = useMutation(orpc.teams.removeMember.mutationOptions());
  const revokeInvitation = useMutation(
    orpc.teams.revokeInvitation.mutationOptions()
  );
  const leave = useMutation(orpc.teams.leave.mutationOptions());

  const refresh = useCallback(() => {
    queryClient
      .invalidateQueries(
        orpc.teams.get.queryOptions({ input: { teamId: team.id } })
      )
      .catch(() => undefined);
    queryClient
      .invalidateQueries(
        orpc.teams.listInvitations.queryOptions({ input: { teamId: team.id } })
      )
      .catch(() => undefined);
    onChanged();
  }, [onChanged, queryClient, team.id]);

  const handleRename = useCallback(async () => {
    if (!name.trim() || name.trim() === team.name) {
      return;
    }
    try {
      await rename.mutateAsync({ name: name.trim(), teamId: team.id });
      toast.success("Team renamed");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename");
    }
  }, [name, refresh, rename, team.id, team.name]);

  const handleRemove = useCallback(async () => {
    if (!pendingMember) {
      return;
    }
    try {
      await removeMember.mutateAsync({
        teamId: team.id,
        userId: pendingMember,
      });
      toast.success("Member removed");
      setPendingMember(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove member"
      );
    }
  }, [pendingMember, refresh, removeMember, team.id]);

  const handleRevoke = useCallback(async () => {
    if (!pendingInvitation) {
      return;
    }
    try {
      await revokeInvitation.mutateAsync({
        invitationId: pendingInvitation.id,
      });
      toast.success("Invitation revoked");
      setPendingInvitation(null);
      refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not revoke invitation"
      );
    }
  }, [pendingInvitation, refresh, revokeInvitation]);

  const handleLeave = useCallback(async () => {
    try {
      await leave.mutateAsync({ teamId: team.id });
      toast.success("You left the team");
      setConfirmLeave(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not leave");
    }
  }, [leave, onChanged, team.id]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    []
  );

  const detail: TeamDetail | undefined = detailQuery.data;
  const isOwner = team.ownerId === (meQuery.data?.id ?? null);

  return (
    <Dialog onOpenChange={handleDialogChange(onOpenChange)} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage {team.name}</DialogTitle>
          <DialogDescription>
            Rename the team, manage who is on it, and revoke invite links you no
            longer want.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="block text-xs" htmlFor="team-rename">
                Team name
              </Label>
              <Input
                id="team-rename"
                maxLength={80}
                onChange={handleNameChange}
                value={name}
              />
            </div>
            <Button
              disabled={rename.isPending || name.trim() === team.name}
              onClick={fire(handleRename)}
            >
              {rename.isPending ? "Saving…" : "Rename"}
            </Button>
          </div>

          <Separator />

          <section className="space-y-2">
            <h3 className="font-medium text-sm">Members</h3>
            {renderMembers(detail, team.ownerId, setPendingMember)}
            <p className="text-muted-foreground text-xs">
              Members are identified by user id; the API does not return their
              name or email.
            </p>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="font-medium text-sm">Invitations</h3>
            {(invitationsQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No invitations issued.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {(invitationsQuery.data ?? []).map((inv) => (
                  <InvitationRow
                    invitation={inv}
                    key={inv.id}
                    onRevoke={requestInvitationRevoke(setPendingInvitation)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <DialogFooter>
          {isOwner ? null : (
            <Button onClick={openLeave(setConfirmLeave)} variant="destructive">
              Leave team
            </Button>
          )}
          <Button variant="outline">Done</Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog
        onOpenChange={handleDialogChange(clearMember(setPendingMember))}
        open={pendingMember !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to the team immediately. If they are the only
              other member, the team may fall below its minimum size.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={fire(handleRemove)}>
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={handleDialogChange(clearInvitation(setPendingInvitation))}
        open={pendingInvitation !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invite link stops working immediately. Anyone who already
              accepted stays on the team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={fire(handleRevoke)}>
              Revoke invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={handleDialogChange(clearLeave(setConfirmLeave))}
        open={confirmLeave}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this team?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need a new invite to rejoin. Any project the team has
              submitted stays submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={fire(handleLeave)}>
              Leave team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function renderMembers(
  detail: TeamDetail | undefined,
  ownerId: string,
  setPendingMember: (id: string | null) => void
) {
  if (!detail) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }
  if (detail.members.length === 0) {
    return <p className="text-muted-foreground text-sm">No members yet.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {detail.members.map((member) => (
        <MemberRow
          isOwner={member.userId === ownerId}
          key={member.userId}
          onRemove={requestMemberRemoval(setPendingMember)}
          userId={member.userId}
        />
      ))}
    </ul>
  );
}

function fire(fn: () => Promise<void>) {
  return () => {
    fn();
  };
}

function handleDialogChange(setter: (v: boolean) => void) {
  return (next: boolean) => {
    if (!next) {
      setter(false);
    }
  };
}

function requestMemberRemoval(setter: (id: string | null) => void) {
  return (userId: string) => {
    setter(userId);
  };
}

function requestInvitationRevoke(setter: (inv: TeamInvitation | null) => void) {
  return (inv: TeamInvitation) => {
    setter(inv);
  };
}

function clearMember(setter: (id: string | null) => void) {
  return () => {
    setter(null);
  };
}

function clearInvitation(setter: (inv: TeamInvitation | null) => void) {
  return () => {
    setter(null);
  };
}

function clearLeave(setter: (v: boolean) => void) {
  return () => {
    setter(false);
  };
}

function openLeave(setter: (v: boolean) => void) {
  return () => {
    setter(true);
  };
}

function MemberRow({
  userId,
  isOwner,
  onRemove,
}: {
  isOwner: boolean;
  onRemove: (userId: string) => void;
  userId: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-xs">{userId}</span>
        {isOwner ? <Badge variant="subtle">Owner</Badge> : null}
      </span>
      {isOwner ? null : (
        <button
          aria-label={`Remove ${userId}`}
          className="rounded p-1.5 text-muted-foreground hover:bg-error/10 hover:text-error"
          onClick={removeAction(onRemove, userId)}
          type="button"
        >
          <UserMinusIcon className="size-4" />
        </button>
      )}
    </li>
  );
}

function removeAction(onRemove: (userId: string) => void, userId: string) {
  return () => {
    onRemove(userId);
  };
}

function InvitationRow({
  invitation,
  onRevoke,
}: {
  invitation: TeamInvitation;
  onRevoke: (inv: TeamInvitation) => void;
}) {
  const revocable = invitation.status === "pending";
  return (
    <li className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm">
          {invitation.invitedEmail ?? "Open link"}
        </span>
        <Badge variant={INVITATION_TONE[invitation.status] ?? "outline"}>
          {invitation.status}
        </Badge>
      </span>
      {revocable ? (
        <button
          aria-label={`Revoke invitation for ${invitation.invitedEmail ?? "open link"}`}
          className="rounded p-1.5 text-muted-foreground hover:bg-error/10 hover:text-error"
          onClick={revokeAction(onRevoke, invitation)}
          type="button"
        >
          <BanIcon className="size-4" />
        </button>
      ) : null}
    </li>
  );
}

function revokeAction(
  onRevoke: (inv: TeamInvitation) => void,
  invitation: TeamInvitation
) {
  return () => {
    onRevoke(invitation);
  };
}
