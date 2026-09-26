import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";
import { ServiceStatus } from "@/types/database";

// Lazy initialization / configuration of web-push
function ensureVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.RESEND_FROM_EMAIL && process.env.RESEND_FROM_EMAIL.includes("@")
      ? `mailto:${process.env.RESEND_FROM_EMAIL}`
      : "mailto:support@regresoseguro.com";

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  }
  return false;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    serviceId?: string;
    status?: string;
    [key: string]: any;
  };
}

/**
 * Returns meaningful Spanish notification copy for each service status transition (FR-019 / AC-019-2)
 */
export function getStatusNotificationContent(
  status: ServiceStatus,
  options?: {
    driverName?: string;
    cancellationReason?: string;
    serviceId?: string;
  }
): PushNotificationPayload | null {
  const serviceUrl = options?.serviceId ? `/?service_id=${options.serviceId}` : "/";

  switch (status) {
    case "assigned":
      return {
        title: "¡Conductor asignado!",
        body: options?.driverName
          ? `${options.driverName} ha sido asignado a tu viaje y pronto saldrá en camino.`
          : "Un conductor ha sido asignado a tu viaje y pronto saldrá en camino.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: {
          url: serviceUrl,
          serviceId: options?.serviceId,
          status,
        },
      };

    case "en_route":
      return {
        title: "Conductor en camino",
        body: options?.driverName
          ? `${options.driverName} va en camino a tu ubicación.`
          : "Tu conductor va en camino a tu ubicación de recogida.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: {
          url: serviceUrl,
          serviceId: options?.serviceId,
          status,
        },
      };

    case "in_progress":
      return {
        title: "Viaje en curso",
        body: "Tu conductor ha llegado y el viaje hacia tu destino ha comenzado.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: {
          url: serviceUrl,
          serviceId: options?.serviceId,
          status,
        },
      };

    case "completed":
      return {
        title: "Viaje finalizado",
        body: "¡Llegaste a tu destino seguro con tu auto! Por favor, calificá el servicio.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: {
          url: serviceUrl,
          serviceId: options?.serviceId,
          status,
        },
      };

    case "cancelled":
      return {
        title: "Servicio cancelado",
        body: options?.cancellationReason
          ? `Tu viaje ha sido cancelado: ${options.cancellationReason}`
          : "Tu solicitud de viaje ha sido cancelada.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: {
          url: serviceUrl,
          serviceId: options?.serviceId,
          status,
        },
      };

    default:
      return null;
  }
}

/**
 * Sends a push notification to all active push subscriptions of a specific user.
 * Automatically cleans up expired/invalid endpoints (HTTP 410 or 404).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; removed: number }> {
  const isConfigured = ensureVapidConfig();
  if (!isConfigured) {
    console.warn("[push] VAPID keys not configured, skipping push notification.");
    return { sent: 0, failed: 0, removed: 0 };
  }

  const serviceClient = await createServiceClient();

  // Fetch all subscriptions for this user
  const { data: subscriptions, error } = await (serviceClient as any)
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, removed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;

  const serializedPayload = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, serializedPayload);
        sent++;
      } catch (err: any) {
        failed++;
        console.error(`[push] Error sending to endpoint ${sub.endpoint}:`, err.statusCode || err.message);

        // HTTP 404 Not Found or HTTP 410 Gone means the subscription is no longer valid
        if (err.statusCode === 404 || err.statusCode === 410) {
          try {
            await (serviceClient as any)
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
            removed++;
          } catch (delErr: any) {
            console.error(`[push] Failed to remove expired subscription ${sub.id}:`, delErr.message);
          }
        }
      }
    })
  );

  return { sent, failed, removed };
}
