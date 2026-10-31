import { cn } from '@/lib/cn';

export type BadgeTone = 'primary' | 'green' | 'amber' | 'red' | 'neutral';

const tones: Record<BadgeTone, { wrap: string; dot: string }> = {
  primary: { wrap: 'bg-primary-soft text-primary', dot: 'bg-primary' },
  green: { wrap: 'bg-green-soft text-green', dot: 'bg-green-solid' },
  amber: { wrap: 'bg-amber-soft text-amber', dot: 'bg-amber-solid' },
  red: { wrap: 'bg-red-soft text-red', dot: 'bg-red-solid' },
  neutral: { wrap: 'bg-neutral-soft text-neutral-text', dot: 'bg-neutral-dot' },
};

interface StatusBadgeProps {
  tone?: BadgeTone;
  children: string;
  className?: string;
}

export function StatusBadge({ tone = 'neutral', children, className }: StatusBadgeProps) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        'flex w-fit shrink-0 flex-row items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        t.wrap,
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', t.dot)} />
      {children}
    </span>
  );
}
