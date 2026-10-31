import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ label, hint, error, className, children }: FieldShellProps) {
  return (
    <label className={cn('flex h-fit flex-1 flex-col gap-1.5', className)}>
      <span className="text-[13px] font-medium text-navy">{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-red">{error}</span>
      ) : hint ? (
        <span className="text-xs text-text-3">{hint}</span>
      ) : null}
    </label>
  );
}

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  wrapperClassName?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, hint, error, icon: Icon, wrapperClassName, className, ...props },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={wrapperClassName}>
      <span
        className={cn(
          'flex w-full flex-row items-center gap-2 rounded-lg bg-surface px-3 py-2.5 outline -outline-offset-[0.5px] focus-within:outline-primary',
          error ? 'outline-red-border' : 'outline-border',
          props.disabled && 'bg-neutral-soft',
        )}
      >
        <input
          ref={ref}
          {...props}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-text-3 disabled:text-text-2',
            className,
          )}
        />
        {Icon ? <Icon className="size-4 shrink-0 text-text-3" /> : null}
      </span>
    </FieldShell>
  );
});

interface SelectFieldProps {
  label: string;
  hint?: string;
  value: string;
  options: string[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SelectField({
  label,
  hint,
  value,
  options,
  onChange,
  disabled,
  className,
}: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} className={className}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full appearance-none rounded-lg bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238595AE%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[position:right_12px_center] bg-no-repeat py-2.5 pr-9 pl-3 text-sm text-navy outline outline-border -outline-offset-[0.5px] focus:outline-primary disabled:bg-neutral-soft"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface ReadOnlyFieldProps {
  label: string;
  value: string;
  className?: string;
}

/** Prefilled electoral-roll values the voter cannot edit. */
export function ReadOnlyField({ label, value, className }: ReadOnlyFieldProps) {
  return (
    <FieldShell label={label} className={className}>
      <span className="flex w-full flex-row items-center rounded-lg bg-neutral-soft px-3 py-2.5 text-sm text-text-2 outline outline-border -outline-offset-[0.5px]">
        {value}
      </span>
    </FieldShell>
  );
}
