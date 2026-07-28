import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorker } from "@/components/service-worker";
import { LocaleProvider } from "@/components/locale-provider";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: "mHungry", template: "%s · mHungry" },
    description: t("app.description"),
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  themeColor: "#174c37",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dictionary } = await getI18n();
  return (
    <html lang={locale} className={`${sans.variable} ${display.variable}`}>
      <body>
        <LocaleProvider locale={locale} dictionary={dictionary}>
          {children}
          <ServiceWorker />
          <Toaster richColors position="top-center" />
        </LocaleProvider>
      </body>
    </html>
  );
}
