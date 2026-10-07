"use client";

import { useEffect, useState } from "react";
import { ExternalLink, LoaderCircle, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { LineAuthButton } from "./line-auth-button";
import { useI18n } from "./locale-provider";

type Props = {
  connected: boolean;
  synced: boolean;
  displayName: string | null;
  messagingEnabled: boolean;
  friendStatus: "unknown" | "friend" | "not_friend" | "blocked";
  officialAccountUrl?: string;
};

export function LineSettings({ connected, synced, displayName, messagingEnabled, friendStatus, officialAccountUrl }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [enabled, setEnabled] = useState(messagingEnabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!connected || synced) return;
    void fetch("/api/line/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((response) => { if (response.ok) router.refresh(); });
  }, [connected, router, synced]);

  async function save(nextEnabled: boolean) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/line/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled }),
    });
    if (response.ok) {
      setEnabled(nextEnabled);
      setMessage(nextEnabled ? t("line.enabledSuccess") : t("line.disabledSuccess"));
    } else {
      setMessage(t("line.saveFailed"));
    }
    setBusy(false);
  }

  async function sendTest() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/line/test", { method: "POST" });
    setMessage(response.ok ? t("line.testSuccess") : t("line.testFailed"));
    setBusy(false);
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 text-2xl"><MessageCircle size={22} />{t("line.settingsTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-[#64756d]">{t("line.settingsCopy")}</p>
      {!connected ? <div className="mt-4"><LineAuthButton mode="link" /></div> : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-[#dfe5de] p-4">
            <p className="text-sm font-bold">{displayName || t("line.connectedAccount")}</p>
            <p className="mt-1 text-xs text-[#64756d]">{friendStatus === "friend" ? t("line.friendReady") : t("line.friendRequired")}</p>
          </div>
          {friendStatus !== "friend" && officialAccountUrl && <a className="btn-secondary w-full" href={officialAccountUrl} target="_blank" rel="noopener noreferrer">{t("line.addFriend")}<ExternalLink size={16} /></a>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-primary flex-1" disabled={busy || friendStatus !== "friend"} onClick={() => save(!enabled)}>{busy && <LoaderCircle className="animate-spin" size={18} />}{enabled ? t("line.disableMessages") : t("line.enableMessages")}</button>
            <button className="btn-secondary flex-1" disabled={busy || friendStatus !== "friend"} onClick={sendTest}>{t("line.sendTest")}</button>
          </div>
        </div>
      )}
      {message && <p className="mt-3 rounded-xl bg-[#edf3ea] p-3 text-sm" role="status">{message}</p>}
    </section>
  );
}
