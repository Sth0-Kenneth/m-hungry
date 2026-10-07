import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { extractLineIdentity, lineUserIdSchema } from "./identity";
import { verifyLineWebhookSignature } from "./signature";

describe("LINE integration", () => {
  it("validates LINE user IDs", () => {
    expect(lineUserIdSchema.safeParse("U8e742f61d673b39c7fff3cecb7536ef0").success).toBe(true);
    expect(lineUserIdSchema.safeParse("user-123").success).toBe(false);
  });

  it("extracts only the verified custom LINE identity", () => {
    const user = {
      identities: [
        {
          provider: "custom:line",
          identity_data: {
            sub: "U8e742f61d673b39c7fff3cecb7536ef0",
            name: "LINE User",
            picture: "https://profile.line-scdn.net/example",
          },
        },
      ],
    } as unknown as Pick<User, "identities">;
    expect(extractLineIdentity(user)).toEqual({
      lineUserId: "U8e742f61d673b39c7fff3cecb7536ef0",
      displayName: "LINE User",
      pictureUrl: "https://profile.line-scdn.net/example",
    });
  });

  it("rejects malformed identity data", () => {
    const user = {
      identities: [{ provider: "custom:line", identity_data: { sub: "not-a-line-id" } }],
    } as unknown as Pick<User, "identities">;
    expect(extractLineIdentity(user)).toBeNull();
  });

  it("verifies LINE webhook signatures against the untouched request body", () => {
    const body = '{"destination":"U8e742f61d673b39c7fff3cecb7536ef0","events":[]}';
    const secret = "8c570fa6dd201bb328f1c1eac23a96d8";
    const signature = "GhRKmvmHys4Pi8DxkF4+EayaH0OqtJtaZxgTD9fMDLs=";
    expect(verifyLineWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyLineWebhookSignature(`${body} `, signature, secret)).toBe(false);
  });
});
