-- VENDO talks to PostgreSQL only from the trusted Next.js server, as the table owner.
-- Row Level Security is enabled on every table WITHOUT policies, so any other role
-- (for example Supabase "anon"/"authenticated" through the public REST API) gets no access.
-- Object-level authorization (who may edit which listing, etc.) is enforced in the
-- server service layer: see SECURITY.md.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
