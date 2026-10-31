-- CreateEnum
CREATE TYPE "OfficerRole" AS ENUM ('ELECTION_ADMINISTRATOR', 'VERIFICATION_OFFICER', 'POLLING_CENTRE_OFFICER', 'SYSTEM_AUDITOR');

-- CreateEnum
CREATE TYPE "ElectionLifecycle" AS ENUM ('CONFIGURED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "RemotePollingRequestStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('OFFICER', 'VOTER', 'SYSTEM');

-- CreateTable
CREATE TABLE "Officer" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "OfficerRole" NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Officer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voter" (
    "id" TEXT NOT NULL,
    "voterNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "registeredConstituencyId" TEXT NOT NULL,
    "homePollingCentreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constituency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Constituency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollingCentre" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "constituencyId" TEXT NOT NULL,

    CONSTRAINT "PollingCentre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lifecycle" "ElectionLifecycle" NOT NULL DEFAULT 'CONFIGURED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionConstituency" (
    "electionId" TEXT NOT NULL,
    "constituencyId" TEXT NOT NULL,

    CONSTRAINT "ElectionConstituency_pkey" PRIMARY KEY ("electionId","constituencyId")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "symbol" TEXT,
    "electionId" TEXT NOT NULL,
    "constituencyId" TEXT NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterElectionStatus" (
    "id" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "hasVoted" BOOLEAN NOT NULL DEFAULT false,
    "votedAt" TIMESTAMP(3),

    CONSTRAINT "VoterElectionStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmittedBallot" (
    "ballotReference" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "constituencyId" TEXT NOT NULL,
    "nonce" BYTEA NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "authTag" BYTEA NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmittedBallot_pkey" PRIMARY KEY ("ballotReference")
);

-- CreateTable
CREATE TABLE "RemotePollingRequest" (
    "id" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "pollingCentreId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "RemotePollingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemotePollingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemotePollingAssignment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "pollingCentreId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemotePollingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "officerId" TEXT,
    "voterId" TEXT,
    "role" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRecord" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Officer_username_key" ON "Officer"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Voter_voterNumber_key" ON "Voter"("voterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Constituency_code_key" ON "Constituency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PollingCentre_code_key" ON "PollingCentre"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Election_code_key" ON "Election"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_electionId_constituencyId_fullName_key" ON "Candidate"("electionId", "constituencyId", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "VoterElectionStatus_voterId_electionId_key" ON "VoterElectionStatus"("voterId", "electionId");

-- CreateIndex
CREATE UNIQUE INDEX "RemotePollingAssignment_requestId_key" ON "RemotePollingAssignment"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "RemotePollingAssignment_voterId_electionId_key" ON "RemotePollingAssignment"("voterId", "electionId");

-- CreateIndex
CREATE UNIQUE INDEX "OtpChallenge_challengeId_key" ON "OtpChallenge"("challengeId");

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_registeredConstituencyId_fkey" FOREIGN KEY ("registeredConstituencyId") REFERENCES "Constituency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_homePollingCentreId_fkey" FOREIGN KEY ("homePollingCentreId") REFERENCES "PollingCentre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollingCentre" ADD CONSTRAINT "PollingCentre_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "Constituency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionConstituency" ADD CONSTRAINT "ElectionConstituency_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionConstituency" ADD CONSTRAINT "ElectionConstituency_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "Constituency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "Constituency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionId_constituencyId_fkey" FOREIGN KEY ("electionId", "constituencyId") REFERENCES "ElectionConstituency"("electionId", "constituencyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoterElectionStatus" ADD CONSTRAINT "VoterElectionStatus_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoterElectionStatus" ADD CONSTRAINT "VoterElectionStatus_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittedBallot" ADD CONSTRAINT "SubmittedBallot_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittedBallot" ADD CONSTRAINT "SubmittedBallot_constituencyId_fkey" FOREIGN KEY ("constituencyId") REFERENCES "Constituency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemotePollingRequest" ADD CONSTRAINT "RemotePollingRequest_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemotePollingRequest" ADD CONSTRAINT "RemotePollingRequest_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemotePollingRequest" ADD CONSTRAINT "RemotePollingRequest_pollingCentreId_fkey" FOREIGN KEY ("pollingCentreId") REFERENCES "PollingCentre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemotePollingRequest" ADD CONSTRAINT "RemotePollingRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemotePollingAssignment" ADD CONSTRAINT "RemotePollingAssignment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RemotePollingRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemotePollingAssignment" ADD CONSTRAINT "RemotePollingAssignment_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemotePollingAssignment" ADD CONSTRAINT "RemotePollingAssignment_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemotePollingAssignment" ADD CONSTRAINT "RemotePollingAssignment_pollingCentreId_fkey" FOREIGN KEY ("pollingCentreId") REFERENCES "PollingCentre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemotePollingAssignment" ADD CONSTRAINT "RemotePollingAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- At most one active (PENDING or UNDER_REVIEW) remote polling request per
-- voter per election. Prisma cannot express partial indexes, so this is
-- hand-written; the constraint name must never reach a response body.
CREATE UNIQUE INDEX "RemotePollingRequest_one_active_per_voter_election"
ON "RemotePollingRequest" ("voterId", "electionId")
WHERE "status" IN ('PENDING', 'UNDER_REVIEW');
