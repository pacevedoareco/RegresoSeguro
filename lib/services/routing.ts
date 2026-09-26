/**
 * Routing and Distance calculation helper.
 * Supports OpenRouteService API when ORS_API_KEY is configured.
 * Fallbacks to geodesic/Haversine formula + 1.25 urban routing factor if ORS is unavailable or unconfigured.
 */

interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculates Haversine distance between two coordinates in kilometers.
 */
export function haversineDistanceKm(p1: LatLng, p2: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes driving distance between two points in km.
 * Uses OpenRouteService directions API if ORS_API_KEY is present,
 * otherwise estimates driving distance with Haversine * 1.25 urban winding factor.
 */
export async function calculateDrivingDistanceKm(
  from: LatLng,
  to: LatLng
): Promise<number> {
  const apiKey = process.env.ORS_API_KEY;

  if (apiKey) {
    try {
      const url = "https://api.openrouteservice.org/v2/directions/driving-car";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const distanceMeters =
          data?.routes?.[0]?.summary?.distance ??
          data?.features?.[0]?.properties?.summary?.distance;
        if (typeof distanceMeters === "number") {
          return Math.round((distanceMeters / 1000) * 1000) / 1000;
        }
      }
    } catch (err) {
      console.warn("[routing] ORS request failed, falling back to estimated distance:", err);
    }
  }

  // Fallback: Haversine distance with 1.25 road multiplier
  const directKm = haversineDistanceKm(from, to);
  return Math.round(directKm * 1.25 * 1000) / 1000;
}

/**
 * Calculates all 3 legs of the Regreso Seguro service.
 * Leg 1: Driver -> Pickup
 * Leg 2: Pickup -> Destination
 * Leg 3: Destination -> Driver (or Driver base/origin)
 */
export async function calculateThreeLegDistances(
  driverPos: LatLng,
  pickup: LatLng,
  destination: LatLng
): Promise<{ pickupKm: number; rideKm: number; returnKm: number }> {
  const [pickupKm, rideKm, returnKm] = await Promise.all([
    calculateDrivingDistanceKm(driverPos, pickup),
    calculateDrivingDistanceKm(pickup, destination),
    calculateDrivingDistanceKm(destination, driverPos),
  ]);

  return {
    pickupKm,
    rideKm,
    returnKm,
  };
}
