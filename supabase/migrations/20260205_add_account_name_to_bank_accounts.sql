ALTER TABLE public.agency_bank_accounts 
ADD COLUMN IF NOT EXISTS account_name TEXT;
