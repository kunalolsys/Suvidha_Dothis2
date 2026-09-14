import React, { useState, useCallback, useEffect, useMemo } from "react";
import api from "../../lib/api";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Select } from "antd";

/* ─── Design tokens ────────────────────────────────────────────────────────── */
const C = {
  bg: "#F0F4FA",
  card: "#FFFFFF",
  surf: "#F8FAFC",
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
  purple: "#7C3AED",
  purpleL: "#F5F3FF",
  slate: "#64748B",
  slate2: "#94A3B8",
  text: "#0F172A",
  text2: "#334155",
};

const STATUS = {
  Completed: {
    bg: C.greenL,
    border: C.greenB,
    text: C.green,
    dot: C.green,
    label: "Completed",
    icon: "✓",
  },
  Pending: {
    bg: C.amberL,
    border: C.amberB,
    text: C.amber,
    dot: C.amber,
    label: "Pending",
    icon: "◷",
  },
  Upcoming: {
    bg: C.accentL,
    border: C.accentB,
    text: C.accent,
    dot: C.accent,
    label: "Upcoming",
    icon: "⌛",
  },
  Overdue: {
    bg: C.redL,
    border: C.redB,
    text: C.red,
    dot: C.red,
    label: "Overdue",
    icon: "⚠",
  },
  "In Progress": {
    bg: C.purpleL,
    border: "#DDD6FE",
    text: C.purple,
    dot: C.purple,
    label: "In Progress",
    icon: "▶",
  },
};
const getStatus = (s) => STATUS[s] || STATUS.Pending;

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const delayDays = (due) => {
  if (!due) return null;
  const diff = Math.round((new Date() - new Date(due)) / 86400000);
  return diff;
};

/* ─── Pill badge ────────────────────────────────────────────────────────────── */
const Pill = ({ children, bg, text, border, dot, size = "sm" }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: size === "sm" ? "3px 9px" : "5px 12px",
      borderRadius: "20px",
      fontSize: size === "sm" ? "11px" : "12px",
      fontWeight: 600,
      background: bg,
      color: text,
      border: `1px solid ${border}`,
      whiteSpace: "nowrap",
    }}
  >
    {dot && (
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
        }}
      />
    )}
    {children}
  </span>
);

/* ─── Checklist progress bar ────────────────────────────────────────────────── */
const ChecklistBar = ({ items }) => {
  if (!items?.length)
    return <span style={{ fontSize: 12, color: C.slate2 }}>—</span>;
  const done = items.filter((i) => i.isCompleted).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: C.slate,
        }}
      >
        <span>
          {done}/{items.length} done
        </span>
        <span
          style={{ fontWeight: 700, color: pct === 100 ? C.green : C.text }}
        >
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: 5,
          background: C.border,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 3,
            transition: "width 0.5s ease",
            width: `${pct}%`,
            background: pct === 100 ? C.green : pct >= 50 ? C.accent : C.amber,
          }}
        />
      </div>
    </div>
  );
};

/* ─── Delay chip ────────────────────────────────────────────────────────────── */
const DelayChip = ({ task }) => {
  if (task.status === "Completed") {
    if (!task.completedAt || !task.dueDate) return null;
    const diff = Math.round(
      (new Date(task.completedAt) - new Date(task.dueDate)) / 86400000,
    );
    if (diff <= 0)
      return (
        <span style={{ fontSize: 11, fontWeight: 600, color: C.green }}>
          ✓ On time
        </span>
      );
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: C.amber }}>
        +{diff}d late
      </span>
    );
  }
  if (task.status === "Upcoming") return null;
  const d = delayDays(task.dueDate);
  if (d === null) return null;
  if (d > 0)
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: C.red }}>
        ⚠ {d}d overdue
      </span>
    );
  if (d === 0)
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: C.amber }}>
        Due today
      </span>
    );
  return (
    <span style={{ fontSize: 11, color: C.slate2 }}>{Math.abs(d)}d left</span>
  );
};

/* ─── Task Detail Drawer ────────────────────────────────────────────────────── */
const TaskDrawer = ({ task, onClose }) => {
  if (!task) return null;
  const st = getStatus(task.status);
  const checkDone = task.checklist?.filter((c) => c.isCompleted).length || 0;
  const checkTotal = task.checklist?.length || 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 500,
          background: C.card,
          height: "100%",
          overflowY: "auto",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.25s ease",
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${C.border}`,
            background: st.bg,
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Pill bg={st.bg} text={st.text} border={st.border} dot={st.dot}>
                  {st.label}
                </Pill>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: C.slate,
                    background: C.surf,
                    border: `1px solid ${C.border}`,
                    padding: "2px 8px",
                    borderRadius: 6,
                  }}
                >
                  {task.TaskId}
                </span>
              </div>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: C.text,
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {task.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.slate,
                fontSize: 20,
                padding: 4,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div
          style={{
            padding: "20px 24px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Description */}
          <div
            style={{
              background: C.surf,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: C.slate2,
                marginBottom: 6,
              }}
            >
              Description
            </div>
            <p
              style={{
                fontSize: 13,
                color: C.text2,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {task.description}
            </p>
          </div>

          {/* Key dates grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {[
              { label: "Start Date", val: fmt(task.startDate) },
              { label: "Due Date", val: fmt(task.dueDate) },
              {
                label: "Completed At",
                val: task.completedAt
                  ? `${fmt(task.completedAt)} ${fmtTime(task.completedAt)}`
                  : "—",
              },
              {
                label: "Task End Days",
                val: task.taskEndDays
                  ? `${task.taskEndDays} day${task.taskEndDays > 1 ? "s" : ""}`
                  : "—",
              },
            ].map(({ label, val }) => (
              <div
                key={label}
                style={{
                  background: C.surf,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.7px",
                    textTransform: "uppercase",
                    color: C.slate2,
                    marginBottom: 3,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* People */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: C.slate2,
                marginBottom: 8,
              }}
            >
              People
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { role: "Assigned To", user: task.assignedTo },
                { role: "Assigned By", user: task.assignedBy },
              ].map(
                ({ role, user }) =>
                  user && (
                    <div
                      key={role}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: C.surf,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        padding: "10px 14px",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: `linear-gradient(135deg, ${C.accent}, #4F46E5)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#fff",
                        }}
                      >
                        {(user.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.text,
                          }}
                        >
                          {user.name || "—"}
                        </div>
                        <div style={{ fontSize: 11, color: C.slate }}>
                          {role} · {user.email}
                        </div>
                      </div>
                    </div>
                  ),
              )}
            </div>
          </div>

          {/* Department */}
          {task.departmentOfAssignToUser && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                  color: C.slate2,
                }}
              >
                Department
              </div>
              <Pill bg={C.accentL} text={C.accent} border={C.accentB}>
                🏢 {task.departmentOfAssignToUser.name}
              </Pill>
            </div>
          )}

          {/* Checklist */}
          {task.checklist?.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    color: C.slate2,
                  }}
                >
                  Checklist
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: checkDone === checkTotal ? C.green : C.slate,
                  }}
                >
                  {checkDone}/{checkTotal} completed
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {task.checklist.map((item, i) => (
                  <div
                    key={item._id || i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 9,
                      background: item.isCompleted ? C.greenL : C.surf,
                      border: `1px solid ${item.isCompleted ? C.greenB : C.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: item.isCompleted ? C.green : "transparent",
                        border: `2px solid ${item.isCompleted ? C.green : C.border2}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.isCompleted && (
                        <span
                          style={{
                            color: "#fff",
                            fontSize: 9,
                            fontWeight: 700,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        color: item.isCompleted ? C.green : C.text2,
                        textDecoration: item.isCompleted
                          ? "line-through"
                          : "none",
                      }}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependency info */}
          {task.isDependent && task.dependencyConfig?.taskDependent && (
            <div
              style={{
                background: "#FFF7ED",
                border: `1px solid ${C.amberB}`,
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.amber,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Dependency
              </div>
              <div style={{ fontSize: 13, color: "#92400E" }}>
                Linked to parent task ·{" "}
                {task.dependencyConfig.startTimeSetting?.replace(/-/g, " ")}
              </div>
            </div>
          )}

          {/* Reopen info */}
          {task.isReopen && (
            <div
              style={{
                background: C.redL,
                border: `1px solid ${C.redB}`,
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.red,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                🔁 Reopened
              </div>
              {task.reopenedReason && (
                <div style={{ fontSize: 13, color: "#991B1B" }}>
                  {task.reopenedReason}
                </div>
              )}
            </div>
          )}

          {/* Metadata footer */}
          <div
            style={{
              marginTop: "auto",
              padding: "14px 0 0",
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 11, color: C.slate2 }}>
              Created: {fmt(task.createdAt)} {fmtTime(task.createdAt)}
            </div>
            <div style={{ fontSize: 11, color: C.slate2 }}>
              Last updated: {fmt(task.updatedAt)} {fmtTime(task.updatedAt)}
            </div>
            <div style={{ fontSize: 11, color: C.slate2 }}>
              Type: {task.taskType?.replace("Task", "") || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
const UserTaskHistory = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const userName = location.state?.userName;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // drawer task
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("dueDate"); // dueDate | createdAt | title
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.post("/tasks/filter", {
        userId,

        filters: {
          taskType: typeFilter == "Recurring" ? "recurring" : "All",
        },
        limit: 100000,
      });
      setTasks(res.data.data || []);
    } catch {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [userId,typeFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "Completed").length;
    const overdue = tasks.filter((t) => {
      if (t.status === "Completed") return false;
      return t.dueDate && new Date(t.dueDate) < new Date();
    }).length;
    const pending = tasks.filter((t) => t.status === "Pending").length;
    const upcoming = tasks.filter((t) => t.status === "Upcoming").length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, overdue, pending, upcoming, pct };
  }, [tasks]);

  // ── Filtered + sorted tasks ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let out = [...tasks];
    if (statusFilter !== "All")
      out = out.filter((t) => t.status === statusFilter);
    if (typeFilter !== "All")
      out = out.filter((t) => t.taskType?.includes(typeFilter));
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.TaskId?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.departmentOfAssignToUser?.name?.toLowerCase().includes(q),
      );
    }
    out.sort((a, b) => {
      let va = a[sortBy],
        vb = b[sortBy];
      if (!va) return 1;
      if (!vb) return -1;
      if (sortBy === "title") {
        va = va.toLowerCase();
        vb = vb.toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      va = new Date(va);
      vb = new Date(vb);
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return out;
  }, [tasks, statusFilter, typeFilter, search, sortBy, sortDir]);

  const paginated = filtered;
  //   const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3 }}>↕</span>;
    return (
      <span style={{ color: C.accent }}>{sortDir === "asc" ? "↑" : "↓"}</span>
    );
  };

  /* ─── Loading ─────────────────────────────────────────────────────────── */
  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: `3px solid ${C.accentB}`,
              borderTopColor: C.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <div style={{ fontSize: 13, color: C.slate }}>Loading tasks…</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  /* ─── Error ───────────────────────────────────────────────────────────── */
  if (error)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "40px 32px",
            textAlign: "center",
            maxWidth: 360,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.text,
              marginBottom: 6,
            }}
          >
            Failed to load
          </div>
          <div style={{ fontSize: 13, color: C.slate, marginBottom: 20 }}>
            {error}
          </div>
          <button
            onClick={fetchTasks}
            style={{
              background: C.accent,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );

  /* ─── Main render ─────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        padding: "28px 24px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .task-row{transition:background 0.12s,box-shadow 0.12s}
        .task-row:hover{background:#F8FAFC!important;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
        select option{background:#fff;color:${C.text}}
        input::placeholder{color:${C.slate2}}
      `}</style>

      <div style={{ margin: "0 auto" }}>
        {/* ── Page header ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24, animation: "fadeUp 0.3s ease" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `linear-gradient(135deg,${C.accent},#4F46E5)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {(userName || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: C.text,
                      margin: 0,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {userName ? `${userName}'s Tasks` : "Task History"}
                  </h1>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 1 }}>
                    Complete task timeline and details
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/reports/mis")}
                className="
      inline-flex items-center justify-center gap-2
      rounded-xl border px-4 py-2.5
      text-sm font-semibold
      transition-all duration-200
      hover:-translate-y-0.5
      shadow-sm hover:shadow-md
    "
                style={{
                  background: "#fff",
                  borderColor: C.border2,
                  color: C.slate,
                }}
              >
                <span>←</span>
                <span>Back</span>
              </button>

              <button
                onClick={fetchTasks}
                className="
      inline-flex items-center justify-center gap-2
      rounded-xl px-4 py-2.5
      text-sm font-semibold text-white
      transition-all duration-200
      hover:-translate-y-0.5
      shadow-md
    "
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: C.card,
                  border: `1px solid ${C.border2}`,
                  borderRadius: 10,
                  //   padding: "8px 14px",
                  //   fontSize: 12,
                  //   fontWeight: 600,
                  color: C.slate,
                  cursor: "pointer",
                }}
              >
                <span>↻</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats strip ───────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 12,
            marginBottom: 20,
            animation: "fadeUp 0.35s ease",
          }}
        >
          {[
            {
              label: "Total",
              val: stats.total,
              color: C.accent,
              bg: C.accentL,
              border: C.accentB,
              filter: "All",
            },
            {
              label: "Completed",
              val: stats.completed,
              color: C.green,
              bg: C.greenL,
              border: C.greenB,
              filter: "Completed",
            },
            {
              label: "Pending",
              val: stats.pending,
              color: C.amber,
              bg: C.amberL,
              border: C.amberB,
              filter: "Pending",
            },
            {
              label: "Upcoming",
              val: stats.upcoming,
              color: "#7C3AED",
              bg: C.purpleL,
              border: "#DDD6FE",
              filter: "Upcoming",
            },
            {
              label: "Overdue",
              val: stats.overdue,
              color: C.red,
              bg: C.redL,
              border: C.redB,
              filter: "Overdue",
            },
          ].map(({ label, val, color, bg, border, filter }) => (
            <div
              key={label}
              onClick={() => {
                setStatusFilter(statusFilter === filter ? "All" : filter);
                setPage(1);
              }}
              style={{
                background: statusFilter === filter ? bg : C.card,
                border: `1px solid ${statusFilter === filter ? border : C.border}`,
                borderRadius: 14,
                padding: "14px 16px",
                cursor: "pointer",
                boxShadow:
                  statusFilter === filter
                    ? `0 4px 16px ${color}20`
                    : "0 1px 4px rgba(0,0,0,0.05)",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}
              >
                {val}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: C.slate,
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
              {label === "Total" && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      height: 4,
                      background: C.border,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${stats.pct}%`,
                        background: C.green,
                        borderRadius: 2,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: C.slate2, marginTop: 3 }}>
                    {stats.pct}% complete
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Filters + search ──────────────────────────────────────────── */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            animation: "fadeUp 0.4s ease",
          }}
        >
          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: C.surf,
              border: `1px solid ${C.border2}`,
              borderRadius: 10,
              padding: "7px 12px",
              flex: 1,
              minWidth: 200,
            }}
          >
            <span style={{ color: C.slate2, fontSize: 14 }}>⌕</span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, ID, department…"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
                color: C.text,
                flex: 1,
                fontFamily: "inherit",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.slate2,
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            size="middle"
            style={{
              width: 170,
            }}
            options={[
              {
                label: "All Status",
                value: "All",
              },
              {
                label: "Completed",
                value: "Completed",
              },
              {
                label: "Pending",
                value: "Pending",
              },
              {
                label: "Upcoming",
                value: "Upcoming",
              },
              {
                label: "Overdue",
                value: "Overdue",
              },
            ]}
          />

          {/* Type filter */}
          <Select
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            size="middle"
            style={{
              width: 170,
            }}
            options={[
              {
                label: "All Types",
                value: "All",
              },
              {
                label: "Delegation",
                value: "Delegation",
              },
              {
                label: "Recurring",
                value: "Recurring",
              },
            ]}
          />

          {/* Sort */}
          <Select
            value={`${sortBy}:${sortDir}`}
            onChange={(value) => {
              const [col, dir] = value.split(":");

              setSortBy(col);
              setSortDir(dir);
              setPage(1);
            }}
            size="middle"
            style={{
              width: 180,
            }}
            options={[
              {
                label: "Due Date ↓",
                value: "dueDate:desc",
              },
              {
                label: "Due Date ↑",
                value: "dueDate:asc",
              },
              {
                label: "Created ↓",
                value: "createdAt:desc",
              },
              {
                label: "Created ↑",
                value: "createdAt:asc",
              },
              {
                label: "Title A–Z",
                value: "title:asc",
              },
              {
                label: "Title Z–A",
                value: "title:desc",
              },
            ]}
          />

          <div style={{ fontSize: 12, color: C.slate2, marginLeft: "auto" }}>
            {filtered.length} task{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            animation: "fadeUp 0.45s ease",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "38px 110px 1fr 130px 120px 120px 110px 100px 60px",
              gap: 0,
              padding: "10px 16px",
              background: C.surf,
              borderBottom: `1px solid ${C.border}`,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.7px",
              textTransform: "uppercase",
              color: C.slate2,
            }}
          >
            <span>#</span>
            <span>Task ID</span>
            <span
              onClick={() => toggleSort("title")}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Title <SortIcon col="title" />
            </span>
            <span>Department</span>
            <span
              onClick={() => toggleSort("createdAt")}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Created <SortIcon col="createdAt" />
            </span>
            <span
              onClick={() => toggleSort("dueDate")}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Due <SortIcon col="dueDate" />
            </span>
            <span>Status</span>
            <span>Checklist</span>
            <span></span>
          </div>

          {/* Rows */}
          {paginated.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>
                📋
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.slate }}>
                No tasks found
              </div>
              <div style={{ fontSize: 12, color: C.slate2, marginTop: 4 }}>
                Try adjusting your filters
              </div>
            </div>
          ) : (
            paginated.map((task, idx) => {
              const st = getStatus(task.status);
              const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
              return (
                <div
                  key={task._id}
                  className="task-row"
                  onClick={() => setSelected(task)}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "38px 110px 1fr 130px 120px 120px 110px 100px 60px",
                    gap: 0,
                    padding: "13px 16px",
                    borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer",
                    alignItems: "center",
                    background: task.isReopen ? "#FFFBEB" : C.card,
                  }}
                >
                  {/* Row num */}
                  <span
                    style={{ fontSize: 11, color: C.slate2, fontWeight: 500 }}
                  >
                    {rowNum}
                  </span>

                  {/* Task ID */}
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      background: C.accentL,
                      color: C.accent,
                      padding: "2px 7px",
                      borderRadius: 6,
                      border: `1px solid ${C.accentB}`,
                      fontWeight: 700,
                      width: "fit-content",
                    }}
                  >
                    {task.TaskId}
                  </span>

                  {/* Title + description */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {task.title}
                      {task.isReopen && (
                        <span
                          style={{
                            fontSize: 10,
                            background: C.amberL,
                            color: C.amber,
                            border: `1px solid ${C.amberB}`,
                            borderRadius: 4,
                            padding: "1px 5px",
                            flexShrink: 0,
                            fontWeight: 700,
                          }}
                        >
                          Reopened
                        </span>
                      )}
                      {task.isDependent && (
                        <span
                          style={{
                            fontSize: 10,
                            background: C.purpleL,
                            color: C.purple,
                            border: "1px solid #DDD6FE",
                            borderRadius: 4,
                            padding: "1px 5px",
                            flexShrink: 0,
                            fontWeight: 700,
                          }}
                        >
                          Dep.
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.slate2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginTop: 2,
                      }}
                    >
                      {task.description}
                    </div>
                  </div>

                  {/* Department */}
                  <span
                    style={{
                      fontSize: 11,
                      color: C.slate,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.departmentOfAssignToUser?.name || "—"}
                  </span>

                  {/* Created */}
                  <span style={{ fontSize: 11, color: C.slate2 }}>
                    {fmt(task.createdAt)}
                  </span>

                  {/* Due */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color:
                          task.status !== "Completed" &&
                          task.dueDate &&
                          new Date(task.dueDate) < new Date()
                            ? C.red
                            : C.text2,
                        fontWeight: 500,
                      }}
                    >
                      {fmt(task.dueDate)}
                    </div>
                    <DelayChip task={task} />
                  </div>

                  {/* Status */}
                  <div style={{ minWidth: 80 }}>
                    <Pill
                      bg={st.bg}
                      text={st.text}
                      border={st.border}
                      dot={st.dot}
                    >
                      {st.label}
                    </Pill>
                  </div>

                  {/* Checklist */}
                  <div style={{ minWidth: 80 }}>
                    <ChecklistBar items={task.checklist} />
                  </div>

                  {/* Arrow */}
                  <span
                    style={{
                      color: C.slate2,
                      fontSize: 16,
                      textAlign: "right",
                    }}
                  >
                    ›
                  </span>
                </div>
              );
            })
          )}

          {/* Pagination */}
          {/* {totalPages > 1 && (
            <div
              style={{
                padding: "14px 20px",
                borderTop: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 12, color: C.slate }}>
                Page {page} of {totalPages} · {filtered.length} tasks
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{
                    background: C.surf,
                    border: `1px solid ${C.border2}`,
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: page === 1 ? C.slate2 : C.text,
                    cursor: page === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ← Prev
                </button>
                {Array.from(
                  { length: Math.min(totalPages, 7) },
                  (_, i) => i + 1,
                ).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: 32,
                      height: 32,
                      border: `1px solid ${page === p ? C.accent : C.border2}`,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: page === p ? 700 : 500,
                      background: page === p ? C.accent : C.surf,
                      color: page === p ? "#fff" : C.text,
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    background: C.surf,
                    border: `1px solid ${C.border2}`,
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: page === totalPages ? C.slate2 : C.text,
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )} */}
        </div>
      </div>

      {/* ── Task detail drawer ─────────────────────────────────────────── */}
      {selected && (
        <TaskDrawer task={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

export default UserTaskHistory;
