import Link from "next/link";
import {
  LayoutDashboard,
  ScanLine,
  Package,
  BookOpen,
  History,
  Settings,
  Leaf,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/auth-actions";
import { LanguageSwitcher } from "./language-switcher";
import { getI18n } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const links = [
  ["/dashboard", "nav.dashboard", LayoutDashboard],
  ["/scan", "nav.scan", ScanLine],
  ["/inventory", "nav.inventory", Package],
  ["/recipes", "nav.recipes", BookOpen],
  ["/usage", "nav.usage", History],
  ["/settings", "nav.settings", Settings],
] as const satisfies ReadonlyArray<readonly [string, TranslationKey, typeof LayoutDashboard]>;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-[#d9ded5] bg-[#f1f2ea] p-5 md:flex md:flex-col">
        <Link href="/dashboard" className="mb-5 flex items-center gap-2 font-bold">
          <span className="grid size-9 place-items-center rounded-xl bg-[#174c37] text-white">
            <Leaf size={18} />
          </span>
          mHungry
        </Link>
        <LanguageSwitcher compact />
        <nav className="mt-6 space-y-1">
          {links.map(([href, key, Icon]) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold hover:bg-white"
            >
              <Icon size={19} />
              {t(key)}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-auto">
          <button className="flex items-center gap-3 px-3 py-3 text-sm font-bold">
            <LogOut size={18} />
            {t("nav.logout")}
          </button>
        </form>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-[#d9ded5] bg-[#f7f7f2] px-4 py-3 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="grid size-8 place-items-center rounded-lg bg-[#174c37] text-white">
              <Leaf size={16} />
            </span>
            mHungry
          </Link>
          <LanguageSwitcher compact />
        </header>
        {children}
      </div>
      <nav
        aria-label={t("nav.primary")}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[#d9ded5] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {links.map(([href, key, Icon]) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 py-2 text-center text-[10px] font-bold"
          >
            <Icon size={20} />
            {t(key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
