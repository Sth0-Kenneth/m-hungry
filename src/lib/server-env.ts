import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1).optional(),
  LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: z.string().min(1).optional(),
  LINE_MESSAGING_CHANNEL_SECRET: z.string().min(1).optional(),
  USE_MOCK_AI: z.enum(["true", "false"]).default("true"),
});

export const serverEnv = serverSchema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
  FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
  LINE_MESSAGING_CHANNEL_SECRET: process.env.LINE_MESSAGING_CHANNEL_SECRET,
  USE_MOCK_AI: process.env.USE_MOCK_AI,
});
