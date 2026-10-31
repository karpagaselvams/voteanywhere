import { TriangleAlert } from 'lucide-react';

export function Loading() {
  return (
    <div className="flex w-full flex-1 items-center justify-center py-20 text-sm text-text-3">
      Loading…
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <div className="flex w-full flex-row items-center gap-2.5 rounded-xl bg-red-soft px-4 py-3 outline outline-red-border -outline-offset-[0.5px]">
      <TriangleAlert className="size-4 shrink-0 text-red-solid" />
      <span className="text-[13px] text-red">{message}</span>
    </div>
  );
}
