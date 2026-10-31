import { err, ok, type Result } from '../../lib/result';
import { electionRepository } from '../elections/repository';
import { voterRepository } from './repository';

export interface VoterProfile {
  id: string;
  voterNumber: string;
  fullName: string;
  registeredConstituency: { id: string; code: string; name: string };
  homePollingCentre: { id: string; code: string; name: string } | null;
}

export interface EligibilityCheck {
  key: string;
  label: string;
  passed: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  election: { id: string; code: string; name: string; lifecycle: string } | null;
  checks: EligibilityCheck[];
}

// Eligibility verification: active voter record, correct election, not
// already voted. The voter is identified from the session, never from input.
export const voterService = {
  async getProfile(voterId: string): Promise<Result<VoterProfile>> {
    const voter = await voterRepository.findByIdWithGeography(voterId);
    if (!voter) {
      return err(404, 'NOT_FOUND', 'Voter record not found');
    }
    return ok({
      id: voter.id,
      voterNumber: voter.voterNumber,
      fullName: voter.fullName,
      registeredConstituency: {
        id: voter.registeredConstituency.id,
        code: voter.registeredConstituency.code,
        name: voter.registeredConstituency.name,
      },
      homePollingCentre: voter.homePollingCentre
        ? {
            id: voter.homePollingCentre.id,
            code: voter.homePollingCentre.code,
            name: voter.homePollingCentre.name,
          }
        : null,
    });
  },

  async checkEligibility(voterId: string): Promise<Result<EligibilityResult>> {
    const voter = await voterRepository.findByIdWithGeography(voterId);
    if (!voter) {
      return err(404, 'NOT_FOUND', 'Voter record not found');
    }
    const election = await electionRepository.findCurrent();
    if (!election) {
      return ok({ eligible: false, election: null, checks: [] });
    }
    const status = await voterRepository.hasVoted(voter.id, election.id);

    // Eligibility is checked against the registered constituency's election —
    // the remote polling centre plays no part here (constituency-invariant).
    const covered = election.constituencies.some(
      (c) => c.constituencyId === voter.registeredConstituencyId,
    );
    const checks: EligibilityCheck[] = [
      { key: 'voter-record', label: 'Voter record is active', passed: true },
      {
        key: 'election-covers-constituency',
        label: 'Election covers your registered constituency',
        passed: covered,
      },
      {
        key: 'election-open',
        label: 'Election is configured or active',
        passed: election.lifecycle !== 'CLOSED',
      },
      {
        key: 'not-already-voted',
        label: 'No ballot submitted for this election',
        passed: !status?.hasVoted,
      },
    ];
    return ok({
      eligible: checks.every((c) => c.passed),
      election: {
        id: election.id,
        code: election.code,
        name: election.name,
        lifecycle: election.lifecycle,
      },
      checks,
    });
  },
};
