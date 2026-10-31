import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { BadgeTone } from './StatusBadge';

const chipTones: Record<BadgeTone, { chip: string; icon: string }> = {
  primary: { chip: 'bg-primary-soft', icon: 'text-primary' },
  green: { chip: 'bg-green-soft', icon: 'text-green-solid' },
  amber: { chip: 'bg-amber-soft', icon: 'text-amber-solid' },
  red: { chip: 'bg-red-soft', icon: 'text-red-solid' },
  neutral: { chip: 'bg-neutral-soft', icon: 'text-neutral-text' },
};

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone?: BadgeTone;
  deltaTone?: 'default' | 'green';
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'primary',
  deltaTone = 'default',
  className,
}: StatCardProps) {
  const t = chipTones[tone];
  return (
    <div
      className={cn(
        'flex h-fit flex-1 flex-col gap-2.5 rounded-xl bg-surface p-5 outline outline-border -outline-offset-[0.5px]',
        className,
      )}
    >
      <div className="flex w-full flex-row items-center justify-between">
        <span className="text-[13px] font-medium text-text-2">{label}</span>
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', t.chip)}>
          <Icon className={cn('size-[18px]', t.icon)} />
        </span>
      </div>
      <p className="text-[28px] leading-none font-bold text-navy">{value}</p>
      {delta ? (
        <p
          className={cn(
            'text-xs font-medium',
            deltaTone === 'green' ? 'text-green-solid' : 'text-text-3',
          )}
        >
          {delta}
        </p>
      ) : null}
    </div>
  );
}
