import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export interface UserProfile {
  user_id: string;
  role: "payer" | "contractor";
  display_name?: string | null;
  company?: string | null;
}

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: UserProfile | null;
}

/**
 * Server-side helper to read the authenticated session and role profile.
 */
export async function getAuthContext(): Promise<AuthContext> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, profile: null };
    }

    // Read profile via service role client to ensure RLS doesn't block reading role
    const admin = getServiceSupabase();
    if (!admin) {
      return {
        user: { id: user.id, email: user.email },
        profile: null,
      };
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("user_id, role, display_name, company")
      .eq("user_id", user.id)
      .single();

    return {
      user: { id: user.id, email: user.email },
      profile: profile as UserProfile | null,
    };
  } catch (err) {
    console.warn("[getAuthContext] Error reading auth session:", err);
    return { user: null, profile: null };
  }
}
