import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import { account, session, user, verification } from "@/server/db/schema";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

export const isGoogleAuthEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    // Point Better Auth at the tables defined in Phase 2 (schema.ts) rather
    // than regenerating — see DATABASE.md → Migration Policy.
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  ...(isGoogleAuthEnabled
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
          },
        },
      }
    : {}),
  // Keep nextCookies last so it can flush Set-Cookie from server actions.
  plugins: [nextCookies()],
});

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>["user"];

/**
 * First line of every protected service/route path. Validates the real
 * session (not just cookie presence) and throws the standard 401 envelope.
 */
export async function requireUser(reqHeaders: Headers): Promise<SessionUser> {
  const result = await auth.api.getSession({ headers: reqHeaders });
  if (!result?.user) {
    throw new ApiError("UNAUTHORIZED", "You must be signed in");
  }
  return result.user;
}
