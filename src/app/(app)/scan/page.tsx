import Link from "next/link";
import { ReceiptText, Camera, CalendarSearch } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";

export default async function Page() {
  const { t } = await getI18n();
  const scans = [
    ["/scan/receipt", t("scan.receipt"), t("scan.receiptCopy"), ReceiptText],
    ["/scan/food", t("scan.food"), t("scan.foodCopy"), Camera],
    ["/scan/expiration", t("scan.expiration"), t("scan.expirationCopy"), CalendarSearch],
  ] as const;
  return <main className="page"><PageHeader eyebrow={t("scan.eyebrow")} title={t("scan.title")} description={t("scan.description")} /><div className="grid gap-4 sm:grid-cols-2">{scans.map(([href, title, copy, Icon]) => <Link href={href} key={href} className="card p-6 hover:bg-[#edf3ea]"><Icon size={30} /><h2 className="mt-6 text-2xl">{title}</h2><p className="mt-2 text-sm text-[#687970]">{copy}</p></Link>)}</div></main>;
}
