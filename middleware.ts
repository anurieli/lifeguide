import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

// verbose: true → the auth proxy/middleware logs every step (incl. the exact reason a
// code exchange fails) to the Vercel function logs. Temporary, for diagnosing prod login.
export default convexAuthNextjsMiddleware(undefined, { verbose: true });

export const config = {
  // Run on everything except static files and Next internals.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
