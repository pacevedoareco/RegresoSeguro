import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeAnalyticsMetrics } from "@/lib/analytics/analytics";

// GET /api/admin/analytics - Super-Admin only operational metrics (FR-025)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
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

  if (profile?.role !== "super_admin") {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "Solo el Super-Admin puede acceder a las analíticas.",
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const serviceClient = await createServiceClient();

  // Build query with optional date range
  let servicesQuery = (serviceClient as any)
    .from("services")
    .select("id, status, requested_at, assigned_at");

  let ratingsQuery = (serviceClient as any)
    .from("ratings")
    .select("stars, created_at");

  if (fromDate) {
    servicesQuery = servicesQuery.gte("requested_at", fromDate);
    ratingsQuery = ratingsQuery.gte("created_at", fromDate);
  }

  if (toDate) {
    // Add end of day constraint
    servicesQuery = servicesQuery.lte("requested_at", toDate);
    ratingsQuery = ratingsQuery.lte("created_at", toDate);
  }

  const [{ data: services, error: servicesError }, { data: ratings, error: ratingsError }] =
    await Promise.all([servicesQuery, ratingsQuery]);

  if (servicesError) {
    console.error("[admin:analytics:get] Error querying services:", servicesError.message);
    return NextResponse.json(
      { code: "DB_ERROR", message: "Error al consultar métricas de servicios." },
      { status: 500 }
    );
  }

  if (ratingsError) {
    console.error("[admin:analytics:get] Error querying ratings:", ratingsError.message);
  }

  const metrics = computeAnalyticsMetrics(services || [], ratings || []);

  return NextResponse.json({ metrics }, { status: 200 });
}
