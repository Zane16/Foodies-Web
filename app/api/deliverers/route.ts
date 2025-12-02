// app/api/deliverers/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

// GET all deliverers filtered by admin's organization
export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the admin's profile to retrieve their organization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("organization, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify the user is an admin or superadmin
    if (profile.role !== "admin" && profile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Fetch ALL deliverers for this organization, then filter in JavaScript
    // Note: We do this because Supabase appears to cache queries with different filters
    console.log(`[API] Fetching deliverers for organization: ${profile.organization}`)

    const { data: allDelivererProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, status, created_at")
      .eq("role", "deliverer")
      .eq("organization", profile.organization)
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching deliverer profiles:", profilesError)
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Filter to only approved deliverers in JavaScript to avoid cache issues
    const delivererProfiles = (allDelivererProfiles || []).filter(d => d.status === 'approved');

    console.log(`[API] Total deliverers: ${allDelivererProfiles?.length || 0}, Approved: ${delivererProfiles.length}`)
    console.log(`[API] Approved deliverer profiles:`, delivererProfiles)

    // If no deliverers in this organization, return empty array
    if (!delivererProfiles || delivererProfiles.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch applications to get vehicle_type and availability
    const delivererIds = delivererProfiles.map(p => p.id);

    const { data: applications, error: appsError } = await supabaseAdmin
      .from("applications")
      .select("email, vehicle_type, availability")
      .eq("role", "deliverer")
      .eq("status", "approved")
      .in("email", delivererProfiles.map(p => p.email));

    if (appsError) {
      console.error("Error fetching applications:", appsError);
    }

    // Create a map of email to application data
    const appMap = new Map(
      (applications || []).map(app => [app.email, app])
    );

    // Fetch delivery statistics for each deliverer
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("deliverer_id, status")
      .in("deliverer_id", delivererIds);

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
    }

    // Calculate statistics for each deliverer
    const deliveryStats = new Map();
    (orders || []).forEach(order => {
      if (!deliveryStats.has(order.deliverer_id)) {
        deliveryStats.set(order.deliverer_id, {
          total_deliveries: 0,
          active_deliveries: 0
        });
      }
      const stats = deliveryStats.get(order.deliverer_id);

      // Count completed deliveries
      if (order.status === 'completed' || order.status === 'delivered') {
        stats.total_deliveries++;
      }

      // Count active deliveries (accepted, on_the_way)
      if (order.status === 'accepted' || order.status === 'on_the_way') {
        stats.active_deliveries++;
      }
    });

    // Combine all data
    const deliverersData = delivererProfiles.map(deliverer => {
      const stats = deliveryStats.get(deliverer.id) || { total_deliveries: 0, active_deliveries: 0 };
      const appData = appMap.get(deliverer.email);

      return {
        id: deliverer.id,
        full_name: deliverer.full_name,
        email: deliverer.email,
        vehicle_type: appData?.vehicle_type || 'Not specified',
        availability: appData?.availability || 'Not specified',
        is_active: deliverer.status === 'approved',
        total_deliveries: stats.total_deliveries,
        active_deliveries: stats.active_deliveries
      };
    });

    return NextResponse.json(deliverersData);
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
