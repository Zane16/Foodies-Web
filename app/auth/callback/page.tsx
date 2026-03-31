// "use client"

// import { useEffect, useState } from 'react'
// import { useRouter } from 'next/navigation'
// import { createSupabaseClient } from '@/lib/supabase'

// export default function AuthCallbackPage() {
//   const router = useRouter()
//   const [error, setError] = useState<string | null>(null)

//   useEffect(() => {
//     const handleCallback = async () => {
//       const supabase = createSupabaseClient()

//       console.log('=== AUTH CALLBACK DEBUG ===')
//       console.log('Hash:', window.location.hash)
//       console.log('Search:', window.location.search)
//       console.log('Full URL:', window.location.href)

//       // Check for error in URL params (from Supabase)
//       const urlParams = new URLSearchParams(window.location.search)
//       const errorParam = urlParams.get('error')
//       const errorDescription = urlParams.get('error_description')

//       if (errorParam) {
//         console.error('Auth error from URL:', errorParam, errorDescription)
//         setError(errorDescription || errorParam)
//         router.push('/auth/error')
//         return
//       }

//       // Handle the hash fragment (Supabase magic link uses hash-based auth)
//       // This automatically exchanges the token for a session
//       const hashParams = new URLSearchParams(window.location.hash.substring(1))
//       const accessToken = hashParams.get('access_token')
//       const refreshToken = hashParams.get('refresh_token')
//       const type = hashParams.get('type')

//       console.log('Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })

//       if (accessToken && type === 'invite') {
//         // For invite flow, set the session from the tokens
//         const { data, error: sessionError } = await supabase.auth.setSession({
//           access_token: accessToken,
//           refresh_token: refreshToken || ''
//         })

//         if (sessionError) {
//           console.error('Session error:', sessionError)
//           setError(sessionError.message)
//           router.push('/auth/error')
//           return
//         }

//         console.log('Session set successfully:', !!data.session)
//         // User is authenticated, redirect to password setup
//         router.push('/auth/set-password')
//         return
//       }

//       // Fallback: check if we already have a session
//       const { data: { session }, error: sessionError } = await supabase.auth.getSession()

//       console.log('Existing session:', !!session)
//       console.log('==========================')

//       if (sessionError) {
//         console.error('Session check error:', sessionError)
//         setError(sessionError.message)
//         router.push('/auth/error')
//         return
//       }

//       if (session) {
//         // User is authenticated, redirect to password setup
//         router.push('/auth/set-password')
//       } else {
//         // No session found
//         console.error('No session or token found')
//         setError('No authentication token found')
//         router.push('/auth/error')
//       }
//     }

//     handleCallback()
//   }, [router])

//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <div className="text-center">
//         <h2 className="text-xl font-semibold mb-2">Processing invitation...</h2>
//         <p className="text-gray-600">Please wait while we verify your invite link.</p>
//         {error && (
//           <p className="text-red-600 text-sm mt-4">Debug: {error}</p>
//         )}
//       </div>
//     </div>
//   )
// }



// app/api/approve-application/route.ts
// import { NextResponse } from "next/server";
// import { getSupabaseAdmin } from "@/lib/supabase";

// export async function POST(req: Request) {
//   try {
//     const supabaseAdmin = getSupabaseAdmin();
//     const body = await req.json();
//     const { applicationId, adminId } = body;

//     if (!applicationId) {
//       return NextResponse.json({ error: "applicationId required" }, { status: 400 });
//     }

//     // Fetch application
//     const { data: application, error: appErr } = await supabaseAdmin
//       .from("applications")
//       .select("*")
//       .eq("id", applicationId)
//       .single();

//     if (appErr || !application) {
//       return NextResponse.json({ error: "Application not found" }, { status: 404 });
//     }

//     console.log("APPLICATION:", {
//       id: application.id,
//       email: application.email,
//       role: application.role,
//       organization: application.organization,
//     });

//     // Decide approval flow
//     if (application.role === "vendor" || application.role === "deliverer") {
//       return await handleVendorDelivererApproval(supabaseAdmin, application, applicationId, adminId);
//     } else {
//       return await handleAdminApproval(supabaseAdmin, application, applicationId, adminId);
//     }

//   } catch (err) {
//     console.error("APPROVAL ERROR:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }

// // ─────────────────────────────────────────────
// // VENDOR / DELIVERER APPROVAL
// // ─────────────────────────────────────────────
// // ────────────── Vendor / Deliverer Approval ──────────────
// async function handleVendorDelivererApproval(
//   supabaseAdmin: any,
//   application: any,
//   applicationId: string,
//   adminId?: string
// ) {
//   // Step 1: Get admin's organization
//   let organizationId: string | null = null;
//   let organization = "global";

//   if (adminId) {
//     const { data: adminProfile } = await supabaseAdmin
//       .from("profiles")
//       .select("organization, organization_id")
//       .eq("id", adminId)
//       .single();

//     if (adminProfile) {
//       organizationId = adminProfile.organization_id;
//       organization = adminProfile.organization || "global";
//     }
//   }

//   console.log("Organization info:", { organizationId, organization });

//   // Step 2: Invite user via Supabase Auth
//   const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
//   const redirectUrl = `${appUrl}/auth/callback`; // Must match Supabase dashboard

//   const { data: authData, error: authError } =
//     await supabaseAdmin.auth.admin.inviteUserByEmail(application.email, {
//       data: {
//         full_name: application.full_name,
//         role: application.role,
//         organization_id: organizationId,
//         organization: organization,
//         business_name: application.business_name,
//         business_address: application.business_address,
//         menu_summary: application.menu_summary,
//         vehicle_type: application.vehicle_type,
//         availability: application.availability,
//       },
//       redirectTo: redirectUrl,
//     });

//   if (authError || !authData?.user) {
//     console.error("Invite failed:", authError);
//     return NextResponse.json(
//       { error: "Failed to invite user: " + authError?.message },
//       { status: 500 }
//     );
//   }

//   console.log("User invited successfully:", authData.user.id);

//   // Step 3: Update application status in database
//   await supabaseAdmin
//     .from("applications")
//     .update({
//       status: "approved",
//       user_id: authData.user.id,
//       reviewed_at: new Date().toISOString(),
//       reviewed_by: adminId || null,
//     })
//     .eq("id", applicationId);

//   // Step 4: Return response (no separate magic link needed)
//   return NextResponse.json({
//     success: true,
//     message: `${application.role} application approved. Invitation email sent to ${application.email}.`,
//     user: {
//       id: authData.user.id,
//       email: application.email,
//       role: application.role,
//     },
//     emailNote: "Note: If the email doesn't arrive, check the inbox or spam folder.",
//   });
// }

// // ─────────────────────────────────────────────
// // ADMIN APPROVAL
// // ─────────────────────────────────────────────
// async function handleAdminApproval(
//   supabaseAdmin: any,
//   application: any,
//   applicationId: string,
//   adminId?: string
// ) {
//   const orgName = application.organization;
//   const orgDomain = application.notes;

//   if (!orgName || !orgDomain) {
//     return NextResponse.json({ error: "Admin application missing organization or domain" }, { status: 400 });
//   }

//   console.log("ADMIN ORG CHECK:", { orgName, orgDomain });

//   // Check existing organization by domain
//   const { data: existingOrg, error: findError } = await supabaseAdmin
//     .from("organizations")
//     .select("id")
//     .contains("email_domains", [orgDomain])
//     .maybeSingle();

//   if (findError) {
//     console.error("Org lookup failed:", findError);
//     return NextResponse.json({ error: "Organization lookup failed" }, { status: 500 });
//   }

//   let organizationId: string;

//   if (existingOrg) {
//     organizationId = existingOrg.id;
//   } else {
//     // Create organization
//     const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
//     const { data: newOrg, error: orgError } = await supabaseAdmin
//       .from("organizations")
//       .insert({ name: orgName, slug, email_domains: [orgDomain], status: "active" })
//       .select("id")
//       .single();

//     if (orgError || !newOrg) {
//       console.error("Failed to create organization:", orgError);
//       return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
//     }

//     organizationId = newOrg.id;
//   }

//   // Invite admin user via Supabase Auth
//   const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
//   const redirectUrl = `${appUrl}/auth/callback`;

//   const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(application.email, {
//     data: { full_name: application.full_name, role: application.role, organization_id: organizationId },
//     redirectTo: redirectUrl,
//   });

//   if (authError || !authData?.user) {
//     console.error("Auth invite failed:", authError);
//     return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
//   }

//   // Update application status
//   await supabaseAdmin
//     .from("applications")
//     .update({
//       status: "approved",
//       user_id: authData.user.id,
//       reviewed_at: new Date().toISOString(),
//       reviewed_by: adminId || null,
//     })
//     .eq("id", applicationId);

//   return NextResponse.json({
//     success: true,
//     message: `Admin application approved. Invitation sent via email.`,
//     user: { id: authData.user.id, email: application.email, role: application.role },
//     emailNote: "Note: If the email doesn't arrive, the user can follow the invite link sent via email.",
//   });
// }