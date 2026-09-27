import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import {
  BellIcon,
  LockIcon,
  PaletteIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(dashboard)/settings/")({
  component: SettingsComponent,
});

function SettingsComponent() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-bold font-display text-3xl text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-5" />
            Profile
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                defaultValue={user?.name ?? ""}
                id="name"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                defaultValue={user?.email ?? ""}
                disabled
                id="email"
                placeholder="you@example.com"
                type="email"
              />
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockIcon className="size-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your password and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              placeholder="Enter current password"
              type="password"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                placeholder="Enter new password"
                type="password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                placeholder="Confirm new password"
                type="password"
              />
            </div>
          </div>
          <Button>Update Password</Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="size-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how rave looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-muted-foreground text-sm">
                Choose your preferred color scheme
              </p>
            </div>
            <ModeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="size-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            defaultChecked
            description="Receive email updates about your events"
            label="Email notifications"
          />
          <NotificationToggle
            defaultChecked
            description="Get reminded before submission deadlines"
            label="Submission reminders"
          />
          <NotificationToggle
            defaultChecked
            description="Notifications when team members join or leave"
            label="Team activity"
          />
          <NotificationToggle
            defaultChecked
            description="Be notified when results are published"
            label="Results announcements"
          />
          <NotificationToggle
            defaultChecked={false}
            description="Weekly summary of hackathon activity"
            label="Weekly digest"
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-error/30" variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-error">
            <TrashIcon className="size-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-error">Delete Account</p>
              <p className="text-muted-foreground text-sm">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <input
        className="size-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/30"
        defaultChecked={defaultChecked}
        type="checkbox"
      />
    </label>
  );
}
