/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw, XCircle } from "lucide-react";
import { useI18n } from "./locale-provider";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

async function compress(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const maxDimension = 1800;
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (output) =>
        output ? resolve(output) : reject(new Error("Could not compress image")),
      "image/jpeg",
      0.82,
    ),
  );
}

export function CameraCapture({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // The video element only exists after stream state renders it. Attach the
  // stream here rather than immediately after setStream(), when the ref is null.
  useEffect(() => {
    if (!stream) return;

    const activeStream = stream;
    const element = video.current;
    if (element) {
      element.srcObject = activeStream;
      void element.play().catch(() => {
        setError(t("camera.previewFailed"));
      });
    }

    return () => {
      if (element) element.srcObject = null;
      activeStream.getTracks().forEach((track) => track.stop());
    };
  }, [stream, t]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function start() {
    setError(undefined);

    if (!window.isSecureContext && location.hostname !== "localhost") {
      setError(t("camera.https"));
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t("camera.unsupported"));
      return;
    }

    try {
      const activeStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(activeStream);
    } catch (reason) {
      const denied =
        reason instanceof DOMException && reason.name === "NotAllowedError";
      setError(
        denied
          ? t("camera.denied")
          : t("camera.unavailable"),
      );
    }
  }

  async function accept(blob: Blob) {
    setBusy(true);
    try {
      const output = await compress(blob);
      const file = new File([output], `capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(output));
      setStream(null);
      onCapture(file);
    } catch {
      setError(t("camera.prepareFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function snap() {
    const element = video.current;
    if (!element || element.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError(t("camera.starting"));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext("2d")?.drawImage(element, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) void accept(blob);
        else setError(t("camera.captureFailed"));
      },
      "image/jpeg",
      0.9,
    );
  }

  function retake() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(undefined);
    setError(undefined);
  }

  return (
    <div className="card overflow-hidden">
      <div className="aspect-[4/3] bg-[#16251f]">
        {preview ? (
          <img
            src={preview}
            alt={t("camera.previewAlt")}
            className="h-full w-full object-contain"
          />
        ) : stream ? (
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-center text-white/75">
            <div>
              <Camera className="mx-auto" size={40} />
              <p className="mt-3 text-sm">{t("camera.clearPhoto")}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 p-4">
        {preview ? (
          <button type="button" onClick={retake} className="btn-secondary">
            <RefreshCw size={18} /> {t("camera.retake")}
          </button>
        ) : stream ? (
          <button
            type="button"
            onClick={snap}
            disabled={busy}
            className="btn-primary"
          >
            <Camera size={18} /> {t("camera.capture")}
          </button>
        ) : (
          <button type="button" onClick={start} className="btn-primary">
            <Camera size={18} /> {t("camera.open")}
          </button>
        )}

        <label className="btn-secondary">
          <ImagePlus size={18} /> {t("camera.choose")}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > MAX_IMAGE_BYTES) {
                setError(t("camera.tooLarge"));
              } else {
                void accept(file);
              }
            }}
          />
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="flex gap-2 border-t border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <XCircle className="shrink-0" size={18} /> {error}
        </p>
      )}
    </div>
  );
}
