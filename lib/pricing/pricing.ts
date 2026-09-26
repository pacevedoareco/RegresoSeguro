/**
 * Price calculation logic (pure functions)
 * BR-012: 3-component distance-based pricing
 * price = (driver→pickup km + pickup→destination km + destination→driver km) × price_per_km
 */

export interface PriceComponents {
  pickupKm: number;   // Leg 1: driver → pickup
  rideKm: number;     // Leg 2: pickup → destination
  returnKm: number;   // Leg 3: destination → driver
}

export interface PriceBreakdown {
  pickupKm: number;
  rideKm: number;
  returnKm: number;
  totalKm: number;
  pricePerKm: number;
  totalPrice: number;
}

/**
 * Calculates the 3-component service price.
 * BR-012: total = (leg1 + leg2 + leg3) × price_per_km
 * All distances in km, price in ARS.
 */
export function calculatePrice(
  components: PriceComponents,
  pricePerKm: number
): PriceBreakdown {
  const { pickupKm, rideKm, returnKm } = components;
  const totalKm = pickupKm + rideKm + returnKm;
  const totalPrice = Math.round(totalKm * pricePerKm * 100) / 100;

  return {
    pickupKm,
    rideKm,
    returnKm,
    totalKm: Math.round(totalKm * 1000) / 1000,
    pricePerKm,
    totalPrice,
  };
}

/**
 * Formats a price in ARS using Argentine locale format.
 * OQ-005: $1.500,00 format using es-AR locale.
 */
export function formatPrice(priceARS: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceARS);
}
