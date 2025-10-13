-- ============================================================================
-- DISABLE RLS AND CREATE PERMISSIVE POLICIES
-- ============================================================================
-- Run this in your Supabase SQL Editor to fix RLS issues

-- Disable RLS on applications table
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

-- Disable RLS on other tables (if needed)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ALTERNATIVE: If you want to KEEP RLS enabled, use these policies instead
-- ============================================================================
-- Uncomment the section below if you prefer to keep RLS enabled with proper policies

/*
-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Applications: Allow anonymous insert (for application submissions)
CREATE POLICY "Anyone can submit applications"
  ON public.applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Applications: Only admins can read/update
CREATE POLICY "Admins can manage applications"
  ON public.applications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- Profiles: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Profiles: Admins can manage all profiles
CREATE POLICY "Admins can manage profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'superadmin')
    )
  );

-- Vendors: Public can read active vendors
CREATE POLICY "Anyone can view active vendors"
  ON public.vendors FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Vendors: Vendors can update their own info
CREATE POLICY "Vendors can update own info"
  ON public.vendors FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Vendors: Admins can manage all vendors
CREATE POLICY "Admins can manage vendors"
  ON public.vendors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin')
    )
  );
*/

-- ============================================================================
-- VERIFY RLS STATUS
-- ============================================================================
-- Run this to check which tables have RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
