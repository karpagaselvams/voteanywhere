import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'white' | 'outline' | 'translucent' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  white: 'bg-surface text-navy hover:bg-neutral-soft',
  outline: 'bg-surface text-navy outline outline-border -outline-offset-[0.5px] hover:bg-neutral-soft',
  translucent: 'bg-white/10 text-white hover:bg-white/20',
  danger: 'bg-red-soft text-red outline outline-red-border -outline-offset-[0.5px] hover:bg-red-soft/70',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  icon: Icon,
  iconRight: IconRight,
  children,
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'flex h-fit flex-row items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        fullWidth ? 'w-full min-w-0 shrink' : 'w-fit shrink-0',
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      {children}
      {IconRight ? <IconRight className="size-4 shrink-0" /> : null}
    </button>
  );
}
