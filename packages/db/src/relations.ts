import { defineRelations } from "drizzle-orm";
import { auditLog } from "./schema/audit";
import {
  account,
  authRelations,
  session,
  user,
  verification,
} from "./schema/auth";
import {
  ballotSeed,
  comment,
  vote,
  votingVerification,
} from "./schema/community";
import { event, eventOrganizer, prize, track } from "./schema/events";
import {
  judgeAssignment,
  result,
  rubric,
  rubricCriterion,
  score,
} from "./schema/judging";
import { submission } from "./schema/submissions";
import { team, teamInvitation, teamMember } from "./schema/teams";
import { userProfile } from "./schema/users";

export const relations = {
  ...defineRelations(
    {
      account,
      auditLog,
      ballotSeed,
      comment,
      event,
      eventOrganizer,
      judgeAssignment,
      prize,
      result,
      rubric,
      rubricCriterion,
      score,
      session,
      submission,
      team,
      teamInvitation,
      teamMember,
      track,
      user,
      userProfile,
      verification,
      vote,
      votingVerification,
    },
    (r) => ({
      event: {
        organizer: r.one.user({ from: r.event.organizerId, to: r.user.id }),
        prizes: r.many.prize({ from: r.event.id, to: r.prize.eventId }),
        submissions: r.many.submission({
          from: r.event.id,
          to: r.submission.eventId,
        }),
        teams: r.many.team({ from: r.event.id, to: r.team.eventId }),
        tracks: r.many.track({ from: r.event.id, to: r.track.eventId }),
      },
      judgeAssignment: {
        score: r.one.score({
          from: r.judgeAssignment.id,
          to: r.score.assignmentId,
        }),
        submission: r.one.submission({
          from: r.judgeAssignment.submissionId,
          to: r.submission.id,
        }),
      },
      rubric: {
        criteria: r.many.rubricCriterion({
          from: r.rubric.id,
          to: r.rubricCriterion.rubricId,
        }),
      },
      submission: {
        assignments: r.many.judgeAssignment({
          from: r.submission.id,
          to: r.judgeAssignment.submissionId,
        }),
        event: r.one.event({ from: r.submission.eventId, to: r.event.id }),
        scores: r.many.score({
          from: r.submission.id,
          to: r.score.submissionId,
        }),
        team: r.one.team({ from: r.submission.teamId, to: r.team.id }),
        track: r.one.track({ from: r.submission.trackId, to: r.track.id }),
      },
      team: {
        event: r.one.event({ from: r.team.eventId, to: r.event.id }),
        members: r.many.teamMember({
          from: r.team.id,
          to: r.teamMember.teamId,
        }),
        submission: r.one.submission({
          from: r.team.id,
          to: r.submission.teamId,
        }),
      },
    })
  ),
  ...authRelations,
};
