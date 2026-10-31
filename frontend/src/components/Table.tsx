import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TableProps {
  columns: string[];
  children: ReactNode;
  className?: string;
}

export function Table({ columns, children, className }: TableProps) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-neutral-soft/60">
            {columns.map((c) => (
              <th
                key={c}
                className="px-5 py-2.5 text-[10px] font-semibold tracking-[0.8px] text-text-3 whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-border last:border-0 hover:bg-neutral-soft/40">{children}</tr>;
}

export function Cell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-5 py-3 align-middle text-[13px] text-text-2', className)}>{children}</td>;
}

export function PrimaryCell({ title, meta }: { title: string; meta?: string }) {
  return (
    <td className="px-5 py-3 align-middle">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-navy whitespace-nowrap">{title}</span>
        {meta ? <span className="text-[11px] text-text-3 whitespace-nowrap">{meta}</span> : null}
      </div>
    </td>
  );
}
