"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Leaf, LoaderCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/locale-provider";

type ConfirmationStatus = "confirming" | "failed";

const allowedOtpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export default function ConfirmAccountPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<ConfirmationStatus>("confirming");
  const confirmationStarted = useRef(false);

  useEffect(() => {
    if (confirmationStarted.current) return;
    confirmationStarted.current = true;

    async function confirmAccount() {
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const next = safeNextPath(query.get("next"));
      window.history.replaceState(null, "", window.location.pathname);

      if (
        query.has("error") ||
        query.has("error_code") ||
        fragment.has("error") ||
        fragment.has("error_code")
      ) {
        setStatus("failed");
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        setStatus("failed");
        return;
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
        isSingleton: false,
        auth: { detectSessionInUrl: false },
      });

      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const type = query.get("type") as EmailOtpType | null;

      let error: Error | null = null;
      if (accessToken && refreshToken) {
        ({ error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }));
      } else if (code) {
        ({ error } = await supabase.auth.exchangeCodeForSession(code));
      } else if (tokenHash && type && allowedOtpTypes.has(type)) {
        ({ error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        }));
      } else {
        error = new Error("No supported confirmation credentials were found.");
      }

      if (error) {
        setStatus("failed");
        return;
      }

      if (query.get("line") === "1") {
        const { data: sessionData } = await supabase.auth.getSession();
        await fetch("/api/line/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerToken: sessionData.session?.provider_token }),
        }).catch(() => undefined);
      }

      window.location.replace(next);
    }

    void confirmAccount();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="grid size-9 place-items-center rounded-xl bg-[#174c37] text-white">
              <Leaf size={18} />
            </span>
            mHungry
          </Link>
          <LanguageSwitcher compact />
        </div>
        <section className="card p-6 text-center md:p-8">
          {status === "confirming" ? (
            <>
              <LoaderCircle
                className="mx-auto animate-spin text-[#174c37]"
                size={32}
              />
              <h1 className="mt-4 text-2xl">{t("auth.confirming")}</h1>
              <p className="mt-2 text-sm text-[#687970]">
                {t("auth.confirmingCopy")}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl">{t("auth.confirmFailed")}</h1>
              <p role="alert" className="mt-2 text-sm text-[#687970]">
                {t("auth.confirmFailedCopy")}
              </p>
              <Link href="/login" className="btn-primary mt-6 w-full">
                {t("auth.login")}
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
