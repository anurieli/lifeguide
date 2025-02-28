-- Migration to fix policies for the coming_soon table
-- This ensures the table has proper RLS policies for all operations

-- Make sure RLS is enabled on the table
ALTER TABLE IF EXISTS public.coming_soon ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow public read access" ON public.coming_soon;
DROP POLICY IF EXISTS "Allow authenticated users to delete features" ON public.coming_soon;
DROP POLICY IF EXISTS "Allow authenticated users to insert features" ON public.coming_soon;
DROP POLICY IF EXISTS "Allow authenticated users to update features" ON public.coming_soon;

-- Create comprehensive policies for all operations

-- Allow anyone to read features (both authenticated and anonymous users)
CREATE POLICY "Allow public read access" 
ON public.coming_soon
FOR SELECT 
TO authenticated, anon
USING (true);

-- Allow only authenticated users to insert new features
CREATE POLICY "Allow authenticated users to insert features" 
ON public.coming_soon
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow only authenticated users to update features
CREATE POLICY "Allow authenticated users to update features" 
ON public.coming_soon
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow only authenticated users to delete features
CREATE POLICY "Allow authenticated users to delete features" 
ON public.coming_soon
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Grant appropriate permissions to roles
GRANT SELECT ON public.coming_soon TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coming_soon TO authenticated;

-- Reset the sequence for the id column if needed
-- This helps if there have been issues with the sequence getting out of sync
DO $$
DECLARE
  max_id uuid;
BEGIN
  -- Only attempt to reset if the table uses a sequence for its ID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coming_soon' 
    AND column_name = 'id' 
    AND column_default LIKE 'nextval%'
  ) THEN
    EXECUTE 'SELECT MAX(id) FROM public.coming_soon' INTO max_id;
    IF max_id IS NOT NULL THEN
      EXECUTE 'SELECT setval(pg_get_serial_sequence(''public.coming_soon'', ''id''), (SELECT MAX(id) FROM public.coming_soon) + 1)';
      RAISE NOTICE 'Reset sequence for coming_soon.id';
    END IF;
  ELSE
    RAISE NOTICE 'Table coming_soon does not use a sequence for id column, no reset needed';
  END IF;
END
$$; 