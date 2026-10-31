import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar, type NavItem } from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';

interface PortalLayoutProps {
  menuLabel: string;
  portalName: string;
  items: NavItem[];
}

export function PortalLayout({ menuLabel, portalName, items }: PortalLayoutProps) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!session) return null;

  const active = [...items]
    .sort((a, b) => b.to.length - a.to.length)
    .find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
  const title = active?.label ?? portalName;

  return (
    <div className="flex min-h-screen w-full flex-row bg-bg">
      <Sidebar menuLabel={menuLabel} items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          breadcrumb={`${portalName} / ${title}`}
          title={title}
          session={session}
          onSignOut={() => {
            void signOut().then(() => navigate('/login'));
          }}
        />
        <main className="flex w-full flex-1 flex-col gap-6 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
