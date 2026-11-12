import { DisclosurePermission } from "@/infrastructure/store/persistent-store";

export type { DisclosurePermission };

export interface PermissionCheckResult {
  isPermitted: boolean;
  permittedFields: string[];
  deniedFields: string[];
  reason: string;
}

export interface DisclosureRequest {
  recipient: string;
  purpose: string;
  requestedFields: string[];
  userId?: string;
  expiresInHours?: number;
}
