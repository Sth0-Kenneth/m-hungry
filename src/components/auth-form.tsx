"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LoaderCircle, Leaf } from "lucide-react";
import { login, register, type AuthState } from "@/app/auth-actions";
import { LanguageSwitcher } from "./language-switcher";
import { useI18n } from "./locale-provider";
import { LineAuthButton } from "./line-auth-button";
import { env } from "@/lib/env";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t } = useI18n();
  const action = mode === "login" ? login : register;
  const [state, formAction, pending] = useActionState(action, {} as AuthState);
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
        <section className="card p-6 md:p-8">
          <h1 className="text-3xl">{t(mode === "login" ? "auth.welcome" : "auth.start")}</h1>
          <p className="mt-2 text-sm text-[#687970]">
            {t(mode === "login" ? "auth.loginCopy" : "auth.registerCopy")}
          </p>
          {env.NEXT_PUBLIC_LINE_LOGIN_ENABLED === "true" && (
            <>
              <div className="mt-6"><LineAuthButton /></div>
              <div className="my-5 flex items-center gap-3 text-xs text-[#687970]">
                <span className="h-px flex-1 bg-[#dfe5de]" />
                <span>{t("auth.orEmail")}</span>
                <span className="h-px flex-1 bg-[#dfe5de]" />
              </div>
            </>
          )}
          <form action={formAction} className="space-y-4">
            {mode === "register" && (
              <label>
                <span className="label">{t("auth.displayName")}</span>
                <input className="input" name="displayName" autoComplete="name" required />
              </label>
            )}
            <label>
              <span className="label">{t("auth.email")}</span>
              <input className="input" name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              <span className="label">{t("auth.password")}</span>
              <input
                className="input"
                name="password"
                type="password"
                minLength={mode === "login" ? 6 : 8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>
            {state.error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
                {state.error}
              </p>
            )}
            {state.success && (
              <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
                {state.success}
              </p>
            )}
            <button className="btn-primary w-full" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" size={18} />}
              {t(mode === "login" ? "auth.login" : "auth.create")}
            </button>
          </form>
          <p className="mt-6 text-center text-sm">
            {t(mode === "login" ? "auth.newHere" : "auth.registered")} {" "}
            <Link className="font-bold underline" href={mode === "login" ? "/register" : "/login"}>
              {t(mode === "login" ? "auth.create" : "auth.login")}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
