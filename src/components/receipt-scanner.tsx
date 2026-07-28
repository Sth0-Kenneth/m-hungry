"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { CameraCapture } from "./camera-capture";
import { useI18n } from "./locale-provider";
import { createClient } from "@/lib/supabase/client";
import type { ReceiptDraft } from "@/lib/types";
import { receiptAiSchema } from "@/lib/validation";
import { toast } from "sonner";

export function ReceiptScanner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [file, setFile] = useState<File>();
  const [draft, setDraft] = useState<ReceiptDraft>();
  const [imagePath, setImagePath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function process() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t("receipt.sessionExpired"));
      const now = new Date();
      const path = `${user.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw new Error(t("receipt.uploadFailed"));
      setImagePath(path);
      const response = await fetch("/api/ai/process-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || t("receipt.processFailed"));
      setDraft(receiptAiSchema.parse(body));
      toast.success(t("receipt.readSuccess"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("receipt.processFailed"));
    } finally {
      setBusy(false);
    }
  }

  function updateItem(index: number, key: string, value: string | number | boolean | null) {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, itemIndex) =>
              itemIndex === index ? { ...item, [key]: value } : item,
            ),
          }
        : current,
    );
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const response = await fetch("/api/receipts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath, ...draft }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || t("receipt.saveFailed"));
      toast.success(t("receipt.saveSuccess"));
      router.push(`/purchases/${body.purchaseId}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("receipt.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!draft) {
    return (
      <div>
        <CameraCapture onCapture={setFile} />
        <button onClick={process} disabled={!file || busy} className="btn-primary mt-4 w-full">
          {busy && <LoaderCircle className="animate-spin" />}
          {t("receipt.read")}
        </button>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <p className="mt-4 text-xs text-[#687970]">{t("receipt.privacy")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {draft.mock && (
        <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle size={18} />
          {t("common.mockNotice")}
        </div>
      )}
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <label>
          <span className="label">{t("receipt.store")}</span>
          <input className="input" value={draft.storeName ?? ""} onChange={(event) => setDraft({ ...draft, storeName: event.target.value })} />
        </label>
        <label>
          <span className="label">{t("receipt.purchaseDate")}</span>
          <input type="date" className="input" value={draft.purchaseDate ?? ""} onChange={(event) => setDraft({ ...draft, purchaseDate: event.target.value })} />
        </label>
        <label>
          <span className="label">{t("receipt.currency")}</span>
          <input className="input" value={draft.currency} maxLength={3} onChange={(event) => setDraft({ ...draft, currency: event.target.value.toUpperCase() })} />
        </label>
        <label>
          <span className="label">{t("receipt.total")}</span>
          <input type="number" className="input" value={draft.total ?? ""} onChange={(event) => setDraft({ ...draft, total: event.target.value ? Number(event.target.value) : null })} />
        </label>
      </div>
      <div className="space-y-3">
        {draft.items.map((item, index) => (
          <article className="card p-4" key={index}>
            <div className="mb-4 flex items-center justify-between">
              <b>{t("receipt.item", { number: index + 1 })}</b>
              <button aria-label={t("receipt.remove")} onClick={() => setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })}>
                <Trash2 size={18} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="label">{t("receipt.original")}</span><input className="input" value={item.rawName} onChange={(event) => updateItem(index, "rawName", event.target.value)} /></label>
              <label><span className="label">{t("receipt.normalized")}</span><input className="input" value={item.normalizedName} onChange={(event) => updateItem(index, "normalizedName", event.target.value)} /></label>
              <label><span className="label">{t("receipt.quantity")}</span><input type="number" min="0.01" step="any" className="input" value={item.quantity} onChange={(event) => updateItem(index, "quantity", Number(event.target.value))} /></label>
              <label><span className="label">{t("receipt.unit")}</span><input className="input" value={item.unit} onChange={(event) => updateItem(index, "unit", event.target.value)} /></label>
              <label><span className="label">{t("receipt.price")}</span><input type="number" className="input" value={item.totalPrice ?? ""} onChange={(event) => updateItem(index, "totalPrice", event.target.value ? Number(event.target.value) : null)} /></label>
              <label className="flex items-end gap-2 pb-3"><input type="checkbox" checked={item.addToInventory} onChange={(event) => updateItem(index, "addToInventory", event.target.checked)} /><span className="text-sm font-bold">{t("receipt.addInventory")}</span></label>
            </div>
          </article>
        ))}
      </div>
      <button className="btn-secondary" onClick={() => setDraft({ ...draft, items: [...draft.items, { rawName: "", normalizedName: "", quantity: 1, unit: locale === "ja" ? "個" : "piece", unitPrice: null, totalPrice: null, category: null, addToInventory: true }] })}>
        <Plus size={18} /> {t("receipt.addItem")}
      </button>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button onClick={save} disabled={busy || !draft.items.length} className="btn-primary w-full">
        {busy && <LoaderCircle className="animate-spin" />} {t("receipt.confirmSave")}
      </button>
      <p className="text-xs text-[#687970]">{t("receipt.confirmNotice")}</p>
    </div>
  );
}
