import { PhaseNotice } from "@/components/phase-notice";
import { getI18n } from "@/lib/i18n/server";
export default async function Page() { const { t } = await getI18n(); return <PhaseNotice phase={t("phase.three")} title={t("phase.foodTitle")} description={t("phase.foodCopy")} />; }
