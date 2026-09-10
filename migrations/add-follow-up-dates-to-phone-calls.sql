-- Add auto follow-up date columns to phone_calls table
-- Mirrors src/models/PhoneCall.js (follow_up_date_2 / follow_up_date_3)

ALTER TABLE phone_calls
ADD COLUMN IF NOT EXISTS follow_up_date_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_date_3 TIMESTAMPTZ;
