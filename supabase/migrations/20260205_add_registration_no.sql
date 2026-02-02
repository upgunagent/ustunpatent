-- Add registration_no column to firm_trademarks
ALTER TABLE public.firm_trademarks
ADD COLUMN IF NOT EXISTS registration_no TEXT;
