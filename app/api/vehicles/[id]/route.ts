import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { code: "INVALID_ID", message: "ID de vehículo inválido." },
      { status: 400 }
    );
  }

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

  // Soft-delete the vehicle (set is_active = false)
  const { data, error } = await (supabase as any)
    .from("vehicles")
    .update({ is_active: false })
    .eq("id", id)
    .eq("rider_id", user.id)
    .select()
    .single();

  if (error || !data) {
    console.error("[vehicles:delete] Error deleting vehicle:", error?.message);
    return NextResponse.json(
      {
        code: "DELETE_ERROR",
        message: "No se pudo eliminar el vehículo o no existe.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { message: "Vehículo eliminado correctamente.", vehicle: data },
    { status: 200 }
  );
}
