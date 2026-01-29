-- Add registration_date to firm_trademarks
ALTER TABLE public.firm_trademarks
ADD COLUMN IF NOT EXISTS registration_date DATE;
