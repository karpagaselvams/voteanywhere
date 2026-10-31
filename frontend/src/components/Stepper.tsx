import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TimelineStep } from '@/types';

interface StepperProps {
  steps: TimelineStep[];
}

/** The horizontal progress rail used on the voter dashboard and status screens. */
export function Stepper({ steps }: StepperProps) {
  return (
    <div className="flex w-full flex-row items-start">
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-row items-center">
            <span
              className={cn(
                'h-0.5 flex-1',
                i === 0 ? 'bg-transparent' : steps[i - 1].state === 'done' ? 'bg-green-solid' : 'bg-border',
              )}
            />
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                step.state === 'done' && 'bg-green-solid text-white',
                step.state === 'current' && 'bg-primary text-white ring-4 ring-primary-soft',
                step.state === 'upcoming' && 'bg-neutral-soft text-text-3',
              )}
            >
              {step.state === 'done' ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'h-0.5 flex-1',
                i === steps.length - 1 ? 'bg-transparent' : step.state === 'done' ? 'bg-green-solid' : 'bg-border',
              )}
            />
          </div>
          <span
            className={cn(
              'text-center text-[11px] font-semibold',
              step.state === 'upcoming' ? 'text-text-3' : 'text-navy',
            )}
          >
            {step.label}
          </span>
          <span className="text-center text-[10px] text-text-3">{step.detail}</span>
        </div>
      ))}
    </div>
  );
}

interface VerticalStepsProps {
  steps: TimelineStep[];
}

/** The vertical variant used in ballot sessions and completion panels. */
export function VerticalSteps({ steps }: VerticalStepsProps) {
  return (
    <div className="flex w-full flex-col">
      {steps.map((step, i) => (
        <div key={step.label} className="flex w-full flex-row gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                step.state === 'done' && 'bg-green-solid text-white',
                step.state === 'current' && 'bg-primary text-white',
                step.state === 'upcoming' && 'bg-neutral-soft text-text-3',
              )}
            >
              {step.state === 'done' ? <Check className="size-3" /> : i + 1}
            </span>
            {i < steps.length - 1 ? (
              <span className={cn('w-0.5 flex-1', step.state === 'done' ? 'bg-green-solid' : 'bg-border')} />
            ) : null}
          </div>
          <div className={cn('flex flex-col gap-0.5', i < steps.length - 1 && 'pb-4')}>
            <span className="text-[13px] font-semibold text-navy">{step.label}</span>
            <span className="text-[11px] text-text-3">{step.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
