import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidRatingStars, calculateNewAverageRating } from "@/lib/ratings/ratings";

const createRatingSchema = z.object({
  service_id: z.string().uuid("ID de servicio inválido"),
  stars: z
    .number()
    .int("La calificación debe ser un número entero")
    .min(1, "Mínimo 1 estrella")
    .max(5, "Máximo 5 estrellas"),
  comment: z.string().max(500, "Comentario demasiado largo").optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Cuerpo de la solicitud inválido." },
      { status: 400 }
    );
  }

  const parsed = createRatingSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Datos inválidos.";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

  const { service_id, stars, comment } = parsed.data;

  if (!isValidRatingStars(stars)) {
    return NextResponse.json(
      { code: "INVALID_STARS", message: "La calificación debe ser de 1 a 5 estrellas." },
      { status: 400 }
    );
  }

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

  // 1. Fetch service record
  const { data: service, error: serviceError } = await (serviceClient as any)
    .from("services")
    .select("*")
    .eq("id", service_id)
    .single();

  if (serviceError || !service) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Servicio no encontrado." },
      { status: 404 }
    );
  }

  // 2. Validate service is completed (BR-024, PD-025 / OQ-006: ratings allowed ONLY for completed services)
  if (service.status !== "completed") {
    return NextResponse.json(
      {
        code: "SERVICE_NOT_COMPLETED",
        message: "Solo se pueden calificar servicios completados.",
      },
      { status: 400 }
    );
  }

  // 3. Determine if current user is rider or driver, and set ratee_id
  const isRider = service.rider_id === user.id;
  const isDriver = service.driver_id === user.id;

  if (!isRider && !isDriver) {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "No participaste de este viaje.",
      },
      { status: 403 }
    );
  }

  const ratee_id = isRider ? service.driver_id : service.rider_id;

  if (!ratee_id) {
    return NextResponse.json(
      {
        code: "INVALID_RATEE",
        message: "No se pudo determinar el usuario a calificar.",
      },
      { status: 400 }
    );
  }

  // 4. Validate user hasn't already submitted a rating for this service (BR-026)
  const { data: existingRating } = await (serviceClient as any)
    .from("ratings")
    .select("id")
    .eq("service_id", service_id)
    .eq("rater_id", user.id)
    .maybeSingle();

  if (existingRating) {
    return NextResponse.json(
      {
        code: "ALREADY_RATED",
        message: "Ya enviaste tu calificación para este viaje.",
      },
      { status: 409 }
    );
  }

  // 5. Insert rating
  const { data: newRating, error: ratingInsertError } = await (serviceClient as any)
    .from("ratings")
    .insert({
      service_id,
      rater_id: user.id,
      ratee_id,
      stars,
      comment: comment?.trim() || null,
    })
    .select()
    .single();

  if (ratingInsertError) {
    console.error("[ratings:post] Insert error:", ratingInsertError.message);
    return NextResponse.json(
      { code: "INSERT_ERROR", message: "Error al registrar la calificación." },
      { status: 500 }
    );
  }

  // 6. Recalculate and update profile average_rating & rating_count for ratee (BR-027)
  const { data: rateeProfile } = await (serviceClient as any)
    .from("profiles")
    .select("average_rating, rating_count")
    .eq("id", ratee_id)
    .single();

  if (rateeProfile) {
    const { average, count } = calculateNewAverageRating({
      currentAverage: rateeProfile.average_rating ? Number(rateeProfile.average_rating) : null,
      currentCount: Number(rateeProfile.rating_count ?? 0),
      newStars: stars,
    });

    await (serviceClient as any)
      .from("profiles")
      .update({
        average_rating: average,
        rating_count: count,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ratee_id);
  }

  return NextResponse.json(
    {
      rating: newRating,
      message: "¡Gracias por calificar el viaje!",
    },
    { status: 201 }
  );
}
