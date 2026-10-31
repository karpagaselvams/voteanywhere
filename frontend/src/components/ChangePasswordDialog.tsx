import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { KeyRound, X } from 'lucide-react';
import { Button } from './Button';
import { changePassword } from '@/services/auth';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(1, 'Required'),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full rounded-lg bg-surface px-3 py-2.5 text-sm text-navy outline outline-border -outline-offset-[0.5px] focus:outline-primary';

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [failed, setFailed] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFailed(null);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setDone(true);
    } catch (error) {
      const body = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)
        : undefined;
      setFailed(body?.error ?? 'Could not change the password. Please try again.');
    }
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/40"
      role="dialog"
      aria-modal="true"
      aria-label="Change password"
    >
      <div className="flex w-[400px] flex-col gap-4 rounded-2xl bg-surface p-6 outline outline-border -outline-offset-[0.5px]">
        <div className="flex flex-row items-center justify-between">
          <h2 className="text-[16px] font-bold text-navy">Change Password</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-3 transition-colors hover:text-navy"
          >
            <X className="size-4" />
          </button>
        </div>

        {done ? (
          <>
            <p className="rounded-lg bg-green-soft px-3 py-2 text-xs font-medium text-green">
              Password changed. Your other sessions were signed out.
            </p>
            <Button variant="outline" fullWidth onClick={onClose}>
              Close
            </Button>
          </>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-navy">Current password</span>
              <input
                {...register('currentPassword')}
                type="password"
                autoComplete="current-password"
                className={inputClass}
              />
              {errors.currentPassword ? (
                <span className="text-xs font-medium text-red">
                  {errors.currentPassword.message}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-navy">New password</span>
              <input
                {...register('newPassword')}
                type="password"
                autoComplete="new-password"
                className={inputClass}
              />
              {errors.newPassword ? (
                <span className="text-xs font-medium text-red">{errors.newPassword.message}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-navy">Confirm new password</span>
              <input
                {...register('confirm')}
                type="password"
                autoComplete="new-password"
                className={inputClass}
              />
              {errors.confirm ? (
                <span className="text-xs font-medium text-red">{errors.confirm.message}</span>
              ) : null}
            </label>

            {failed ? (
              <p className="rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">
                {failed}
              </p>
            ) : null}

            <Button type="submit" icon={KeyRound} fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Changing…' : 'Change Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
