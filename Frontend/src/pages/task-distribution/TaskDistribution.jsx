import React, { useState, useMemo, useCallback } from "react";

/* ─── MOCK DATA ─────────────────────────────────────────────────────────── */
const MOCK_USERS = [
  {
    _id: "u1",
    name: "Priya Verma",
    role: "Manager",
    dept: "Operations",
    avatar: "PV",
  },
  {
    _id: "u2",
    name: "Rahul Singh",
    role: "Manager",
    dept: "Finance",
    avatar: "RS",
  },
  {
    _id: "u3",
    name: "Ankit Sharma",
    role: "Member",
    dept: "Operations",
    avatar: "AS",
  },
  {
    _id: "u4",
    name: "Sneha Patel",
    role: "Member",
    dept: "Finance",
    avatar: "SP",
  },
  {
    _id: "u5",
    name: "Kiran Mehta",
    role: "Sr. Manager",
    dept: "IT",
    avatar: "KM",
  },
  { _id: "u6", name: "Divya Roy", role: "Member", dept: "HR", avatar: "DR" },
];

const MOCK_TASKS = [
  {
    _id: "t1",
    TaskId: "25060041",
    title: "Q2 Vendor Reconciliation Audit",
    description:
      "Complete review of all vendor invoices and reconcile with purchase orders for Q2. Flag discrepancies above ₹50,000.",
    department: "Finance",
    priority: "High",
    assignedBy: { name: "Tushar Gupta", role: "Sr. Manager", avatar: "TG" },
    currentHolder: { name: "Priya Verma", role: "Manager", avatar: "PV" },
    finalAssignedTo: null,
    delegationLevel: 2,
    distributionStatus: "Forwarded",
    delegationFlowEnabled: true,
    startDate: "2026-06-01",
    dueDate: "2026-06-08",
    taskType: "DelegationTask",
    isRecurrent: false,
    delegationFlow: [
      {
        level: 1,
        actor: "Tushar Gupta",
        role: "Sr. Manager",
        action: "Created & Forwarded",
        timestamp: "2026-05-30T09:00:00Z",
        note: "Needs urgent review before board meeting.",
      },
      {
        level: 2,
        actor: "Priya Verma",
        role: "Manager",
        action: "Received",
        timestamp: "2026-05-30T09:45:00Z",
        note: null,
      },
    ],
  },
  {
    _id: "t2",
    TaskId: "25060042",
    title: "Server Infrastructure Health Check",
    description:
      "Monthly audit of all production servers. Document CPU, RAM, disk utilization trends.",
    department: "IT",
    priority: "Critical",
    assignedBy: { name: "Kiran Mehta", role: "Sr. Manager", avatar: "KM" },
    currentHolder: { name: "Priya Verma", role: "Manager", avatar: "PV" },
    finalAssignedTo: null,
    delegationLevel: 2,
    distributionStatus: "Pending",
    delegationFlowEnabled: true,
    startDate: "2026-06-02",
    dueDate: "2026-06-05",
    taskType: "DelegationTask",
    isRecurrent: true,
    delegationFlow: [
      {
        level: 1,
        actor: "Kiran Mehta",
        role: "Sr. Manager",
        action: "Created & Forwarded",
        timestamp: "2026-06-01T08:00:00Z",
        note: "Critical — SLA breach risk.",
      },
      {
        level: 2,
        actor: "Priya Verma",
        role: "Manager",
        action: "Received",
        timestamp: "2026-06-01T08:30:00Z",
        note: null,
      },
    ],
  },
  {
    _id: "t3",
    TaskId: "25060043",
    title: "Employee Onboarding Documentation",
    description:
      "Prepare complete onboarding kit for 3 new joiners in Operations. Include NDA, IT setup checklist, HR policies.",
    department: "HR",
    priority: "Medium",
    assignedBy: { name: "Atul Mohan", role: "Owner", avatar: "AM" },
    currentHolder: { name: "Priya Verma", role: "Manager", avatar: "PV" },
    finalAssignedTo: { name: "Divya Roy", role: "Member", avatar: "DR" },
    delegationLevel: 3,
    distributionStatus: "FinalAssigned",
    delegationFlowEnabled: true,
    startDate: "2026-05-28",
    dueDate: "2026-06-10",
    taskType: "DelegationTask",
    isRecurrent: false,
    delegationFlow: [
      {
        level: 1,
        actor: "Atul Mohan",
        role: "Owner",
        action: "Created & Forwarded",
        timestamp: "2026-05-28T10:00:00Z",
        note: null,
      },
      {
        level: 2,
        actor: "Priya Verma",
        role: "Manager",
        action: "Forwarded",
        timestamp: "2026-05-28T11:00:00Z",
        note: "Assigned to HR specialist.",
      },
      {
        level: 3,
        actor: "Divya Roy",
        role: "Member",
        action: "Final Assignment",
        timestamp: "2026-05-28T11:30:00Z",
        note: null,
      },
    ],
  },
  {
    _id: "t4",
    TaskId: "25060044",
    title: "Monthly GST Filing Preparation",
    description:
      "Compile all invoices, GSTR-2B reconciliation, and prepare data for CA submission.",
    department: "Finance",
    priority: "High",
    assignedBy: { name: "Tushar Gupta", role: "Sr. Manager", avatar: "TG" },
    currentHolder: { name: "Priya Verma", role: "Manager", avatar: "PV" },
    finalAssignedTo: null,
    delegationLevel: 2,
    distributionStatus: "Pending",
    delegationFlowEnabled: true,
    startDate: "2026-06-03",
    dueDate: "2026-06-07",
    taskType: "RecurringTask",
    isRecurrent: true,
    delegationFlow: [
      {
        level: 1,
        actor: "Tushar Gupta",
        role: "Sr. Manager",
        action: "Created & Forwarded",
        timestamp: "2026-06-02T14:00:00Z",
        note: "Monthly recurring.",
      },
      {
        level: 2,
        actor: "Priya Verma",
        role: "Manager",
        action: "Received",
        timestamp: "2026-06-02T14:20:00Z",
        note: null,
      },
    ],
  },
  {
    _id: "t5",
    TaskId: "25060045",
    title: "Client Contract Renewal Review",
    description:
      "Review expiring contracts for Q3. Flag clients requiring renegotiation.",
    department: "Operations",
    priority: "Medium",
    assignedBy: { name: "Atul Mohan", role: "Owner", avatar: "AM" },
    currentHolder: { name: "Priya Verma", role: "Manager", avatar: "PV" },
    finalAssignedTo: null,
    delegationLevel: 2,
    distributionStatus: "Forwarded",
    delegationFlowEnabled: true,
    startDate: "2026-06-01",
    dueDate: "2026-06-12",
    taskType: "DelegationTask",
    isRecurrent: false,
    delegationFlow: [
      {
        level: 1,
        actor: "Atul Mohan",
        role: "Owner",
        action: "Created & Forwarded",
        timestamp: "2026-05-31T16:00:00Z",
        note: null,
      },
      {
        level: 2,
        actor: "Priya Verma",
        role: "Manager",
        action: "Received",
        timestamp: "2026-05-31T16:30:00Z",
        note: null,
      },
    ],
  },
];

/* ─── CONSTANTS ─────────────────────────────────────────────────────────── */
const PRIORITY_META = {
  Critical: {
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    dot: "#EF4444",
  },
  High: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
  Medium: {
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    dot: "#3B82F6",
  },
  Low: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
};
const STATUS_META = {
  Pending: {
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    label: "Pending",
  },
  Forwarded: {
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    label: "Forwarded",
  },
  FinalAssigned: {
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    label: "Assigned",
  },
  Completed: {
    color: "#64748B",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    label: "Completed",
  },
};

const aging = (dueDate) => {
  const diff = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
  if (diff < 0)
    return {
      label: `${Math.abs(diff)}d overdue`,
      color: "#DC2626",
      bg: "#FEF2F2",
    };
  if (diff === 0)
    return { label: "Due today", color: "#D97706", bg: "#FFFBEB" };
  if (diff <= 2)
    return { label: `${diff}d left`, color: "#D97706", bg: "#FFFBEB" };
  return { label: `${diff}d left`, color: "#64748B", bg: "#F8FAFC" };
};

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
    ? new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/* ─── AVATAR ────────────────────────────────────────────────────────────── */
const Avatar = ({ initials, size = 28, gradient = false, title }) => (
  <div
    title={title}
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      flexShrink: 0,
      background: gradient
        ? "linear-gradient(135deg,#2563EB,#4F46E5)"
        : "#EFF6FF",
      border: `1.5px solid ${gradient ? "transparent" : "#BFDBFE"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.38,
      fontWeight: 700,
      color: gradient ? "#fff" : "#2563EB",
      letterSpacing: "-0.5px",
      userSelect: "none",
    }}
  >
    {initials}
  </div>
);

/* ─── PILL ──────────────────────────────────────────────────────────────── */
const Pill = ({ children, color, bg, border, dot, size = "xs" }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: size === "xs" ? "2px 7px" : "4px 10px",
      borderRadius: 20,
      fontSize: size === "xs" ? 10 : 11,
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${border}`,
      letterSpacing: "0.2px",
      whiteSpace: "nowrap",
    }}
  >
    {dot && (
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
        }}
      />
    )}
    {children}
  </span>
);

/* ─── TIMELINE ──────────────────────────────────────────────────────────── */
const Timeline = ({ flow }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    {flow.map((step, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          gap: 12,
          position: "relative",
          paddingBottom: i < flow.length - 1 ? 20 : 0,
        }}
      >
        {/* Connector line */}
        {i < flow.length - 1 && (
          <div
            style={{
              position: "absolute",
              left: 14,
              top: 28,
              bottom: 0,
              width: 1,
              background: "#E2E8F0",
            }}
          />
        )}
        {/* Dot */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            flexShrink: 0,
            background:
              i === flow.length - 1
                ? "linear-gradient(135deg,#2563EB,#4F46E5)"
                : "#F1F5F9",
            border: `2px solid ${i === flow.length - 1 ? "#2563EB" : "#E2E8F0"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: i === flow.length - 1 ? "#fff" : "#94A3B8",
            zIndex: 1,
          }}
        >
          {step.level}
        </div>
        {/* Content */}
        <div style={{ flex: 1, paddingTop: 4, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
              {step.actor}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#94A3B8",
                background: "#F1F5F9",
                padding: "1px 6px",
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              {step.role}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: i === flow.length - 1 ? "#2563EB" : "#64748B",
              marginBottom: 2,
            }}
          >
            {step.action}
          </div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>
            {fmtTime(step.timestamp)}
          </div>
          {step.note && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#334155",
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 7,
                padding: "6px 10px",
              }}
            >
              "{step.note}"
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

/* ─── TASK CARD (left panel) ────────────────────────────────────────────── */
const TaskCard = ({ task, selected, onClick }) => {
  const [hov, setHov] = useState(false);
  const age = aging(task.dueDate);
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.Medium;
  const sm = STATUS_META[task.distributionStatus] || STATUS_META.Pending;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: selected ? "#EFF6FF" : hov ? "#FAFBFF" : "#FFFFFF",
        border: `1px solid ${selected ? "#2563EB" : hov ? "#BFDBFE" : "#E2E8F0"}`,
        borderLeft: `3px solid ${selected ? "#2563EB" : pm.dot}`,
        borderRadius: 12,
        padding: "14px 14px 12px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: selected
          ? "0 0 0 3px rgba(37,99,235,0.1)"
          : hov
            ? "0 2px 12px rgba(0,0,0,0.07)"
            : "0 1px 3px rgba(0,0,0,0.04)",
        marginBottom: 8,
        position: "relative",
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                fontWeight: 700,
                color: "#2563EB",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: 5,
                padding: "1px 7px",
              }}
            >
              #{task.TaskId}
            </span>
            {task.isRecurrent && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#7C3AED",
                  background: "#F5F3FF",
                  border: "1px solid #DDD6FE",
                  borderRadius: 5,
                  padding: "1px 6px",
                }}
              >
                ↻ Recurring
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#0F172A",
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {task.title}
          </div>
        </div>
        <Pill color={pm.color} bg={pm.bg} border={pm.border} dot={pm.dot}>
          {task.priority}
        </Pill>
      </div>

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#64748B",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 5,
            padding: "2px 7px",
          }}
        >
          🏢 {task.department}
        </span>
        <Pill color={sm.color} bg={sm.bg} border={sm.border} dot={sm.color}>
          {sm.label}
        </Pill>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: age.color,
            background: age.bg,
            border: `1px solid ${age.color}30`,
            borderRadius: 5,
            padding: "2px 7px",
          }}
        >
          {age.label}
        </span>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Avatar initials={task.assignedBy.avatar} size={20} />
          <span style={{ fontSize: 11, color: "#64748B" }}>
            from{" "}
            <strong style={{ color: "#334155" }}>{task.assignedBy.name}</strong>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Delegation level dots */}
          {Array.from({ length: task.delegationLevel }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background:
                  i < task.delegationFlow.length ? "#2563EB" : "#E2E8F0",
              }}
            />
          ))}
          <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 4 }}>
            L{task.delegationLevel}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── SELECT FIELD ──────────────────────────────────────────────────────── */
const SelectF = ({ value, onChange, options, placeholder }) => {
  const [f, setF] = useState(false);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{
        width: "100%",
        border: `1px solid ${f ? "#2563EB" : "#CBD5E1"}`,
        borderRadius: 9,
        padding: "9px 12px",
        fontSize: 13,
        color: value ? "#0F172A" : "#94A3B8",
        fontFamily: "inherit",
        outline: "none",
        background: "#fff",
        boxShadow: f ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
        transition: "all 0.15s",
        appearance: "none",
        cursor: "pointer",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o._id} value={o._id}>
          {o.name} — {o.role}
        </option>
      ))}
    </select>
  );
};

const TextArea = ({ value, onChange, placeholder }) => {
  const [f, setF] = useState(false);
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{
        width: "100%",
        border: `1px solid ${f ? "#2563EB" : "#CBD5E1"}`,
        borderRadius: 9,
        padding: "9px 12px",
        fontSize: 13,
        color: "#0F172A",
        fontFamily: "inherit",
        outline: "none",
        background: "#fff",
        resize: "vertical",
        boxShadow: f ? "0 0 0 3px rgba(37,99,235,0.12)" : "none",
        transition: "all 0.15s",
        boxSizing: "border-box",
      }}
    />
  );
};

const ActionBtn = ({ children, onClick, disabled, variant = "primary" }) => {
  const [hov, setHov] = useState(false);
  const V = {
    primary: {
      bg: hov ? "#1D4ED8" : "#2563EB",
      color: "#fff",
      border: "none",
      shadow: "0 2px 8px rgba(37,99,235,0.3)",
    },
    success: {
      bg: hov ? "#047857" : "#059669",
      color: "#fff",
      border: "none",
      shadow: "0 2px 8px rgba(5,150,105,0.3)",
    },
    ghost: {
      bg: hov ? "#F1F5F9" : "transparent",
      color: "#64748B",
      border: "1px solid #E2E8F0",
      shadow: "none",
    },
  };
  const s = V[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "9px 18px",
        borderRadius: 9,
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        border: s.border || "none",
        background: s.bg,
        color: s.color,
        boxShadow: s.shadow,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════════════ */
export default function TaskDistributionCenter() {
  const [selectedId, setSelectedId] = useState("t2");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusF] = useState("All");
  const [deptFilter, setDeptF] = useState("All");
  const [actionTab, setActionTab] = useState("forward"); // forward | assign
  const [forwardTo, setForwardTo] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const filtered = useMemo(
    () =>
      MOCK_TASKS.filter((t) => {
        const q = search.toLowerCase();
        const matchQ =
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.TaskId.includes(q) ||
          t.department.toLowerCase().includes(q);
        const matchS =
          statusFilter === "All" || t.distributionStatus === statusFilter;
        const matchD = deptFilter === "All" || t.department === deptFilter;
        return matchQ && matchS && matchD;
      }),
    [search, statusFilter, deptFilter],
  );

  const selected = MOCK_TASKS.find((t) => t._id === selectedId);

  const stats = useMemo(
    () => ({
      total: MOCK_TASKS.length,
      pending: MOCK_TASKS.filter((t) => t.distributionStatus === "Pending")
        .length,
      forwarded: MOCK_TASKS.filter((t) => t.distributionStatus === "Forwarded")
        .length,
      assigned: MOCK_TASKS.filter(
        (t) => t.distributionStatus === "FinalAssigned",
      ).length,
    }),
    [],
  );

  const handleForward = () => {
    if (!forwardTo) {
      showToast("Please select a manager to forward to", "error");
      return;
    }
    showToast(
      `Task forwarded to ${MOCK_USERS.find((u) => u._id === forwardTo)?.name}`,
    );
    setForwardTo("");
    setForwardNote("");
  };

  const handleAssign = () => {
    if (!assignTo) {
      showToast("Please select a member for final assignment", "error");
      return;
    }
    showToast(
      `Task finally assigned to ${MOCK_USERS.find((u) => u._id === assignTo)?.name}`,
      "success",
    );
    setAssignTo("");
    setAssignNote("");
  };

  const managers = MOCK_USERS.filter(
    (u) => u.role === "Manager" || u.role === "Sr. Manager",
  );
  const members = MOCK_USERS.filter((u) => u.role === "Member");
  const depts = [...new Set(MOCK_TASKS.map((t) => t.department))];

  return (
    <div
      style={{
        minHeight: "100vh",
        // background: "#F0F4FA",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=DM+Mono:wght@400;500&display=swap');
      `}</style>

      {/* ── TOAST ─────────────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            animation: "toastIn 0.25s ease",
            background: toast.type === "error" ? "#FEF2F2" : "#ECFDF5",
            border: `1px solid ${toast.type === "error" ? "#FECACA" : "#A7F3D0"}`,
            borderRadius: 12,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            color: toast.type === "error" ? "#DC2626" : "#059669",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          {toast.type === "error" ? "⚠" : "✓"} {toast.msg}
        </div>
      )}

      <div style={{ margin: "0 auto", padding: "20px 28px" }}>
        {/* ── STATS STRIP ───────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
            marginBottom: 20,
            animation: "fadeIn 0.3s ease",
          }}
        >
          {[
            {
              label: "In My Inbox",
              val: stats.total,
              color: "#2563EB",
              bg: "#EFF6FF",
              border: "#BFDBFE",
              icon: "📥",
            },
            {
              label: "Awaiting Action",
              val: stats.pending,
              color: "#D97706",
              bg: "#FFFBEB",
              border: "#FDE68A",
              icon: "⏳",
            },
            {
              label: "Forwarded On",
              val: stats.forwarded,
              color: "#7C3AED",
              bg: "#F5F3FF",
              border: "#DDD6FE",
              icon: "↗",
            },
            {
              label: "Final Assigned",
              val: stats.assigned,
              color: "#059669",
              bg: "#ECFDF5",
              border: "#A7F3D0",
              icon: "✓",
            },
          ].map(({ label, val, color, bg, border, icon }) => (
            <div
              key={label}
              style={{
                background: "#fff",
                border: `1px solid ${border}`,
                borderRadius: 14,
                padding: "16px 18px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color,
                    lineHeight: 1,
                  }}
                >
                  {val}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── TWO-PANEL LAYOUT ──────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "380px 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* ── LEFT: INBOX ─────────────────────────────────────────────── */}
          <div style={{ animation: "fadeIn 0.35s ease" }}>
            {/* Search + Filters */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: "14px 14px 12px",
                marginBottom: 10,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              {/* Search */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 9,
                  padding: "7px 12px",
                  marginBottom: 10,
                }}
              >
                <span style={{ color: "#94A3B8", fontSize: 14 }}>⌕</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks, IDs…"
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 13,
                    color: "#0F172A",
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
                      color: "#94A3B8",
                      fontSize: 14,
                      display: "flex",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {/* Filters */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusF(e.target.value)}
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    color: "#334155",
                    fontFamily: "inherit",
                    outline: "none",
                    background: "#F8FAFC",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Forwarded">Forwarded</option>
                  <option value="FinalAssigned">Assigned</option>
                </select>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptF(e.target.value)}
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    color: "#334155",
                    fontFamily: "inherit",
                    outline: "none",
                    background: "#F8FAFC",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">All Depts</option>
                  {depts.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Count */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                padding: "0 2px",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                }}
              >
                {filtered.length} task{filtered.length !== 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>
                sorted by urgency
              </span>
            </div>

            {/* Cards */}
            <div
              style={{
                maxHeight: "calc(100vh - 300px)",
                overflowY: "auto",
                paddingRight: 2,
              }}
            >
              {filtered.length === 0 ? (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    padding: "40px 20px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>
                    📭
                  </div>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: "#64748B" }}
                  >
                    No tasks match your filters
                  </div>
                </div>
              ) : (
                filtered.map((t) => (
                  <TaskCard
                    key={t._id}
                    task={t}
                    selected={selectedId === t._id}
                    onClick={() => setSelectedId(t._id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT: DETAIL PANEL ───────────────────────────────────── */}
          {selected ? (
            <div
              key={selected._id}
              style={{
                animation: "slideIn 0.25s ease",
                position: "sticky",
                top: 20,
                maxHeight: "calc(100vh - 100px)",
                overflowY: "auto",
              }}
            >
              {/* Task Details Card */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 16,
                  padding: "22px 24px",
                  marginBottom: 14,
                  boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 16,
                    paddingBottom: 16,
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#2563EB",
                          background: "#EFF6FF",
                          border: "1px solid #BFDBFE",
                          borderRadius: 6,
                          padding: "2px 8px",
                        }}
                      >
                        #{selected.TaskId}
                      </span>
                      <Pill
                        color={PRIORITY_META[selected.priority]?.color}
                        bg={PRIORITY_META[selected.priority]?.bg}
                        border={PRIORITY_META[selected.priority]?.border}
                        dot={PRIORITY_META[selected.priority]?.dot}
                        size="sm"
                      >
                        {selected.priority}
                      </Pill>
                      <Pill
                        color={STATUS_META[selected.distributionStatus]?.color}
                        bg={STATUS_META[selected.distributionStatus]?.bg}
                        border={
                          STATUS_META[selected.distributionStatus]?.border
                        }
                        size="sm"
                      >
                        {STATUS_META[selected.distributionStatus]?.label}
                      </Pill>
                      {selected.isRecurrent && (
                        <Pill
                          color="#7C3AED"
                          bg="#F5F3FF"
                          border="#DDD6FE"
                          size="sm"
                        >
                          ↻ Recurring
                        </Pill>
                      )}
                    </div>
                    <h2
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "#0F172A",
                        lineHeight: 1.35,
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {selected.title}
                    </h2>
                  </div>
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: 13,
                    color: "#334155",
                    lineHeight: 1.65,
                    marginBottom: 16,
                  }}
                >
                  {selected.description}
                </div>

                {/* Info grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  {[
                    {
                      label: "Department",
                      val: selected.department,
                      icon: "🏢",
                    },
                    {
                      label: "Start Date",
                      val: fmt(selected.startDate),
                      icon: "📅",
                    },
                    {
                      label: "Due Date",
                      val: fmt(selected.dueDate),
                      icon: "🎯",
                    },
                    {
                      label: "Task Type",
                      val: selected.taskType.replace("Task", ""),
                      icon: "📋",
                    },
                    {
                      label: "Delegated By",
                      val: `${selected.assignedBy.name}`,
                      icon: "👤",
                    },
                    {
                      label: "Level",
                      val: `Delegation L${selected.delegationLevel}`,
                      icon: "⬆",
                    },
                  ].map(({ label, val, icon }) => (
                    <div
                      key={label}
                      style={{
                        background: "#F8FAFC",
                        border: "1px solid #F1F5F9",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#94A3B8",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          marginBottom: 4,
                        }}
                      >
                        {icon} {label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#0F172A",
                        }}
                      >
                        {val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* People strip */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div
                    style={{
                      flex: 1,
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      borderRadius: 10,
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Avatar
                      initials={selected.assignedBy.avatar}
                      size={28}
                      gradient
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#2563EB",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Assigned By
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#0F172A",
                        }}
                      >
                        {selected.assignedBy.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>
                        {selected.assignedBy.role}
                      </div>
                    </div>
                  </div>
                  {selected.finalAssignedTo && (
                    <div
                      style={{
                        flex: 1,
                        background: "#ECFDF5",
                        border: "1px solid #A7F3D0",
                        borderRadius: 10,
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Avatar
                        initials={selected.finalAssignedTo.avatar}
                        size={28}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#059669",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Final Assignee
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#0F172A",
                          }}
                        >
                          {selected.finalAssignedTo.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#64748B" }}>
                          {selected.finalAssignedTo.role}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delegation Timeline Card */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 16,
                  padding: "20px 24px",
                  marginBottom: 14,
                  boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                    }}
                  >
                    ⇄
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0F172A",
                      }}
                    >
                      Delegation Flow
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>
                      {selected.delegationFlow.length} steps completed
                    </div>
                  </div>
                </div>
                <Timeline flow={selected.delegationFlow} />
              </div>

              {/* Action Panel */}
              {selected.distributionStatus !== "FinalAssigned" && (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* Tab bar */}
                  <div
                    style={{
                      display: "flex",
                      borderBottom: "1px solid #F1F5F9",
                    }}
                  >
                    {[
                      {
                        id: "forward",
                        label: "↗ Forward Task",
                        color: "#7C3AED",
                      },
                      {
                        id: "assign",
                        label: "✓ Final Assign",
                        color: "#059669",
                      },
                    ].map(({ id, label, color }) => (
                      <button
                        key={id}
                        onClick={() => setActionTab(id)}
                        style={{
                          flex: 1,
                          padding: "13px 12px",
                          border: "none",
                          cursor: "pointer",
                          background: actionTab === id ? "#fff" : "#F8FAFC",
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: "inherit",
                          color: actionTab === id ? color : "#94A3B8",
                          borderBottom:
                            actionTab === id
                              ? `2px solid ${color}`
                              : "2px solid transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Tab body */}
                  <div style={{ padding: "20px 22px" }}>
                    {actionTab === "forward" ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          animation: "fadeIn 0.2s ease",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#64748B",
                              textTransform: "uppercase",
                              letterSpacing: "0.6px",
                              marginBottom: 6,
                            }}
                          >
                            Forward To{" "}
                            <span style={{ color: "#DC2626" }}>*</span>
                          </label>
                          <SelectF
                            value={forwardTo}
                            onChange={setForwardTo}
                            options={managers}
                            placeholder="— Select Manager / Sr. Manager —"
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#64748B",
                              textTransform: "uppercase",
                              letterSpacing: "0.6px",
                              marginBottom: 6,
                            }}
                          >
                            Note (Optional)
                          </label>
                          <TextArea
                            value={forwardNote}
                            onChange={setForwardNote}
                            placeholder="Add routing instructions or context…"
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            justifyContent: "flex-end",
                          }}
                        >
                          <ActionBtn
                            variant="ghost"
                            onClick={() => {
                              setForwardTo("");
                              setForwardNote("");
                            }}
                          >
                            Clear
                          </ActionBtn>
                          <ActionBtn onClick={handleForward}>
                            ↗ Forward Task
                          </ActionBtn>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          animation: "fadeIn 0.2s ease",
                        }}
                      >
                        <div
                          style={{
                            background: "#FFFBEB",
                            border: "1px solid #FDE68A",
                            borderRadius: 10,
                            padding: "10px 14px",
                            fontSize: 12,
                            color: "#92400E",
                            fontWeight: 500,
                          }}
                        >
                          ⚠ Final assignment makes this task visible in the
                          worker's task dashboard.
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#64748B",
                              textTransform: "uppercase",
                              letterSpacing: "0.6px",
                              marginBottom: 6,
                            }}
                          >
                            Assign To Member{" "}
                            <span style={{ color: "#DC2626" }}>*</span>
                          </label>
                          <SelectF
                            value={assignTo}
                            onChange={setAssignTo}
                            options={members}
                            placeholder="— Select Team Member —"
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#64748B",
                              textTransform: "uppercase",
                              letterSpacing: "0.6px",
                              marginBottom: 6,
                            }}
                          >
                            Instruction Note
                          </label>
                          <TextArea
                            value={assignNote}
                            onChange={setAssignNote}
                            placeholder="Specific instructions for the assignee…"
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            justifyContent: "flex-end",
                          }}
                        >
                          <ActionBtn
                            variant="ghost"
                            onClick={() => {
                              setAssignTo("");
                              setAssignNote("");
                            }}
                          >
                            Clear
                          </ActionBtn>
                          <ActionBtn variant="success" onClick={handleAssign}>
                            ✓ Final Assign
                          </ActionBtn>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Already assigned state */}
              {selected.distributionStatus === "FinalAssigned" && (
                <div
                  style={{
                    background: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    borderRadius: 16,
                    padding: "20px 24px",
                    textAlign: "center",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#059669",
                      marginBottom: 4,
                    }}
                  >
                    Task Finally Assigned
                  </div>
                  <div style={{ fontSize: 12, color: "#065F46" }}>
                    This task is now visible in{" "}
                    <strong>{selected.finalAssignedTo?.name}'s</strong> task
                    dashboard.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 16,
                padding: "80px 40px",
                textAlign: "center",
                boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.25 }}>
                ⇄
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#64748B",
                  marginBottom: 6,
                }}
              >
                Select a task
              </div>
              <div style={{ fontSize: 13, color: "#94A3B8" }}>
                Click any task from the inbox to view details and take action
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
