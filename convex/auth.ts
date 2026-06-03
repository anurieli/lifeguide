import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Google from "@auth/core/providers/google";

// Anonymous = instant, cookie-bound, throwaway identity (good for "just look around").
// Google = durable account that survives cookie clears and works across browsers/devices.
// Google needs AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET set in the Convex deployment env, and the
// callback URL  https://<deployment>.convex.site/api/auth/callback/google  registered in the
// Google Cloud OAuth client. Until those exist, signIn("google") fails but Anonymous still works.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous, Google],
});
