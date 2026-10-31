import { err, ok, type Result } from '../../lib/result';
import { ballotRepository } from '../ballots/repository';
import { openBallotForCounting } from '../ballots/crypto';
import { electionRepository } from '../elections/repository';

// The Election Simulator is one backend module. It orchestrates the ballot
// and election services; it does not reimplement them. Counting runs only
// here, only after the election is closed, and only through
// openBallotForCounting. Results are aggregates per candidate per
// constituency — never per voter.
export const simulatorService = {
  // Post-closure comparison of ballots issued against ballots recorded, as
  // counts, per constituency. It never matches an individual issuance to an
  // individual submission — that match is exactly what ballot secrecy
  // forbids. A discrepancy is reported as a discrepancy.
  async reconcile(electionId: string): Promise<Result<unknown>> {
    const election = await electionRepository.findById(electionId);
    if (!election) return err(404, 'NOT_FOUND', 'Election not found');
    if (election.lifecycle !== 'CLOSED') {
      return err(409, 'CONFLICT', 'Reconciliation runs after the election is closed');
    }

    const issuedStatuses = await ballotRepository.listIssuedStatuses(electionId);
    const recordedCounts = await ballotRepository.countBallotsByConstituency(electionId);

    const issuedByConstituency = new Map<string, number>();
    for (const status of issuedStatuses) {
      const key = status.voter.registeredConstituencyId;
      issuedByConstituency.set(key, (issuedByConstituency.get(key) ?? 0) + 1);
    }
    const recordedByConstituency = new Map(
      recordedCounts.map((r) => [r.constituencyId, r._count.ballotReference]),
    );

    // A ballot cast at a remote polling centre counts toward the voter's
    // registered constituency — both sides of this comparison are keyed by
    // the registered constituency.
    const rows = election.constituencies.map(({ constituency }) => {
      const issued = issuedByConstituency.get(constituency.id) ?? 0;
      const recorded = recordedByConstituency.get(constituency.id) ?? 0;
      return {
        constituency: { code: constituency.code, name: constituency.name },
        ballotsIssued: issued,
        ballotsRecorded: recorded,
        discrepancy: issued - recorded,
      };
    });

    return ok({
      election: { code: election.code, name: election.name },
      reconciledAt: new Date(),
      rows,
      totalDiscrepancy: rows.reduce((sum, r) => sum + r.discrepancy, 0),
    });
  },

  // Aggregate results per candidate per constituency. Available to every
  // role after closure; contains no voter information by construction.
  async results(electionId: string): Promise<Result<unknown>> {
    const election = await electionRepository.findById(electionId);
    if (!election) return err(404, 'NOT_FOUND', 'Election not found');
    if (election.lifecycle !== 'CLOSED') {
      return err(409, 'CONFLICT', 'Results are available after the election is closed');
    }

    const ballots = await ballotRepository.listBallotsForElection(electionId);
    const candidateInfo = new Map(
      (await ballotRepository.listCandidatesForElection(electionId)).map((c) => [
        c.id,
        { fullName: c.fullName, symbol: c.symbol, constituency: c.constituency },
      ]),
    );

    const tally = new Map<string, { constituencyId: string; candidateId: string; votes: number }>();
    for (const ballot of ballots) {
      const choice = openBallotForCounting(ballot);
      const key = `${ballot.constituencyId}:${choice.candidateId}`;
      const row = tally.get(key) ?? {
        constituencyId: ballot.constituencyId,
        candidateId: choice.candidateId,
        votes: 0,
      };
      row.votes += 1;
      tally.set(key, row);
    }

    return ok({
      election: { code: election.code, name: election.name },
      results: [...tally.values()].map((row) => {
        const info = candidateInfo.get(row.candidateId);
        return {
          constituency: info
            ? { code: info.constituency.code, name: info.constituency.name }
            : { code: row.constituencyId, name: row.constituencyId },
          candidate: info
            ? { fullName: info.fullName, symbol: info.symbol }
            : { fullName: row.candidateId, symbol: null },
          votes: row.votes,
        };
      }),
    });
  },
};
