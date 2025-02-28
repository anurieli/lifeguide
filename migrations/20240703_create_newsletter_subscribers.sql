-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow anyone to insert subscribers (for the public subscription form)
CREATE POLICY newsletter_insert_policy ON newsletter_subscribers 
  FOR INSERT WITH CHECK (true);

-- Only allow admins to view all subscribers
CREATE POLICY newsletter_select_policy ON newsletter_subscribers 
  FOR SELECT USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' IN (SELECT email FROM admins));

-- Create an update trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_newsletter_subscribers_updated_at
BEFORE UPDATE ON newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 