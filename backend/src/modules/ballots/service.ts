import crypto from 'node:crypto';
import type { Voter } from '@prisma/client';
import { err, ok, type Result } from '../../lib/result';
import { auditService } from '../audit/service';
import { electionRepository } from '../elections/repository';
import { sealChoice } from './crypto';
import { ballotRepository as repo } from './repository';

export class AlreadyVotedError extends Error {
  constructor() {
    super('A ballot has already been submitted for this election');
    this.name = 'AlreadyVotedError';
  }
}

// The constituency that builds a ballot has exactly one legal source: the
// voter's own record. Taking the whole Voter — not a loose constituencyId —
// makes it impossible for a caller to pass the remote centre's constituency
// by accident. This is the Core Rule enforced by signature.
export const ballotService = {
  async generateBallot(voter: Voter): Promise<Result<unknown>> {
    const election = await electionRepository.findCurrent();
    if (!election || election.lifecycle !== 'ACTIVE') {
      return err(409, 'CONFLICT', 'The election is not active');
    }
    const status = await repo.findElectionStatus(voter.id, election.id);
    if (status?.hasVoted) {
      return err(409, 'CONFLICT', new AlreadyVotedError().message);
    }

    const candidates = await repo.findCandidates(election.id, voter.registeredConstituencyId);
    if (candidates.length === 0) {
      return err(409, 'CONFLICT', 'No candidates registered for your constituency in this election');
    }

    // If the voter holds an approved remote polling assignment, it answers
    // "where may I appear" — never "which ballot". The candidates above came
    // from the voter's registered constituency either way.
    const assignment = await repo.findAssignment(voter.id, election.id);
    const constituency = await repo.findConstituency(voter.registeredConstituencyId);

    return ok({
      election: { id: election.id, code: election.code, name: election.name },
      constituency: { id: constituency.id, code: constituency.code, name: constituency.name },
      candidates: candidates.map((c) => ({ id: c.id, fullName: c.fullName, symbol: c.symbol })),
      remoteAssignment: assignment
        ? {
            pollingCentre: {
              code: assignment.pollingCentre.code,
              name: assignment.pollingCentre.name,
            },
            used: assignment.request.status === 'USED',
          }
        : null,
    });
  },

  async submitBallot(
    voter: Voter,
    input: { candidateId: string },
  ): Promise<Result<{ ballotReference: string; submittedAt: Date }>> {
    const election = await electionRepository.findCurrent();
    if (!election || election.lifecycle !== 'ACTIVE') {
      return err(409, 'CONFLICT', 'The election is not active');
    }

    // The candidate must stand in the voter's registered constituency for
    // this election — a candidate from the remote centre's constituency must
    // never land on this ballot, even by request tampering.
    const candidate = await repo.findCandidateOnBallot(
      input.candidateId,
      election.id,
      voter.registeredConstituencyId,
    );
    if (!candidate) {
      return err(422, 'VALIDATION', 'That choice is not on your ballot');
    }

    const assignment = await repo.findAssignment(voter.id, election.id);
    const ballotReference = crypto.randomBytes(16).toString('hex'); // opaque, non-sequential
    const sealed = sealChoice(
      { candidateId: candidate.id },
      { ballotReference, electionId: election.id, constituencyId: voter.registeredConstituencyId },
    );

    try {
      const ballot = await repo.submitInTransaction({
        voterId: voter.id,
        electionId: election.id,
        constituencyId: voter.registeredConstituencyId,
        ballotReference,
        sealed,
        requestIdToMarkUsed: assignment?.requestId,
      });

      // System actor, opaque reference only. No voter identifier ever shares
      // a record with a ballot reference — the audit trail must not join the
      // two sides of the secrecy boundary.
      await auditService.record({
        actorType: 'SYSTEM',
        actorId: null,
        action: 'ballot.submitted',
        entityType: 'SubmittedBallot',
        entityRef: ballotReference,
      });

      return ok({ ballotReference, submittedAt: ballot.submittedAt });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: string }).code === 'P2002'
      ) {
        // The database constraint is the enforcement; translate it. The
        // constraint name never reaches a response body.
        return err(409, 'CONFLICT', new AlreadyVotedError().message);
      }
      throw error;
    }
  },
};
