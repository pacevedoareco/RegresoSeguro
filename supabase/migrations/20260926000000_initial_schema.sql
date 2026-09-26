-- ============================================================
-- Migration: 0001_initial_schema
-- Project:   Regreso Seguro
-- Created:   2026-09-26
-- Source:    docs/DATA_MODEL.md
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'rider',
  'driver',
  'operator',
  'super_admin'
);

CREATE TYPE public.driver_availability AS ENUM (
  'online',
  'offline'
);

CREATE TYPE public.service_status AS ENUM (
  'requested',
  'assigned',
  'en_route',
  'in_progress',
  'completed',
  'cancelled'
);

-- ------------------------------------------------------------
-- 2. TABLES
-- ------------------------------------------------------------

-- profiles: extends auth.users (one row per user)
CREATE TABLE public.profiles (
  id                  uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role                public.user_role NOT NULL DEFAULT 'rider',
  full_name           text        NOT NULL,
  phone               text,
  registered_as_driver boolean    NOT NULL DEFAULT false,
  strikes             integer     NOT NULL DEFAULT 0,
  is_suspended        boolean     NOT NULL DEFAULT false,
  average_rating      numeric(3,2),
  rating_count        integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_strikes_non_negative CHECK (strikes >= 0),
  CONSTRAINT profiles_rating_range CHECK (
    average_rating IS NULL OR (average_rating >= 1 AND average_rating <= 5)
  )
);

-- driver_profiles: extended info for drivers (1:1 with profiles)
CREATE TABLE public.driver_profiles (
  id                   uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  dni                  text        NOT NULL,
  license_number       text        NOT NULL,
  license_category     text        NOT NULL,
  availability         public.driver_availability NOT NULL DEFAULT 'offline',
  current_lat          numeric(10,7),
  current_lng          numeric(10,7),
  location_updated_at  timestamptz,
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT driver_profiles_pkey PRIMARY KEY (id)
);

-- vehicles: vehicles saved to a rider's profile
CREATE TABLE public.vehicles (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  rider_id      uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  license_plate text        NOT NULL,
  make_model    text        NOT NULL,
  color         text        NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vehicles_pkey PRIMARY KEY (id),
  CONSTRAINT vehicles_license_plate_non_empty CHECK (length(trim(license_plate)) > 0),
  CONSTRAINT vehicles_make_model_non_empty CHECK (length(trim(make_model)) > 0),
  CONSTRAINT vehicles_color_non_empty CHECK (length(trim(color)) > 0),
  -- BR-021: unique license plate per rider (among active vehicles)
  CONSTRAINT vehicles_unique_plate_per_rider UNIQUE (rider_id, license_plate)
);

-- services: one row per service request (core entity)
CREATE TABLE public.services (
  id                   uuid             NOT NULL DEFAULT gen_random_uuid(),
  rider_id             uuid             NOT NULL REFERENCES public.profiles (id),
  driver_id            uuid             REFERENCES public.profiles (id),
  vehicle_id           uuid             NOT NULL REFERENCES public.vehicles (id),
  status               public.service_status NOT NULL DEFAULT 'requested',
  pickup_address       text             NOT NULL,
  pickup_lat           numeric(10,7)    NOT NULL,
  pickup_lng           numeric(10,7)    NOT NULL,
  destination_address  text             NOT NULL,
  destination_lat      numeric(10,7)    NOT NULL,
  destination_lng      numeric(10,7)    NOT NULL,
  estimated_price      numeric(10,2),
  estimated_pickup_km  numeric(8,3),
  estimated_ride_km    numeric(8,3),
  estimated_return_km  numeric(8,3),
  final_price          numeric(10,2),
  final_pickup_km      numeric(8,3),
  final_ride_km        numeric(8,3),
  final_return_km      numeric(8,3),
  price_per_km_at_time numeric(8,2),
  cancellation_reason  text,
  cancelled_by         uuid             REFERENCES public.profiles (id),
  requested_at         timestamptz      NOT NULL DEFAULT now(),
  assigned_at          timestamptz,
  completed_at         timestamptz,
  cancelled_at         timestamptz,

  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_price_non_negative CHECK (
    estimated_price IS NULL OR estimated_price >= 0
  ),
  CONSTRAINT services_final_price_non_negative CHECK (
    final_price IS NULL OR final_price >= 0
  )
);

-- service_status_log: immutable audit log of every status change
CREATE TABLE public.service_status_log (
  id          uuid             NOT NULL DEFAULT gen_random_uuid(),
  service_id  uuid             NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  from_status public.service_status,
  to_status   public.service_status NOT NULL,
  changed_by  uuid             NOT NULL REFERENCES public.profiles (id),
  changed_at  timestamptz      NOT NULL DEFAULT now(),
  notes       text,

  CONSTRAINT service_status_log_pkey PRIMARY KEY (id)
);

-- ratings: post-service ratings (two rows per completed service)
CREATE TABLE public.ratings (
  id          uuid      NOT NULL DEFAULT gen_random_uuid(),
  service_id  uuid      NOT NULL REFERENCES public.services (id),
  rater_id    uuid      NOT NULL REFERENCES public.profiles (id),
  ratee_id    uuid      NOT NULL REFERENCES public.profiles (id),
  stars       smallint  NOT NULL,
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ratings_pkey PRIMARY KEY (id),
  -- BR-026: one rating per rater per service
  CONSTRAINT ratings_unique_rater_per_service UNIQUE (service_id, rater_id),
  -- BR-024: stars must be 1–5
  CONSTRAINT ratings_stars_range CHECK (stars >= 1 AND stars <= 5),
  CONSTRAINT ratings_different_parties CHECK (rater_id <> ratee_id)
);

-- pricing_config: singleton table (always exactly one row)
CREATE TABLE public.pricing_config (
  id           integer      NOT NULL,
  price_per_km numeric(8,2) NOT NULL,
  updated_by   uuid         NOT NULL REFERENCES public.profiles (id),
  updated_at   timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT pricing_config_pkey PRIMARY KEY (id),
  CONSTRAINT pricing_config_singleton CHECK (id = 1),
  CONSTRAINT pricing_config_price_positive CHECK (price_per_km > 0)
);

-- push_subscriptions: Web Push API subscription objects per user/device
CREATE TABLE public.push_subscriptions (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  endpoint   text        NOT NULL,
  p256dh     text        NOT NULL,
  auth       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  -- One subscription per endpoint globally (upsert-safe)
  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

-- ------------------------------------------------------------
-- 3. INDEXES (docs/DATA_MODEL.md §Key Indexes)
-- ------------------------------------------------------------

-- Fast lookup of active services per rider (BR-001 check)
CREATE INDEX idx_services_rider_active
  ON public.services (rider_id, status)
  WHERE status NOT IN ('completed', 'cancelled');

-- Fast lookup of pending services for admin panel
CREATE INDEX idx_services_status
  ON public.services (status, requested_at DESC);

-- Fast lookup of online drivers for assignment and price estimation
CREATE INDEX idx_driver_profiles_online
  ON public.driver_profiles (availability, is_active)
  WHERE availability = 'online' AND is_active = true;

-- General lookup indexes
CREATE INDEX idx_services_driver_id ON public.services (driver_id);
CREATE INDEX idx_service_status_log_service_id ON public.service_status_log (service_id);
CREATE INDEX idx_ratings_service_id ON public.ratings (service_id);
CREATE INDEX idx_ratings_ratee_id ON public.ratings (ratee_id);
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

-- ------------------------------------------------------------
-- 4. TRIGGERS
-- ------------------------------------------------------------

-- 4a. Auto-create profile when a new auth user is registered
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone, registered_as_driver)
  VALUES (
    NEW.id,
    'rider',
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'registered_as_driver')::boolean, false)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4b. Auto-suspend rider when strikes reach 3 (BR-002, BR-005)
CREATE OR REPLACE FUNCTION public.handle_strikes_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.strikes >= 3 THEN
    NEW.is_suspended := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_strikes_updated
  BEFORE UPDATE OF strikes ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_strikes_update();

-- 4c. Update profiles.average_rating and rating_count after a new rating is inserted
CREATE OR REPLACE FUNCTION public.handle_new_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    rating_count   = rating_count + 1,
    average_rating = (
      COALESCE(average_rating, 0) * rating_count + NEW.stars
    ) / (rating_count + 1),
    updated_at     = now()
  WHERE id = NEW.ratee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_rating_inserted
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_rating();

-- 4d. Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER driver_profiles_set_updated_at
  BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER push_subscriptions_set_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (docs/DATA_MODEL.md §RLS Policy Summary)
-- ------------------------------------------------------------

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper: get caller's role from profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- ---- profiles ----

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.current_user_role() IN ('operator', 'super_admin'));

-- Super-Admin only: update any profile (for role promotion)
CREATE POLICY "profiles_update_super_admin"
  ON public.profiles FOR UPDATE
  USING (public.current_user_role() = 'super_admin');

-- ---- driver_profiles ----

CREATE POLICY "driver_profiles_select_own"
  ON public.driver_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "driver_profiles_update_own"
  ON public.driver_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "driver_profiles_select_admin"
  ON public.driver_profiles FOR SELECT
  USING (public.current_user_role() IN ('operator', 'super_admin'));

CREATE POLICY "driver_profiles_manage_super_admin"
  ON public.driver_profiles FOR ALL
  USING (public.current_user_role() = 'super_admin');

-- ---- vehicles ----

CREATE POLICY "vehicles_all_own"
  ON public.vehicles FOR ALL
  USING (rider_id = auth.uid())
  WITH CHECK (rider_id = auth.uid());

-- ---- services ----

CREATE POLICY "services_select_own_rider"
  ON public.services FOR SELECT
  USING (rider_id = auth.uid());

CREATE POLICY "services_select_own_driver"
  ON public.services FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "services_select_admin"
  ON public.services FOR SELECT
  USING (public.current_user_role() IN ('operator', 'super_admin'));

-- Riders can only create services for themselves (via API route with service role key)
CREATE POLICY "services_insert_rider"
  ON public.services FOR INSERT
  WITH CHECK (rider_id = auth.uid());

-- Status updates only via service-role key (API routes) — anon/user cannot UPDATE
-- No permissive UPDATE policy for non-service-role users.

-- ---- service_status_log ----

CREATE POLICY "service_status_log_select_authenticated"
  ON public.service_status_log FOR SELECT
  USING (auth.role() = 'authenticated');

-- Inserts only via service-role key (no permissive INSERT for authenticated users)

-- ---- ratings ----

CREATE POLICY "ratings_insert_own_service"
  ON public.ratings FOR INSERT
  WITH CHECK (
    rater_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id
        AND s.status = 'completed'
        AND (s.rider_id = auth.uid() OR s.driver_id = auth.uid())
    )
  );

CREATE POLICY "ratings_select_authenticated"
  ON public.ratings FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---- pricing_config ----

CREATE POLICY "pricing_config_select_authenticated"
  ON public.pricing_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "pricing_config_update_super_admin"
  ON public.pricing_config FOR UPDATE
  USING (public.current_user_role() = 'super_admin');

-- ---- push_subscriptions ----

CREATE POLICY "push_subscriptions_all_own"
  ON public.push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- 6. SEED DATA
-- ------------------------------------------------------------

-- pricing_config must be seeded with exactly one row.
-- Initial per-km rate: 1 ARS (placeholder — Super-Admin must update before launch).
-- Updated by a system user placeholder; will be updated by actual super_admin on first login.
-- We cannot reference profiles.id yet (no user exists), so we use a deferred seed approach:
-- The API layer handles pricing_config creation on first super_admin login.
-- We seed it with a special sentinel: ON CONFLICT DO NOTHING is used from the app.

-- This seed row is intentionally omitted here because pricing_config.updated_by
-- references profiles.id (FK), and no profile exists at migration time.
-- The seed is applied programmatically in TASK-011 (Super-Admin setup).
