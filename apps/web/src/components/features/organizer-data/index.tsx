import { ArrowLeftIcon } from "lucide-react";
import { ExportSection } from "./exports";
import { ImportSection } from "./imports";

/**
 * Data in and data out.
 *
 * The platform could already read and write CSV; there was simply no way to
 * reach either from the app. Adoptability is explicitly a migration path, and
 * the only route to it was knowing a URL.
 */
export function DataPage({ eventId }: { eventId: string }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-1">
        <a
          className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          href="/organizer/events"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to events
        </a>
        <h1 className="font-bold font-display text-3xl text-foreground">
          Data
        </h1>
        <p className="text-muted-foreground">
          Take your data out, and bring data in. Nothing here leaves a platform
          you cannot leave.
        </p>
      </header>

      <ExportSection eventId={eventId} />
      <ImportSection eventId={eventId} />
    </div>
  );
}
