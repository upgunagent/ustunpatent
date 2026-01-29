-- Add classes column to firm_trademarks
ALTER TABLE public.firm_trademarks
ADD COLUMN IF NOT EXISTS classes TEXT;
