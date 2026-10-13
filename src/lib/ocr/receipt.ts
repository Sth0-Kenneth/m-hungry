"use client";

export type ReceiptOcrProgress = {
  status: string;
  progress: number;
};

export type ReceiptOcrResult = {
  text: string;
  confidence: number;
};

export function normalizeReceiptOcrText(value: string) {
  return value
    .normalize("NFKC")
    .replaceAll("\u0000", "")
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function recognizeReceiptText(
  image: File,
  onProgress?: (progress: ReceiptOcrProgress) => void,
): Promise<ReceiptOcrResult> {
  const { createWorker, OEM } = await import("tesseract.js");
  const worker = await createWorker(["jpn", "eng"], OEM.LSTM_ONLY, {
    logger(message) {
      onProgress?.({ status: message.status, progress: message.progress });
    },
  });

  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });
    const result = await worker.recognize(image, { rotateAuto: true });
    return {
      text: normalizeReceiptOcrText(result.data.text).slice(0, 30_000),
      confidence: Math.max(0, Math.min(100, result.data.confidence)),
    };
  } finally {
    await worker.terminate();
  }
}
