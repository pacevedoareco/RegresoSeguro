-- ============================================================
-- Migration: 0002_payments_and_earnings
-- Project:   Regreso Seguro
-- Created:   2026-10-20
-- Stories:   HU-12 (SCRUM-16) payment method selector
--            HU-35 (SCRUM-39) driver settlement & wallet
-- Decision:  PD-026 (digital payments are simulated in the MVP)
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------

CREATE TYPE public.payment_method AS ENUM (
  'mercado_pago',
  'transfer',
  'cash'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'paid'
);

-- ------------------------------------------------------------
-- 2. TABLES
-- ------------------------------------------------------------

-- services: payment method chosen by the rider + settlement frozen at completion (BR-013 style)
ALTER TABLE public.services
  ADD COLUMN payment_method          public.payment_method NOT NULL DEFAULT 'cash',
  ADD COLUMN payment_status          public.payment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN paid_at                 timestamptz,
  ADD COLUMN commission_rate_at_time numeric(5,4),
  ADD COLUMN commission_amount       numeric(10,2),
  ADD COLUMN driver_net_amount       numeric(10,2),
  ADD CONSTRAINT services_commission_amount_non_negative CHECK (
    commission_amount IS NULL OR commission_amount >= 0
  ),
  ADD CONSTRAINT services_driver_net_non_negative CHECK (
    driver_net_amount IS NULL OR driver_net_amount >= 0
  );

-- pricing_config: operational commission retained from each service (Super-Admin editable)
ALTER TABLE public.pricing_config
  ADD COLUMN commission_rate numeric(5,4) NOT NULL DEFAULT 0.20,
  ADD CONSTRAINT pricing_config_commission_range CHECK (
    commission_rate >= 0 AND commission_rate < 1
  );

-- ------------------------------------------------------------
-- 3. INDEXES
-- ------------------------------------------------------------

CREATE INDEX services_driver_completed_idx
  ON public.services (driver_id, completed_at DESC)
  WHERE status = 'completed';
