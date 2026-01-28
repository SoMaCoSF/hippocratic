// ==============================================================================
// file_id: SOM-SCR-0015-v0.1.0
// name: FacilityCard.tsx
// description: Facility card component for map/search results
// project_id: HIPPOCRATIC
// category: script
// tags: [web, react, ui, facilities, card]
// created: 2026-01-16
// modified: 2026-01-16
// version: 0.1.0
// agent_id: AGENT-CURSOR-OPENAI
// execution: Imported by Next.js page
// ==============================================================================

"use client";

import type { Facility } from "@/lib/facilities";
import { formatAddress, googleMapsLink, streetViewLink, zillowLink } from "@/lib/facilities";
import { loadDraft, saveDraft, type FacilityObservationDraft, type YesNoUnknown } from "@/lib/observations";
import { useMemo, useState } from "react";

function Badge({
  children,
  tone = "zinc",
}: {
  children: React.ReactNode;
  tone?: "zinc" | "green" | "red" | "amber" | "blue";
}) {
  const cls =
    tone === "green"
      ? "bg-green-100 text-green-800 border-green-200"
      : tone === "red"
        ? "bg-red-100 text-red-800 border-red-200"
        : tone === "amber"
          ? "bg-amber-100 text-amber-800 border-amber-200"
          : tone === "blue"
            ? "bg-blue-100 text-blue-800 border-blue-200"
            : "bg-zinc-100 text-zinc-800 border-zinc-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

export function FacilityCard({
  facility,
  distanceMiles,
  sameLocationCount,
  onSelect,
  selected,
}: {
  facility: Facility;
  distanceMiles?: number | null;
  sameLocationCount?: number | null;
  onSelect?: (id: string) => void;
  selected?: boolean;
}) {
  const maps = googleMapsLink(facility);
  const street = streetViewLink(facility);
  const zillow = zillowLink(facility);

  const statusTone =
    facility.inService === true ? "green" : facility.inService === false ? "red" : "amber";

  const stateCode = "CA";
  const [draft, setDraft] = useState<FacilityObservationDraft>(() => loadDraft(stateCode, facility.id));

  const isDirty = useMemo(() => {
    const saved = loadDraft(stateCode, facility.id);
    // Cheap compare for MVP
    return JSON.stringify({ ...draft, updatedAt: "" }) !== JSON.stringify({ ...saved, updatedAt: "" });
  }, [draft, facility.id]);

  const setField = <K extends keyof FacilityObservationDraft>(key: K, value: FacilityObservationDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const ynuButton = (label: string, value: YesNoUnknown, cur: YesNoUnknown, onChange: (v: YesNoUnknown) => void) => {
    const active = cur === value;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(value);
        }}
        className={[
          "rounded-md border px-2 py-1 text-xs font-medium",
          active
            ? "border-blue-400 bg-blue-50 text-blue-800"
            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
          "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
          active ? "dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200" : "",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <button
      type="button"
      onClick={() => onSelect?.(facility.id)}
      className={[
        "w-full text-left rounded-lg border bg-white p-3 shadow-sm hover:shadow transition",
        "dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-800",
        selected ? "border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/40" : "border-zinc-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{facility.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {facility.categoryName ? <Badge tone="blue">{facility.categoryName}</Badge> : null}
            <Badge tone={statusTone}>
              {facility.inService === true
                ? "In service (derived)"
                : facility.inService === false
                  ? "Possibly not in service"
                  : "Unknown status"}
            </Badge>
            {sameLocationCount && sameLocationCount > 1 ? (
              <Badge tone="amber">Same address: {sameLocationCount}</Badge>
            ) : null}
            {distanceMiles != null ? <Badge>{distanceMiles.toFixed(1)} mi</Badge> : null}
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
        <div className="truncate">{formatAddress(facility) || "Address unavailable"}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {facility.phone ? <span>Phone: {facility.phone}</span> : null}
          {facility.licenseStatus ? <span>License: {facility.licenseStatus}</span> : null}
          {facility.licenseExpirationDate ? <span>Exp: {facility.licenseExpirationDate}</span> : null}
          {facility.dataDate ? <span>Data: {facility.dataDate}</span> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {maps ? (
          <a
            className="text-xs font-medium text-blue-700 hover:underline"
            href={maps}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Open in Maps
          </a>
        ) : null}
        {street ? (
          <a
            className="text-xs font-medium text-blue-700 hover:underline"
            href={street}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Street View
          </a>
        ) : null}
        {zillow ? (
          <a
            className="text-xs font-medium text-blue-700 hover:underline"
            href={zillow}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Zillow
          </a>
        ) : null}
        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          Checklist is local-only for MVP (saved in your browser).
        </span>
      </div>

      <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Validity checklist</div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
            {draft.updatedAt ? `Saved: ${new Date(draft.updatedAt).toLocaleString()}` : ""}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-zinc-700 dark:text-zinc-300">Signage present</div>
            <div className="flex items-center gap-1">
              {ynuButton("Yes", "yes", draft.signagePresent, (v) => setField("signagePresent", v))}
              {ynuButton("No", "no", draft.signagePresent, (v) => setField("signagePresent", v))}
              {ynuButton("?", "unknown", draft.signagePresent, (v) => setField("signagePresent", v))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-zinc-700 dark:text-zinc-300">Appears open</div>
            <div className="flex items-center gap-1">
              {ynuButton("Yes", "yes", draft.appearsOpen, (v) => setField("appearsOpen", v))}
              {ynuButton("No", "no", draft.appearsOpen, (v) => setField("appearsOpen", v))}
              {ynuButton("?", "unknown", draft.appearsOpen, (v) => setField("appearsOpen", v))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-zinc-700 dark:text-zinc-300">Door locked</div>
            <div className="flex items-center gap-1">
              {ynuButton("Yes", "yes", draft.doorLocked, (v) => setField("doorLocked", v))}
              {ynuButton("No", "no", draft.doorLocked, (v) => setField("doorLocked", v))}
              {ynuButton("?", "unknown", draft.doorLocked, (v) => setField("doorLocked", v))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-zinc-700 dark:text-zinc-300">Staff observed</div>
            <div className="flex items-center gap-1">
              {ynuButton("Yes", "yes", draft.staffedObserved, (v) => setField("staffedObserved", v))}
              {ynuButton("No", "no", draft.staffedObserved, (v) => setField("staffedObserved", v))}
              {ynuButton("?", "unknown", draft.staffedObserved, (v) => setField("staffedObserved", v))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-zinc-700 dark:text-zinc-300">Clients/patients observed</div>
            <div className="flex items-center gap-1">
              {ynuButton("Yes", "yes", draft.clientsObserved, (v) => setField("clientsObserved", v))}
              {ynuButton("No", "no", draft.clientsObserved, (v) => setField("clientsObserved", v))}
              {ynuButton("?", "unknown", draft.clientsObserved, (v) => setField("clientsObserved", v))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <textarea
              value={draft.notes}
              placeholder="Notes (what you saw, date/time, context)…"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setField("notes", e.target.value)}
              className="min-h-[64px] w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-900 outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Photos: placeholder only (upload/storage next).
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setField("photoPlaceholderCount", draft.photoPlaceholderCount + 1);
                }}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-800"
              >
                + Add photo placeholder ({draft.photoPlaceholderCount})
              </button>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const fresh = loadDraft(stateCode, facility.id);
                  setDraft(fresh);
                }}
                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-800"
              >
                Revert
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  saveDraft(stateCode, draft);
                  setDraft(loadDraft(stateCode, facility.id));
                }}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
            {isDirty ? (
              <div className="text-[11px] text-amber-700 dark:text-amber-300">Unsaved changes</div>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}



