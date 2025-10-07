// app/api/test-env/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set ✓" : "Missing ✗",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set ✓" : "Missing ✗",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set ✓" : "Missing ✗",
  });
}
