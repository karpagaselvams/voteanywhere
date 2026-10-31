import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, KeyRound, LogOut, Search } from 'lucide-react';
import type { Session } from '@/types';
import { cn } from '@/lib/cn';
import { ChangePasswordDialog } from './ChangePasswordDialog';

interface AppHeaderProps {
  breadcrumb: string;
  title: string;
  session: Session;
  onSignOut: () => void;
}

export function AppHeader({ breadcrumb, title, session, onSignOut }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen]);

  return (
    <header className="flex w-full shrink-0 flex-row items-center justify-between gap-4 border-b border-border bg-surface px-7 py-[13px]">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-xs text-text-3">{breadcrumb}</span>
        <h1 className="truncate text-xl font-semibold text-navy">{title}</h1>
      </div>

      <div className="flex shrink-0 flex-row items-center gap-4">
        <div className="hidden w-[264px] flex-row items-center gap-2 rounded-lg bg-neutral-soft px-3 py-2 lg:flex">
          <Search className="size-[15px] shrink-0 text-text-3" />
          <input
            type="search"
            placeholder="Search requests, centres, voters…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-navy outline-none placeholder:text-text-3"
          />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative size-9 shrink-0 rounded-lg bg-surface outline outline-border -outline-offset-[0.5px]"
        >
          <Bell className="absolute top-[9px] left-[9px] size-[18px] text-text-2" />
          <span className="absolute top-1.5 left-[22px] size-[9px] rounded-full bg-red-solid outline-2 outline-surface -outline-offset-1" />
        </button>

        <span className="h-8 w-px shrink-0 bg-border" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className={cn(
              'flex flex-row items-center gap-2.5 rounded-xl px-2.5 py-1.5 outline -outline-offset-[0.5px] transition-colors',
              menuOpen ? 'bg-neutral-soft outline-border' : 'outline-transparent hover:bg-neutral-soft',
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white">
              {session.initials}
            </span>
            <span className="hidden min-w-0 flex-col items-start gap-px sm:flex">
              <span className="max-w-[140px] truncate text-[13px] font-semibold text-navy">
                {session.name}
              </span>
              <span className="max-w-[160px] truncate text-[11px] text-text-3">
                {session.subtitle}
              </span>
            </span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-text-3 transition-transform',
                menuOpen && 'rotate-180',
              )}
            />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 flex w-56 flex-col rounded-xl bg-surface p-1.5 shadow-lg outline outline-border -outline-offset-[0.5px]"
            >
              {session.role !== 'VOTER' ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setChangingPassword(true);
                  }}
                  className="flex w-full flex-row items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-navy transition-colors hover:bg-neutral-soft"
                >
                  <KeyRound className="size-4 shrink-0 text-text-3" />
                  Change password
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
                className="flex w-full flex-row items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-red transition-colors hover:bg-red-soft"
              >
                <LogOut className="size-4 shrink-0" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {changingPassword ? (
        <ChangePasswordDialog onClose={() => setChangingPassword(false)} />
      ) : null}
    </header>
  );
}
