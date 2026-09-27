import type { Services } from "@rave/api/contract";

import { adminService } from "../features/admin/service";
import { prizesService } from "../features/events/prizes";
import { eventsService } from "../features/events/service";
import { tracksService } from "../features/events/tracks";
import { exportsService } from "../features/exports/service";
import { assignmentsService } from "../features/judging/assignments";
import { rubricsService } from "../features/judging/rubric";
import { scoringService } from "../features/judging/scoring";
import { resultsService } from "../features/results/service";
import { submissionsService } from "../features/submissions/service";
import { teamsService } from "../features/teams/service";
import { commentsService } from "../features/voting/comments";
import { votingService } from "../features/voting/votes";

export const services: Services = {
  admin: adminService,
  assignments: assignmentsService,
  comments: commentsService,
  events: eventsService,
  exports: exportsService,
  prizes: prizesService,
  results: resultsService,
  rubrics: rubricsService,
  scoring: scoringService,
  submissions: submissionsService,
  teams: teamsService,
  tracks: tracksService,
  voting: votingService,
};
