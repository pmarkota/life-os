import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types";

/** Get the authenticated user's profile (role, permissions).
 * Returns null if not authenticated or profile not found. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

/** Require the caller to be an admin. Throws-as-response if not. */
export async function requireAdmin(): Promise<
  { ok: true; profile: Profile } | { ok: false; status: number; error: string }
> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, status: 401, error: "Unauthorized" };
  if (profile.role !== "admin")
    return { ok: false, status: 403, error: "Admin access required" };
  return { ok: true, profile };
}

/** Require the caller to be authenticated; returns the profile. */
export async function requireProfile(): Promise<
  { ok: true; profile: Profile } | { ok: false; status: number; error: string }
> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true, profile };
}

export function isRole(profile: Profile | null, role: UserRole): boolean {
  return profile?.role === role;
}
