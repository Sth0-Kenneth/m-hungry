import { z } from "zod";
import type { User } from "@supabase/supabase-js";

export const LINE_PROVIDER = "custom:line" as const;
export const lineUserIdSchema = z.string().regex(/^U[0-9a-f]{32}$/);

const identityDataSchema = z.object({
  sub: lineUserIdSchema,
  name: z.string().max(200).optional(),
  full_name: z.string().max(200).optional(),
  picture: z.string().url().max(2048).optional(),
});

export type LineIdentity = {
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
};

export function extractLineIdentity(user: Pick<User, "identities">): LineIdentity | null {
  const identity = user.identities?.find((candidate) => candidate.provider === LINE_PROVIDER);
  if (!identity) return null;
  const parsed = identityDataSchema.safeParse(identity.identity_data);
  if (!parsed.success) return null;
  return {
    lineUserId: parsed.data.sub,
    displayName: parsed.data.name ?? parsed.data.full_name ?? null,
    pictureUrl: parsed.data.picture ?? null,
  };
}
