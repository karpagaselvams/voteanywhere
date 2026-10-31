import { z } from 'zod';

export const officerLoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const otpRequestSchema = z.object({
  voterNumber: z.string().min(1).max(50),
});

export const otpVerifySchema = z.object({
  challengeId: z.string().min(1).max(100),
  otp: z.string().regex(/^\d{6}$/),
});

export const sessionIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(200),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type OfficerLoginInput = z.infer<typeof officerLoginSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
