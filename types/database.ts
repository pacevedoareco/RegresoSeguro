// Re-exported from the generated Supabase types.
// This file provides hand-authored types that complement the auto-generated ones.

export type UserRole = "rider" | "driver" | "operator" | "super_admin";
export type DriverAvailability = "online" | "offline";
export type ServiceStatus =
  | "requested"
  | "assigned"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

// Convenience row types (mirrors DB schema from DATA_MODEL.md)
export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  registered_as_driver: boolean;
  strikes: number;
  is_suspended: boolean;
  average_rating: number | null;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface DriverProfile {
  id: string;
  dni: string;
  license_number: string;
  license_category: string;
  availability: DriverAvailability;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  rider_id: string;
  license_plate: string;
  make_model: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  rider_id: string;
  driver_id: string | null;
  vehicle_id: string;
  status: ServiceStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  estimated_price: number | null;
  estimated_pickup_km: number | null;
  estimated_ride_km: number | null;
  estimated_return_km: number | null;
  final_price: number | null;
  final_pickup_km: number | null;
  final_ride_km: number | null;
  final_return_km: number | null;
  price_per_km_at_time: number | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  requested_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface ServiceStatusLog {
  id: string;
  service_id: string;
  from_status: ServiceStatus | null;
  to_status: ServiceStatus;
  changed_by: string;
  changed_at: string;
  notes: string | null;
}

export interface Rating {
  id: string;
  service_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

export interface PricingConfig {
  id: number;
  price_per_km: number;
  updated_by: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}
