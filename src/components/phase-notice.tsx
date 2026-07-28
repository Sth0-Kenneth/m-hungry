import Link from "next/link";
import { Wrench } from "lucide-react";
import { PageHeader } from "./page-header";
import { getI18n } from "@/lib/i18n/server";

export async function PhaseNotice({ title, phase, description }: { title: string; phase: string; description: string }) {
  const { t } = await getI18n();
  return (
    <main className="page max-w-2xl">
      <PageHeader eyebrow={phase} title={title} />
      <div className="card p-7">
        <Wrench />
        <p className="mt-4 text-[#607168]">{description}</p>
        <p className="mt-4 text-sm">{t("phase.routeReserved")}</p>
        <Link href="/dashboard" className="btn-primary mt-6">{t("common.backDashboard")}</Link>
      </div>
    </main>
  );
}
