import { err, ok, type Result } from '../../lib/result';
import { auditService } from '../audit/service';
import { remotePollingRepository } from '../remote-polling/repository';
import { remotePollingSystem } from '../remote-polling/service';
import { electionRepository as repo } from './repository';

function shapeElection(e: {
  id: string;
  code: string;
  name: string;
  lifecycle: string;
  startsAt: Date;
  endsAt: Date;
  constituencies?: { constituency: { code: string; name: string } }[];
}) {
  return {
    id: e.id,
    code: e.code,
    name: e.name,
    lifecycle: e.lifecycle,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    constituencies: (e.constituencies ?? []).map((c) => ({
      code: c.constituency.code,
      name: c.constituency.name,
    })),
  };
}

export const electionService = {
  async listElections(): Promise<Result<unknown>> {
    return ok((await repo.listAll()).map(shapeElection));
  },

  async listCandidates(): Promise<Result<unknown>> {
    const candidates = await repo.listCandidates();
    return ok(
      candidates.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        symbol: c.symbol,
        election: { code: c.election.code, name: c.election.name },
        constituency: { code: c.constituency.code, name: c.constituency.name },
      })),
    );
  },

  async listCentres(): Promise<Result<unknown>> {
    const centres = await repo.listCentres();
    return ok(
      centres.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        constituency: { code: c.constituency.code, name: c.constituency.name },
      })),
    );
  },

  async activate(id: string, officerId: string): Promise<Result<unknown>> {
    const election = await repo.findById(id);
    if (!election) return err(404, 'NOT_FOUND', 'Election not found');
    if (election.lifecycle !== 'CONFIGURED') {
      return err(409, 'CONFLICT', 'Only a configured election can be activated');
    }
    const updated = await repo.setLifecycle(id, 'ACTIVE');
    await auditService.record({
      actorType: 'OFFICER',
      actorId: officerId,
      action: 'election.activated',
      entityType: 'Election',
      entityRef: election.code,
    });
    return ok(shapeElection(updated));
  },

  async close(id: string, officerId: string): Promise<Result<unknown>> {
    const election = await repo.findById(id);
    if (!election) return err(404, 'NOT_FOUND', 'Election not found');
    if (election.lifecycle !== 'ACTIVE') {
      return err(409, 'CONFLICT', 'Only an active election can be closed');
    }

    // Closing expires every still-open remote polling request. These are
    // SYSTEM transitions — never attributed to a person — and each is
    // audited per the state machine.
    const openRequests = await remotePollingRepository.findOpenRequestIds(id);
    await remotePollingSystem.expireOpenRequests(id);
    for (const request of openRequests) {
      await auditService.record({
        actorType: 'SYSTEM',
        actorId: null,
        action: 'remote_polling.request.expired',
        entityType: 'RemotePollingRequest',
        entityRef: `${request.id}:${request.status}->EXPIRED`,
      });
    }

    const updated = await repo.setLifecycle(id, 'CLOSED');
    await auditService.record({
      actorType: 'OFFICER',
      actorId: officerId,
      action: 'election.closed',
      entityType: 'Election',
      entityRef: election.code,
    });
    return ok(shapeElection(updated));
  },
};
