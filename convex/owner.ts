// ============================================================================
// OWNER — the single account that may see the cross-user admin surface in prod.
// ============================================================================
// LifeGuide has one builder/owner. Anonymous "just look around" users and any
// other Google account are NOT the owner. The owner is identified by the email
// on their Google identity (anonymous users have no email, so they can never
// match). This is enforced SERVER-SIDE wherever cross-user data is exposed
// (see convex/feedback.ts) — the /admin page gate is only UX on top of it.
// ============================================================================

import { query, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const OWNER_EMAIL = "anurieli365@gmail.com";

// True only if the current identity is signed in as the owner's email.
export async function isOwner(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  const user = await ctx.db.get(userId);
  return user?.email === OWNER_EMAIL;
}

// Client gate: lets /admin decide whether to render the panel in production.
// Returns false for anonymous and non-owner identities.
export const amOwner = query({
  args: {},
  handler: async (ctx) => ({ isOwner: await isOwner(ctx) }),
});
