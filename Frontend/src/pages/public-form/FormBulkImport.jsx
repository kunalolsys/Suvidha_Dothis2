import React, { useState, useRef } from "react";
import api from "../../lib/api";
import axios from "axios";

// ─── Design tokens ────────────────────────────────────────────────────────
const T = {
  bg: "#F1F5F9",
  card: "#FFFFFF",
  surf: "#F8FAFC",
  text: "#0F172A",
  text2: "#334155",
  muted: "#64748B",
  muted2: "#94A3B8",
  border: "#E2E8F0",
  border2: "#CBD5E1",
  accent: "#2563EB",
  accentL: "#EFF6FF",
  accentB: "#BFDBFE",
  green: "#059669",
  greenL: "#ECFDF5",
  greenB: "#A7F3D0",
  amber: "#D97706",
  amberL: "#FFFBEB",
  amberB: "#FDE68A",
  red: "#DC2626",
  redL: "#FEF2F2",
  redB: "#FECACA",
};

// ─── Tiny button ──────────────────────────────────────────────────────────
function Btn({
  children,
  onClick,
  loading,
  disabled,
  variant = "primary",
  icon,
  style = {},
}) {
  const [hov, setHov] = useState(false);
  const V = {
    primary: { bg: hov ? "#1D4ED8" : T.accent, color: "#fff", border: "none" },
    success: { bg: hov ? "#047857" : T.green, color: "#fff", border: "none" },
    ghost: {
      bg: hov ? T.surf : "transparent",
      color: T.muted,
      border: `1px solid ${T.border}`,
    },
    outline: {
      bg: hov ? T.accentL : "transparent",
      color: T.accent,
      border: `1px solid ${T.accentB}`,
    },
  };
  const s = V[variant] || V.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 18px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        opacity: disabled || loading ? 0.55 : 1,
        background: s.bg,
        color: s.color,
        border: s.border,
        ...style,
      }}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }}
        />
      ) : (
        icon && <span style={{ fontSize: 15 }}>{icon}</span>
      )}
      {children}
    </button>
  );
}

// ─── Status row pill ─────────────────────────────────────────────────────
function Pill({ children, color, bg, border }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// Props:
//   formSlug   – slug of the OpenForm  e.g. "vendor-inspection-form"
//   formName   – display name          e.g. "Vendor Inspection Form"
//   onDone     – callback after successful import
// ═════════════════════════════════════════════════════════════════════════
export default function FormBulkImport({ formSlug, formName, onDone }) {
  const fileRef = useRef();

  const [step, setStep] = useState(1); // 1=download  2=upload  3=result
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // ── 1. Download sample XLSX ───────────────────────────────────────────
  const handleDownload = async () => {
    try {
      const res = await api.get(`/open-forms/${formSlug}/import-template`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formSlug}-template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setStep(2); // advance to upload step
    } catch {
      // stay on step 1, user will retry
    }
  };

  // ── 2. Pick file ──────────────────────────────────────────────────────
  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
  };

  // ── 3. Upload & import ────────────────────────────────────────────────
  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("triggerFms", "true");
    fd.append("remark", "Bulk import from UI");
    try {
      const res = await api.post(`/open-forms/${formSlug}/import`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      setStep(3);
      // if (res.data.summary?.imported > 0) onDone?.();
    } catch (err) {
      setResult({ error: err?.response?.data?.message || "Import failed" });
      setStep(3);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setStep(1);
  };

  const { summary, log = [], errorFile, message, error } = result || {};
  const handleDownloadErrorFile = async (e) => {
    e.preventDefault();
    try {
      // Prefix with your VITE_API_BASE_URL if errorFile is a relative path like '/uploads/file.csv'
      const fileUrl = errorFile.startsWith("http")
        ? errorFile
        : `${import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, "")}${errorFile}`;

      const response = await axios.get(fileUrl, {
        responseType: "blob",
        withCredentials: true, // Sends cookies if your route requires authentication
      });

      // Create a temporary link to trigger explicit CSV download
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "text/csv" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `import-errors-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download error CSV file:", err);
      window.alert("Failed to download error CSV file");
    }
  };
  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* ── STEP INDICATOR ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginBottom: 24,
        }}
      >
        {[
          { n: 1, label: "Download Template" },
          { n: 2, label: "Upload Filled Sheet" },
          { n: 3, label: "Review Results" },
        ].map(({ n, label }, i) => {
          const done = step > n;
          const current = step === n;
          return (
            <React.Fragment key={n}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: done ? T.green : current ? T.accent : T.border,
                    color: done || current ? "#fff" : T.muted2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                    transition: "all 0.2s",
                  }}
                >
                  {done ? "✓" : n}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: current ? T.text : done ? T.green : T.muted2,
                  }}
                >
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: step > n ? T.green : T.border,
                    margin: "0 12px",
                    minWidth: 20,
                    transition: "background 0.3s",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── STEP 1: Download ────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ animation: "fadeUp 0.25s ease" }}>
          <div
            style={{
              background: T.accentL,
              border: `1px solid ${T.accentB}`,
              borderRadius: 14,
              padding: "20px 22px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: T.accent,
                marginBottom: 6,
              }}
            >
              📥 Download the sample sheet
            </div>
            <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
              The template has one column for each field in{" "}
              <strong>{formName}</strong>. Fill each row with one submission and
              upload it back.
            </div>
          </div>
          <Btn onClick={handleDownload} icon="⬇" variant="primary">
            Download Import Template
          </Btn>
          <button
            onClick={() => setStep(2)}
            style={{
              marginLeft: 12,
              background: "none",
              border: "none",
              color: T.muted,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "underline",
            }}
          >
            I already have the template →
          </button>
        </div>
      )}

      {/* ── STEP 2: Upload ──────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={{ animation: "fadeUp 0.25s ease" }}>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) pickFile(f);
            }}
            style={{
              border: `2px dashed ${dragOver ? T.accent : file ? T.green : T.border2}`,
              borderRadius: 14,
              padding: "36px 24px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? T.accentL : file ? T.greenL : T.surf,
              transition: "all 0.15s",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>
              {file ? "✅" : "📂"}
            </div>
            {file ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text2 }}>
                  Drop your filled sheet here
                </div>
                <div style={{ fontSize: 12, color: T.muted2, marginTop: 4 }}>
                  or click to browse — .xlsx or .csv accepted
                </div>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setStep(1)} icon="←">
              Back
            </Btn>
            <Btn
              onClick={handleImport}
              loading={uploading}
              disabled={!file}
              icon="⬆"
            >
              {uploading ? "Importing…" : "Import Submissions"}
            </Btn>
          </div>
        </div>
      )}

      {/* ── STEP 3: Results ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div style={{ animation: "fadeUp 0.25s ease" }}>
          {/* Error state */}
          {error && (
            <div
              style={{
                background: T.redL,
                border: `1px solid ${T.redB}`,
                borderRadius: 12,
                padding: "14px 18px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.red }}>
                {error}
              </span>
            </div>
          )}

          {/* Summary strip */}
          {summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 10,
                marginBottom: 18,
              }}
            >
              {[
                {
                  label: "Total Rows",
                  val: summary.total,
                  color: T.accent,
                  bg: T.accentL,
                  border: T.accentB,
                },
                {
                  label: "✓ Imported",
                  val: summary.imported,
                  color: T.green,
                  bg: T.greenL,
                  border: T.greenB,
                },
                {
                  label: "⟳ Skipped",
                  val: summary.skipped,
                  color: T.amber,
                  bg: T.amberL,
                  border: T.amberB,
                },
                {
                  label: "✕ Errors",
                  val: summary.errors,
                  color: T.red,
                  bg: T.redL,
                  border: T.redB,
                },
              ].map(({ label, val, color, bg, border }) => (
                <div
                  key={label}
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color,
                      lineHeight: 1,
                    }}
                  >
                    {val}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.muted,
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Result message */}
          {message && (
            <div
              style={{
                background: summary?.errors === 0 ? T.greenL : T.amberL,
                border: `1px solid ${summary?.errors === 0 ? T.greenB : T.amberB}`,
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: summary?.errors === 0 ? T.green : T.amber,
                marginBottom: 16,
              }}
            >
              {message}
            </div>
          )}

          {/* Error CSV download */}
          {errorFile && (
            <a
              href={errorFile}
              onClick={handleDownloadErrorFile}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: T.red,
                marginBottom: 16,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              ⬇ Download Error Report (CSV)
            </a>
          )}

          {/* Row log table */}
          {log.length > 0 && (
            <div
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  background: T.surf,
                  padding: "10px 16px",
                  borderBottom: `1px solid ${T.border}`,
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                }}
              >
                Import Log
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ background: T.surf }}>
                      {["Row", "Status", "Detail"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            fontWeight: 700,
                            color: T.muted,
                            borderBottom: `1px solid ${T.border}`,
                            fontSize: 11,
                            textTransform: "uppercase",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {log.map((row, i) => (
                      <tr
                        key={i}
                        style={{
                          background: i % 2 === 0 ? "#fff" : T.surf,
                          borderBottom: `1px solid ${T.border}`,
                        }}
                      >
                        <td
                          style={{
                            padding: "8px 12px",
                            color: T.muted,
                            width: 60,
                            fontWeight: 600,
                          }}
                        >
                          {row.row}
                        </td>
                        <td style={{ padding: "8px 12px", width: 110 }}>
                          {row.status === "imported" && (
                            <Pill
                              color={T.green}
                              bg={T.greenL}
                              border={T.greenB}
                            >
                              ✓ Imported
                            </Pill>
                          )}
                          {row.status === "skipped" && (
                            <Pill
                              color={T.amber}
                              bg={T.amberL}
                              border={T.amberB}
                            >
                              ⟳ Skipped
                            </Pill>
                          )}
                          {row.status === "error" && (
                            <Pill color={T.red} bg={T.redL} border={T.redB}>
                              ✕ Error
                            </Pill>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            color: row.status === "error" ? T.red : T.text2,
                          }}
                        >
                          {row.reason}
                          {row.submissionId && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontFamily: "monospace",
                                fontSize: 10,
                                color: T.muted2,
                              }}
                            >
                              ID: …{String(row.submissionId).slice(-6)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={reset} icon="↺" variant="ghost">
              Import Another
            </Btn>
            {summary?.imported > 0 && (
              <Btn onClick={onDone} icon="✓" variant="success">
                Done
              </Btn>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
