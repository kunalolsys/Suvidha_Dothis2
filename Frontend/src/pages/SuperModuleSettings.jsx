import React, { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { toast } from "sonner";
import api from "../lib/api";
import { formatLabel } from "../lib/utilFunctions";

/* ─── Icon SVGs (inline, no extra deps) ──────────────────────────────────── */
const Icon = {
  zap: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  shield: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  lock: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  check: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  grid: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  cpu: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  ),
  layers: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  alert: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  fms: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
};

/* ─── Module metadata registry ───────────────────────────────────────────── */
const MODULE_META = {
  FMS_ENGINE: {
    label: "FMS Engine",
    description:
      "Flow Management System — automated workflow templates, dependency chains, and task scheduling engine.",
    icon: Icon.fms,
    color: "#2563EB",
    gradient: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
    tag: "Core",
  },
  default: {
    label: null,
    description:
      "System module. Enabling or disabling affects all users immediately.",
    icon: Icon.layers,
    color: "#0D9488",
    gradient: "linear-gradient(135deg, #0D9488 0%, #0891B2 100%)",
    tag: "Module",
  },
};

const getMeta = (key) =>
  MODULE_META[key] || { ...MODULE_META.default, label: key };

/* ─── Toggle Switch ──────────────────────────────────────────────────────── */
const ToggleSwitch = ({ enabled, loading, onChange }) => (
  <button
    onClick={onChange}
    disabled={loading}
    aria-pressed={enabled}
    style={{
      position: "relative",
      width: "52px",
      height: "28px",
      borderRadius: "14px",
      border: "none",
      cursor: loading ? "not-allowed" : "pointer",
      background: enabled
        ? "linear-gradient(135deg, #2563EB, #4F46E5)"
        : "#E2E8F0",
      transition: "background 0.3s cubic-bezier(.4,0,.2,1)",
      padding: 0,
      flexShrink: 0,
      boxShadow: enabled ? "0 0 0 3px rgba(37,99,235,0.18)" : "none",
    }}
  >
    <span
      style={{
        position: "absolute",
        top: "3px",
        left: enabled ? "27px" : "3px",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
        transition: "left 0.25s cubic-bezier(.4,0,.2,1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {loading ? (
        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            border: "2px solid #CBD5E1",
            borderTopColor: "#2563EB",
            display: "block",
            animation: "spin 0.7s linear infinite",
          }}
        />
      ) : (
        <span
          style={{ color: enabled ? "#2563EB" : "#94A3B8", display: "flex" }}
        >
          {enabled ? Icon.check : Icon.x}
        </span>
      )}
    </span>
  </button>
);

/* ─── Module Card ────────────────────────────────────────────────────────── */
const ModuleCard = ({ moduleKey, enabled, toggling, onToggle, index }) => {
  const meta = getMeta(moduleKey);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#FFFFFF",
        border: `1px solid ${hovered ? "#BFDBFE" : "#E2E8F0"}`,
        borderRadius: "18px",
        padding: "22px 24px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
        boxShadow: hovered
          ? "0 8px 32px rgba(37,99,235,0.10), 0 1px 4px rgba(0,0,0,0.04)"
          : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-1px)" : "none",
        animationDelay: `${index * 80}ms`,
        animation: "slideIn 0.35s ease both",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Active glow strip on left edge */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "12px",
          bottom: "12px",
          width: "3px",
          borderRadius: "0 3px 3px 0",
          background: enabled ? meta.gradient : "#E2E8F0",
          transition: "background 0.3s ease",
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "14px",
          background: enabled ? `${meta.color}12` : "#F1F5F9",
          border: `1px solid ${enabled ? `${meta.color}25` : "#E2E8F0"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: enabled ? meta.color : "#94A3B8",
          flexShrink: 0,
          transition: "all 0.3s ease",
        }}
      >
        {meta.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#0F172A",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {formatLabel(meta.label || moduleKey)}
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: "20px",
              background: `${meta.color}12`,
              color: meta.color,
              border: `1px solid ${meta.color}25`,
            }}
          >
            {meta.tag}
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: "20px",
              background: enabled
                ? "rgba(5,150,105,0.1)"
                : "rgba(100,116,139,0.1)",
              color: enabled ? "#059669" : "#64748B",
              border: `1px solid ${enabled ? "rgba(5,150,105,0.2)" : "rgba(100,116,139,0.2)"}`,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: enabled ? "#059669" : "#94A3B8",
                animation: enabled ? "blink 2s ease infinite" : "none",
              }}
            />
            {enabled ? "Active" : "Inactive"}
          </span>
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#64748B",
            lineHeight: "1.5",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {meta.description}
        </div>
        <div
          style={{
            marginTop: "8px",
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#94A3B8",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            padding: "2px 8px",
            display: "inline-block",
          }}
        >
          {moduleKey}
        </div>
      </div>

      {/* Toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: enabled ? "#2563EB" : "#94A3B8",
          }}
        >
          {enabled ? "ON" : "OFF"}
        </span>
        <ToggleSwitch
          enabled={enabled}
          loading={toggling}
          onChange={onToggle}
        />
      </div>
    </div>
  );
};

/* ─── Skeleton loader ────────────────────────────────────────────────────── */
const SkeletonCard = ({ index }) => (
  <div
    style={{
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      borderRadius: "18px",
      padding: "22px 24px",
      display: "flex",
      alignItems: "center",
      gap: "20px",
      animationDelay: `${index * 80}ms`,
      animation: "slideIn 0.35s ease both",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}
  >
    <div
      style={{
        width: "52px",
        height: "52px",
        borderRadius: "14px",
        background: "#F1F5F9",
        animation: "shimmer 1.4s ease infinite",
      }}
    />
    <div
      style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}
    >
      <div
        style={{
          height: "16px",
          width: "45%",
          borderRadius: "8px",
          background: "#F1F5F9",
          animation: "shimmer 1.4s ease infinite",
        }}
      />
      <div
        style={{
          height: "12px",
          width: "75%",
          borderRadius: "8px",
          background: "#F1F5F9",
          animation: "shimmer 1.4s 0.15s ease infinite",
        }}
      />
    </div>
    <div
      style={{
        width: "52px",
        height: "28px",
        borderRadius: "14px",
        background: "#F1F5F9",
        animation: "shimmer 1.4s ease infinite",
      }}
    />
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */
const SuperModuleSettings = () => {
  const role = Cookies.get("role") || "";
  const isSuper = role === "Super";

  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState(null);
  const [error, setError] = useState(null);
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState("");

  const getIsEnabled = (m) => {
    if (!m) return false;
    if (typeof m.isEnabled === "boolean") return m.isEnabled;
    if (typeof m.enabled === "boolean") return m.enabled;
    if (m.status) return m.status === "ENABLED";
    if (typeof m.is_active === "boolean") return m.is_active;
    return false;
  };

  const getKey = (m) => m.moduleKey ?? m.key ?? m.module ?? "";

  useEffect(() => {
    if (!isSuper) {
      setLoading(false);
      return;
    }
    const fetch_ = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/setup/modules/list");
        const data = res.data?.data ?? res.data;
        setModules(Array.isArray(data) ? data : (data?.modules ?? []));
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load modules");
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [isSuper]);

  const toggleModule = async (moduleKey, nextEnabled) => {
    setTogglingKey(moduleKey);
    try {
      await api.post("/setup/modules/toggle", {
        moduleKey,
        isEnabled: nextEnabled,
      });
      setModules((prev) =>
        prev.map((m) =>
          getKey(m) !== moduleKey ? m : { ...m, isEnabled: nextEnabled },
        ),
      );
      toast.success(
        `${formatLabel(getMeta(moduleKey).label || moduleKey)} ${nextEnabled ? "enabled" : "disabled"}`,
      );
    } catch (e) {
      toast.error(
        e?.response?.data?.message || `Failed to toggle ${moduleKey}`,
      );
    } finally {
      setTogglingKey(null);
    }
  };

  const filtered = modules.filter(
    (m) =>
      !search ||
      getKey(m).toLowerCase().includes(search.toLowerCase()) ||
      (getMeta(getKey(m)).label || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const enabledCount = modules.filter((m) => getIsEnabled(m)).length;
  const disabledCount = modules.length - enabledCount;

  /* ── Access denied ── */
  if (!isSuper)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: "24px",
            padding: "48px 40px",
            textAlign: "center",
            maxWidth: "420px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#DC2626",
              margin: "0 auto 20px",
            }}
          >
            {Icon.lock}
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#0F172A",
              marginBottom: "8px",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Access Restricted
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#64748B",
              marginBottom: "20px",
              lineHeight: "1.6",
            }}
          >
            This page is available to Super administrators only. Your current
            role doesn't have permission.
          </div>
          <div
            style={{
              background: "#FFF7ED",
              border: "1px solid #FED7AA",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#92400E",
            }}
          >
            Current role: <strong>{role || "Unknown"}</strong>
          </div>
        </div>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F1F5F9",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        padding: "32px 24px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
        @keyframes blink   { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes slideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        * { box-sizing: border-box; }
        input:focus { outline: none; }
      `}</style>

      <div
        style={{
          //  maxWidth: "860px",
          margin: "0 auto",
        }}
      >
        {/* ── Page header ── */}
        <div style={{ marginBottom: "28px", animation: "fadeIn 0.4s ease" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    background:
                      "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                  }}
                >
                  {Icon.cpu}
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#0F172A",
                      margin: 0,
                      fontFamily: "'Outfit', sans-serif",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    Module Settings
                  </h1>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#64748B",
                      marginTop: "2px",
                    }}
                  >
                    Super administrator controls
                  </div>
                </div>
              </div>
            </div>

            {/* Stats pills */}
            {!loading && modules.length > 0 && (
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#059669",
                      display: "inline-block",
                      animation: "blink 2s ease infinite",
                    }}
                  />
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>
                    {enabledCount}
                  </span>
                  <span style={{ color: "#64748B" }}>active</span>
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#94A3B8",
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontWeight: 600, color: "#0F172A" }}>
                    {disabledCount}
                  </span>
                  <span style={{ color: "#64748B" }}>inactive</span>
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#64748B" }}>Total</span>
                  <span style={{ fontWeight: 700, color: "#2563EB" }}>
                    {modules.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Main card ── */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: "24px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            overflow: "hidden",
            animation: "slideIn 0.35s ease",
          }}
        >
          {/* Card header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ color: "#2563EB" }}>{Icon.grid}</div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#0F172A",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                System Modules
              </span>
              {!loading && (
                <span
                  style={{
                    background: "#EFF6FF",
                    color: "#2563EB",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    border: "1px solid #BFDBFE",
                  }}
                >
                  {modules.length} total
                </span>
              )}
            </div>

            {/* Search */}
            {!loading && modules.length > 2 && (
              <div style={{ position: "relative" }}>
                <svg
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94A3B8",
                  }}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search modules…"
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "7px 12px 7px 32px",
                    fontSize: "13px",
                    color: "#0F172A",
                    width: "200px",
                    fontFamily: "inherit",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#93C5FD")}
                  onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
                />
              </div>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div
              style={{
                margin: "16px 24px 0",
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.18)",
                borderRadius: "12px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#B91C1C",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <span style={{ color: "#DC2626" }}>{Icon.alert}</span>
              {error}
            </div>
          )}

          {/* Module list */}
          <div
            style={{
              padding: "16px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {loading ? (
              [1, 2, 3].map((i) => <SkeletonCard key={i} index={i - 1} />)
            ) : filtered.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "#94A3B8",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "14px",
                    marginBottom: "4px",
                    color: "#64748B",
                  }}
                >
                  No modules found
                </div>
                <div style={{ fontSize: "13px" }}>
                  Try a different search term
                </div>
              </div>
            ) : (
              filtered.map((m, i) => {
                const key = getKey(m);
                return (
                  <ModuleCard
                    key={key}
                    moduleKey={key}
                    enabled={getIsEnabled(m)}
                    toggling={togglingKey === key}
                    onToggle={() => toggleModule(key, !getIsEnabled(m))}
                    index={i}
                  />
                );
              })
            )}
          </div>

          {/* Footer warning */}
          <div
            style={{
              margin: "4px 24px 20px",
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "12px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <span style={{ color: "#D97706", flexShrink: 0, marginTop: "1px" }}>
              {Icon.alert}
            </span>
            <div
              style={{ fontSize: "12px", color: "#92400E", lineHeight: "1.6" }}
            >
              <strong>Production warning:</strong> Module changes apply
              immediately for all users across the platform. Only Super
              administrators can perform these actions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperModuleSettings;
