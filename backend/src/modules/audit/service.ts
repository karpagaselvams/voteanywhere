import { auditRepository, type AuditEntry } from './repository';
import { logger } from '../../config/logger';

// Callers must only ever pass the actor, the action, and an operation
// reference. Never a password, OTP, token, encryption key, or decrypted
// candidate choice.
export const auditService = {
  async record(entry: AuditEntry): Promise<void> {
    try {
      await auditRepository.record(entry);
    } catch (error) {
      // Audit failure must not silently swallow the original operation's
      // outcome, but it must be visible in logs.
      logger.error('audit record write failed', {
        action: entry.action,
        errorName: error instanceof Error ? error.name : 'unknown',
      });
    }
  },
};
