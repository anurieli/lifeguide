-- Add subdescription column to guide_sections table
ALTER TABLE guide_sections ADD COLUMN subdescription TEXT;

-- Update existing rows with empty subdescription
UPDATE guide_sections SET subdescription = '' WHERE subdescription IS NULL;

-- Add comment to the column
COMMENT ON COLUMN guide_sections.subdescription IS 'Additional detailed information about the section that can be expanded'; 