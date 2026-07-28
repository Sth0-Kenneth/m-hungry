"use server";

import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { env, isConfigured } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { getSiteUrl } from "@/lib/site-url";

export type AuthState = { error?: string; success?: string };

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const { t, locale } = await getI18n();
  if (!isConfigured) return { error: t("auth.notConfigured") };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || password.length < 6) return { error: t("auth.invalidLogin") };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? t("auth.confirmEmail")
          : t("auth.loginFailed"),
    };
  }
  if (data.user) {
    await supabase.from("profiles").update({ language: locale }).eq("id", data.user.id);
  }
  redirect("/dashboard");
}

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const { t, locale } = await getI18n();
  if (!isConfigured) return { error: t("auth.notConfigured") };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const displayName = String(form.get("displayName") ?? "").trim();
  if (!displayName) return { error: t("auth.enterName") };
  if (!email || password.length < 8) return { error: t("auth.invalidRegister") };
  // The hosted default confirmation template redirects with an implicit
  // session in the URL fragment. This also works when the email is opened on
  // a different device, where a PKCE verifier cookie would not be available.
  const supabase = createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "implicit",
        persistSession: false,
      },
    },
  );
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, language: locale },
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
    },
  });
  if (error) {
    if (error.code === "email_address_not_authorized") {
      return { error: t("auth.emailNotAuthorized") };
    }
    if (
      error.code === "over_email_send_rate_limit" ||
      error.code === "over_request_rate_limit"
    ) {
      return { error: t("auth.emailRateLimited") };
    }
    return { error: t("auth.registerFailed") };
  }
  if (!data.session) return { success: t("auth.confirmEmail") };
  const sessionClient = await createClient();
  const { error: sessionError } = await sessionClient.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (sessionError) return { error: t("auth.registerFailed") };
  if (data.user) {
    await sessionClient
      .from("profiles")
      .update({ language: locale })
      .eq("id", data.user.id);
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
