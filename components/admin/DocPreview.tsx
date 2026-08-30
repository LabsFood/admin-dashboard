"use client";

import { FileText, ShieldCheck } from "lucide-react";
import type { BcDocument } from "@/lib/mock/batchcookers";

/**
 * Aperçu d'une pièce justificative.
 * Les images sont rendues telles quelles ; les PDF sont simulés par une page A4
 * stylisée (même approche que l'écran Candidatures).
 */
export default function DocPreview({
  doc,
  chefName,
  large = false,
}: {
  doc: BcDocument;
  chefName: string;
  large?: boolean;
}) {
  if (doc.format === "image" && doc.previewUrl) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={doc.previewUrl}
          alt={doc.label}
          className={`w-full object-cover ${large ? "max-h-[70vh]" : "max-h-72"}`}
        />
      </div>
    );
  }

  const isCertificate = ["haccp", "rc-pro", "sap-coop", "crcesu", "approval"].includes(doc.id);

  return (
    <div
      className={`mx-auto rounded-lg bg-white p-6 shadow-sm ${large ? "max-w-md" : ""}`}
      style={{ aspectRatio: "1 / 1.414" }}
    >
      {isCertificate ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-terra-pale text-terra-deep">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <p className="mt-3 font-display text-base font-bold text-navy">{doc.label}</p>
          <p className="mt-1 text-xs text-ink-soft">Délivré à</p>
          <p className="text-sm font-semibold text-navy">{chefName}</p>
          <div className="mt-4 w-full space-y-1.5">
            {[80, 60, 70].map((w, i) => (
              <div
                key={i}
                className="mx-auto h-1.5 rounded-full bg-cream-deep"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
          <div className="mt-5 h-9 w-9 rounded-full border-2 border-dashed border-terra/50" />
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-terra" />
            <p className="font-display text-sm font-bold text-navy">{doc.label}</p>
          </div>
          <div className="mt-1 h-1 w-16 rounded-full bg-terra" />
          <p className="mt-2 text-[10px] text-ink-soft">{chefName}</p>
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((block) => (
              <div key={block}>
                <div className="h-1.5 w-1/3 rounded-full bg-terra-pale" />
                <div className="mt-1.5 space-y-1">
                  {[100, 92, 78].map((w, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full bg-cream-deep"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-wider text-ink-soft">
        Page 1 / {doc.pages ?? 1} · aperçu simulé
      </p>
    </div>
  );
}
