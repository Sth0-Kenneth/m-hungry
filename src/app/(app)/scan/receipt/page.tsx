import { PageHeader } from "@/components/page-header";
import { ReceiptScanner } from "@/components/receipt-scanner";
import { getI18n } from "@/lib/i18n/server";

export default async function Page() {
  const { t } = await getI18n();
  return <main className="page max-w-3xl"><PageHeader eyebrow={t("receipt.eyebrow")} title={t("receipt.title")} description={t("receipt.description")} /><ReceiptScanner /></main>;
}
