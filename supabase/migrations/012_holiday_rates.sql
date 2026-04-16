-- 012_holiday_rates.sql
-- Replace holiday_surcharge with per-service holiday rates

ALTER TABLE profiles
  ADD COLUMN holiday_boarding_rate NUMERIC(8, 2) NOT NULL DEFAULT 0,
  ADD COLUMN holiday_daycare_rate NUMERIC(8, 2) NOT NULL DEFAULT 0;

ALTER TABLE profiles
  DROP COLUMN holiday_surcharge;
