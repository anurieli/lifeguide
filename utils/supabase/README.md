# Supabase Client Utilities

This directory contains the official Supabase client utilities for the LifeGuide application.

## Available Clients

- **client.ts**: Browser-side client with caching (singleton pattern)
- **server.ts**: Server-side client for use in Server Components and API routes
- **actions.ts**: Client specifically designed for use with Server Actions
- **middleware.ts**: Client for use in Next.js middleware
- **route.ts**: Client for use in Route Handlers (app/api routes)

## Usage Guidelines

### Browser Client (client.ts)

Use this in client components that run in the browser.

```typescript
import { createClient } from '@/lib/supabase/client';

// In your component:
const supabase = createClient();

// Example usage:
const { data } = await supabase.from('table_name').select('*');
```

### Server Client (server.ts)

Use this in server components or API routes.

```typescript
import { createClient } from '@/lib/supabase/server';

// In your server component:
const supabase = await createClient();

// Example usage:
const { data } = await supabase.from('table_name').select('*');
```

### Actions Client (actions.ts)

Use this in server actions.

```typescript
import { createClient } from '@/lib/supabase/actions';

// In your server action:
const supabase = await createClient();

// Example usage:
const { data } = await supabase.from('table_name').select('*');
```

### Middleware Client (middleware.ts)

Use this in Next.js middleware.

```typescript
import { createClient } from '@/lib/supabase/middleware';

// In your middleware:
export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  
  // Example usage:
  const { data } = await supabase.auth.getUser();
  
  return response;
}
```

### Route Handler Client (route.ts)

Use this in app directory route handlers.

```typescript
import { createRouteHandlerClient } from '@/lib/supabase/route';

// In your route handler:
export async function GET(request: Request) {
  const response = NextResponse.next();
  const supabase = await createRouteHandlerClient(response);
  
  // Example usage:
  const { data } = await supabase.auth.getUser();
  
  return response;
}
```

## Notes

- The clients in this directory follow the recommended patterns for Next.js authentication with Supabase.
- The browser client implements a singleton pattern to improve performance by reusing the same client instance across components.
- The server client properly handles cookies according to the Supabase SSR guidelines.
- All clients are properly typed with the Database type from @/types/supabase. 