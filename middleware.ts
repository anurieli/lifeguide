import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

// The auth tokens live in cookies (Convex Auth's Next.js integration). Without
// a maxAge those are SESSION cookies, which mobile browsers evict whenever the
// tab/process is killed — so the phone demanded a fresh Google sign-in on almost
// every reload. A 14-day maxAge persists them; the middleware re-issues the
// cookies on each authenticated request, so it's a rolling window: sign-in is
// only demanded again after 14 days away (Ariel, 2026-07-13).
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export default convexAuthNextjsMiddleware(undefined, {
  cookieConfig: { maxAge: COOKIE_MAX_AGE_SECONDS },
});

export const config = {
  // Run on everything except static files and Next internals.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
