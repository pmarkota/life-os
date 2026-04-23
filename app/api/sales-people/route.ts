import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireProfile } from "@/lib/auth/profile";
import {
  PERMISSION_PRESETS,
  type PermissionPreset,
  type Profile,
  type ProfilePermissions,
} from "@/types";

// GET /api/sales-people — list all profiles (admin sees all; sales sees only other sales for assignment dropdowns)
export async function GET() {
  const auth = await requireProfile();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, role, permissions, created_at, updated_at")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Non-admins only get a minimal view (no email, no permissions)
  if (auth.profile.role !== "admin") {
    return NextResponse.json(
      (data as Profile[]).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        role: p.role,
      })),
    );
  }

  return NextResponse.json(data);
}

// POST /api/sales-people — create a new sales person (admin only)
// Body: { email, password, full_name, preset }
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    full_name?: string;
    preset?: PermissionPreset;
    permissions?: ProfilePermissions;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const fullName = body.full_name?.trim();
  const preset = body.preset ?? "standard";

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: "email, password, and full_name are required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const permissions =
    body.permissions ?? PERMISSION_PRESETS[preset]?.permissions;
  if (!permissions) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create the auth user with confirmed email (skip verification — admin-managed)
  const { data: authData, error: authError } = await admin.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    },
  );

  if (authError || !authData?.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Failed to create user" },
      { status: 400 },
    );
  }

  // The handle_new_user trigger will auto-create the profile row.
  // Upsert to ensure the fields we want (role, permissions, full_name) are set.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .upsert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: "sales",
      permissions,
    })
    .select()
    .single();

  if (profileError) {
    // Roll back auth user if profile upsert failed
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json(profile, { status: 201 });
}
