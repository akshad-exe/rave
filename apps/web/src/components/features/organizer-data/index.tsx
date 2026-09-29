import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        backLabel="Back to events"
        description="Take your data out, and bring data in. Nothing here leaves a platform you cannot leave."
        title="Data"
        to="/organizer/events"
      />

      <ExportSection eventId={eventId} />
      <ImportSection eventId={eventId} />
    </div>
  );
}
