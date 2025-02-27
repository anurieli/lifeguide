-- Add delete policy for the coming_soon table
-- This ensures authenticated users can delete records

-- First check if the policy already exists using the correct column names in pg_policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'coming_soon' AND cmd = 'DELETE'
    ) THEN
        -- Create the delete policy if it doesn't exist
        EXECUTE 'CREATE POLICY "Allow authenticated users to delete features" ON coming_soon
                FOR DELETE USING (auth.uid() IS NOT NULL)';
                
        -- Log that the policy was created
        RAISE NOTICE 'Created delete policy for coming_soon table';
    ELSE
        -- Log that the policy already exists
        RAISE NOTICE 'Delete policy for coming_soon table already exists';
    END IF;
END
$$;

-- Make sure RLS is enabled on the table
ALTER TABLE IF EXISTS coming_soon ENABLE ROW LEVEL SECURITY;

-- Explicitly grant delete permissions to authenticated users
GRANT DELETE ON coming_soon TO authenticated; 