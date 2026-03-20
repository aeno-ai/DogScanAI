import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Dog,
  Heart,
  Activity,
  Ruler,
  Weight,
  Home,
  Users,
  Sparkles,
  AlertCircle,
  ArrowLeftRight,
  BarChart2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AssistantChatPanel from "./AssistantChatPanel";

// ─── Temperament color map ──────────────────────────────────────────────────
const TEMP_COLORS = {
  playful: "bg-blue-100 text-blue-700",
  loyal: "bg-blue-100 text-blue-700",
  affectionate: "bg-blue-100 text-blue-700",
  devoted: "bg-blue-100 text-blue-700",
  loving: "bg-blue-100 text-blue-700",
  sociable: "bg-blue-100 text-blue-700",
  social: "bg-blue-100 text-blue-700",
  sweet: "bg-blue-100 text-blue-700",
  friendly: "bg-green-100 text-green-700",
  gentle: "bg-green-100 text-green-700",
  amiable: "bg-green-100 text-green-700",
  "good-natured": "bg-green-100 text-green-700",
  "good-tempered": "bg-green-100 text-green-700",
  pleasant: "bg-green-100 text-green-700",
  easygoing: "bg-green-100 text-green-700",
  "even-tempered": "bg-green-100 text-green-700",
  patient: "bg-green-100 text-green-700",
  docile: "bg-green-100 text-green-700",
  lovable: "bg-green-100 text-green-700",
  energetic: "bg-orange-100 text-orange-700",
  active: "bg-orange-100 text-orange-700",
  athletic: "bg-orange-100 text-orange-700",
  agile: "bg-orange-100 text-orange-700",
  lively: "bg-orange-100 text-orange-700",
  vivacious: "bg-orange-100 text-orange-700",
  exuberant: "bg-orange-100 text-orange-700",
  boisterous: "bg-orange-100 text-orange-700",
  "fun-loving": "bg-orange-100 text-orange-700",
  merry: "bg-orange-100 text-orange-700",
  happy: "bg-orange-100 text-orange-700",
  cheerful: "bg-orange-100 text-orange-700",
  outgoing: "bg-orange-100 text-orange-700",
  vocal: "bg-orange-100 text-orange-700",
  calm: "bg-blue-100 text-blue-700",
  quiet: "bg-blue-100 text-blue-700",
  adaptable: "bg-blue-100 text-blue-700",
  sensitive: "bg-blue-100 text-blue-700",
  responsive: "bg-blue-100 text-blue-700",
  resilient: "bg-blue-100 text-blue-700",
  comical: "bg-blue-100 text-blue-700",
  clownish: "bg-blue-100 text-blue-700",
  charming: "bg-blue-100 text-blue-700",
  optimistic: "bg-blue-100 text-blue-700",
  protective: "bg-red-100 text-red-700",
  courageous: "bg-red-100 text-red-700",
  brave: "bg-red-100 text-red-700",
  bold: "bg-red-100 text-red-700",
  fearless: "bg-red-100 text-red-700",
  daring: "bg-red-100 text-red-700",
  feisty: "bg-red-100 text-red-700",
  spirited: "bg-red-100 text-red-700",
  tenacious: "bg-red-100 text-red-700",
  assertive: "bg-red-100 text-red-700",
  dominant: "bg-red-100 text-red-700",
  sassy: "bg-red-100 text-red-700",
  intelligent: "bg-blue-100 text-blue-700",
  smart: "bg-blue-100 text-blue-700",
  bright: "bg-blue-100 text-blue-700",
  trainable: "bg-blue-100 text-blue-700",
  obedient: "bg-blue-100 text-blue-700",
  alert: "bg-blue-100 text-blue-700",
  curious: "bg-blue-100 text-blue-700",
  inquisitive: "bg-blue-100 text-blue-700",
  cooperative: "bg-blue-100 text-blue-700",
  hardworking: "bg-blue-100 text-blue-700",
  eager: "bg-blue-100 text-blue-700",
  reliable: "bg-teal-100 text-teal-700",
  trustworthy: "bg-teal-100 text-teal-700",
  faithful: "bg-teal-100 text-teal-700",
  dependable: "bg-teal-100 text-teal-700",
  willing: "bg-teal-100 text-teal-700",
  hardy: "bg-teal-100 text-teal-700",
  strong: "bg-teal-100 text-teal-700",
  determined: "bg-teal-100 text-teal-700",
  confident: "bg-teal-100 text-teal-700",
  "self-assured": "bg-teal-100 text-teal-700",
  quick: "bg-teal-100 text-teal-700",
  independent: "bg-yellow-100 text-yellow-700",
  aloof: "bg-yellow-100 text-yellow-700",
  dignified: "bg-yellow-100 text-yellow-700",
  regal: "bg-yellow-100 text-yellow-700",
  stubborn: "bg-yellow-100 text-yellow-700",
  "strong-willed": "bg-yellow-100 text-yellow-700",
  "wary of strangers": "bg-yellow-100 text-yellow-700",
  "cat-like": "bg-yellow-100 text-yellow-700",
  mischievous: "bg-yellow-100 text-yellow-700",
};

const getTempColor = (t) => TEMP_COLORS[t] ?? "bg-gray-100 text-gray-600";

// ─── Per-slot accent theme ──────────────────────────────────────────────────
const SLOT_ACCENT = [
  {
    border: "border-blue-400",
    bg: "bg-blue-50",
    text: "text-blue-700",
    badgeBg: "bg-blue-600",
    ring: "ring-blue-300",
    label: "A",
    dot: "bg-blue-500",
  },
  {
    border: "border-violet-400",
    bg: "bg-violet-50",
    text: "text-violet-700",
    badgeBg: "bg-violet-600",
    ring: "ring-violet-300",
    label: "B",
    dot: "bg-violet-500",
  },
  {
    border: "border-emerald-400",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badgeBg: "bg-emerald-600",
    ring: "ring-emerald-300",
    label: "C",
    dot: "bg-emerald-500",
  },
];

// ─── Section header ─────────────────────────────────────────────────────────
const SectionHeader = ({ label, span }) => (
  <tr>
    <td
      colSpan={span}
      className="pt-6 pb-1.5 pl-4 pr-3 bg-slate-50 border-y border-slate-100"
    >
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
    </td>
  </tr>
);

// ─── Stat row ───────────────────────────────────────────────────────────────
const StatRow = ({ label, icon: Icon, iconColor, values }) => (
  <tr className="border-b border-slate-100 group last:border-0">
    <td className="py-3 pl-3 pr-2 w-28 sm:w-36 align-top bg-white sticky left-0 z-10 shadow-[1px_0_0_#f1f5f9]">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 ${iconColor}`} />
        <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
          {label}
        </span>
      </div>
    </td>
    {values.map((v, i) => (
      <td
        key={i}
        className="py-3 px-3 sm:px-4 align-top text-xs sm:text-sm font-medium text-slate-800 group-hover:bg-slate-50/80 transition-colors min-w-[130px] sm:min-w-[180px]"
      >
        {v ?? <span className="text-slate-300">—</span>}
      </td>
    ))}
  </tr>
);

// ─── Breed search dropdown ──────────────────────────────────────────────────
const BreedSearchDropdown = ({ breeds, selected, onSelect, accent, label }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const results = breeds
    .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, breeds.length);

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (breed) => {
    onSelect(breed);
    setQuery("");
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onSelect(null);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative w-full">
      {/* Slot label */}
      <div className="mb-1">
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          Breed {label}
        </span>
      </div>

      {selected ? (
        /* ── Filled slot ── */
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl border-2 ${accent.border} ${accent.bg} transition-all`}
        >
          <img
            src={selected.image}
            alt={selected.name}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover ring-2 ${accent.ring} flex-shrink-0`}
          />
          <div className="flex-1 min-w-0">
            <p className={`text-xs sm:text-sm font-bold truncate ${accent.text}`}>
              {selected.name}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-500 capitalize truncate">
              {selected.size}
              {selected.characteristics?.group
                ? ` · ${selected.characteristics.group}`
                : ""}
            </p>
          </div>
          <button
            onClick={clear}
            className="p-1.5 hover:bg-white/70 rounded-lg transition-colors flex-shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* ── Empty / searching slot ── */
        <div>
          <div
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed ${accent.border} bg-white hover:${accent.bg} focus-within:${accent.bg} transition-colors cursor-text`}
            onClick={() => {
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <Search className={`w-3.5 h-3.5 flex-shrink-0 ${accent.text}`} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search…"
              className={`flex-1 min-w-0 text-sm bg-transparent outline-none placeholder-slate-400 ${accent.text}`}
            />
            {query && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {open && results.length > 0 && (
            <div className="absolute z-50 top-full mt-1.5 w-full bg-white rounded-xl shadow-2xl border border-slate-100 overflow-y-auto max-h-52">
              {results.map((b) => (
                <button
                  key={b.id}
                  onMouseDown={() => pick(b)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <img
                    src={b.image}
                    alt={b.name}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {b.name}
                    </p>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {b.size}
                      {b.characteristics?.group
                        ? ` · ${b.characteristics.group}`
                        : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {open && results.length === 0 && query && (
            <div className="absolute z-50 top-full mt-1.5 w-full bg-white rounded-xl shadow-xl border border-slate-100 py-6 text-center">
              <Dog className="w-7 h-7 text-slate-300 mx-auto mb-1" />
              <p className="text-xs text-slate-500">No results for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Mobile breed slot pill (compact horizontal selector) ──────────────────
const MobileSlotPill = ({ slot, accent, onTap, onClear }) => {
  if (slot) {
    return (
      <div
        className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border-2 ${accent.border} ${accent.bg} flex-shrink-0`}
      >
        <img
          src={slot.image}
          alt={slot.name}
          className={`w-7 h-7 rounded-full object-cover ring-1 ${accent.ring}`}
        />
        <span className={`text-xs font-bold ${accent.text} max-w-[80px] truncate`}>
          {slot.name}
        </span>
        <button
          onClick={onClear}
          className="ml-0.5 text-slate-400 hover:text-slate-600"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onTap}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-dashed ${accent.border} text-xs font-semibold ${accent.text} flex-shrink-0 hover:${accent.bg} transition-colors`}
    >
      <Plus className="w-3 h-3" />
      Breed {accent.label}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main modal
// ═══════════════════════════════════════════════════════════════════════════
const BreedCompareModal = ({ open, onClose, breeds = [] }) => {
  const [slots, setSlots] = useState([null, null, null]);
  // Which slot is being edited on mobile (null = none open)
  const [mobileEditSlot, setMobileEditSlot] = useState(null);

  // Keyboard & scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) { setSlots([null, null, null]); setMobileEditSlot(null); }
  }, [open]);

  const setSlot = (idx, breed) =>
    setSlots((prev) => Object.assign([...prev], { [idx]: breed }));

  const filled = slots.filter(Boolean);
  const canCompare = filled.length >= 2;

  const availableFor = (idx) => {
    const takenIds = slots.filter((b, i) => b && i !== idx).map((b) => b.id);
    return breeds.filter((b) => !takenIds.includes(b.id));
  };

  const maxW =
    filled.length >= 3 ? "1060px" : filled.length >= 2 ? "840px" : "660px";

  const breedCompareContext =
    filled.length > 0
      ? {
          type: "breed_comparison",
          breeds: filled.map((b) => ({
            name: b.name,
            size: b.size,
            temperament: b.temperament,
            origin: b.characteristics?.origin,
            group: b.characteristics?.group,
            lifespan: b.characteristics?.lifespan,
            height: b.measurements?.height,
            weight: b.measurements?.weight,
            coat: b.physicalTraits?.coat,
            ears: b.physicalTraits?.ears,
            snout: b.physicalTraits?.snout,
            tail: b.physicalTraits?.tail,
            healthConsiderations: Array.isArray(b.healthConsiderations)
              ? b.healthConsiderations
              : [],
            description: b.description,
          })),
          summary: `Comparing ${filled.map((b) => b.name).join(", ")}`,
        }
      : null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Compare dog breeds"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ── Panel ────────────────────────────────────────────────────── */}
      <div
        className="relative z-10 bg-white w-full rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{
          maxWidth: maxW,
          /* Mobile: up to 95% viewport height; desktop: 92dvh */
          maxHeight: "95dvh",
        }}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-slate-200" />
        </div>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-[15px] font-bold text-slate-900 leading-tight">
                Compare Breeds
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
                Select up to 3 breeds to compare side by side
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Breed selectors ─────────────────────────────────────────── */}
        {/*
          Mobile  → horizontal pill row (compact, always visible) + a
                    full-screen breed picker that slides up when a pill is tapped
          Desktop → grid of 3 search dropdowns (original layout)
        */}

        {/* MOBILE slot pills */}
        <div className="sm:hidden px-4 py-3 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {slots.map((slot, i) => (
              <MobileSlotPill
                key={i}
                slot={slot}
                accent={SLOT_ACCENT[i]}
                onTap={() => setMobileEditSlot(i)}
                onClear={(e) => { e.stopPropagation(); setSlot(i, null); }}
              />
            ))}
          </div>
          {!canCompare && (
            <p className="text-[11px] text-slate-400 mt-2">
              {filled.length === 0
                ? "Tap a slot above to pick a breed"
                : "Add one more breed to compare"}
            </p>
          )}
        </div>

        {/* DESKTOP slot grid */}
        <div className="hidden sm:block px-5 pt-4 pb-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="grid grid-cols-3 gap-3">
            {slots.map((slot, i) => (
              <BreedSearchDropdown
                key={i}
                breeds={availableFor(i)}
                selected={slot}
                onSelect={(b) => setSlot(i, b)}
                accent={SLOT_ACCENT[i]}
                label={SLOT_ACCENT[i].label}
              />
            ))}
          </div>
        </div>

        {/* ── Comparison area (scrollable) ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          {!canCompare ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <BarChart2 className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300" />
              </div>
              <h3 className="text-sm sm:text-[15px] font-semibold text-slate-600 mb-1">
                Select at least 2 breeds
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs">
                Use the{" "}
                <span className="sm:hidden">slots above</span>
                <span className="hidden sm:inline">search fields above</span>{" "}
                to pick breeds — their stats will appear here side by side.
              </p>
            </div>
          ) : (
            /* Horizontal scroll wrapper for the table */
            <div className="overflow-x-auto">
              <table
                className="w-full text-left border-collapse"
                style={{ minWidth: filled.length >= 3 ? "560px" : filled.length >= 2 ? "420px" : "280px" }}
              >
                {/* Breed header row */}
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="w-28 sm:w-36 py-3 sm:py-4 pl-3 sm:pl-4 pr-2 sm:pr-3 sticky left-0 bg-white z-20 shadow-[1px_0_0_#f1f5f9]" />
                    {filled.map((breed, i) => (
                      <th
                        key={i}
                        className="py-3 sm:py-4 px-3 sm:px-4 min-w-[130px] sm:min-w-[180px] align-top"
                      >
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="relative">
                            <img
                              src={breed.image}
                              alt={breed.name}
                              className={`w-full h-20 sm:h-28 object-cover rounded-xl ring-2 ${SLOT_ACCENT[i].ring}`}
                            />
                            <span
                              className={`absolute top-1.5 left-1.5 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-[11px] font-black text-white rounded-full shadow-md ${SLOT_ACCENT[i].badgeBg}`}
                            >
                              {SLOT_ACCENT[i].label}
                            </span>
                          </div>
                          <div>
                            <p
                              className={`text-[12px] sm:text-[13px] font-bold ${SLOT_ACCENT[i].text} leading-tight`}
                            >
                              {breed.name}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 capitalize mt-0.5">
                              {breed.size} · {breed.characteristics?.group ?? "—"}
                            </p>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Overview */}
                  <SectionHeader label="Overview" span={filled.length + 1} />
                  <StatRow label="Size" icon={Dog} iconColor="text-blue-500"
                    values={filled.map((b) => <span className="capitalize">{b.size}</span>)} />
                  <StatRow label="Origin" icon={Home} iconColor="text-rose-500"
                    values={filled.map((b) => b.characteristics?.origin ?? "—")} />
                  <StatRow label="Group" icon={Users} iconColor="text-violet-500"
                    values={filled.map((b) => b.characteristics?.group ?? "—")} />
                  <StatRow label="Lifespan" icon={Heart} iconColor="text-pink-500"
                    values={filled.map((b) =>
                      b.characteristics?.lifespan ? `${b.characteristics.lifespan} yrs` : "—"
                    )} />

                  {/* Measurements */}
                  <SectionHeader label="Measurements" span={filled.length + 1} />
                  <StatRow label="Height" icon={Ruler} iconColor="text-green-500"
                    values={filled.map((b) =>
                      b.measurements?.height ? `${b.measurements.height} in` : "—"
                    )} />
                  <StatRow label="Weight" icon={Weight} iconColor="text-amber-500"
                    values={filled.map((b) =>
                      b.measurements?.weight ? `${b.measurements.weight} lbs` : "—"
                    )} />

                  {/* Physical Traits */}
                  <SectionHeader label="Physical Traits" span={filled.length + 1} />
                  <StatRow label="Snout" icon={Dog} iconColor="text-orange-500"
                    values={filled.map((b) => b.physicalTraits?.snout ?? "—")} />
                  <StatRow label="Ears" icon={AlertCircle} iconColor="text-sky-500"
                    values={filled.map((b) => b.physicalTraits?.ears ?? "—")} />
                  <StatRow label="Coat" icon={Sparkles} iconColor="text-purple-500"
                    values={filled.map((b) => b.physicalTraits?.coat ?? "—")} />
                  <StatRow label="Tail" icon={Activity} iconColor="text-teal-500"
                    values={filled.map((b) => b.physicalTraits?.tail ?? "—")} />

                  {/* Temperament */}
                  <SectionHeader label="Temperament" span={filled.length + 1} />
                  <tr className="border-b border-slate-100 group">
                    <td className="py-3 pl-3 pr-2 align-top sticky left-0 bg-white z-10 shadow-[1px_0_0_#f1f5f9]">
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Traits
                      </span>
                    </td>
                    {filled.map((b, i) => (
                      <td key={i} className="py-3 px-3 sm:px-4 align-top group-hover:bg-slate-50/80 transition-colors">
                        <div className="flex flex-wrap gap-1 sm:gap-1.5">
                          {(b.temperament ?? []).map((t, j) => (
                            <span key={j} className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium ${getTempColor(t)}`}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Health Notes */}
                  {filled.some(
                    (b) => Array.isArray(b.healthConsiderations) && b.healthConsiderations.length > 0
                  ) && (
                    <>
                      <SectionHeader label="Health Notes" span={filled.length + 1} />
                      <tr className="border-b border-slate-100 group">
                        <td className="py-3 pl-3 pr-2 align-top sticky left-0 bg-white z-10 shadow-[1px_0_0_#f1f5f9]">
                          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Conditions
                          </span>
                        </td>
                        {filled.map((b, i) => (
                          <td key={i} className="py-3 px-3 sm:px-4 align-top group-hover:bg-slate-50/80 transition-colors">
                            {b.healthConsiderations?.length ? (
                              <ul className="space-y-1 sm:space-y-1.5">
                                {b.healthConsiderations.map((h, j) => (
                                  <li key={j} className="flex items-start gap-1.5 text-[11px] sm:text-xs text-slate-700">
                                    <span className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                                    {h}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-sm text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}

                  {/* About */}
                  {filled.some((b) => b.description) && (
                    <>
                      <SectionHeader label="About" span={filled.length + 1} />
                      <tr className="border-b border-slate-100 group">
                        <td className="py-3 pl-3 pr-2 align-top sticky left-0 bg-white z-10 shadow-[1px_0_0_#f1f5f9]">
                          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Summary
                          </span>
                        </td>
                        {filled.map((b, i) => (
                          <td key={i} className="py-3 px-3 sm:px-4 align-top group-hover:bg-slate-50/80 transition-colors">
                            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">{b.description ?? "—"}</p>
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* AI Chat */}
          {canCompare && (
            <div className="border-t border-slate-100">
              <AssistantChatPanel
                mode="scan"
                key={filled.map((b) => b.id).join("-")}
                scanContext={breedCompareContext}
                title="Ask About These Breeds"
                subtitle={`Ask Casper anything about ${filled.map((b) => b.name).join(", ")}.`}
              />
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <p className="text-xs text-slate-400">
            {filled.length === 0
              ? "No breeds selected"
              : `Comparing ${filled.length} breed${filled.length !== 1 ? "s" : ""}`}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Mobile breed picker sheet ──────────────────────────────────── */}
      {mobileEditSlot !== null && (
        <>
          <div
            className="absolute inset-0 z-30 sm:hidden"
            onClick={() => setMobileEditSlot(null)}
          />
          <MobileBreedPicker
            slot={mobileEditSlot}
            accent={SLOT_ACCENT[mobileEditSlot]}
            breeds={availableFor(mobileEditSlot)}
            onSelect={(b) => {
              setSlot(mobileEditSlot, b);
              setMobileEditSlot(null);
            }}
            onClose={() => setMobileEditSlot(null)}
          />
        </>
      )}
    </div>
  );
};

// ─── Mobile breed picker (full-screen search sheet) ────────────────────────
const MobileBreedPicker = ({ slot, accent, breeds, onSelect, onClose }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus with slight delay to let animation settle
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const results = breeds.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[300] sm:hidden bg-white rounded-t-2xl shadow-2xl flex flex-col"
      style={{ maxHeight: "85dvh" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Handle */}
      <div className="flex justify-center pt-2.5 pb-1">
        <div className="w-9 h-1 rounded-full bg-slate-200" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 flex items-center justify-center text-[11px] font-black text-white rounded-full shadow ${accent.badgeBg}`}>
            {accent.label}
          </span>
          <span className="text-sm font-bold text-slate-800">
            Choose Breed {accent.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 ${accent.border} bg-white`}>
          <Search className={`w-4 h-4 flex-shrink-0 ${accent.text}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search breed…"
            className={`flex-1 text-sm bg-transparent outline-none placeholder-slate-400 ${accent.text}`}
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <Dog className="w-10 h-10 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No breeds match "{query}"</p>
          </div>
        )}
        {results.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b)}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
          >
            <img
              src={b.image}
              alt={b.name}
              className={`w-11 h-11 rounded-xl object-cover ring-2 ${accent.ring} flex-shrink-0`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{b.name}</p>
              <p className="text-xs text-slate-400 capitalize">
                {b.size}
                {b.characteristics?.group ? ` · ${b.characteristics.group}` : ""}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
          </button>
        ))}
        {/* Bottom padding for safe area */}
        <div className="h-6" />
      </div>
    </div>
  );
};

export default BreedCompareModal;