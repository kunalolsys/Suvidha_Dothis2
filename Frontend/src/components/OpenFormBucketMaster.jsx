import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Select as AntdSelect } from "antd";
import { toast } from "sonner";
import api from "../lib/api";

/* ─── Icon SVGs (matching SuperModuleSettings) ───────────────────────────── */
const Icon = {
  shield: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  lock: (
    <svg
      width="24"
      height="24"
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
  userCheck: (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  ),
  calendar: (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  sliders: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  info: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
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
  save: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
};

const OpenFormBucketMaster = () => {
  const role = Cookies.get("role") || "";
  const isSuper = role === "Super";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState(undefined);
  const [taskEndDays, setTaskEndDays] = useState(3);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);

  useEffect(() => {
    if (!isSuper) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, masterRes] = await Promise.all([
          api.get("/users/list-drop"), // Apne active users list endpoint se match karein
          api.get("/task-buckets/open-form/master"),
        ]);

        const rawUsers =
          usersRes.data?.data ?? usersRes.data?.users ?? usersRes.data ?? [];
        const activeUsers = Array.isArray(rawUsers)
          ? rawUsers.filter((u) => !u.isDeleted && u.isActive !== false)
          : [];
        setUsers(activeUsers);

        const masterData = masterRes.data?.data;
        if (masterData) {
          setAssignedTo(
            masterData.assignedTo?._id || masterData.assignedTo || undefined,
          );
          setTaskEndDays(masterData.taskEndDays ?? 3);
          setLastUpdated(masterData.updatedAt || null);
          setUpdatedBy(masterData.updatedBy || null);
        }
      } catch (e) {
        setError(
          e?.response?.data?.message ||
            "Failed to load Open Form Bucket Master settings",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSuper]);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!assignedTo) {
      toast.error("Please select an Assigned To user");
      return;
    }

    const days = Number(taskEndDays);
    if (!taskEndDays || Number.isNaN(days) || days < 1) {
      toast.error("Task End Days must be at least 1");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/task-buckets/open-form/master", {
        assignedTo,
        taskEndDays: days,
      });

      const updated = res.data?.data;
      if (updated) {
        setLastUpdated(updated.updatedAt || new Date().toISOString());
      }
      toast.success(
        res.data?.message || "Open Form Bucket Master saved successfully",
      );
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "Failed to save master settings",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ── Access denied (Exact match with SuperModuleSettings) ── */
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
            role doesn&apos;t have permission.
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

  const selectedUserObj = users.find(
    (u) => String(u._id) === String(assignedTo),
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
      `}</style>

      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                {Icon.shield}
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
                  Open Form Bucket Master
                </h1>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    marginTop: "2px",
                  }}
                >
                  Super administrator controls for open form bucket routing
                </div>
              </div>
            </div>

            {/* Active Status Pill */}
            {!loading && (
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
                    background: assignedTo ? "#059669" : "#D97706",
                    display: "inline-block",
                    animation: "blink 2s ease infinite",
                  }}
                />
                <span style={{ fontWeight: 600, color: "#0F172A" }}>
                  {assignedTo ? "Configured" : "Not Configured"}
                </span>
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
              <div style={{ color: "#2563EB" }}>{Icon.sliders}</div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#0F172A",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Default Bucket Assignment Rules
              </span>
            </div>

            {lastUpdated && (
              <span style={{ fontSize: "12px", color: "#64748B" }}>
                Updated:{" "}
                {new Date(lastUpdated).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {updatedBy?.name ? ` (${updatedBy.name})` : ""}
              </span>
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

          {/* Form Body */}
          <div style={{ padding: "24px" }}>
            {loading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: "74px",
                      borderRadius: "16px",
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      animation: "shimmer 1.4s ease infinite",
                    }}
                  />
                ))}
              </div>
            ) : (
              <form
                onSubmit={handleSave}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                }}
              >
                {/* Field 1: Assigned To */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "#0F172A",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    <span style={{ color: "#2563EB", display: "flex" }}>
                      {Icon.userCheck}
                    </span>
                    Assigned To User <span style={{ color: "#DC2626" }}>*</span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      marginBottom: "12px",
                    }}
                  >
                    Every bucket submitted through the Open Form will be
                    assigned directly to this user.
                  </div>

                  <AntdSelect
                    showSearch
                    allowClear
                    size="large"
                    placeholder="Select target user..."
                    value={assignedTo}
                    onChange={(val) => setAssignedTo(val)}
                    style={{ width: "100%" }}
                    optionFilterProp="label"
                    options={users.map((u) => ({
                      value: u._id,
                      label: u.name,
                    }))}
                  />

                  {selectedUserObj && (
                    <div
                      style={{
                        marginTop: "10px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#059669",
                        background: "rgba(5,150,105,0.08)",
                        border: "1px solid rgba(5,150,105,0.2)",
                        borderRadius: "20px",
                        padding: "3px 10px",
                      }}
                    >
                      Active Target: {selectedUserObj.name} (
                      {selectedUserObj.email})
                    </div>
                  )}
                </div>

                {/* Field 2: Task End Days */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "16px",
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "#0F172A",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    <span style={{ color: "#2563EB", display: "flex" }}>
                      {Icon.calendar}
                    </span>
                    Task End Days <span style={{ color: "#DC2626" }}>*</span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      marginBottom: "12px",
                    }}
                  >
                    Default deadline window (in days) calculated from the open
                    form submission date.
                  </div>

                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={taskEndDays}
                    onChange={(e) => setTaskEndDays(e.target.value)}
                    placeholder="e.g. 3"
                    style={{
                      width: "100%",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0F172A",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Info Card */}
                <div
                  style={{
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "12px",
                    color: "#1E40AF",
                    lineHeight: "1.6",
                  }}
                >
                  <span
                    style={{
                      color: "#2563EB",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    {Icon.info}
                  </span>
                  <div>
                    <strong>Note:</strong> All incoming Open Form requests will
                    automatically be assigned to the selected user with the
                    configured task end days, starting from the form submission
                    date.
                  </div>
                </div>

                {/* Submit Action Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    paddingTop: "6px",
                  }}
                >
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      background: saving
                        ? "#93C5FD"
                        : "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "12px",
                      padding: "11px 22px",
                      fontSize: "13px",
                      fontWeight: 700,
                      fontFamily: "'Outfit', sans-serif",
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                    }}
                  >
                    {saving ? (
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.4)",
                          borderTopColor: "#FFFFFF",
                          display: "inline-block",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                    ) : (
                      Icon.save
                    )}
                    {saving ? "Saving Settings..." : "Save Master Settings"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer warning (matching SuperModuleSettings) */}
          <div
            style={{
              margin: "0 24px 20px",
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
              <strong>Super Admin Control:</strong> Updating this master
              immediately affects all incoming Open Form bucket submissions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenFormBucketMaster;
