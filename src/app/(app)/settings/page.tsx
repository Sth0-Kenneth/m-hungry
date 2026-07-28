import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logout } from "@/app/auth-actions";
import { getI18n } from "@/lib/i18n/server";

export default async function Page() {
  const [{ user }, { t }] = await Promise.all([requireUser(), getI18n()]);
  return (
    <main className="page max-w-2xl">
      <PageHeader eyebrow={t("settings.eyebrow")} title={t("settings.title")} />
      <section className="card p-6">
        <p className="label">{t("settings.signedIn")}</p><p>{user.email}</p>
        <hr className="my-6 border-[#e0e3dc]" />
        <h2 className="text-2xl">{t("settings.interfaceLanguage")}</h2>
        <p className="mt-2 text-sm text-[#607168]">{t("settings.languageCopy")}</p>
        <div className="mt-4"><LanguageSwitcher /></div>
        <hr className="my-6 border-[#e0e3dc]" />
        <h2 className="text-2xl">{t("settings.privacy")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#607168]">{t("settings.privacyCopy1")}</p>
        <p className="mt-3 text-sm leading-6 text-[#607168]">{t("settings.privacyCopy2")}</p>
        <form action={logout}><button className="btn-secondary mt-6">{t("nav.logout")}</button></form>
      </section>
    </main>
  );
}
