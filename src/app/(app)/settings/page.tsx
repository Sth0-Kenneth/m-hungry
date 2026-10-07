import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logout } from "@/app/auth-actions";
import { getI18n } from "@/lib/i18n/server";
import { NotificationSettings } from "@/components/notification-settings";
import { LineSettings } from "@/components/line-settings";
import { env } from "@/lib/env";
import { LINE_PROVIDER } from "@/lib/line/identity";

export default async function Page() {
  const [{ user, supabase }, { t }] = await Promise.all([requireUser(), getI18n()]);
  const lineEnabled = env.NEXT_PUBLIC_LINE_LOGIN_ENABLED === "true";
  const lineIdentityConnected = user.identities?.some((identity) => identity.provider === LINE_PROVIDER) ?? false;
  const [{data:settings},{data:notifications},lineResult]=await Promise.all([
    supabase.from("user_settings").select("reminder_days,preferred_cooking_time").eq("user_id",user.id).maybeSingle(),
    supabase.from("notifications").select("id,title,message,created_at,read_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20),
    lineEnabled
      ? supabase.from("line_connections").select("display_name,messaging_enabled,friend_status").eq("user_id",user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const lineConnection = lineResult.data;
  const friendStatus = lineConnection?.friend_status === "friend" || lineConnection?.friend_status === "not_friend" || lineConnection?.friend_status === "blocked"
    ? lineConnection.friend_status
    : "unknown";
  return (
    <main className="page max-w-2xl">
      <PageHeader eyebrow={t("settings.eyebrow")} title={t("settings.title")} />
      <section className="card p-6">
        <p className="label">{t("settings.signedIn")}</p>
        <p>{user.email ?? lineConnection?.display_name ?? t("line.connectedAccount")}</p>
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
      {lineEnabled && (
        <div className="mt-6">
          <LineSettings
            connected={lineIdentityConnected}
            synced={Boolean(lineConnection)}
            displayName={lineConnection?.display_name ?? null}
            messagingEnabled={lineConnection?.messaging_enabled ?? false}
            friendStatus={friendStatus}
            officialAccountUrl={env.NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL}
          />
        </div>
      )}
      <div className="mt-6"><NotificationSettings initialDays={settings?.reminder_days??[0,1,3]} initialTime={Number(settings?.preferred_cooking_time)||30} notifications={notifications??[]}/></div>
    </main>
  );
}
