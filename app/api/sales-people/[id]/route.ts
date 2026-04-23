import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/profile";
import type { ProfilePermissions } from "@/types";

// PATCH /api/sales-people/[id] — update full_name, permissions, or password (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    full_name?: string;
    permissions?: ProfilePermissions;
    password?: string;
  };

  const admin = createAdminClient();

  // Optional password reset
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "password must be at least 8 characters" },
        { status: 400 },
      );
    }
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, {
      password: body.password,
    });
    if (pwErr) {
      return NextResponse.json({ error: pwErr.message }, { status: 400 });
    }
  }

  // Build profile patch
  const patch: Record<string, unknown> = {};
  if (body.full_name !== undefined) patch.full_name = body.full_name.trim();
  if (body.permissions !== undefined) patch.permissions = body.permissions;

  if (Object.keys(patch).length === 0) {
    // Only password changed (or nothing) — return current profile
    const { data } = await admin.from("profiles").select("*").eq("id", id).single();
    return NextResponse.json(data);
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/sales-people/[id] — remove a sales person (admin only)
// Prevents deleting an admin account.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  // Guard: don't allow deleting admins
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (target.role === "admin") {
    return NextResponse.json(
      { error: "Cannot delete admin profile" },
      { status: 403 },
    );
  }

  // Unassign any leads first (RLS would otherwise orphan them with a dangling FK → set null via FK anyway)
  await admin
    .from("leads")
    .update({ assigned_to: null })
    .eq("assigned_to", id);

  // Delete auth user — profile cascades via FK
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
