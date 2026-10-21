import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { summarizeEarnings } from "@/lib/earnings/earnings";

// GET /api/driver/earnings - Driver wallet: balances + settlement detail per service (HU-35)
export async function GET() {
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

  if (profile?.role !== "driver") {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Solo los conductores tienen billetera." },
      { status: 403 }
    );
  }

  const serviceClient = await createServiceClient();
  const { data: services, error } = await (serviceClient as any)
    .from("services")
    .select(
      "id, completed_at, pickup_address, destination_address, final_price, final_pickup_km, final_ride_km, final_return_km, commission_rate_at_time, commission_amount, driver_net_amount, payment_method, payment_status"
    )
    .eq("driver_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[driver:earnings] Query error:", error.message);
    return NextResponse.json(
      { code: "DB_ERROR", message: "No se pudieron obtener las ganancias." },
      { status: 500 }
    );
  }

  const settlements = services ?? [];

  return NextResponse.json(
    { summary: summarizeEarnings(settlements), settlements },
    { status: 200 }
  );
}
