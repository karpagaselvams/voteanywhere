import type { RemotePollingRequestStatus } from '@prisma/client';
import { DomainError, err, ok, type Result } from '../../lib/result';
import { auditService } from '../audit/service';
import { electionRepository } from '../elections/repository';
import { voterRepository } from '../voters/repository';
import { remotePollingRepository as repo } from './repository';

// Every status change goes through the legality table below. A move that is
// not listed is illegal. See the remote-polling-workflow state machine.
const TRANSITIONS: Record<RemotePollingRequestStatus, RemotePollingRequestStatus[]> = {
  PENDING: ['UNDER_REVIEW', 'WITHDRAWN', 'EXPIRED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'WITHDRAWN', 'PENDING'],
  APPROVED: ['USED', 'EXPIRED'],
  REJECTED: [],
  WITHDRAWN: [],
  USED: [],
  EXPIRED: [],
};

function assertLegal(from: RemotePollingRequestStatus, to: RemotePollingRequestStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new DomainError(409, 'CONFLICT', `Request cannot move from ${from} to ${to}`);
  }
}

interface Actor {
  actorType: 'OFFICER' | 'VOTER';
  actorId: string;
}

async function auditTransition(
  actor: Actor | { actorType: 'SYSTEM'; actorId: null },
  action: string,
  requestId: string,
  from: RemotePollingRequestStatus,
  to: RemotePollingRequestStatus,
): Promise<void> {
  await auditService.record({
    actorType: actor.actorType,
    actorId: actor.actorId,
    action,
    entityType: 'RemotePollingRequest',
    entityRef: `${requestId}:${from}->${to}`,
  });
}

function shapeRequest(r: {
  id: string;
  status: RemotePollingRequestStatus;
  reason: string | null;
  reviewNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  pollingCentre: { id: string; code: string; name: string; constituency: { code: string; name: string } };
  election: { id: string; code: string; name: string; lifecycle: string };
}) {
  return {
    id: r.id,
    status: r.status,
    reason: r.reason,
    reviewNote: r.reviewNote,
    submittedAt: r.createdAt,
    reviewedAt: r.reviewedAt,
    pollingCentre: {
      id: r.pollingCentre.id,
      code: r.pollingCentre.code,
      name: r.pollingCentre.name,
      constituency: r.pollingCentre.constituency.name,
    },
    election: { id: r.election.id, code: r.election.code, name: r.election.name, lifecycle: r.election.lifecycle },
  };
}

export const remotePollingService = {
  async listCentres() {
    const centres = await repo.listCentres();
    return centres.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      constituency: { code: c.constituency.code, name: c.constituency.name },
    }));
  },

  async submitRequest(
    voterId: string,
    input: { electionId: string; pollingCentreId: string; reason?: string },
  ): Promise<Result<unknown>> {
    const voter = await voterRepository.findByIdWithGeography(voterId);
    if (!voter) return err(404, 'NOT_FOUND', 'Voter record not found');

    const election = await electionRepository.findById(input.electionId);
    if (!election) return err(404, 'NOT_FOUND', 'Election not found');
    // Requests cannot be submitted after the election opens.
    if (election.lifecycle !== 'CONFIGURED') {
      return err(409, 'CONFLICT', 'Remote polling requests are closed for this election');
    }

    const centre = await repo.findCentreById(input.pollingCentreId);
    if (!centre) return err(404, 'NOT_FOUND', 'Polling centre not found');
    // A centre inside the voter's own constituency is not a remote vote.
    if (centre.constituencyId === voter.registeredConstituencyId) {
      return err(
        422,
        'VALIDATION',
        'Choose a polling centre outside your registered constituency — your home centre is the default',
      );
    }

    try {
      const request = await repo.createRequest({
        voterId,
        electionId: election.id,
        pollingCentreId: centre.id,
        reason: input.reason,
      });
      await auditService.record({
        actorType: 'VOTER',
        actorId: voterId,
        action: 'remote_polling.request.submitted',
        entityType: 'RemotePollingRequest',
        entityRef: request.id,
      });
      return ok(shapeRequest(request));
    } catch (error) {
      // The partial unique index, not this catch, is the enforcement; this
      // just translates the violation into a domain error.
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: string }).code === 'P2002'
      ) {
        return err(409, 'CONFLICT', 'You already have an active remote polling request for this election');
      }
      throw error;
    }
  },

  // Voter portal home: profile, current election, latest request,
  // assignment, and has-voted state in one read.
  async dashboard(voterId: string): Promise<Result<unknown>> {
    const voter = await voterRepository.findByIdWithGeography(voterId);
    if (!voter) return err(404, 'NOT_FOUND', 'Voter record not found');

    const election = await electionRepository.findCurrent();
    const [request, assignment, status] = election
      ? await Promise.all([
          repo.findLatestRequestForVoter(voterId, election.id),
          repo.findAssignmentForVoter(voterId, election.id),
          voterRepository.hasVoted(voterId, election.id),
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
        ? {
            id: election.id,
            code: election.code,
            name: election.name,
            lifecycle: election.lifecycle,
            startsAt: election.startsAt,
            endsAt: election.endsAt,
          }
        : null,
      request: request ? shapeRequest(request) : null,
      assignment: assignment
        ? {
            pollingCentre: {
              code: assignment.pollingCentre.code,
              name: assignment.pollingCentre.name,
            },
            assignedAt: assignment.createdAt,
            used: assignment.request.status === 'USED',
          }
        : null,
      hasVoted: status?.hasVoted ?? false,
    });
  },

  async getMyRequest(voterId: string): Promise<Result<unknown>> {
    const request = await repo.findLatestRequestForVoter(voterId);
    if (!request) return err(404, 'NOT_FOUND', 'No remote polling request found');
    return ok(shapeRequest(request));
  },

  async getMyAssignment(voterId: string): Promise<Result<unknown>> {
    const election = await electionRepository.findCurrent();
    if (!election) return err(404, 'NOT_FOUND', 'No assignment found');
    const assignment = await repo.findAssignmentForVoter(voterId, election.id);
    if (!assignment) return err(404, 'NOT_FOUND', 'No assignment found');
    return ok({
      id: assignment.id,
      // The assignment names a polling centre and an election. It carries no
      // constituency — the voter's registered constituency is untouched.
      pollingCentre: {
        code: assignment.pollingCentre.code,
        name: assignment.pollingCentre.name,
      },
      election: { code: assignment.election.code, name: assignment.election.name },
      assignedAt: assignment.createdAt,
      used: assignment.request.status === 'USED',
    });
  },

  async withdrawMyRequest(voterId: string): Promise<Result<unknown>> {
    const request = await repo.findLatestRequestForVoter(voterId);
    if (!request) return err(404, 'NOT_FOUND', 'No remote polling request found');
    // Ownership came from the session; legality from the table.
    assertLegal(request.status, 'WITHDRAWN');
    const updated = await repo.updateStatus(request.id, 'WITHDRAWN', {
      reviewedById: null,
    });
    await auditTransition(
      { actorType: 'VOTER', actorId: voterId },
      'remote_polling.request.withdrawn',
      request.id,
      request.status,
      'WITHDRAWN',
    );
    return ok({ id: updated.id, status: updated.status });
  },

  async listQueue(status?: RemotePollingRequestStatus): Promise<Result<unknown>> {
    const requests = await repo.listRequests(status);
    return ok(
      requests.map((r) => ({
        ...shapeRequest(r),
        voter: { voterNumber: r.voter.voterNumber, fullName: r.voter.fullName },
        reviewedBy: r.reviewedBy?.displayName ?? null,
      })),
    );
  },

  async claim(requestId: string, officerId: string): Promise<Result<unknown>> {
    const request = await repo.findRequestById(requestId);
    if (!request) return err(404, 'NOT_FOUND', 'Request not found');
    assertLegal(request.status, 'UNDER_REVIEW');
    const updated = await repo.updateStatus(requestId, 'UNDER_REVIEW', {
      reviewedById: officerId,
      reviewedAt: new Date(),
    });
    await auditTransition(
      { actorType: 'OFFICER', actorId: officerId },
      'remote_polling.request.claimed',
      requestId,
      request.status,
      'UNDER_REVIEW',
    );
    return ok({ id: updated.id, status: updated.status });
  },

  async release(requestId: string, officerId: string): Promise<Result<unknown>> {
    const request = await repo.findRequestById(requestId);
    if (!request) return err(404, 'NOT_FOUND', 'Request not found');
    assertLegal(request.status, 'PENDING');
    const updated = await repo.updateStatus(requestId, 'PENDING', {
      reviewedById: null,
      reviewedAt: undefined,
    });
    await auditTransition(
      { actorType: 'OFFICER', actorId: officerId },
      'remote_polling.request.released',
      requestId,
      request.status,
      'PENDING',
    );
    return ok({ id: updated.id, status: updated.status });
  },

  async approve(requestId: string, officerId: string): Promise<Result<unknown>> {
    const request = await repo.findRequestById(requestId);
    if (!request) return err(404, 'NOT_FOUND', 'Request not found');
    assertLegal(request.status, 'APPROVED');

    // Approvals cannot happen once the election closes, and the voter must
    // still be eligible — approved days ago is not a licence forever.
    const election = await electionRepository.findById(request.electionId);
    if (!election || election.lifecycle === 'CLOSED') {
      return err(409, 'CONFLICT', 'The election is closed');
    }
    const voted = await voterRepository.hasVoted(request.voterId, request.electionId);
    if (voted?.hasVoted) {
      return err(409, 'CONFLICT', 'The voter has already voted in this election');
    }

    const { assignment } = await repo.approveWithAssignment(requestId, officerId, {
      voterId: request.voterId,
      electionId: request.electionId,
      pollingCentreId: request.pollingCentreId,
    });
    await auditTransition(
      { actorType: 'OFFICER', actorId: officerId },
      'remote_polling.request.approved',
      requestId,
      request.status,
      'APPROVED',
    );
    return ok({ id: requestId, status: 'APPROVED', assignmentId: assignment.id });
  },

  async reject(requestId: string, officerId: string, reason: string): Promise<Result<unknown>> {
    const request = await repo.findRequestById(requestId);
    if (!request) return err(404, 'NOT_FOUND', 'Request not found');
    assertLegal(request.status, 'REJECTED');
    if (!reason.trim()) {
      return err(422, 'VALIDATION', 'A rejection reason is required');
    }
    const updated = await repo.updateStatus(requestId, 'REJECTED', {
      reviewedById: officerId,
      reviewedAt: new Date(),
      reviewNote: reason.trim(),
    });
    await auditTransition(
      { actorType: 'OFFICER', actorId: officerId },
      'remote_polling.request.rejected',
      requestId,
      request.status,
      'REJECTED',
    );
    return ok({ id: updated.id, status: updated.status });
  },
};

// Used by the ballot submission transaction and by election closure. These
// are the only callers — SYSTEM transitions are never attributed to a person.
export const remotePollingSystem = {
  expireOpenRequests: (electionId: string) => repo.expireOpenRequests(electionId),
  markUsedInTransaction: repo.markUsedInTransaction,
};
