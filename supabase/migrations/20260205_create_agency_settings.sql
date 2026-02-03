-- Create Agency Settings Table (Singleton intended)
CREATE TABLE IF NOT EXISTS public.agency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_name TEXT,
    email TEXT,
    tax_office TEXT,
    tax_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated" ON public.agency_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Agency Phones (One-to-Many)
CREATE TABLE IF NOT EXISTS public.agency_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agency_settings(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agency_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated" ON public.agency_phones FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Agency Addresses (One-to-Many)
CREATE TABLE IF NOT EXISTS public.agency_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agency_settings(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agency_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated" ON public.agency_addresses FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Agency Bank Accounts (One-to-Many)
CREATE TABLE IF NOT EXISTS public.agency_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agency_settings(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    iban TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agency_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated" ON public.agency_bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Agency Consultants (One-to-Many)
CREATE TABLE IF NOT EXISTS public.agency_consultants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agency_settings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agency_consultants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated" ON public.agency_consultants FOR ALL TO authenticated USING (true) WITH CHECK (true);
