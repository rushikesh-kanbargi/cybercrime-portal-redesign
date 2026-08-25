"use client";

// Client-side image compression (D21) — canvas-based, no dependency. PDFs
// pass through untouched (rendering a PDF to raster to "compress" it would
// destroy the thing that makes a bank statement useful as evidence).

const MAX_DIMENSION = 1600;
const QUALITY = 0.75;

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file; // compression didn't help — keep original

    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // ponytail: decode failure (corrupt/unsupported image) falls back to the
    // original file — server-side size/MIME checks are the real gate.
    return file;
  }
}
