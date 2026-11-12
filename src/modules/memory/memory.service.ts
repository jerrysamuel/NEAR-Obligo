import { store, ShoppingPreference, Profile } from "@/infrastructure/store/persistent-store";

export class MemoryService {
  public static getPreferences(userId?: string): ShoppingPreference {
    return store.getPreferences(userId);
  }

  public static updatePreferences(
    updates: Partial<ShoppingPreference>,
    userId?: string
  ): ShoppingPreference {
    return store.updatePreferences(updates, userId);
  }

  public static getProfile(userId?: string): Profile {
    return store.getProfile(userId);
  }

  public static updateProfile(updates: Partial<Profile>, userId?: string): Profile {
    return store.updateProfile(updates, userId);
  }
}
