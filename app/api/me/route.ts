import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";

// GET /api/me — returns the current user's profile (role, permissions)
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(profile);
}
