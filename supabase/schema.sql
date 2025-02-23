-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for malleability levels
CREATE TYPE malleability_level AS ENUM ('green', 'yellow', 'red');

-- Create table for admin users
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert the admin email
INSERT INTO admin_users (email) VALUES ('anurieli365@gmail.com');

-- Create table for guide sections
CREATE TABLE guide_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    order_position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id)
);

-- Create table for guide subsections
CREATE TABLE guide_subsections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES guide_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    subdescription TEXT,
    example TEXT,
    malleability_level malleability_level NOT NULL,
    order_position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    malleability_details TEXT
);

-- Create table for user responses
CREATE TABLE user_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subsection_id UUID NOT NULL REFERENCES guide_subsections(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, subsection_id)
);

-- Create table for user progress
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subsection_id UUID NOT NULL REFERENCES guide_subsections(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, subsection_id)
);

-- Create indexes
CREATE INDEX idx_guide_sections_order ON guide_sections(order_position);
CREATE INDEX idx_guide_subsections_order ON guide_subsections(order_position, section_id);
CREATE INDEX idx_user_responses_user ON user_responses(user_id);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_guide_sections_updated_at
    BEFORE UPDATE ON guide_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guide_subsections_updated_at
    BEFORE UPDATE ON guide_subsections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_responses_updated_at
    BEFORE UPDATE ON user_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users
CREATE POLICY "Admin users are viewable by authenticated users"
    ON admin_users FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create policies for guide_sections
CREATE POLICY "Guide sections are viewable by everyone"
    ON guide_sections FOR SELECT
    USING (true);

CREATE POLICY "Guide sections are editable by admins"
    ON guide_sections FOR ALL
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM admin_users));

-- Create policies for guide_subsections
CREATE POLICY "Guide subsections are viewable by everyone"
    ON guide_subsections FOR SELECT
    USING (true);

CREATE POLICY "Guide subsections are editable by admins"
    ON guide_subsections FOR ALL
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM admin_users));

-- Create policies for user_responses
CREATE POLICY "Users can view their own responses"
    ON user_responses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own responses"
    ON user_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses"
    ON user_responses FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policies for user_progress
CREATE POLICY "Users can view their own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to reorder sections
CREATE OR REPLACE FUNCTION reorder_sections(section_ids UUID[])
RETURNS VOID AS $$
DECLARE
    section_id UUID;
    i INTEGER;
BEGIN
    i := 1;
    FOREACH section_id IN ARRAY section_ids
    LOOP
        UPDATE guide_sections
        SET order_position = i
        WHERE id = section_id;
        i := i + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create the reorder subsections function with validation and error handling
CREATE OR REPLACE FUNCTION reorder_subsections(
    p_section_id UUID,
    p_subsection_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subsection_id UUID;
    v_order INTEGER;
    v_count INTEGER;
BEGIN
    -- Log the input parameters
    RAISE NOTICE 'Reordering subsections for section: %, subsections: %', p_section_id, p_subsection_ids;
    
    -- Validate section exists
    IF NOT EXISTS (SELECT 1 FROM guide_sections WHERE id = p_section_id) THEN
        RAISE EXCEPTION 'Section % does not exist', p_section_id;
    END IF;
    
    -- Count subsections to be updated
    SELECT COUNT(*)
    INTO v_count
    FROM unnest(p_subsection_ids) AS sid
    WHERE EXISTS (
        SELECT 1 
        FROM guide_subsections gs 
        WHERE gs.id = sid 
        AND gs.section_id = p_section_id
    );
    
    -- Validate all subsections exist and belong to the section
    IF v_count != array_length(p_subsection_ids, 1) THEN
        RAISE EXCEPTION 'Not all subsections exist or belong to section %', p_section_id;
    END IF;
    
    -- Update order positions
    v_order := 1;
    FOREACH v_subsection_id IN ARRAY p_subsection_ids
    LOOP
        UPDATE guide_subsections
        SET order_position = v_order
        WHERE id = v_subsection_id
        AND section_id = p_section_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update subsection %', v_subsection_id;
        END IF;
        
        v_order := v_order + 1;
    END LOOP;
    
    RAISE NOTICE 'Successfully reordered % subsections', v_order - 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reorder_subsections(UUID, UUID[]) TO authenticated;

-- Create notification function for subsection reordering
CREATE OR REPLACE FUNCTION notify_subsection_reorder()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_notify(
        'subsection_reordered',
        json_build_object(
            'section_id', NEW.section_id,
            'subsection_id', NEW.id,
            'order_position', NEW.order_position
        )::text
    );
    RETURN NEW;
END;
$$;

-- Create trigger for subsection reorder notifications
CREATE TRIGGER notify_subsection_reorder_trigger
    AFTER UPDATE OF order_position ON guide_subsections
    FOR EACH ROW
    EXECUTE FUNCTION notify_subsection_reorder();

-- Enable Realtime for guide_sections and guide_subsections tables
ALTER PUBLICATION supabase_realtime ADD TABLE guide_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE guide_subsections;

-- Enable replication identifiers for realtime
ALTER TABLE guide_sections REPLICA IDENTITY FULL;
ALTER TABLE guide_subsections REPLICA IDENTITY FULL;

-- Grant required permissions for realtime
GRANT SELECT ON guide_sections TO authenticated, anon;
GRANT SELECT ON guide_subsections TO authenticated, anon;