import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** The white panel used throughout the design: 1px border, 12px radius. */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'flex h-fit flex-col rounded-xl bg-surface outline outline-border -outline-offset-[0.5px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  meta?: string;
  action?: ReactNode;
}

export function CardHeader({ title, meta, action }: CardHeaderProps) {
  return (
    <div className="flex w-full shrink-0 flex-row items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-[15px] font-semibold text-navy">{title}</h2>
        {meta ? <p className="text-xs text-text-3">{meta}</p> : null}
      </div>
      {action}
    </div>
  );
}
