import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function Page() {
  const { t } = await getI18n();
  return <main className="grid min-h-screen place-items-center p-5 text-center"><div><h1 className="text-4xl">{t("offline.title")}</h1><p className="mt-3 text-[#607168]">{t("offline.copy")}</p><Link href="/dashboard" className="btn-primary mt-6">{t("offline.retry")}</Link></div></main>;
}
