-- Bourg Lead Capture backend
-- The live Supabase project has this schema applied already.
-- The private access key is intentionally NOT stored in source control.

create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'printing-united-2026-leads',
  customer_name text,
  company text,
  job_title text,
  email text,
  phone text,
  badge_image_path text not null,
  notes text,
  priority text not null default 'Warm' check (priority in ('Hot','Warm','Follow-up','Info only')),
  product_interests text[] not null default '{}',
  captured_by text not null,
  capture_location text not null default 'C.P. Bourg booth'
    check (capture_location in ('C.P. Bourg booth','Canon booth','Xerox booth','Other')),
  follow_up_date date,
  follow_up_action text,
  status text not null default 'New' check (status in ('New','Contacted','Qualified','Closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_leads_workspace_check check (workspace_id = 'printing-united-2026-leads')
);

alter table public.sales_leads enable row level security;
grant select, insert, update on public.sales_leads to anon;
grant select, insert, update on public.sales_leads to authenticated;

-- Policies use private.has_shared_link_access(workspace_id), the same
-- server-side private-link authorization pattern used by Expo Ops.
-- Badge storage bucket: bourg-lead-badges (PRIVATE), 10 MB max.
-- Object paths begin with printing-united-2026-leads/ so Storage RLS can
-- validate the private lead-app link without exposing badge images publicly.
