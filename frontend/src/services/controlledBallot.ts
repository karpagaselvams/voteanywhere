import { api } from './api';
import type { Ballot, VoteReceipt } from '@/types';

/**
 * Controlled ballot, owned by the Election Simulator — one backend module,
 * not a second voting system and not an online ballot.
 *
 * The ballot's constituency always comes back from the simulator. The screen
 * renders that value and never derives it from the remote polling centre.
 */
export const getControlledBallot = () =>
  api.get<Ballot>('/simulator/controlled-ballot').then((r) => r.data);

/**
 * Submits the chosen candidate. The voter's identity stays on the session.
 * The receipt proves a ballot was recorded and does not contain the choice.
 */
export const submitControlledBallot = (candidateId: string) =>
  api
    .post<VoteReceipt>('/simulator/controlled-ballot/submit', { candidateId })
    .then((r) => r.data);
