-- Add registration_date column to firm_trademarks
ALTER TABLE public.firm_trademarks
ADD COLUMN IF NOT EXISTS registration_date DATE;

-- Ensure classes column exists (in case previous migration wasn't run)
ALTER TABLE public.firm_trademarks
ADD COLUMN IF NOT EXISTS classes TEXT;
