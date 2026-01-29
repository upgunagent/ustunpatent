-- Create Firms Table
CREATE TABLE IF NOT EXISTS public.firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    authority_name TEXT, -- Yetki İsmi
    phone TEXT,
    tpmk_owner_no TEXT,
    email TEXT,
    website TEXT,
    representative TEXT, -- Müşteri Temsilcisi
    sector TEXT,
    type TEXT CHECK (type IN ('individual', 'corporate')),
    
    -- Fields for Individual
    individual_name_surname TEXT,
    individual_tc TEXT,
    individual_address TEXT,
    
    -- Fields for Corporate
    corporate_title TEXT,
    corporate_tax_office TEXT,
    corporate_tax_number TEXT,
    corporate_authorized_person TEXT, -- Yetkili Kişi
    corporate_address TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for firms
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

-- Create Policy for firms (Allow all for now as per project style, or authenticated)
-- Checking existing policies might be good, but for now assuming authenticated access
CREATE POLICY "Enable read access for authenticated users" ON public.firms
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.firms
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.firms
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.firms
    FOR DELETE
    TO authenticated
    USING (true);


-- Create Firm Trademarks Table
CREATE TABLE IF NOT EXISTS public.firm_trademarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    watch_agreement BOOLEAN DEFAULT false,
    logo_url TEXT,
    name TEXT NOT NULL,
    rights_owner TEXT, -- Hak Sahibi
    application_no TEXT,
    start_bulletin_no TEXT,
    watch_start_date DATE,
    watch_end_date DATE,
    consultant_name TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for firm_trademarks
ALTER TABLE public.firm_trademarks ENABLE ROW LEVEL SECURITY;

-- Create Policy for firm_trademarks
CREATE POLICY "Enable read access for authenticated users" ON public.firm_trademarks
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.firm_trademarks
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.firm_trademarks
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.firm_trademarks
    FOR DELETE
    TO authenticated
    USING (true);
