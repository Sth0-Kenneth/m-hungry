import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202607220001_initial_schema.sql"), "utf8");
const phase = readFileSync(resolve(process.cwd(), "supabase/migrations/20260901020407_phase_3_5_features.sql"), "utf8");
const line = readFileSync(resolve(process.cwd(), "supabase/migrations/20261007043623_line_integration.sql"), "utf8");

describe("row-level user data assumptions", () => {
  it("enables RLS and scopes owned tables to auth.uid", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("user_id=auth.uid()");
    expect(sql).toContain("id=auth.uid()");
  });
  it("uses user-specific storage paths", () => {
    expect(sql).toContain("(storage.foldername(name))[1]=auth.uid()::text");
  });
  it("keeps recipe usage user-scoped and unavailable to anon", () => {
    expect(phase).toContain("user_id = auth.uid()");
    expect(phase).toContain("revoke all on function public.record_recipe_usage(jsonb) from public, anon");
  });
  it("keeps LINE identities user-scoped and server-managed", () => {
    expect(line).toContain("alter table public.line_connections enable row level security");
    expect(line).toContain("using ((select auth.uid()) = user_id)");
    expect(line).toContain("revoke all on table public.line_connections from anon, authenticated");
    expect(line).toContain("grant select on table public.line_connections to authenticated");
  });
});
