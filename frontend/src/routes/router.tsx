import { createBrowserRouter, Navigate } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Settings,
  UserCheck,
  Vote,
} from 'lucide-react';
import { PortalLayout } from '@/layouts/PortalLayout';
import type { NavItem } from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';
import { RequireRole } from './RequireRole';
import { LoginPage } from '@/pages/LoginPage';

import VoterDashboardPage from '@/pages/voter/DashboardPage';
import EligibilityPage from '@/pages/voter/EligibilityPage';
import RequestPage from '@/pages/voter/RequestPage';
import StatusPage from '@/pages/voter/StatusPage';
import BallotPage from '@/pages/voter/BallotPage';

import OfficerDashboardPage from '@/pages/officer/DashboardPage';
import VerificationPage from '@/pages/officer/VerificationPage';
import BallotControlPage from '@/pages/officer/BallotControlPage';
import AuditPage from '@/pages/officer/AuditPage';

import AdminDashboardPage from '@/pages/admin/DashboardPage';
import ElectionsPage from '@/pages/admin/ElectionsPage';
import CandidatesPage from '@/pages/admin/CandidatesPage';
import ReportsPage from '@/pages/admin/ReportsPage';

const voterNav = [
  { to: '/voter', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/voter/eligibility', label: 'Eligibility Check', icon: BadgeCheck },
  { to: '/voter/request', label: 'Remote Polling Request', icon: ClipboardList },
  { to: '/voter/status', label: 'Request Status & Centre', icon: MapPin },
  { to: '/voter/ballot', label: 'Controlled Ballot', icon: Vote },
];

// Officer nav follows the permission matrix. It filters what each role sees;
// the backend still enforces every operation.
//   VERIFICATION_OFFICER   — reviews and approves remote polling requests
//   POLLING_CENTRE_OFFICER — centre operations: voter check-in, ballot control
//   SYSTEM_AUDITOR         — read-only; audit pages arrive with the audit module
type OfficerPortalRole = Extract<
  Role,
  'VERIFICATION_OFFICER' | 'POLLING_CENTRE_OFFICER' | 'SYSTEM_AUDITOR'
>;

const officerDashboardItem: NavItem = {
  to: '/officer',
  label: 'Dashboard',
  icon: LayoutDashboard,
  end: true,
};

const officerNavByRole: Record<OfficerPortalRole, NavItem[]> = {
  VERIFICATION_OFFICER: [
    officerDashboardItem,
    { to: '/officer/verification', label: 'Verification & Check-in', icon: UserCheck },
  ],
  POLLING_CENTRE_OFFICER: [
    officerDashboardItem,
    { to: '/officer/verification', label: 'Verification & Check-in', icon: UserCheck },
    { to: '/officer/ballot-control', label: 'Ballot Control', icon: Vote },
  ],
  SYSTEM_AUDITOR: [
    officerDashboardItem,
    { to: '/officer/audit', label: 'Audit Trail', icon: ScrollText },
  ],
};

function OfficerPortalLayout() {
  const { session } = useAuth();
  const items =
    session && session.role !== 'VOTER' && session.role !== 'ELECTION_ADMINISTRATOR'
      ? officerNavByRole[session.role]
      : [];
  return <PortalLayout menuLabel="OFFICER MENU" portalName="Officer Portal" items={items} />;
}

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/elections', label: 'Election Management', icon: CalendarRange },
  { to: '/admin/candidates', label: 'Candidates & Centres', icon: Building2 },
  { to: '/admin/reports', label: 'Requests & Reports', icon: Settings },
];

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireRole roles={['VOTER']} />,
    children: [
      {
        element: <PortalLayout menuLabel="VOTER MENU" portalName="Voter Portal" items={voterNav} />,
        children: [
          { path: '/voter', element: <VoterDashboardPage /> },
          { path: '/voter/eligibility', element: <EligibilityPage /> },
          { path: '/voter/request', element: <RequestPage /> },
          { path: '/voter/status', element: <StatusPage /> },
          { path: '/voter/ballot', element: <BallotPage /> },
        ],
      },
    ],
  },
  {
    element: (
      <RequireRole roles={['VERIFICATION_OFFICER', 'POLLING_CENTRE_OFFICER', 'SYSTEM_AUDITOR']} />
    ),
    children: [
      {
        element: <OfficerPortalLayout />,
        children: [
          { path: '/officer', element: <OfficerDashboardPage /> },
          {
            // Voter verification at a centre: Verification Officer and
            // Polling Centre Officer. A System Auditor reaching for the URL
            // directly is bounced by this nested guard.
            element: <RequireRole roles={['VERIFICATION_OFFICER', 'POLLING_CENTRE_OFFICER']} />,
            children: [{ path: '/officer/verification', element: <VerificationPage /> }],
          },
          {
            // Ballot control belongs to the Polling Centre Officer.
            element: <RequireRole roles={['POLLING_CENTRE_OFFICER']} />,
            children: [{ path: '/officer/ballot-control', element: <BallotControlPage /> }],
          },
          {
            // The audit trail belongs to the System Auditor — read-only.
            element: <RequireRole roles={['SYSTEM_AUDITOR']} />,
            children: [{ path: '/officer/audit', element: <AuditPage /> }],
          },
        ],
      },
    ],
  },
  {
    element: <RequireRole roles={['ELECTION_ADMINISTRATOR']} />,
    children: [
      {
        element: (
          <PortalLayout menuLabel="ADMINISTRATION" portalName="Admin Portal" items={adminNav} />
        ),
        children: [
          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/admin/elections', element: <ElectionsPage /> },
          { path: '/admin/candidates', element: <CandidatesPage /> },
          { path: '/admin/reports', element: <ReportsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
