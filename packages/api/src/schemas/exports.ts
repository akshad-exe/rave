import { z } from "zod";

export const eventIdInput = z.object({ eventId: z.string() });
