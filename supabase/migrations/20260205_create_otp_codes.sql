CREATE TABLE IF NOT EXISTS public.auth_otp_codes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    code text NOT NULL,
    redirect_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + interval '15 minutes')
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_email_code ON public.auth_otp_codes(email, code);

-- RLS (Optional logic: Admin only?)
ALTER TABLE public.auth_otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service Role Full Access" ON public.auth_otp_codes
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
