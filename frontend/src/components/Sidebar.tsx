import { NavLink } from 'react-router-dom';
import { Vote, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface SidebarProps {
  menuLabel: string;
  items: NavItem[];
}

export function Sidebar({ menuLabel, items }: SidebarProps) {
  return (
    <aside className="flex w-[264px] shrink-0 flex-col justify-between self-stretch border-r border-border bg-surface">
      <div className="flex w-full flex-col gap-[18px] px-4 pt-5 pb-3">
        <div className="flex w-full flex-row items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Vote className="size-5 text-white" />
          </span>
          <span className="flex flex-col gap-px">
            <span className="text-[15px] leading-tight font-bold text-navy">Vote Anywhere</span>
            <span className="text-[10px] leading-tight text-text-3">Remote Polling System</span>
          </span>
        </div>

        <div className="h-px w-full bg-border" />

        <nav className="flex w-full flex-col gap-0.5">
          <span className="px-3 pb-2 text-[10px] font-semibold tracking-[1.5px] text-text-3">
            {menuLabel}
          </span>
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex w-full flex-row items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] transition-colors',
                  isActive
                    ? 'bg-primary-soft font-semibold text-primary'
                    : 'font-medium text-text-2 hover:bg-neutral-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-primary' : 'text-icon-gray')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex w-full flex-col gap-3 p-4">
        <div className="flex w-full flex-row items-center gap-2 rounded-lg bg-green-soft px-3 py-2">
          <span className="size-[7px] shrink-0 rounded-full bg-green-solid" />
          <span className="text-[11px] font-medium text-green">System Operational</span>
        </div>
      </div>
    </aside>
  );
}
