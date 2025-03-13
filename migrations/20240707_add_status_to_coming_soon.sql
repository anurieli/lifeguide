-- Add status column to coming_soon table
-- This migration adds a status column to track the progress of features

-- First, create an enum type for the status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_status') THEN
        CREATE TYPE feature_status AS ENUM ('Complete', 'In Progress', 'TBA');
    END IF;
END
$$;

-- Add the status column with a default value of 'TBA'
ALTER TABLE IF EXISTS public.coming_soon 
ADD COLUMN IF NOT EXISTS status feature_status NOT NULL DEFAULT 'TBA';

-- Update existing records to have appropriate statuses
-- This is just an example, you may want to update specific features
UPDATE public.coming_soon
SET status = 'TBA'
WHERE status IS NULL;

-- Add a comment to the column
COMMENT ON COLUMN public.coming_soon.status IS 'Status of the feature: Complete, In Progress, or TBA (To Be Announced)'; 