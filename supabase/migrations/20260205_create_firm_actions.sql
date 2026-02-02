create table if not exists public.firm_actions (
    id uuid not null default gen_random_uuid(),
    firm_id uuid not null references public.firms(id) on delete cascade,
    trademark_id uuid null references public.firm_trademarks(id) on delete set null,
    type text not null, -- 'notification_email', etc.
    status text not null default 'sent', -- 'pending', 'sent', 'viewed', 'responded', 'approved', 'objected'
    metadata jsonb null, -- Stores email preview, attachments list, etc.
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint firm_actions_pkey primary key (id)
);

-- Enable RLS
alter table public.firm_actions enable row level security;

-- Policy for reading (authenticated users can read)
create policy "Authenticated users can read firm_actions"
on public.firm_actions
for select
to authenticated
using (true);

-- Policy for inserting (authenticated users can insert)
create policy "Authenticated users can insert firm_actions"
on public.firm_actions
for insert
to authenticated
with check (true);

-- Policy for updating (authenticated users can update)
create policy "Authenticated users can update firm_actions"
on public.firm_actions
for update
to authenticated
using (true);
