import { cn } from '@/lib/cn';

const toneFills: Record<string, string> = {
  primary: 'bg-primary',
  green: 'bg-green-solid',
  amber: 'bg-amber-solid',
  red: 'bg-red-solid',
  neutral: 'bg-neutral-dot',
};

const toneStroke: Record<string, string> = {
  primary: '#1D4ED8',
  green: '#16A34A',
  amber: '#F59E0B',
  red: '#DC2626',
  neutral: '#94A3B8',
};

interface ColumnChartProps {
  data: { day: string; value: number }[];
  height?: number;
  /** Bars at or past this index render in the muted tint, as in the design. */
  mutedFrom?: number;
}

export function ColumnChart({ data, height = 180, mutedFrom }: ColumnChartProps) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex w-full flex-row items-end gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[11px] font-semibold text-text-2">{d.value}</span>
          <div
            className={cn(
              'w-full rounded-t-[4px]',
              mutedFrom !== undefined && i >= mutedFrom ? 'bg-primary-border' : 'bg-primary',
            )}
            style={{ height: `${(d.value / max) * (height - 46)}px` }}
          />
          <span className="text-[11px] text-text-3">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

interface DonutChartProps {
  segments: { label: string; value: number; tone: string }[];
  size?: number;
  thickness?: number;
  centerLabel: string;
  centerValue: string;
}

export function DonutChart({
  segments,
  size = 148,
  thickness = 18,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {segments.map((s) => {
          const length = (s.value / total) * circumference;
          const dash = `${length} ${circumference - length}`;
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={toneStroke[s.tone] ?? toneStroke.neutral}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-xl font-bold text-navy">{centerValue}</span>
        <span className="text-[11px] text-text-3">{centerLabel}</span>
      </div>
    </div>
  );
}

interface BarListProps {
  data: { zone: string; value: number }[];
}

export function BarList({ data }: BarListProps) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex w-full flex-col gap-3">
      {data.map((d) => (
        <div key={d.zone} className="flex w-full flex-row items-center gap-3">
          <span className="w-[92px] shrink-0 text-xs text-text-2">{d.zone}</span>
          <div className="h-[18px] flex-1 overflow-hidden rounded-[4px] bg-neutral-soft">
            <div
              className="h-full rounded-[4px] bg-primary"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-xs font-semibold text-navy">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

interface LegendProps {
  items: { label: string; value: number; percent: string; tone: string }[];
}

export function Legend({ items }: LegendProps) {
  return (
    <div className="flex flex-1 flex-col gap-2.5">
      {items.map((i) => (
        <div key={i.label} className="flex flex-row items-center gap-2">
          <span className={cn('size-2 shrink-0 rounded-full', toneFills[i.tone] ?? toneFills.neutral)} />
          <span className="flex-1 text-xs text-text-2">{i.label}</span>
          <span className="text-xs font-semibold text-navy">{i.value}</span>
          <span className="w-8 text-right text-xs text-text-3">{i.percent}</span>
        </div>
      ))}
    </div>
  );
}

interface StackedBarProps {
  segments: { label: string; value: number; tone: string }[];
}

export function StackedBar({ segments }: StackedBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="flex h-2.5 w-full flex-row overflow-hidden rounded-full">
      {segments.map((s) => (
        <span
          key={s.label}
          className={cn(toneFills[s.tone] ?? toneFills.neutral)}
          style={{ width: `${(s.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}
