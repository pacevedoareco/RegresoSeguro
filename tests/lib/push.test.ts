import { describe, it, expect } from "vitest";
import { getStatusNotificationContent } from "@/lib/push/push";

describe("getStatusNotificationContent", () => {
  it("generates correct payload for 'assigned' status with driver name", () => {
    const payload = getStatusNotificationContent("assigned", {
      driverName: "Carlos Gómez",
      serviceId: "srv-123",
    });

    expect(payload).not.toBeNull();
    expect(payload?.title).toBe("¡Conductor asignado!");
    expect(payload?.body).toContain("Carlos Gómez ha sido asignado");
    expect(payload?.data?.url).toBe("/?service_id=srv-123");
    expect(payload?.data?.status).toBe("assigned");
  });

  it("generates correct payload for 'en_route' status", () => {
    const payload = getStatusNotificationContent("en_route", {
      driverName: "Carlos Gómez",
      serviceId: "srv-123",
    });

    expect(payload).not.toBeNull();
    expect(payload?.title).toBe("Conductor en camino");
    expect(payload?.body).toContain("Carlos Gómez va en camino");
    expect(payload?.data?.serviceId).toBe("srv-123");
  });

  it("generates correct payload for 'in_progress' status", () => {
    const payload = getStatusNotificationContent("in_progress", {
      serviceId: "srv-123",
    });

    expect(payload).not.toBeNull();
    expect(payload?.title).toBe("Viaje en curso");
    expect(payload?.body).toContain("viaje hacia tu destino ha comenzado");
  });

  it("generates correct payload for 'completed' status", () => {
    const payload = getStatusNotificationContent("completed", {
      serviceId: "srv-123",
    });

    expect(payload).not.toBeNull();
    expect(payload?.title).toBe("Viaje finalizado");
    expect(payload?.body).toContain("calificá el servicio");
  });

  it("generates correct payload for 'cancelled' status with custom reason", () => {
    const payload = getStatusNotificationContent("cancelled", {
      cancellationReason: "Cancelado por el operador",
      serviceId: "srv-123",
    });

    expect(payload).not.toBeNull();
    expect(payload?.title).toBe("Servicio cancelado");
    expect(payload?.body).toContain("Cancelado por el operador");
  });

  it("returns null for 'requested' status (since initial request is user-initiated)", () => {
    const payload = getStatusNotificationContent("requested", {
      serviceId: "srv-123",
    });

    expect(payload).toBeNull();
  });
});
