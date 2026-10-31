# Glossary

The shared language of Vote Anywhere. Use these terms in identifiers, file names, commit messages, test names, and conversation. When a concept here has a name, that name is the only name for it.

## Core domain

**Voter** — a fictional person holding a record in the voter roll. Identified internally by a voter ID; never by name alone.

**Registered constituency** — the constituency a voter is enrolled in. It determines which ballot they receive. It is fixed by the voter record and is never derived from where they are voting.

**Polling centre** — a physical location where voting takes place. Belongs to exactly one constituency.

**Home polling centre** — the polling centre inside a voter's registered constituency, where they would vote by default.

**Remote polling centre** — an alternative polling centre, usually in a different constituency, that a voter asks to use because they are away from their registered area.

**Remote polling request** — a voter's submitted application to use a remote polling centre for a given election. Reviewed by a Verification Officer.

**Remote polling assignment** — the approved result of a remote polling request. It grants the voter permission to appear at one named remote polling centre for one named election. It never alters their registered constituency.

**Geographically mobile voter** — a voter who is away from their registered constituency during an election. The entire system exists for this case.

## Eligibility and elections

**Eligibility verification** — the check that a voter is entitled to vote in a given election: active voter record, correct election, not already voted, not barred.

**Election** — a named contest with a start, an end, a set of constituencies, and a set of candidates. Has exactly one lifecycle: configured, active, closed.

**Candidate** — a fictional contestant standing in exactly one constituency of one election.

**Reconciliation** — the post-closure comparison of ballots issued against ballots recorded, per constituency. Produces a reconciliation report.

## Ballots

**Ballot** — the set of candidates presented to one voter for one election, generated from that voter's registered constituency.

**Opaque ballot reference** — the random, non-sequential identifier used to refer to a submitted ballot. It carries no voter information and cannot be used to derive voter identity.

**Candidate choice** — the selection a voter makes on a ballot. Stored only in encrypted form and never joined to voter identity.

**Ballot secrecy** — the property that no API response, log line, database view, or audit record ever places voter identity alongside candidate choice.

**Ballot integrity** — the property that a submitted ballot can be shown not to have been altered since submission.

**Duplicate submission** — a second ballot submission by the same voter for the same election. Always rejected, by a database constraint rather than by application check alone.

## Roles

The five roles enforced by backend authorization. See `permissions.md` in the `role-authorization` skill for what each may do.

**Election Administrator** — configures elections and manages election operations.

**Verification Officer** — reviews voter eligibility and remote polling requests.

**Polling Centre Officer** — supports polling-centre operations and voter verification.

**System Auditor** — reviews audit records and integrity-verification activity.

**Voter** — authenticates, requests remote polling access, and participates in the voting simulation.

**Officer** — collective term for the four non-voter roles. Officers log in with username and password; voters log in with a mock OTP.

## System

**Election Simulator** — the single backend module that demonstrates polling-centre operations, ballot processing, failure and recovery scenarios, and reconciliation. There is exactly one. It is not a node in a network.

**Audit record** — an entry describing one state-changing operation: the actor, the timestamp, and a reference to the operation. Never contains passwords, OTPs, encryption keys, or decrypted candidate choices.

**Audit trail** — the ordered set of audit records.

**Mock OTP** — the simulated one-time password used for voter authentication. Not a real SMS, email, or government OTP service.

**Portal** — one of the three frontend surfaces: the voter portal, the officer portal, and the admin portal.

## Terms to avoid

| Do not say | Say instead | Why |
|---|---|---|
| Node, peer, network | Election Simulator | There is one simulator, not a distributed network |
| Consensus, quorum | Reconciliation | The project does not implement distributed consensus |
| Transfer, migrate a voter | Remote polling assignment | Nothing about the voter's registration moves |
| Vote, verb, for storing | Submit a ballot | Keeps the stored artifact and the act distinct |
| Blockchain | (nothing) | The project does not use one |
