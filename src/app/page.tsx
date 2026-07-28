import Link from "next/link";
import { Camera, ReceiptText, BellRing, CookingPot, ArrowRight, Leaf } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getI18n } from "@/lib/i18n/server";

export default async function Home() {
  const { t } = await getI18n();
  const sampleItems = [
    [t("landing.milk"), t("landing.tomorrow"), "bg-orange-400", "1 L"],
    [t("landing.spinach"), t("landing.in2days"), "bg-yellow-400", "240 g"],
    [t("landing.eggs"), t("landing.in3days"), "bg-yellow-300", "6 pcs"],
  ];
  const features = [
    [Camera, t("landing.featureScan"), t("landing.featureScanCopy")],
    [ReceiptText, t("landing.featureReceipt"), t("landing.featureReceiptCopy")],
    [BellRing, t("landing.featureExpiry"), t("landing.featureExpiryCopy")],
  ] as const;

  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5">
        <div className="flex items-center gap-2 font-bold">
          <span className="grid size-9 place-items-center rounded-xl bg-[#174c37] text-white">
            <Leaf size={19} />
          </span>
          mHungry
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <Link href="/login" className="btn-secondary !py-2">
            {t("landing.login")}
          </Link>
        </div>
      </nav>
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-12 md:grid-cols-[1.1fr_.9fr] md:py-24">
        <div>
          <div className="mb-5 inline-flex rounded-full bg-[#dfeade] px-4 py-2 text-sm font-bold">
            {t("landing.tagline")}
          </div>
          <h1 className="max-w-2xl text-5xl leading-[1.03] tracking-tight md:text-7xl">
            {t("landing.title1")}
            <br />
            <span className="text-[#2f7658]">{t("landing.title2")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#587066]">
            {t("landing.description")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary">
              {t("landing.create")} <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn-secondary">
              {t("landing.existing")}
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#6c7c75]">{t("landing.confirm")}</p>
        </div>
        <div>
          <div className="card rotate-1 bg-[#fffdf8] p-5 md:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6c7c75]">{t("landing.greeting")}</p>
                <h2 className="text-3xl">{t("landing.useNext")}</h2>
              </div>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-800">
                {t("landing.soonCount")}
              </span>
            </div>
            {sampleItems.map(([name, expiry, color, quantity]) => (
              <div key={name} className="mb-3 flex items-center gap-4 rounded-2xl border border-[#e3e5de] bg-white p-4">
                <span className={`size-3 rounded-full ${color}`} />
                <div className="flex-1">
                  <b>{name}</b>
                  <p className="text-sm text-[#6c7c75]">{expiry}</p>
                </div>
                <span className="text-sm">{quantity}</span>
              </div>
            ))}
            <div className="mt-5 rounded-2xl bg-[#174c37] p-5 text-white">
              <CookingPot className="mb-3" />
              <h3 className="text-xl">{t("landing.recipe")}</h3>
              <p className="mt-1 text-sm text-white/75">{t("landing.recipeMeta")}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-[#e8eee5] px-5 py-14">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {features.map(([Icon, title, copy]) => (
            <article className="card p-6" key={title}>
              <Icon />
              <h2 className="mt-5 text-2xl">{title}</h2>
              <p className="mt-2 text-[#607168]">{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
