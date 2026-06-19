import { useState } from "react";

// ─────────────────────────────────────────────────────────────
//  ENGINE
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
  component, board,
  length: r1(length), width: r1(width),
  pcsPerUnit, totalQty: pcsPerUnit * units,
  key: `${r1(length)}|${r1(width)}`,
});

function calcCabinet({ name, category, height, width, depth, shelves, units }) {
  const C = CONFIG;
  const h = width - C.CLEARANCE;
  const c = [];
  c.push(makeRow("Sides", C.BOARD_CARCASS, height, depth, 2, units));
  if (category === "BASE") {
    c.push(makeRow("Bottom", C.BOARD_CARCASS, h, depth, 1, units));
    if (shelves > 0) c.push(makeRow("Shelves", C.BOARD_CARCASS, h, depth - C.SHELF_DEPTH_REDUCTION, shelves, units));
    c.push(makeRow("12mm Strip", C.BOARD_CARCASS, h, C.BASE_STRIP_HEIGHT, 2, units));
  } else {
    c.push(makeRow("Bottom+Top", C.BOARD_CARCASS, h, depth, 2, units));
    if (shelves > 0) c.push(makeRow("Shelves", C.BOARD_CARCASS, h, depth - C.SHELF_DEPTH_REDUCTION, shelves, units));
  }
  c.push(makeRow("Back Panel", C.BOARD_BACK, height, width, 1, units));
  return { name, category, height, width, depth, shelves, units, components: c };
}

function calcWardrobe({ name, height, width, depth, shelves, units }) {
  const C = CONFIG;
  const h = width - C.CLEARANCE;
  const c = [];
  c.push(makeRow("Sides", C.BOARD_CARCASS, height, depth, 2, units));
  c.push(makeRow("Bottom+Top", C.BOARD_CARCASS, h, depth, 2, units));
  if (shelves > 0) c.push(makeRow("Shelves", C.BOARD_CARCASS, h, depth - C.SHELF_DEPTH_REDUCTION, shelves, units));
  c.push(makeRow("Back Panel", C.BOARD_BACK, height, width, 1, units));
  return { name, height, width, depth, shelves, units, components: c };
}

function aggregateCabinets(details) {
  const bm = {}, km = {}, um = {};
  for (const cab of details) {
    for (const row of cab.components) {
      if (!row.totalQty) continue;
      const t = row.board === CONFIG.BOARD_BACK ? bm : cab.category === "BASE" ? km : um;
      if (t[row.key]) t[row.key].qty += row.totalQty;
      else t[row.key] = { length: row.length, width: row.width, qty: row.totalQty };
    }
  }
  const s = (m) => Object.values(m).sort((a, b) => b.length - a.length || b.width - a.width);
  return { sA: s(km), sB: s(bm), sC: s(um) };
}

function aggregateWardrobes(details) {
  const cm = {}, bm = {};
  for (const w of details) {
    for (const row of w.components) {
      if (!row.totalQty) continue;
      const t = row.board === CONFIG.BOARD_BACK ? bm : cm;
      if (t[row.key]) t[row.key].qty += row.totalQty;
      else t[row.key] = { length: row.length, width: row.width, qty: row.totalQty };
    }
  }
  const s = (m) => Object.values(m).sort((a, b) => b.length - a.length || b.width - a.width);
  return { sA: s(cm), sB: s(bm) };
}

// ─────────────────────────────────────────────────────────────
//  PDF EXPORT — White bg, height first, 1 page, big font
// ─────────────────────────────────────────────────────────────
function doExportPDF(results, cfg) {
  if (!results) return;
  const { summary, type, details } = results;
  const now = new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" });
  const totalPcs = details.reduce((s, d) => s + d.components.reduce((ss, c) => ss + c.totalQty, 0), 0);

  // Sort: biggest width first = Height/Sides come first
  const sortHeightFirst = (rows) =>
    [...(rows || [])].sort((a, b) => b.width - a.width || b.length - a.length);

  const TOTAL_ROWS = 16;
  const colRows = (rows) => {
    const sorted = sortHeightFirst(rows);
    const dataRows = sorted.map(r =>
      `<tr><td>${r.length}</td><td>${r.width}</td><td>${r.qty}</td></tr>`
    ).join("");
    const emptyCount = Math.max(0, TOTAL_ROWS - sorted.length);
    const emptyRows = Array(emptyCount).fill(
      `<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`
    ).join("");
    return dataRows + emptyRows;
  };

  let col1rows = [], col2rows = [], col3rows = [];
  let col1label = "1.6", col2label = "0.8", col3label = "1.6";
  let col1title = "BASE Carcass", col2title = "Back Panels", col3title = "UPPER Carcass";

  if (type === "cabinet" || type === "mixed") {
    col1rows = summary.sA || []; col2rows = summary.sB || []; col3rows = summary.sC || [];
  } else if (type === "wardrobe") {
    col1rows = summary.sA || []; col2rows = summary.sB || []; col3rows = [];
    col1title = "Carcass"; col3title = "";
  }

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Afzal Wood Work — Cutting List</title>
<style>
@page{size:A4 landscape;margin:7mm 9mm}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100vh;max-height:100vh;overflow:hidden;background:#fff}
body{font-family:'Arial Black',Arial,sans-serif;color:#000;
  display:flex;flex-direction:column;height:100vh}
.hdr{background:linear-gradient(135deg,#0f172a,#1e3a5f);border-radius:7px;
  padding:9px 14px;margin-bottom:6px;display:flex;align-items:center;
  justify-content:space-between;flex-shrink:0}
.hdr-left{display:flex;align-items:center;gap:9px}
.logo{width:34px;height:34px;background:linear-gradient(135deg,#d97706,#f59e0b);
  border-radius:6px;display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:900;font-size:13px;flex-shrink:0}
.brand{font-size:15px;font-weight:900;color:#fff;white-space:nowrap}
.brand-sub{font-size:7px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.14em;margin-top:1px}
.hdr-right{text-align:right;font-size:10px;color:rgba(255,255,255,.65);line-height:1.7}
.hdr-right strong{color:#f59e0b}
.cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;flex:1;min-height:0;overflow:hidden}
.col{display:flex;flex-direction:column;border:2.5px solid #111;background:#fff;overflow:hidden}
.col-hd{padding:5px 0 4px;text-align:center;border-bottom:2.5px solid #111;flex-shrink:0;background:#fff}
.col-board{font-size:26px;font-weight:900;color:#000;line-height:1}
.col-title{font-size:9px;color:#222;font-weight:800;margin-top:2px;text-transform:uppercase;letter-spacing:.05em}
.col table{width:100%;border-collapse:collapse;table-layout:fixed;background:#fff}
.col thead th{font-size:12px;font-weight:900;text-align:center;padding:5px 2px;
  border-bottom:2.5px solid #111;color:#000;background:#fff}
.col tbody td{text-align:center;font-size:26px;font-weight:900;
  padding:4px 2px;border-bottom:1px solid #aaa;color:#000;background:#fff;line-height:1.1}
.col tbody tr:last-child td{border-bottom:none}
.footer{display:flex;justify-content:space-between;align-items:center;
  margin-top:5px;padding-top:4px;border-top:1.5px solid #bbb;flex-shrink:0}
.footer-left{font-size:10px;font-weight:900;color:#000}
.footer-made{font-size:7px;color:#555;margin-top:1px;font-family:Arial,sans-serif;font-weight:400}
.footer-right{font-size:7px;color:#555;text-align:right;line-height:1.6;font-family:Arial,sans-serif;font-weight:400}
@media print{html,body{height:100vh;max-height:100vh;overflow:hidden;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr">
  <div class="hdr-left">
    <div class="logo">AW</div>
    <div><div class="brand">AFZAL WOOD WORK</div><div class="brand-sub">Professional Cutting List Generator</div></div>
  </div>
  <div class="hdr-right">
    <div><strong>Date:</strong> ${now} &nbsp;·&nbsp; <strong>Total Pieces:</strong> ${totalPcs}</div>
    <div>Clearance: <strong>${cfg.CLEARANCE}mm</strong> &nbsp;|&nbsp; Shelf−: <strong>${cfg.SHELF_DEPTH_REDUCTION}mm</strong> &nbsp;|&nbsp; Items: <strong>${details.length}</strong></div>
  </div>
</div>
<div class="cols">
  <div class="col">
    <div class="col-hd"><div class="col-board">${col1label}</div><div class="col-title">${col1title}</div></div>
    <table><thead><tr><th>Length</th><th>Width</th><th>Qty</th></tr></thead>
    <tbody>${colRows(col1rows)}</tbody></table>
  </div>
  <div class="col">
    <div class="col-hd"><div class="col-board">${col2label}</div><div class="col-title">${col2title}</div></div>
    <table><thead><tr><th>Length</th><th>Width</th><th>Qty</th></tr></thead>
    <tbody>${colRows(col2rows)}</tbody></table>
  </div>
  <div class="col">
    <div class="col-hd"><div class="col-board">${col3label}</div><div class="col-title">${col3title}</div></div>
    <table><thead><tr><th>Length</th><th>Width</th><th>Qty</th></tr></thead>
    <tbody>${colRows(col3rows)}</tbody></table>
  </div>
</div>
<div class="footer">
  <div><div class="footer-left">Afzal Wood Work — Cutting List</div><div class="footer-made">Made by Zain Afzal</div></div>
  <div class="footer-right"><div>Generated: ${now}</div><div>afzal-wood-work.vercel.app</div></div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
</body></html>`;

  const w = window.open("", "_blank", "width=1122,height=794");
  w.document.write(html);
  w.document.close();
}

// Share function — Web Share API (mobile) or clipboard fallback
function doShare(results, cfg) {
  if (!results) return;
  const { summary, type, details } = results;
  const now = new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  const totalPcs = details.reduce((s, d) => s + d.components.reduce((ss, c) => ss + c.totalQty, 0), 0);

  const tbl = (title, rows) => {
    if (!rows || !rows.length) return "";
    let t = `\n*${title}*\n`;
    t += "```\n";
    t += "Length   Width    Qty\n";
    t += "─────────────────────\n";
    rows.forEach(r => { t += `${String(r.length).padEnd(9)}${String(r.width).padEnd(9)}${r.qty}\n`; });
    t += "```";
    return t;
  };

  let text = `*AFZAL WOOD WORK — Cutting List*\n`;
  text += `Date: ${now} | Items: ${details.length} | Total: ${totalPcs} pcs\n`;
  text += `Clearance: ${cfg.CLEARANCE}mm | Shelf−: ${cfg.SHELF_DEPTH_REDUCTION}mm\n`;

  if (type === "cabinet" || type === "mixed") {
    text += tbl("Section A — BASE Carcass (1.6mm)", summary.sA || []);
    text += tbl("Section B — Back Panels (0.8mm)", summary.sB || []);
    text += tbl("Section C — UPPER Carcass (1.6mm)", summary.sC || []);
  }
  if (type === "wardrobe") {
    text += tbl("Wardrobe Carcass (1.6mm)", summary.sA || []);
    text += tbl("Back Panels (0.8mm)", summary.sB || []);
  }
  text += `\n_Made by Zain Afzal_`;

  if (navigator.share) {
    navigator.share({ title: "Afzal Wood Work — Cutting List", text });
  } else {
    navigator.clipboard.writeText(text).then(() => alert("Cutting list copied! Paste in WhatsApp."));
  }
}

// ─────────────────────────────────────────────────────────────
//  ICONS
// ─────────────────────────────────────────────────────────────
const IconWood = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);
const IconShare = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IconPDF = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const PRODUCT_TYPES = [
  { value: "BASE",      label: "🔧 Kitchen Cabinet — Base" },
  { value: "UPPER",    label: "🔼 Kitchen Cabinet — Upper" },
  { value: "WARDROBE", label: "🚪 Wardrobe (Almari)" },
];

let nextId = 1;
const newItem = () => ({ id: nextId++, type: "BASE", height: "", width: "", depth: "", shelves: "", units: "" });

// ─────────────────────────────────────────────────────────────
//  FIELD
// ─────────────────────────────────────────────────────────────
function Field({ label, unit = "cm", value, onChange, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input type="number" min="0" step="0.1" value={value} onChange={onChange} placeholder={placeholder || "—"}
          style={{ width: "100%", padding: "9px 30px 9px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8,
            fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#0f172a", background: "#fafbfc",
            outline: "none", boxSizing: "border-box", transition: "border-color .15s" }}
          onFocus={e => { e.target.style.borderColor = "#d97706"; e.target.style.background = "#fff"; }}
          onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#fafbfc"; }} />
        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          fontSize: 9, color: "#cbd5e1", fontWeight: 800, pointerEvents: "none" }}>{unit}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ITEM CARD
// ─────────────────────────────────────────────────────────────
function ItemCard({ item, index, onChange, onRemove, canRemove }) {
  const upd = (field) => (e) => onChange(item.id, field, e.target.value);
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "16px",
      marginBottom: 10, transition: "box-shadow .2s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,.07)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: "#0f172a", color: "#fff",
          fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {index + 1}
        </span>
        <select value={item.type} onChange={upd("type")} style={{ flex: 1, border: "1.5px solid #e2e8f0",
          borderRadius: 8, padding: "6px 8px", fontSize: 12, fontWeight: 600, color: "#334155",
          background: "#f8fafc", cursor: "pointer", outline: "none" }}>
          {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {canRemove && (
          <button onClick={() => onRemove(item.id)} style={{ border: "none", background: "#fef2f2",
            color: "#ef4444", borderRadius: 7, width: 28, height: 28, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconTrash />
          </button>
        )}
      </div>
      <div className="aw-fields" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
        <Field label="Height" value={item.height} onChange={upd("height")} placeholder="72" />
        <Field label="Width"  value={item.width}  onChange={upd("width")}  placeholder="90" />
        <Field label="Depth"  value={item.depth}  onChange={upd("depth")}  placeholder="55" />
        <Field label="Shelves" unit="qty" value={item.shelves} onChange={upd("shelves")} placeholder="0" />
        <Field label="Units"   unit="qty" value={item.units}   onChange={upd("units")}   placeholder="1" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SUMMARY TABLE
// ─────────────────────────────────────────────────────────────
function SummaryTable({ title, badge, badgeColor, rows, accent }) {
  const [open, setOpen] = useState(true);
  if (!rows || !rows.length) return null;
  const totalPcs = rows.reduce((s, r) => s + r.qty, 0);
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", background: "none", border: "none",
        cursor: "pointer", padding: "13px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: open ? "1.5px solid #f1f5f9" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: badgeColor, color: "#fff", fontSize: 9, fontWeight: 800,
            padding: "3px 8px", borderRadius: 5, letterSpacing: "0.07em", textTransform: "uppercase" }}>{badge}</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{title}</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{totalPcs} pcs</span>
        </div>
        <IconChevron open={open} />
      </button>
      {open && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["#", "Length", "Width", "Qty"].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: h === "#" ? "center" : "right",
                    fontSize: 9, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.08em",
                    textTransform: "uppercase", borderBottom: "1.5px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f8fafc" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: "#cbd5e1", fontSize: 10, fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{row.length}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{row.width}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <span style={{ background: accent + "18", color: accent, fontWeight: 900, fontSize: 12,
                      fontFamily: "monospace", padding: "2px 10px", borderRadius: 6 }}>{row.qty}</span>
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
//  DETAIL ACCORDION
// ─────────────────────────────────────────────────────────────
function DetailAccordion({ detail }) {
  const [open, setOpen] = useState(false);
  const isWardrobe = !detail.category;
  const typeLabel = isWardrobe ? "Wardrobe" : detail.category === "BASE" ? "Base Cabinet" : "Upper Cabinet";
  return (
    <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff", marginBottom: 6 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", background: "none", border: "none",
        cursor: "pointer", padding: "11px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: "#0f172a" }}>{detail.name}</span>
          <span style={{ fontSize: 9, color: "#64748b", background: "#f1f5f9", padding: "2px 6px",
            borderRadius: 4, fontWeight: 700, textTransform: "uppercase" }}>{typeLabel}</span>
          <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>
            H:{detail.height}×W:{detail.width}×D:{detail.depth} · ×{detail.units}
          </span>
        </div>
        <IconChevron open={open} />
      </button>
      {open && (
        <div style={{ overflowX: "auto", borderTop: "1px solid #f1f5f9" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Component", "Board", "L", "W", "×/Unit", "Total"].map(h => (
                  <th key={h} style={{ padding: "7px 12px", textAlign: h === "Component" || h === "Board" ? "left" : "right",
                    fontSize: 9, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.components.map((c, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#334155" }}>{c.component}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{ fontSize: 10, fontWeight: 800,
                      color: c.board === "0.8mm" ? "#7c3aed" : "#0369a1",
                      background: c.board === "0.8mm" ? "#f5f3ff" : "#e0f2fe",
                      padding: "2px 6px", borderRadius: 4 }}>{c.board}</span>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{c.length}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{c.width}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#94a3b8", fontFamily: "monospace" }}>{c.pcsPerUnit}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 900, color: "#d97706", fontFamily: "monospace" }}>{c.totalQty}</td>
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
function ResultsPanel({ results, onCopy, copied, onExportPDF, onShare }) {
  if (!results) return null;
  const { details, summary, type } = results;
  const isCabinet = type === "cabinet";
  const totalPcs = details.reduce((s, d) => s + d.components.reduce((ss, c) => ss + c.totalQty, 0), 0);
  const uniqueCuts = new Set(details.flatMap(d => d.components.map(c => c.key))).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-.01em" }}>Cutting List</h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: "3px 0 0" }}>{details.length} items processed</p>
        </div>
        <button onClick={onCopy} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px",
          borderRadius: 8, border: "1.5px solid #e2e8f0", background: copied ? "#f0fdf4" : "#fff",
          color: copied ? "#16a34a" : "#334155", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <IconCopy />{copied ? "Copied!" : "Copy Text"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
        {[["Total Pcs", totalPcs], ["Unique Cuts", uniqueCuts], ["Items", details.length]].map(([lbl, val]) => (
          <div key={lbl} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
            padding: "11px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: "#0f172a" }}>{val}</div>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.07em", marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Summary Tables */}
      {isCabinet ? (
        <>
          <SummaryTable title="BASE Cabinet Carcass" badge="Section A" badgeColor="#0369a1" rows={summary.sA} accent="#0369a1" />
          <SummaryTable title="Back Panels" badge="Section B" badgeColor="#7c3aed" rows={summary.sB} accent="#7c3aed" />
          <SummaryTable title="UPPER Cabinet Carcass" badge="Section C" badgeColor="#0d9488" rows={summary.sC} accent="#0d9488" />
        </>
      ) : (
        <>
          <SummaryTable title="Wardrobe Carcass" badge="Carcass" badgeColor="#0369a1" rows={summary.sA} accent="#0369a1" />
          <SummaryTable title="Back Panels" badge="Back" badgeColor="#7c3aed" rows={summary.sB} accent="#7c3aed" />
        </>
      )}

      {/* Export PDF + Share buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 16 }}>
        <button onClick={onExportPDF} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, padding: "11px", borderRadius: 9, border: "2px solid #dc2626", background: "#fff",
          color: "#dc2626", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(0)"; }}>
          <IconPDF /> Export PDF
        </button>
        <button onClick={onShare} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, padding: "11px", borderRadius: 9, border: "2px solid #16a34a", background: "#fff",
          color: "#16a34a", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(0)"; }}>
          <IconShare /> Share
        </button>
      </div>

      {/* Per-item detail */}
      <p style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.08em",
        textTransform: "uppercase", marginBottom: 8 }}>Per-Item Detail</p>
      {details.map((d, i) => <DetailAccordion key={i} detail={d} />)}
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
  const [cfg, setCfg] = useState({ ...CONFIG });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const addItem = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const updateCfg = (key, val) => {
    const v = parseFloat(val) || 0;
    CONFIG[key] = v;
    setCfg({ ...CONFIG });
  };

  const generate = () => {
    setError("");
    const valid = items.filter(i => i.height && i.width && i.depth && i.units);
    if (!valid.length) { setError("Please fill Height, Width, Depth and Units for at least one item."); return; }

    const cabs = valid.filter(i => i.type !== "WARDROBE").map((i, n) => ({
      name: `Item ${n + 1}`, category: i.type,
      height: +i.height, width: +i.width, depth: +i.depth, shelves: +i.shelves || 0, units: +i.units,
    }));
    const wards = valid.filter(i => i.type === "WARDROBE").map((i, n) => ({
      name: `Wardrobe ${n + 1}`,
      height: +i.height, width: +i.width, depth: +i.depth, shelves: +i.shelves || 0, units: +i.units,
    }));

    let details, summary, type;
    if (cabs.length && !wards.length) {
      details = cabs.map(calcCabinet); summary = aggregateCabinets(details); type = "cabinet";
    } else if (wards.length && !cabs.length) {
      details = wards.map(calcWardrobe); summary = aggregateWardrobes(details); type = "wardrobe";
    } else {
      const cd = cabs.map(calcCabinet), wd = wards.map(calcWardrobe);
      details = [...cd, ...wd];
      const cs = aggregateCabinets(cd), ws = aggregateWardrobes(wd);
      summary = { sA: cs.sA, sB: [...(cs.sB || []), ...(ws.sB || [])], sC: cs.sC, sW: ws.sA };
      type = "mixed";
    }
    setResults({ details, summary, type });
  };

  const handleCopy = () => {
    if (!results) return;
    const { summary, type, details } = results;
    const now = new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
    const totalPcs = details.reduce((s, d) => s + d.components.reduce((ss, c) => ss + c.totalQty, 0), 0);
    const lines = ["AFZAL WOOD WORK — Cutting List", "=".repeat(38),
      `Date: ${now} | Items: ${details.length} | Total: ${totalPcs} pcs`, ""];
    const tbl = (title, rows) => {
      if (!rows || !rows.length) return;
      lines.push(`▶ ${title}`); lines.push("─".repeat(32));
      lines.push("  #   Length    Width     Qty"); lines.push("─".repeat(32));
      rows.forEach((r, i) => lines.push(`  ${String(i + 1).padEnd(4)}${String(r.length).padEnd(10)}${String(r.width).padEnd(10)}${r.qty}`));
      lines.push("");
    };
    if (type === "cabinet" || type === "mixed") {
      tbl("SECTION A — BASE Carcass (1.6mm)", summary.sA);
      tbl("SECTION B — Back Panels (0.8mm)", summary.sB);
      tbl("SECTION C — UPPER Carcass (1.6mm)", summary.sC);
    }
    if (type === "wardrobe") { tbl("Carcass (1.6mm)", summary.sA); tbl("Back Panels (0.8mm)", summary.sB); }
    if (type === "mixed" && summary.sW) tbl("Wardrobe Carcass (1.6mm)", summary.sW);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportPDF = () => doExportPDF(results, cfg);
  const handleShare = () => doShare(results, cfg);

  const S = {
    hdr: { background: "linear-gradient(135deg,#0f172a,#1a2744)", borderBottom: "3px solid #d97706",
      padding: "0 16px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,.3)" },
    hdrInner: { maxWidth: 1120, margin: "0 auto", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" },
    logo: { width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#d97706,#f59e0b)",
      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" },
    main: { maxWidth: 1120, margin: "0 auto", padding: "22px 14px 40px" },
    addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
      border: "none", background: "#0f172a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
    genBtn: { width: "100%", padding: "15px", background: "linear-gradient(135deg,#d97706,#f59e0b)",
      border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
      boxShadow: "0 4px 16px rgba(217,119,6,.4)", marginTop: 8 },
    empty: { background: "#fff", border: "2px dashed #e2e8f0", borderRadius: 16, padding: "52px 28px", textAlign: "center" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @media(min-width:800px){.aw-layout{grid-template-columns:420px 1fr!important}}
        @media(max-width:600px){.aw-fields{grid-template-columns:repeat(2,1fr)!important}}
        @media(min-width:601px) and (max-width:799px){.aw-fields{grid-template-columns:repeat(3,1fr)!important}}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
      `}</style>

      {/* HEADER */}
      <div style={S.hdr}>
        <div style={S.hdrInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={S.logo}><IconWood /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>AFZAL WOOD WORK</div>
              <div style={{ fontSize: 9, color: "#64748b", letterSpacing: ".14em", textTransform: "uppercase" }}>Cutting List Generator</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setSettingsOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,.12)",
              background: settingsOpen ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)",
              color: "#cbd5e1", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ⚙ Settings
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
              borderRadius: 20, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 10, color: "#86efac", fontWeight: 600 }}>Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS DRAWER */}
      {settingsOpen && (
        <div style={{ background: "linear-gradient(135deg,#1e293b,#0f172a)", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "18px 16px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>
              ⚙ Calculation Settings
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
              {[
                { key: "CLEARANCE", label: "Side Clearance (mm)", min: 1, max: 8, step: 0.1, info: "Default: 3.2mm" },
                { key: "SHELF_DEPTH_REDUCTION", label: "Shelf Depth Reduction (mm)", min: 0, max: 5, step: 0.5, info: "Default: 1mm" },
                { key: "BASE_STRIP_HEIGHT", label: "Base Strip Height (mm)", min: 6, max: 32, step: 1, info: "Default: 12mm" },
              ].map(({ key, label, min, max, step, info }) => (
                <div key={key} style={{ background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(255,255,255,.08)", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
                    <span style={{ color: "#d97706", fontWeight: 800, fontFamily: "monospace", fontSize: 13 }}>{cfg[key]}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="range" min={min} max={max} step={step} value={cfg[key]}
                      onChange={e => updateCfg(key, e.target.value)}
                      style={{ flex: 1, accentColor: "#d97706", height: 4 }} />
                    <input type="number" min={min} max={max} step={step} value={cfg[key]}
                      onChange={e => updateCfg(key, e.target.value)}
                      style={{ width: 52, padding: "6px 8px", border: "1.5px solid rgba(255,255,255,.12)",
                        borderRadius: 7, background: "rgba(255,255,255,.07)", color: "#f1f5f9",
                        fontSize: 13, fontFamily: "monospace", fontWeight: 700, textAlign: "center", outline: "none" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>{info}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { ["CLEARANCE","SHELF_DEPTH_REDUCTION","BASE_STRIP_HEIGHT"].forEach((k,i) => updateCfg(k, [3.2,1,12][i])); }}
              style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 5, padding: "7px 14px",
                borderRadius: 7, border: "1.5px solid rgba(255,255,255,.1)", background: "transparent",
                color: "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              ↺ Reset to Defaults
            </button>
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={S.main}>
        <div className="aw-layout" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 22, alignItems: "start" }}>

          {/* LEFT */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Items</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Enter dimensions for each piece</div>
              </div>
              <button onClick={addItem} style={S.addBtn}>
                <IconPlus /> Add Item
              </button>
            </div>

            <div className="aw-fields">
              {items.map((item, idx) => (
                <ItemCard key={item.id} item={item} index={idx}
                  onChange={updateItem} onRemove={removeItem} canRemove={items.length > 1} />
              ))}
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 9,
                padding: "10px 14px", fontSize: 13, color: "#dc2626", fontWeight: 500, marginBottom: 8 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={generate} style={S.genBtn}>⚡ Generate Cutting List</button>

            {/* Config pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {[
                { k: "Clearance", v: cfg.CLEARANCE, def: 3.2, u: "mm" },
                { k: "Shelf −", v: cfg.SHELF_DEPTH_REDUCTION, def: 1, u: "mm" },
                { k: "Strip H", v: cfg.BASE_STRIP_HEIGHT, def: 12, u: "mm" },
                { k: "Carcass", v: "1.6mm", def: "1.6mm", u: "" },
                { k: "Back", v: "0.8mm", def: "0.8mm", u: "" },
              ].map(s => (
                <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                  background: s.v !== s.def ? "#fffbeb" : "#fff",
                  border: `1.5px solid ${s.v !== s.def ? "#fde68a" : "#e2e8f0"}`, borderRadius: 20, fontSize: 11 }}>
                  <span style={{ color: "#94a3b8" }}>{s.k}</span>
                  <span style={{ color: s.v !== s.def ? "#d97706" : "#0f172a", fontWeight: 800, fontFamily: "monospace" }}>{s.v}{s.u}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div>
            {results ? (
              <ResultsPanel results={results} onCopy={handleCopy} copied={copied} onExportPDF={handleExportPDF} onShare={handleShare} />
            ) : (
              <div style={S.empty}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 26 }}>🪵</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Ready to calculate</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, lineHeight: 1.6 }}>
                  Add your items on the left<br />then tap Generate Cutting List
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
