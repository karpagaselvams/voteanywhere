import type { OfficerRole } from '@prisma/client';
import { err, ok, type Result } from '../../lib/result';
import { electionRepository } from '../elections/repository';
import { remotePollingRepository } from '../remote-polling/repository';
import { voterRepository } from '../voters/repository';
import { officerRepository as repo } from './repository';

// Role-aware officer dashboard. Every figure is a real aggregate from the
// database; what each role sees mirrors the permission matrix.
export const officerService = {
  async dashboard(role: OfficerRole, officerId: string): Promise<Result<unknown>> {
    const election = await electionRepository.findCurrent();
    const base = {
      election: election
        ? {
            id: election.id,
            code: election.code,
            name: election.name,
            lifecycle: election.lifecycle,
          }
        : null,
    };

    if (role === 'VERIFICATION_OFFICER') {
      const [pending, underReview, claimedByMe, decidedByMe] = await Promise.all([
        repo.countRequests(['PENDING']),
        repo.countRequests(['UNDER_REVIEW']),
        repo.countRequests(['UNDER_REVIEW'], officerId),
        repo.countRequests(['APPROVED', 'REJECTED'], officerId),
      ]);
      return ok({
        role,
        ...base,
        stats: { pending, underReview, claimedByMe, decidedByMe },
      });
    }

    if (role === 'POLLING_CENTRE_OFFICER') {
      const [assignments, ballotsSubmitted, requestsInReview] = await Promise.all([
        repo.countAssignments(),
        repo.countRequests(['USED']),
        repo.countRequests(['PENDING', 'UNDER_REVIEW']),
      ]);
      return ok({ role, ...base, stats: { assignments, ballotsSubmitted, requestsInReview } });
    }

    // SYSTEM_AUDITOR — read-only overview.
    const [auditRecords, submittedBallots, sessions] = await Promise.all([
      repo.countAuditRecords(),
      repo.countSubmittedBallots(),
      repo.countSessions(),
    ]);
    return ok({ role, ...base, stats: { auditRecords, submittedBallots, sessions } });
  },

  // Pre-vote verification: look up a voter by voter number and see their
  // request, assignment, and has-voted state for the current election.
  async verifyVoter(query: string): Promise<Result<unknown>> {
    const voter = await voterRepository.findByVoterNumberWithGeography(query.trim());
    if (!voter) return err(404, 'NOT_FOUND', 'No voter found for that voter number');

    const election = await electionRepository.findCurrent();
    const [request, assignment, status] = election
      ? await Promise.all([
          remotePollingRepository.findLatestRequestForVoter(voter.id, election.id),
          remotePollingRepository.findAssignmentForVoter(voter.id, election.id),
          voterRepository.hasVoted(voter.id, election.id),
        ])
      : [null, null, null];

    return ok({
      voter: {
        voterNumber: voter.voterNumber,
        fullName: voter.fullName,
        registeredConstituency: voter.registeredConstituency.name,
        homePollingCentre: voter.homePollingCentre?.name ?? null,
      },
      election: election
        ? { code: election.code, name: election.name, lifecycle: election.lifecycle }
        : null,
      request: request
        ? { id: request.id, status: request.status, reviewNote: request.reviewNote }
        : null,
      assignment: assignment
        ? {
            pollingCentre: {
              code: assignment.pollingCentre.code,
              name: assignment.pollingCentre.name,
            },
            assignedAt: assignment.createdAt,
          }
        : null,
      hasVoted: status?.hasVoted ?? false,
    });
  },
};
