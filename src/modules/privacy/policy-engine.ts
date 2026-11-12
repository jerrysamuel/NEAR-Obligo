import { store, DisclosurePermission } from "@/infrastructure/store/persistent-store";
import { PermissionCheckResult } from "./privacy.types";

export class PolicyEngine {
  /**
   * Evaluates whether requested fields can be released to a given recipient.
   * Strictly enforces that:
   * 1. A valid, unrevoked, unexpired permission exists for this recipient.
   * 2. Only explicitly listed fields in the permission are approved.
   */
  public static evaluateDisclosure(
    recipient: string,
    requestedFields: string[],
    userId?: string
  ): PermissionCheckResult {
    const targetUserId = userId || store.getDefaultUserId();
    const permissions = store.getDisclosurePermissions(targetUserId);

    const now = new Date();

    // Find active permission for recipient
    const activePerm = permissions.find(
      (p) =>
        p.recipient.toLowerCase() === recipient.toLowerCase() &&
        !p.revokedAt &&
        new Date(p.expiresAt) > now
    );

    if (!activePerm) {
      return {
        isPermitted: false,
        permittedFields: [],
        deniedFields: requestedFields,
        reason: `No active disclosure permission granted for recipient: "${recipient}". Explicit user authorization required.`,
      };
    }

    const permittedFields = requestedFields.filter((f) => activePerm.permittedFields.includes(f));
    const deniedFields = requestedFields.filter((f) => !activePerm.permittedFields.includes(f));

    return {
      isPermitted: deniedFields.length === 0,
      permittedFields,
      deniedFields,
      reason:
        deniedFields.length === 0
          ? `All requested fields permitted under permission ${activePerm.id}.`
          : `Some fields denied by privacy policy: [${deniedFields.join(", ")}].`,
    };
  }

  /**
   * Sanitizes personal context before sending to external services or merchants.
   */
  public static sanitizeContext<T extends Record<string, unknown>>(
    data: T,
    permittedFields: string[]
  ): Partial<T> {
    const sanitized: Partial<T> = {};
    for (const key of permittedFields) {
      if (key in data) {
        sanitized[key as keyof T] = data[key as keyof T];
      }
    }
    return sanitized;
  }
}
