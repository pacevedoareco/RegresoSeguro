import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "No autenticado." },
      { status: 401 }
    );
  }

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (role !== "operator" && role !== "super_admin") {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "Acceso denegado. Se requiere rol de operador o super-admin.",
      },
      { status: 403 }
    );
  }

  // 1. Fetch pending requests (status = requested), ordered by requested_at ASC
  const { data: pendingRequests, error: reqError } = await (serviceClient as any)
    .from("services")
    .select(
      "*, vehicle:vehicles(*), rider:profiles!services_rider_id_fkey(*), driver:profiles!services_driver_id_fkey(*)"
    )
    .eq("status", "requested")
    .order("requested_at", { ascending: true });

  if (reqError) {
    console.error("[admin:requests] Error fetching requests:", reqError.message);
    return NextResponse.json(
      { code: "FETCH_ERROR", message: "Error al cargar solicitudes." },
      { status: 500 }
    );
  }

  // 2. Fetch ongoing trips (assigned, en_route, in_progress)
  const { data: ongoingTrips, error: ongoingError } = await (serviceClient as any)
    .from("services")
    .select(
      "*, vehicle:vehicles(*), rider:profiles!services_rider_id_fkey(*), driver:profiles!services_driver_id_fkey(*)"
    )
    .in("status", ["assigned", "en_route", "in_progress"])
    .order("requested_at", { ascending: false });

  if (ongoingError) {
    console.error("[admin:requests] Error fetching ongoing trips:", ongoingError.message);
    return NextResponse.json(
      { code: "FETCH_ERROR", message: "Error al cargar viajes en curso." },
      { status: 500 }
    );
  }

  // 3. Fetch completed trips (status = completed)
  const { data: completedTrips, error: completedError } = await (serviceClient as any)
    .from("services")
    .select(
      "*, vehicle:vehicles(*), rider:profiles!services_rider_id_fkey(*), driver:profiles!services_driver_id_fkey(*), ratings(*)"
    )
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (completedError) {
    console.error("[admin:requests] Error fetching completed trips:", completedError.message);
    return NextResponse.json(
      { code: "FETCH_ERROR", message: "Error al cargar viajes finalizados." },
      { status: 500 }
    );
  }

  // 4. Fetch cancelled trips (status = cancelled)
  const { data: cancelledTrips, error: cancelledError } = await (serviceClient as any)
    .from("services")
    .select(
      "*, vehicle:vehicles(*), rider:profiles!services_rider_id_fkey(*), driver:profiles!services_driver_id_fkey(*), ratings(*)"
    )
    .eq("status", "cancelled")
    .order("cancelled_at", { ascending: false });

  if (cancelledError) {
    console.error("[admin:requests] Error fetching cancelled trips:", cancelledError.message);
    return NextResponse.json(
      { code: "FETCH_ERROR", message: "Error al cargar viajes cancelados." },
      { status: 500 }
    );
  }

  // 5. Fetch available online drivers (online, active)
  const { data: drivers, error: driverError } = await (serviceClient as any)
    .from("driver_profiles")
    .select(
      "*, profile:profiles!driver_profiles_id_fkey(full_name, phone, average_rating, rating_count)"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (driverError) {
    console.error("[admin:drivers] Error fetching drivers:", driverError.message);
  }

  // 5. Find which drivers have active assignments
  const { data: activeAssignments } = await (serviceClient as any)
    .from("services")
    .select("driver_id")
    .in("status", ["assigned", "en_route", "in_progress"]);

  const busyDriverIds = new Set(
    (activeAssignments || []).map((a: any) => a.driver_id).filter(Boolean)
  );

  const enrichedDrivers = (drivers || []).map((d: any) => ({
    ...d,
    is_busy: busyDriverIds.has(d.id),
  }));

  return NextResponse.json(
    {
      requests: pendingRequests || [],
      ongoingTrips: ongoingTrips || [],
      completedTrips: completedTrips || [],
      cancelledTrips: cancelledTrips || [],
      drivers: enrichedDrivers,
    },
    { status: 200 }
  );
}
