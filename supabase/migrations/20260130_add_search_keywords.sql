-- Add search_keywords column to firm_trademarks
-- Stores comma-separated keywords
ALTER TABLE public.firm_trademarks
ADD COLUMN IF NOT EXISTS search_keywords TEXT;
