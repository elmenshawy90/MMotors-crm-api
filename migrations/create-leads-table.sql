-- Create leads table (mirrors src/models/Lead.js)
-- Idempotent: safe to re-run; tracked in schema_migrations by run-migration.js

-- Enum types (DO block = CREATE TYPE IF NOT EXISTS equivalent)
DO $$ BEGIN CREATE TYPE lead_source AS ENUM (
  'website', 'phone_call', 'walk_in', 'referral', 'social_media',
  'email', 'advertisement', 'exhibition', 'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE lead_priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE lead_stage AS ENUM (
  'initial_contact', 'needs_analysis', 'test_drive_scheduled',
  'proposal_sent', 'negotiation', 'closed_won', 'closed_lost'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE lead_interest_level AS ENUM (
  'very_low', 'low', 'medium', 'high', 'very_high'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE lead_lost_reason AS ENUM (
  'price_too_high', 'chose_competitor', 'not_interested',
  'no_budget', 'timing', 'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches (id),
  contact_id UUID REFERENCES contacts (id),
  vehicle_id UUID REFERENCES vehicles (id),
  assigned_to UUID REFERENCES users (id),
  created_by UUID REFERENCES users (id),
  lead_number VARCHAR(30) UNIQUE,
  title VARCHAR(255) NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20) NOT NULL,
  source lead_source NOT NULL DEFAULT 'walk_in',
  status lead_status NOT NULL DEFAULT 'new',
  priority lead_priority NOT NULL DEFAULT 'medium',
  stage lead_stage NOT NULL DEFAULT 'initial_contact',
  expected_value DECIMAL(15, 2) DEFAULT 0,
  actual_value DECIMAL(15, 2),
  probability INTEGER DEFAULT 0,
  interest_level lead_interest_level DEFAULT 'medium',
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_year INTEGER,
  budget_min DECIMAL(15, 2),
  budget_max DECIMAL(15, 2),
  financing_required BOOLEAN DEFAULT false,
  trade_in BOOLEAN DEFAULT false,
  trade_in_vehicle VARCHAR(200),
  expected_close_date TIMESTAMPTZ,
  actual_close_date TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,
  notes TEXT,
  lost_reason lead_lost_reason,
  lost_notes TEXT,
  tags VARCHAR(255)[] DEFAULT '{}',
  activities JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes (mirror model definition)
CREATE INDEX IF NOT EXISTS leads_branch_id_idx ON leads (branch_id);
CREATE INDEX IF NOT EXISTS leads_contact_id_idx ON leads (contact_id);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads (assigned_to);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads (stage);
CREATE INDEX IF NOT EXISTS leads_priority_idx ON leads (priority);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads (source);
CREATE INDEX IF NOT EXISTS leads_expected_close_date_idx ON leads (expected_close_date);
CREATE INDEX IF NOT EXISTS leads_next_follow_up_idx ON leads (next_follow_up);
CREATE INDEX IF NOT EXISTS leads_customer_phone_idx ON leads (customer_phone);
