# Database Migrations

This directory contains SQL migration files for the Supabase database.

## How to Run Migrations

### Using Supabase CLI

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Run the migration:
   ```bash
   supabase db push
   ```

### Manual Execution

If you prefer to run the migrations manually:

1. Log in to the Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of the migration file
4. Paste into the SQL Editor and run

## Migration Files

- `add_subdescription_to_guide_sections.sql`: Adds a subdescription text field to the guide_sections table

## After Running Migrations

After running migrations, you may need to:

1. Update your TypeScript types (already done in `types/supabase.ts`)
2. Restart your development server
3. Update any admin interfaces to support the new fields 