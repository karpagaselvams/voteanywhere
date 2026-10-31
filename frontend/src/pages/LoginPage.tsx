import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import axios from 'axios';
import {
  BadgeCheck,
  CalendarRange,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  Lock,
  LogIn,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
  Vote,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { cn } from '@/lib/cn';
import { portalHome, useAuth } from '@/hooks/useAuth';
import voterIllustration from '@/assets/signin/voter.png';
import officerIllustration from '@/assets/signin/officer.png';
import adminIllustration from '@/assets/signin/admin.png';

// The three tabs select the sign-in experience only. Officer and Admin use
// the same credential form against the same endpoint — the account's role
// comes back from the server and decides where the user lands.

type Tab = 'VOTER' | 'OFFICER' | 'ADMIN';

const voterRequestSchema = z.object({
  voterNumber: z.string().min(1, 'Required'),
});
const voterVerifySchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
const officerSchema = z.object({
  username: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
});

type VoterRequestValues = z.infer<typeof voterRequestSchema>;
type VoterVerifyValues = z.infer<typeof voterVerifySchema>;
type OfficerValues = z.infer<typeof officerSchema>;

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: string } | undefined;
    if (body?.error) return body.error;
  }
  return fallback;
}

interface TrustPoint {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface Variant {
  tab: string;
  headline: string;
  sub: string;
  illustration: string;
  trust: TrustPoint[];
  cardTitle: string;
  cardSub: string;
  submit: string;
  notice: string;
  footPrompt: string;
  footLink: string;
}

const variants: Record<Tab, Variant> = {
  VOTER: {
    tab: 'Voter',
    headline: 'Vote from where you are — at an authorized polling centre.',
    sub: 'Request permission to vote at an authorized remote polling centre, attend in person for verification and check-in, then cast a controlled ballot.',
    illustration: voterIllustration,
    trust: [
      {
        icon: UserCheck,
        title: 'Verified in person',
        description:
          'A polling officer verifies your identity and checks you in before any ballot is enabled.',
      },
      {
        icon: MapPin,
        title: 'Authorized physical centres',
        description: 'Remote ballots are cast only at designated, staffed polling centres.',
      },
      {
        icon: Lock,
        title: 'Your vote stays secret',
        description: 'Vote records are stored separately from voter identity.',
      },
    ],
    cardTitle: 'Voter Sign In',
    cardSub: 'Sign in with your voter number and a one-time code.',
    submit: 'Sign In to Voter Portal',
    notice:
      'Remote polling requires your physical presence at the assigned centre. You cannot vote online.',
    footPrompt: 'New to remote polling?',
    footLink: 'Check your eligibility',
  },
  OFFICER: {
    tab: 'Officer',
    headline: 'Verify. Check in. Control the ballot.',
    sub: 'Sign in to verify approved remote voters, manage check-in, and control the ballot session at your polling centre.',
    illustration: officerIllustration,
    trust: [
      {
        icon: BadgeCheck,
        title: 'Verify approved requests',
        description:
          'Check voter identity against the approved remote polling list for your centre.',
      },
      {
        icon: Vote,
        title: 'Control the ballot',
        description: 'Enable the ballot unit only after verification and check-in are complete.',
      },
      {
        icon: FileText,
        title: 'Full audit trail',
        description: 'Every officer action is logged, timestamped, and auditable.',
      },
    ],
    cardTitle: 'Officer Sign In',
    cardSub: 'Verification, polling centre, and audit officers sign in here.',
    submit: 'Sign In to Officer Portal',
    notice: 'Officer access is logged and audited. Your role decides what you can do.',
    footPrompt: 'Need access?',
    footLink: 'Contact your Returning Officer',
  },
  ADMIN: {
    tab: 'Admin',
    headline: 'Configure. Monitor. Report.',
    sub: 'Election administration console — configure elections and candidates, authorize remote polling centres, and monitor the remote polling pipeline.',
    illustration: adminIllustration,
    trust: [
      {
        icon: CalendarRange,
        title: 'Configure elections',
        description: 'Set up elections, candidates, and remote polling rules.',
      },
      {
        icon: ShieldCheck,
        title: 'Authorize centres',
        description: 'Approve and manage physical remote polling centres.',
      },
      {
        icon: Gauge,
        title: 'Monitor & report',
        description: 'Track requests, turnout, and aggregate polling reports in real time.',
      },
    ],
    cardTitle: 'Administrator Sign In',
    cardSub: 'Restricted to authorized election administrators.',
    submit: 'Sign In to Admin Console',
    notice: 'Administrative access is restricted, monitored, and logged.',
    footPrompt: 'Access issues?',
    footLink: 'Contact the Chief Election Office',
  },
};

const order: Tab[] = ['VOTER', 'OFFICER', 'ADMIN'];

const inputClass =
  'w-full rounded-lg bg-surface px-3 py-2.5 text-sm text-navy outline outline-border -outline-offset-[0.5px] placeholder:text-text-3 focus:outline-primary';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-navy">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-red">{error}</span> : null}
    </label>
  );
}

/** Username + password, used by both the Officer and Admin tabs. */
function OfficerCredentialForm({ variant }: { variant: Variant }) {
  const [showPassword, setShowPassword] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signInOfficer } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OfficerValues>({ resolver: zodResolver(officerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFailed(null);
    try {
      const session = await signInOfficer(values);
      // The server told us who this account is; the tab did not.
      await navigate(portalHome[session.role]);
    } catch (error) {
      setFailed(errorMessage(error, 'Invalid username or password'));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      <Field label="Username" error={errors.username?.message}>
        <input {...register('username')} placeholder="officer.polling" className={inputClass} />
      </Field>

      <Field label="Password" error={errors.password?.message}>
        <span className="flex w-full flex-row items-center gap-2 rounded-lg bg-surface px-3 py-2.5 outline outline-border -outline-offset-[0.5px] focus-within:outline-primary">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="shrink-0 text-text-3 transition-colors hover:text-navy"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </Field>

      {failed ? (
        <p className="rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">{failed}</p>
      ) : null}

      <Button type="submit" icon={LogIn} fullWidth disabled={isSubmitting}>
        {variant.submit}
      </Button>
    </form>
  );
}

/** Two-step mock OTP flow: voter number → one-time code. */
function VoterOtpForm({ variant }: { variant: Variant }) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const navigate = useNavigate();
  const { requestOtp, signInVoter } = useAuth();

  const requestForm = useForm<VoterRequestValues>({
    resolver: zodResolver(voterRequestSchema),
    defaultValues: { voterNumber: 'VA-0001' },
  });
  const verifyForm = useForm<VoterVerifyValues>({ resolver: zodResolver(voterVerifySchema) });

  const onRequest = requestForm.handleSubmit(async ({ voterNumber }) => {
    setFailed(null);
    try {
      const issued = await requestOtp(voterNumber);
      setChallengeId(issued.challengeId);
      setStep('verify');
    } catch (error) {
      setFailed(errorMessage(error, 'Invalid or expired code'));
    }
  });

  const onVerify = verifyForm.handleSubmit(async ({ otp }) => {
    if (!challengeId) return;
    setFailed(null);
    try {
      const session = await signInVoter(challengeId, otp);
      await navigate(portalHome[session.role]);
    } catch (error) {
      setFailed(errorMessage(error, 'Invalid or expired code'));
    }
  });

  if (step === 'request') {
    return (
      <form onSubmit={onRequest} className="flex flex-col gap-[18px]">
        <Field label="Voter Number" error={requestForm.formState.errors.voterNumber?.message}>
          <input {...requestForm.register('voterNumber')} placeholder="VA-0001" className={inputClass} />
        </Field>

        {failed ? (
          <p className="rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">{failed}</p>
        ) : null}

        <Button type="submit" icon={LogIn} fullWidth disabled={requestForm.formState.isSubmitting}>
          Send One-Time Code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerify} className="flex flex-col gap-[18px]">
      <p className="rounded-lg bg-neutral-soft px-3 py-2 text-xs text-text-2">
        A one-time code was issued for this voter number. In this development build the mock code
        is printed in the backend console log.
      </p>

      <Field label="One-Time Code" error={verifyForm.formState.errors.otp?.message}>
        <input
          {...verifyForm.register('otp')}
          placeholder="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={inputClass}
        />
      </Field>

      {failed ? (
        <p className="rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">{failed}</p>
      ) : null}

      <Button type="submit" icon={LogIn} fullWidth disabled={verifyForm.formState.isSubmitting}>
        {variant.submit}
      </Button>

      <button
        type="button"
        onClick={() => {
          setStep('request');
          setChallengeId(null);
          setFailed(null);
          verifyForm.reset();
        }}
        className="text-center text-xs font-medium text-primary"
      >
        Use a different voter number
      </button>
    </form>
  );
}

export function LoginPage() {
  const [tab, setTab] = useState<Tab>('VOTER');
  const v = variants[tab];

  return (
    <div className="flex min-h-screen w-full flex-row bg-surface">
      <section className="flex w-[520px] shrink-0 flex-col justify-between bg-navy-deep px-12 py-11">
        <div className="flex flex-row items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Vote className="size-5 text-white" />
          </span>
          <span className="flex flex-col gap-px">
            <span className="text-[15px] font-bold text-white">Vote Anywhere</span>
            <span className="text-[10px] text-navy-text-3">Remote Polling System Simulator</span>
          </span>
        </div>

        <img src={v.illustration} alt="" className="h-[200px] w-full object-contain" />

        <div className="flex flex-col gap-7 py-6">
          <h1 className="text-[32px]/[38px] font-bold text-white">{v.headline}</h1>
          <p className="text-[15px]/[23px] text-navy-text-2">{v.sub}</p>

          <div className="flex flex-col gap-4">
            {v.trust.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-row items-start gap-3">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
                  <Icon className="size-[17px] text-white" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-white">{title}</span>
                  <span className="text-xs/[18px] text-navy-text-3">{description}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-row items-center gap-2.5 rounded-lg bg-white/[0.06] px-3.5 py-3">
            <TriangleAlert className="size-4 shrink-0 text-amber-solid" />
            <span className="text-xs text-navy-text-2">
              This is not an online voting system — ballots are cast in person only.
            </span>
          </div>
          <span className="text-[11px] text-navy-text-3">
            Fictional data only • Academic workflow simulator
          </span>
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center bg-bg p-12">
        <div className="flex w-[430px] shrink-0 flex-col gap-[18px] rounded-2xl bg-surface p-9 outline outline-border -outline-offset-[0.5px]">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-bold text-navy">{v.cardTitle}</h2>
            <p className="text-[13px] text-text-3">{v.cardSub}</p>
          </div>

          <div className="flex w-full flex-row gap-1 rounded-[10px] bg-neutral-soft p-1">
            {order.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors',
                  t === tab ? 'bg-surface text-navy shadow-sm' : 'text-text-3 hover:text-text-2',
                )}
              >
                {variants[t].tab}
              </button>
            ))}
          </div>

          {tab === 'VOTER' ? (
            <VoterOtpForm key="voter" variant={v} />
          ) : (
            <OfficerCredentialForm key={tab} variant={v} />
          )}

          <div className="flex w-full flex-row items-start gap-2.5 rounded-lg bg-amber-soft px-3.5 py-3 outline outline-amber-border -outline-offset-[0.5px]">
            <TriangleAlert className="size-4 shrink-0 text-amber-solid" />
            <span className="text-xs/[18px] text-amber">{v.notice}</span>
          </div>

          <p className="w-full text-center text-xs text-text-3">
            {v.footPrompt} <span className="font-semibold text-primary">{v.footLink}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
