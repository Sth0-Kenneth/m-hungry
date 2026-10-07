"use client";

import { useState } from "react";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { LINE_PROVIDER } from "@/lib/line/identity";
import { useI18n } from "./locale-provider";

export function LineAuthButton({ mode = "login" }: { mode?: "login" | "link" }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (env.NEXT_PUBLIC_LINE_LOGIN_ENABLED !== "true") return null;

  async function start() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const credentials = {
      provider: LINE_PROVIDER,
      options: {
        redirectTo: `${window.location.origin}/auth/confirm?next=/dashboard&line=1`,
        scopes: "openid profile",
        queryParams: { bot_prompt: "normal" },
      },
    } as const;
    const { data, error: authError } = mode === "link"
      ? await supabase.auth.linkIdentity(credentials)
      : await supabase.auth.signInWithOAuth(credentials);
    if (authError) {
      setError(t("line.authFailed"));
      setBusy(false);
      return;
    }
    if (data.url) window.location.assign(data.url);
  }

  return (
    <div>
      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#06c755] px-4 py-3 font-bold text-white transition hover:bg-[#05b84e] disabled:opacity-60" disabled={busy} onClick={start} type="button">
        {busy ? <LoaderCircle className="animate-spin" size={19} /> : <MessageCircle size={19} />}
        {t(mode === "link" ? "line.linkAccount" : "line.login")}
      </button>
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
