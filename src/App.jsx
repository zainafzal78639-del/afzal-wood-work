import { useState } from "react";

// ─────────────────────────────────────────────────────────────
//  ENGINE (inlined from afzal-engine.js)
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  CLEARANCE: 3.2,
  SHELF_DEPTH_REDUCTION: 1,
  BOARD_CARCASS: "1.6mm",
  BOARD_BACK: "0.8mm",
  SIDES_PER_CABINET: 2,
  BASE_STRIP_HEIGHT: 12,
};

const r1 = (n) => Math.round(n * 10) / 10;

const makeRow = (component, board, length, width, pcsPerUnit, units) => ({
  component,
  board,
  length: r1(length),
  width: r1(width),
  pcsPerUnit,
  totalQty: pcsPerUnit * units,
  key: `${r1(length)}|${r1(width)}`,
});

function calcCabinet({ name, category, height, width, depth, shelves, units }) {
  const C = CONFIG;
  const horizLen = width - C.CLEARANCE;
  const components = [];
  components.push(makeRow("Sides", C.BOARD_CARCASS, height, depth, C.SIDES_PER_CABINET, units));
  if (category === "BASE") {
    components.push(makeRow("Bottom", C.BOARD_CARCASS, horizLen, depth, 1, units));
    if (shelves > 0)
      components.push(makeRow("Shelves", C.BOARD_CARCASS, horizLen, depth - C.SHELF_DEPTH_REDUCTION, shelves, units));
    if (C.BASE_STRIP_HEIGHT !== null)
      components.push(makeRow("12mm Strip", C.BOARD_CARCASS, horizLen, C.BASE_STRIP_HEIGHT, 2, units));
  } else {
    components.push(makeRow("Bottom+Top", C.BOARD_CARCASS, horizLen, depth, 2, units));
    if (shelves > 0)
      components.push(makeRow("Shelves", C.BOARD_CARCASS, horizLen, depth - C.SHELF_DEPTH_REDUCTION, shelves, units));
  }
  components.push(makeRow("Back Panel", C.BOARD_BACK, height, width, 1, units));
  return { name, category, height, width, depth, shelves, units, components };
}

function calcWardrobe({ name, height, width, depth, shelves, units }) {
  const C = CONFIG;
  const horizLen = width - C.CLEARANCE;
  const components = [];
  components.push(makeRow("Sides", C.BOARD_CARCASS, height, depth, C.SIDES_PER_CABINET, units));
  components.push(makeRow("Bottom+Top", C.BOARD_CARCASS, horizLen, depth, 2, units));
  if (shelves > 0)
    components.push(makeRow("Shelves", C.BOARD_CARCASS, horizLen, depth - C.SHELF_DEPTH_REDUCTION, shelves, units));
  components.push(makeRow("Back Panel", C.BOARD_BACK, height, width, 1, units));
  return { name, height, width, depth, shelves, units, components };
}

function aggregateCabinets(details) {
  const baseMap = {}, backMap = {}, upperMap = {};
  for (const cab of details) {
    for (const row of cab.components) {
      if (!row.totalQty) continue;
      const target = row.board === CONFIG.BOARD_BACK ? backMap : cab.category === "BASE" ? baseMap : upperMap;
      if (target[row.key]) target[row.key].qty += row.totalQty;
      else target[row.key] = { length: row.length, width: row.width, qty: row.totalQty };
    }
  }
  const sort = (m) => Object.values(m).sort((a, b) => b.length - a.length || b.width - a.width);
  return { sectionA: sort(baseMap), sectionB: sort(backMap), sectionC: sort(upperMap) };
}

function aggregateWardrobes(details) {
  const carcassMap = {}, backMap = {};
  for (const w of details) {
    for (const row of w.components) {
      if (!row.totalQty) continue;
      const target = row.board === CONFIG.BOARD_BACK ? backMap : carcassMap;
      if (target[row.key]) target[row.key].qty += row.totalQty;
      else target[row.key] = { length: row.length, width: row.width, qty: row.totalQty };
    }
  }
  const sort = (m) => Object.values(m).sort((a, b) => b.length - a.length || b.width - a.width);
  return { sectionCarcass: sort(carcassMap), sectionBack: sort(backMap) };
}

// ─────────────────────────────────────────────────────────────
//  ICONS
// ─────────────────────────────────────────────────────────────
const IconWood = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const PRODUCT_TYPES = [
  { value: "BASE",     label: "Kitchen Cabinet — Base" },
  { value: "UPPER",   label: "Kitchen Cabinet — Upper" },
  { value: "WARDROBE",label: "Wardrobe (Almari)" },
];

const EMPTY_ITEM = { type: "BASE", height: "", width: "", depth: "", shelves: "", units: "" };

let nextId = 1;
const newItem = () => ({ ...EMPTY_ITEM, id: nextId++ });

// ─────────────────────────────────────────────────────────────
//  FIELD COMPONENT
// ─────────────────────────────────────────────────────────────
function Field({ label, unit = "cm", value, onChange, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.07em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={onChange}
          placeholder={placeholder || "—"}
          style={{
            width: "100%",
            padding: "9px 34px 9px 11px",
            border: "1.5px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            fontWeight: 500,
            color: "#0f172a",
            background: "#fff",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
          onFocus={e => e.target.style.borderColor = "#d97706"}
          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
        />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ITEM CARD (input row)
// ─────────────────────────────────────────────────────────────
function ItemCard({ item, index, onChange, onRemove, canRemove }) {
  const update = (field) => (e) => onChange(item.id, field, e.target.value);

  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #e2e8f0",
      borderRadius: 12,
      padding: "18px 18px 16px",
      position: "relative",
      transition: "box-shadow 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      {/* Card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: "#0f172a", color: "#fff", borderRadius: 6,
            width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700,
          }}>{index + 1}</span>
          <select
            value={item.type}
            onChange={update("type")}
            style={{
              border: "1.5px solid #e2e8f0", borderRadius: 7, padding: "5px 10px",
              fontSize: 12, fontWeight: 600, color: "#334155",
              background: "#f8fafc", cursor: "pointer", outline: "none",
            }}
          >
            {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {canRemove && (
          <button onClick={() => onRemove(item.id)} style={{
            border: "none", background: "#fef2f2", color: "#ef4444", borderRadius: 6,
            width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
            onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}
          >
            <IconTrash />
          </button>
        )}
      </div>

      {/* Dimension fields */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
        gap: 10,
      }}>
        <Field label="Height" value={item.height} onChange={update("height")} placeholder="e.g. 72" />
        <Field label="Width"  value={item.width}  onChange={update("width")}  placeholder="e.g. 90" />
        <Field label="Depth"  value={item.depth}  onChange={update("depth")}  placeholder="e.g. 55" />
        <Field label="Shelves" unit="qty" value={item.shelves} onChange={update("shelves")} placeholder="0" />
        <Field label="Units"   unit="qty" value={item.units}   onChange={update("units")}   placeholder="1" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SUMMARY TABLE
// ─────────────────────────────────────────────────────────────
function SummaryTable({ title, badge, badgeColor, rows, accent }) {
  const [open, setOpen] = useState(true);
  if (!rows || rows.length === 0) return null;
  const totalPcs = rows.reduce((s, r) => s + r.qty, 0);

  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #e2e8f0",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: open ? "1.5px solid #f1f5f9" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            background: badgeColor, color: "#fff", fontSize: 10, fontWeight: 700,
            padding: "3px 8px", borderRadius: 5, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>{badge}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{title}</span>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{totalPcs} pcs total</span>
        </div>
        <IconChevron open={open} />
      </button>

      {open && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["#", "Length", "Width", "Qty"].map(h => (
                  <th key={h} style={{
                    padding: "9px 14px", textAlign: h === "#" ? "center" : "right",
                    fontSize: 10, fontWeight: 700, color: "#64748b",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    borderBottom: "1.5px solid #e2e8f0",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 14px", textAlign: "center", color: "#94a3b8", fontWeight: 600, fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{row.length}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{row.width}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <span style={{
                      background: accent + "18", color: accent,
                      fontWeight: 800, fontSize: 13, fontFamily: "monospace",
                      padding: "2px 10px", borderRadius: 6,
                    }}>{row.qty}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  DETAIL ACCORDION (per-item breakdown)
// ─────────────────────────────────────────────────────────────
function DetailAccordion({ detail }) {
  const [open, setOpen] = useState(false);
  const isWardrobe = !detail.category;
  const typeLabel = isWardrobe ? "Wardrobe" : detail.category === "BASE" ? "Base Cabinet" : "Upper Cabinet";

  return (
    <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "none", border: "none", cursor: "pointer",
        padding: "11px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{detail.name}</span>
          <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "2px 7px", borderRadius: 5 }}>{typeLabel}</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            H:{detail.height} × W:{detail.width} × D:{detail.depth} — {detail.units} unit{detail.units > 1 ? "s" : ""}
          </span>
        </div>
        <IconChevron open={open} />
      </button>
      {open && (
        <div style={{ overflowX: "auto", borderTop: "1px solid #f1f5f9" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Component", "Board", "Length", "Width", "Pcs/Unit", "Total"].map(h => (
                  <th key={h} style={{
                    padding: "7px 12px", textAlign: h === "Component" || h === "Board" ? "left" : "right",
                    fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.components.map((c, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#334155" }}>{c.component}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: c.board === "0.8mm" ? "#7c3aed" : "#0369a1",
                      background: c.board === "0.8mm" ? "#f5f3ff" : "#e0f2fe",
                      padding: "2px 6px", borderRadius: 4,
                    }}>{c.board}</span>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace", color: "#0f172a", fontWeight: 600 }}>{c.length}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace", color: "#0f172a", fontWeight: 600 }}>{c.width}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{c.pcsPerUnit}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, color: "#d97706", fontFamily: "monospace" }}>{c.totalQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  RESULTS PANEL
// ─────────────────────────────────────────────────────────────
function ResultsPanel({ results, onCopy, copied }) {
  if (!results) return null;
  const { details, summary, type } = results;
  const isCabinet = type === "cabinet";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>Cutting List Summary</h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "3px 0 0" }}>
            {details.length} {details.length === 1 ? "item" : "items"} processed
          </p>
        </div>
        <button onClick={onCopy} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: 8,
          border: "1.5px solid #e2e8f0",
          background: copied ? "#f0fdf4" : "#fff",
          color: copied ? "#16a34a" : "#334155",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          transition: "all 0.15s",
        }}>
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? "Copied!" : "Copy as Text"}
        </button>
      </div>

      {/* Summary tables */}
      {isCabinet ? (
        <>
          <SummaryTable title="BASE Cabinet Carcass" badge="Section A" badgeColor="#0369a1" rows={summary.sectionA} accent="#0369a1" />
          <SummaryTable title="Back Panels" badge="Section B" badgeColor="#7c3aed" rows={summary.sectionB} accent="#7c3aed" />
          <SummaryTable title="UPPER Cabinet Carcass" badge="Section C" badgeColor="#0d9488" rows={summary.sectionC} accent="#0d9488" />
        </>
      ) : (
        <>
          <SummaryTable title="Wardrobe Carcass" badge="Carcass" badgeColor="#0369a1" rows={summary.sectionCarcass} accent="#0369a1" />
          <SummaryTable title="Back Panels" badge="Back" badgeColor="#7c3aed" rows={summary.sectionBack} accent="#7c3aed" />
        </>
      )}

      {/* Per-item detail */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
          Per-Item Detail
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {details.map((d, i) => <DetailAccordion key={i} detail={d} />)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [items, setItems] = useState([newItem()]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const addItem = () => setItems(prev => [...prev, newItem()]);

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const generate = () => {
    setError("");
    setResults(null);

    const valid = items.filter(i => i.height && i.width && i.depth && i.units);
    if (valid.length === 0) {
      setError("Please fill in at least one item with Height, Width, Depth, and Units.");
      return;
    }

    const cabInputs = valid
      .filter(i => i.type !== "WARDROBE")
      .map((i, idx) => ({
        name: `Item ${idx + 1}`,
        category: i.type,
        height: parseFloat(i.height),
        width: parseFloat(i.width),
        depth: parseFloat(i.depth),
        shelves: parseFloat(i.shelves) || 0,
        units: parseFloat(i.units),
      }));

    const wardInputs = valid
      .filter(i => i.type === "WARDROBE")
      .map((i, idx) => ({
        name: `Wardrobe ${idx + 1}`,
        height: parseFloat(i.height),
        width: parseFloat(i.width),
        depth: parseFloat(i.depth),
        shelves: parseFloat(i.shelves) || 0,
        units: parseFloat(i.units),
      }));

    // Determine result type
    if (cabInputs.length > 0 && wardInputs.length === 0) {
      const details = cabInputs.map(c => calcCabinet(c));
      setResults({ type: "cabinet", details, summary: aggregateCabinets(details) });
    } else if (wardInputs.length > 0 && cabInputs.length === 0) {
      const details = wardInputs.map(w => calcWardrobe(w));
      setResults({ type: "wardrobe", details, summary: aggregateWardrobes(details) });
    } else {
      // Mixed — treat cabinets + wardrobes together; show both summaries
      const cabDetails = cabInputs.map(c => calcCabinet(c));
      const wardDetails = wardInputs.map(w => calcWardrobe(w));
      const allDetails = [...cabDetails, ...wardDetails];
      // Build unified summary by merging
      const cabSummary = aggregateCabinets(cabDetails);
      const wardSummary = aggregateWardrobes(wardDetails);
      setResults({
        type: "mixed",
        details: allDetails,
        summary: { ...cabSummary, ...wardSummary },
      });
    }
  };

  const handleCopy = () => {
    if (!results) return;
    const lines = ["AFZAL WOOD WORK — Cutting List", "=".repeat(40)];
    const { summary, type } = results;

    const tableText = (title, rows) => {
      if (!rows || rows.length === 0) return;
      lines.push(`\n${title}`);
      lines.push("-".repeat(30));
      lines.push("Length   Width    Qty");
      rows.forEach(r => lines.push(`${String(r.length).padEnd(9)}${String(r.width).padEnd(9)}${r.qty}`));
    };

    if (type === "cabinet" || type === "mixed") {
      tableText("Section A — BASE Carcass (1.6mm)", summary.sectionA);
      tableText("Section B — Back Panels (0.8mm)", summary.sectionB);
      tableText("Section C — UPPER Carcass (1.6mm)", summary.sectionC);
    }
    if (type === "wardrobe" || type === "mixed") {
      tableText("Carcass (1.6mm)", summary.sectionCarcass);
      tableText("Back Panels (0.8mm)", summary.sectionBack);
    }

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderBottom: "3px solid #d97706",
        padding: "0 24px",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 20px rgba(0,0,0,0.25)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: "linear-gradient(135deg, #d97706, #f59e0b)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff",
            }}>
              <IconWood />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "-0.01em" }}>
                AFZAL WOOD WORK
              </span>
              <span style={{ display: "block", fontSize: 10, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 1 }}>
                Cutting List Generator
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Engine Active</span>
          </div>
        </div>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "28px 16px",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr)",
        gap: 24,
      }}>

        {/* ── RESPONSIVE: side-by-side on wide screens via CSS media in style tag ── */}
        <style>{`
          @media (min-width: 768px) {
            .aw-layout { grid-template-columns: 440px minmax(0,1fr) !important; }
          }
          input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          input[type=number] { -moz-appearance: textfield; }
        `}</style>

        <div className="aw-layout" style={{
          display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 24, alignItems: "start",
        }}>

          {/* ── LEFT PANEL: Input ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Add Items</h1>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>Enter dimensions for each piece</p>
              </div>
              <button onClick={addItem} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                border: "none", background: "#0f172a", color: "#fff",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#1e293b"}
                onMouseLeave={e => e.currentTarget.style.background = "#0f172a"}
              >
                <IconPlus /> Add Item
              </button>
            </div>

            {items.map((item, idx) => (
              <ItemCard
                key={item.id}
                item={item}
                index={idx}
                onChange={updateItem}
                onRemove={removeItem}
                canRemove={items.length > 1}
              />
            ))}

            {error && (
              <div style={{
                background: "#fef2f2", border: "1.5px solid #fecaca",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 13, color: "#dc2626", fontWeight: 500,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={generate} style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, #d97706, #f59e0b)",
              border: "none", borderRadius: 10, color: "#fff",
              fontSize: 15, fontWeight: 800, cursor: "pointer",
              letterSpacing: "0.02em",
              boxShadow: "0 4px 14px rgba(217,119,6,0.35)",
              transition: "transform 0.1s, box-shadow 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(217,119,6,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(217,119,6,0.35)"; }}
            >
              Generate Cutting List
            </button>

            {/* Config reference card */}
            <div style={{
              background: "#fff", border: "1.5px solid #e2e8f0",
              borderRadius: 10, padding: "14px 16px",
            }}>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Active Config
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                {[
                  ["Clearance", `${CONFIG.CLEARANCE} mm`],
                  ["Shelf Reduction", `${CONFIG.SHELF_DEPTH_REDUCTION} mm`],
                  ["Carcass Board", CONFIG.BOARD_CARCASS],
                  ["Back Board", CONFIG.BOARD_BACK],
                  ["Strip Height", `${CONFIG.BASE_STRIP_HEIGHT} mm`],
                  ["Side Pairs", CONFIG.SIDES_PER_CABINET],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#334155", fontFamily: "monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: Results ── */}
          <div>
            {results ? (
              <ResultsPanel results={results} onCopy={handleCopy} copied={copied} />
            ) : (
              <div style={{
                background: "#fff", border: "1.5px dashed #e2e8f0",
                borderRadius: 12, padding: "48px 32px",
                textAlign: "center",
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", color: "#d97706",
                }}>
                  <IconWood />
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#0f172a" }}>No cutting list yet</p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                  Fill in your item dimensions<br />and click Generate Cutting List
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
