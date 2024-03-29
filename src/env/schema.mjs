// @ts-check
import { z } from "zod";

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  NEXTAUTH_SECRET:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),
  NEXTAUTH_URL: z.preprocess(
    // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
    // Since NextAuth.js automatically uses the VERCEL_URL if present.
    (str) => process.env.VERCEL_URL ?? str,
    // VERCEL_URL doesn't include `https` so it cant be validated as a URL
    process.env.VERCEL ? z.string() : z.string().url(),
  ),
  QSTASH_URL: z.string().url(),
  QSTASH_TOKEN: z.string(),
  QSTASH_CURRENT_SIGNING_KEY: z.string(),
  QSTASH_NEXT_SIGNING_KEY: z.string(),
  SCRAPER_USERNAME: z.string(),
  SCRAPER_PASSWORD: z.string(),
  DENO_SCRAPE_URL: z.string(),
  //DISCORD_CLIENT_ID: z.string(),
  //DISCORD_CLIENT_SECRET: z.string(),
  SITE_PASSWORD: z.string(),
});

/**
 * You can't destruct `process.env` as a regular object in the Next.js
 * middleware, so you have to do it manually here.
 * @type {{ [k in keyof z.infer<typeof serverSchema>]: z.infer<typeof serverSchema>[k] | undefined }}
 */
export const serverEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  QSTASH_URL: process.env.QSTASH_URL,
  QSTASH_TOKEN: process.env.QSTASH_TOKEN,
  QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
  QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
  SCRAPER_USERNAME: process.env.SCRAPER_USERNAME,
  SCRAPER_PASSWORD: process.env.SCRAPER_PASSWORD,
  DENO_SCRAPE_URL: process.env.DENO_SCRAPE_URL,
  //DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  //DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  SITE_PASSWORD: process.env.SITE_PASSWORD,
};

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const clientSchema = z.object({
  // NEXT_PUBLIC_CLIENTVAR: z.string(),
  NEXT_PUBLIC_SITE_READ_COOKIE: z.string(),
  NEXT_PUBLIC_SITE_HAS_PERMISSION: z.string(),
  NEXT_PUBLIC_DENO_SCRAPE_URL: z.string(),
});

/**
 * You can't destruct `process.env` as a regular object, so you have to do
 * it manually here. This is because Next.js evaluates this at build time,
 * and only used environment variables are included in the build.
 * @type {{ [k in keyof z.infer<typeof clientSchema>]: z.infer<typeof clientSchema>[k] | undefined }}
 */
export const clientEnv = {
  // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  NEXT_PUBLIC_SITE_READ_COOKIE: 'src',
  NEXT_PUBLIC_SITE_HAS_PERMISSION: 'has-permission',
  NEXT_PUBLIC_DENO_SCRAPE_URL: 'https://fresh-frog-45.deno.dev',
};
