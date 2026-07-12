import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Google from "@auth/core/providers/google";

// Anonymous = instant, cookie-bound, throwaway identity (good for "just look around").
// Google = durable account that survives cookie clears and works across browsers/devices.
// Google needs AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET set in the Convex deployment env, and the
// callback URL  https://<deployment>.convex.site/api/auth/callback/google  registered in the
// Google Cloud OAuth client. Until those exist, signIn("google") fails but Anonymous still works.

// One shared Convex deployment serves BOTH local dev and prod. After Google OAuth, Convex
// redirects the browser back to the app; by default it only allows the single `SITE_URL` origin,
// which is why prod login broke (SITE_URL pointed at localhost, so the token never landed on
// mylifesguide.com). The client now passes its own origin as `redirectTo`, and this callback
// whitelists every origin the app is served from, so one deployment works for all of them.
const ALLOWED_APP_ORIGINS = [
  "https://mylifesguide.com",
  "https://www.mylifesguide.com",
  "http://localhost:3000",
  // The dev machine served over the private tailnet (`tailscale serve`), so phone QA
  // can sign in; reachable only from Ariel's own devices.
  "https://ariels-macbook-pro.tailf278e9.ts.net",
];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous, Google],
  callbacks: {
    async redirect({ redirectTo }) {
      const baseUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
      // Relative paths/queries resolve against SITE_URL (mirrors the library default).
      if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
        return `${baseUrl}${redirectTo}`;
      }
      // Absolute URLs: only allow our known app origins (prod, www, local dev).
      const allowed = ALLOWED_APP_ORIGINS.some(
        (o) => redirectTo === o || redirectTo.startsWith(`${o}/`) || redirectTo.startsWith(`${o}?`),
      );
      if (allowed) return redirectTo;
      throw new Error(`Disallowed redirectTo "${redirectTo}" — not an approved app origin.`);
    },
  },
});
