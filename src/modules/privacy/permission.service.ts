import { store, DisclosurePermission } from "@/infrastructure/store/persistent-store";
import { DisclosureRequest, PermissionCheckResult } from "./privacy.types";
import { PolicyEngine } from "./policy-engine";

export class PermissionService {
  public static getAll(userId?: string): DisclosurePermission[] {
    return store.getDisclosurePermissions(userId);
  }

  public static grant(request: DisclosureRequest): DisclosurePermission {
    const hours = request.expiresInHours || 24 * 7; // 7 days default
    const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();

    return store.addDisclosurePermission({
      userId: request.userId || store.getDefaultUserId(),
      recipient: request.recipient,
      purpose: request.purpose,
      permittedFields: request.requestedFields,
      expiresAt,
      approvedAt: new Date().toISOString(),
    });
  }

  public static revoke(id: string, userId?: string): boolean {
    return store.revokeDisclosurePermission(id, userId);
  }

  public static check(
    recipient: string,
    requestedFields: string[],
    userId?: string
  ): PermissionCheckResult {
    return PolicyEngine.evaluateDisclosure(recipient, requestedFields, userId);
  }
}
