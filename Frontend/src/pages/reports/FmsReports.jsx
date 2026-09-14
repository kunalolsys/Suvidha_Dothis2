import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Layers,
  Award,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Target,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  PieChart as PieChartIcon,
  List,
  TrendingDown,
  Hourglass,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { getUserForDrop } from "../../redux/slices/user/userSlice.js";
import api from "../../lib/api";
import { DatePicker, Select as AntdSelect } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

/* ─── Design Tokens ───────────────────────────────────────────────────── */
const TOKEN = {
  bg: "#F8FAFC",
  surface: "#F1F5F9",
  card: "#FFFFFF",
  cardHover: "#FAFAFA",
  border: "#E2E8F0",
  border2: "#CBD5E1",
  accent: "#2563EB",
  accent2: "#4F46E5",
  green: "#059669",
  greenGlow: "rgba(5,150,105,0.12)",
  amber: "#D97706",
  amberGlow: "rgba(217,119,6,0.12)",
  red: "#DC2626",
  redGlow: "rgba(220,38,38,0.12)",
  purple: "#7C3AED",
  teal: "#0D9488",
  text: "#0F172A",
  muted: "#64748B",
  muted2: "#94A3B8",
};

const STATUS_META = {
  Overdue: { color: TOKEN.red, bg: TOKEN.redGlow, label: "Overdue" },
  Pending: { color: TOKEN.amber, bg: TOKEN.amberGlow, label: "Pending" },
  Completed: { color: TOKEN.green, bg: TOKEN.greenGlow, label: "Completed" },
  "In Progress": { color: TOKEN.accent, bg: "rgba(37,99,235,0.12)", label: "In Progress" },
  Ongoing: { color: TOKEN.accent, bg: "rgba(37,99,235,0.12)", label: "Ongoing" },
  Stopped: { color: TOKEN.muted, bg: "rgba(100,116,139,0.12)", label: "Stopped" },
  "Not Done": { color: TOKEN.red, bg: TOKEN.redGlow, label: "Not Done" },
};

const CHART_COLORS = [
  TOKEN.accent,
  TOKEN.green,
  TOKEN.amber,
  TOKEN.purple,
  TOKEN.teal,
  TOKEN.red,
];

/* ─── Inline Styles ────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: "100vh",
    background: TOKEN.bg,
    fontFamily: "'DM Sans', 'Inter', 'Segoe UI', sans-serif",
    color: TOKEN.text,
    padding: "24px",
  },
  card: (hover) => ({
    background: hover ? TOKEN.cardHover : TOKEN.card,
    border: `1px solid ${TOKEN.border}`,
    borderRadius: "16px",
    transition: "all 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  }),
  kpiCard: {
    background: TOKEN.card,
    border: `1px solid ${TOKEN.border}`,
    borderRadius: "16px",
    padding: "20px",
    flex: 1,
    minWidth: "160px",
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "default",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  label: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    color: TOKEN.muted,
  },
  value: {
    fontSize: "32px",
    fontWeight: 700,
    lineHeight: 1,
    marginTop: "8px",
    marginBottom: "4px",
  },
  badge: (color, bg) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 600,
    color,
    background: bg,
    border: `1px solid ${color}33`,
  }),
  filterBar: {
    background: TOKEN.card,
    border: `1px solid ${TOKEN.border}`,
    borderRadius: "14px",
    padding: "16px 20px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "16px",
    marginBottom: "24px",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "1px",
    textTransform: "uppercase",
    color: TOKEN.muted2,
    borderBottom: `1px solid ${TOKEN.border}`,
    background: TOKEN.surface,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 14px",
    borderBottom: `1px solid ${TOKEN.border}`,
    verticalAlign: "middle",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: TOKEN.text,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  tab: (active) => ({
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    border: "none",
    fontFamily: "inherit",
    background: active ? TOKEN.accent : "transparent",
    color: active ? "#fff" : TOKEN.muted,
    transition: "all 0.15s",
  }),
  btn: (primary) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "10px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    border: primary ? "none" : `1px solid ${TOKEN.border2}`,
    fontFamily: "inherit",
    transition: "all 0.2s",
    background: primary ? TOKEN.accent : "#FFFFFF",
    color: primary ? "#fff" : TOKEN.text,
  }),
};

/* ─── Custom Tooltip ────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${TOKEN.border2}`,
        borderRadius: "10px",
        padding: "12px 16px",
        fontSize: "13px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ color: TOKEN.muted, marginBottom: "6px", fontWeight: 600 }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            color: p.color,
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <span>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ─── KPI Card ──────────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, icon: Icon, color, trend }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...S.kpiCard,
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? `0 8px 32px ${color}22` : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "80px",
          height: "80px",
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          borderRadius: "0 16px 0 0",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={S.label}>{label}</div>
        <div
          style={{
            background: `${color}15`,
            border: `1px solid ${color}30`,
            borderRadius: "10px",
            padding: "7px",
            display: "flex",
          }}
        >
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ ...S.value, color }}>{value}</div>
      {sub && (
        <div
          style={{
            fontSize: "12px",
            color: TOKEN.muted,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {trend === "up" && <ArrowUpRight size={12} color={TOKEN.green} />}
          {trend === "down" && <ArrowDownRight size={12} color={TOKEN.red} />}
          {sub}
        </div>
      )}
    </div>
  );
};

/* ─── Progress Bar ──────────────────────────────────────────────────────── */
const ProgressBar = ({ value, color, height = 6 }) => (
  <div
    style={{
      background: TOKEN.border,
      borderRadius: "99px",
      height,
      overflow: "hidden",
      width: "100%",
    }}
  >
    <div
      style={{
        width: `${Math.min(100, value || 0)}%`,
        height: "100%",
        background: color,
        borderRadius: "99px",
        transition: "width 0.6s ease",
      }}
    />
  </div>
);

/* ─── Rank Badge ────────────────────────────────────────────────────────── */
const RankBadge = ({ rank }) => {
  const colors = { 1: "#F59E0B", 2: "#94A3B8", 3: "#CD7C2F" };
  return (
    <div
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: colors[rank] || TOKEN.border,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "12px",
        color: rank <= 3 ? "#000" : TOKEN.muted,
        flexShrink: 0,
      }}
    >
      {rank}
    </div>
  );
};

/* ─── Main Component ────────────────────────────────────────────────────── */
const FmsReports = () => {
  const dropdownUsers = useSelector(
    (state) => state.users?.dropdownUsers || [],
  );
  const dispatch = useDispatch();

  // Filter States
  const [period, setPeriod] = useState("weekly");
  const [memberIdsMode, setMemberIdsMode] = useState(["all"]);
  const [selectedTemplate, setSelectedTemplate] = useState("all");
  const [instanceStatus, setInstanceStatus] = useState("all");
  const [dateRange, setDateRange] = useState(null);

  // Pagination & Display States
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Options State
  const [templatesList, setTemplatesList] = useState([]);

  // Data State
  const [data, setData] = useState({
    tasks: [],
    topPerformers: [],
    templateStats: [],
    pagination: { current: 1, pages: 1, total: 0, limit: 10 },
    dateRange: { start: "", end: "" },
    filters: {},
  });

  useEffect(() => {
    dispatch(getUserForDrop());
    fetchTemplates();
  }, [dispatch]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/fms/all-templates");
      setTemplatesList(res.data?.data || res.data || []);
    } catch (e) {
      console.error("Failed to load templates", e);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [period, memberIdsMode, selectedTemplate, instanceStatus, dateRange]);

  // Main Report Fetch Logic
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.post("/fms-report/report", {
          period: dateRange?.length === 2 ? "custom" : period,
          limit: 10,
          page,
          memberIds: memberIdsMode.includes("all") ? ["all"] : memberIdsMode,
          templateId: selectedTemplate === "all" ? null : selectedTemplate,
          instanceStatus: instanceStatus === "all" ? null : instanceStatus,
          startDate: dateRange?.[0]?.format("YYYY-MM-DD") || null,
          endDate: dateRange?.[1]?.format("YYYY-MM-DD") || null,
        });

        const d = res.data;
        setData({
          tasks: d.tasks || [],
          topPerformers: d.topPerformers || [],
          templateStats: d.templateStats || [],
          pagination: d.pagination || {
            current: 1,
            pages: 1,
            total: 0,
            limit: 10,
          },
          dateRange: d.dateRange || {},
          filters: d.filters || {},
        });
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to fetch report");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [
    period,
    memberIdsMode,
    selectedTemplate,
    instanceStatus,
    page,
    dateRange,
  ]);

  /* ── 🟢 FIXED Metrics (Uses global templateStats instead of paginated tasks) ── */
  const metrics = useMemo(() => {
    const stats = data.templateStats || [];
    const total = data.pagination.total || 0;

    // Aggregate global overdue, completed, and pending counts from templateStats
    const overdue = stats.reduce((acc, curr) => acc + (curr.overdue || 0), 0);
    const completed = stats.reduce((acc, curr) => acc + (curr.completed || 0), 0);
    const pending = stats.reduce((acc, curr) => acc + (curr.pending || 0), 0);

    const ongoingInstances = [
      ...new Set((data.tasks || []).map((t) => t.fmsInstanceId?._id)),
    ].filter(Boolean).length;

    return { total, overdue, completed, pending, ongoingInstances };
  }, [data]);

  /* ── Status Pie Data ── */
  const statusPieData = useMemo(() => {
    const counts = {};
    (data.tasks || []).forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: STATUS_META[name]?.color || TOKEN.muted,
    }));
  }, [data.tasks]);

  /* ── Template Bar Data ── */
  const templateBarData = useMemo(
    () =>
      (data.templateStats || []).map((ts) => ({
        name:
          ts.templateName?.length > 18
            ? ts.templateName.slice(0, 18) + "…"
            : ts.templateName || "Unknown",
        Assigned: ts.assigned || 0,
        Completed: ts.completed || 0,
        Overdue: ts.overdue || 0,
        Pending: ts.pending || 0,
      })),
    [data.templateStats],
  );

  /* ── Frequency Line Chart Data ── */
  const freqData = useMemo(() => {
    const byDate = {};
    (data.tasks || []).forEach((t) => {
      const d = t.plannedDueDate
        ? new Date(t.plannedDueDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })
        : "Pending";
      if (!byDate[d]) byDate[d] = { date: d, total: 0, overdue: 0 };
      byDate[d].total++;
      if (t.status === "Overdue") byDate[d].overdue++;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [data.tasks]);

  /* ── Radial Performer Scores ── */
  const performerRadial = useMemo(
    () =>
      (data.topPerformers || []).slice(0, 5).map((p, i) => ({
        name: p.userName || "User",
        score: p.score || 0,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [data.topPerformers],
  );

  const TABS = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "tasks", label: "Task Details", icon: List },
    { id: "performers", label: "Performers", icon: Award },
    { id: "templates", label: "Templates", icon: Layers },
  ];

  return (
    <div style={S.page}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  background: `linear-gradient(135deg, ${TOKEN.accent}, ${TOKEN.accent2})`,
                  borderRadius: "12px",
                  padding: "10px",
                  display: "flex",
                }}
              >
                <Zap size={20} color="#fff" />
              </div>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  margin: 0,
                  background: `linear-gradient(90deg, ${TOKEN.text}, ${TOKEN.muted})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                FMS Reports
              </h1>
            </div>
            {data.dateRange?.start && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: TOKEN.muted,
                  fontSize: "13px",
                }}
              >
                <Calendar size={13} />
                {data.dateRange.start} — {data.dateRange.end}
              </div>
            )}
          </div>
          {!loading && data.pagination.total > 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={S.badge(TOKEN.green, "rgba(16,185,129,0.1)")}>
                {data.pagination.total} records
              </span>
              <span style={S.badge(TOKEN.accent, "rgba(59,130,246,0.1)")}>
                {period}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={S.filterBar}>
        <div>
          <div style={{ ...S.label, marginBottom: "6px" }}>Period</div>
          <AntdSelect
            value={period}
            onChange={(value) => setPeriod(value)}
            style={{ width: 140 }}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "quarterly", label: "Quarterly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
        </div>

        <div style={{ minWidth: "180px" }}>
          <div style={{ ...S.label, marginBottom: "6px" }}>Doers</div>
          <AntdSelect
            mode="multiple"
            showSearch
            placeholder={`Select Users (${dropdownUsers.length})`}
            value={memberIdsMode}
            onChange={(values) => {
              if (values.length === 0) {
                setMemberIdsMode(["all"]);
              } else {
                const filtered = values.filter((v) => v !== "all");
                setMemberIdsMode(filtered.length ? filtered : ["all"]);
              }
            }}
            style={{ width: "100%" }}
            optionFilterProp="label"
            options={[
              { value: "all", label: "All Members" },
              ...dropdownUsers
                .filter((item) => item.role?.name !== "Owner")
                .map((u) => ({
                  value: u._id,
                  label: `${u.name || u.email} (${u.role?.name || "No Role"})`,
                })),
            ]}
          />
        </div>

        <div>
          <div style={{ ...S.label, marginBottom: "6px" }}>FMS Template</div>
          <AntdSelect
            value={selectedTemplate}
            onChange={(val) => setSelectedTemplate(val)}
            style={{ width: 160 }}
            options={[
              { value: "all", label: "All Templates" },
              ...templatesList.map((t) => ({
                value: t._id,
                label: t.templateName,
              })),
            ]}
          />
        </div>

        <div>
          <div style={{ ...S.label, marginBottom: "6px" }}>Instance Status</div>
          <AntdSelect
            value={instanceStatus}
            onChange={(val) => setInstanceStatus(val)}
            style={{ width: 140 }}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "ongoing", label: "Ongoing" },
              { value: "completed", label: "Completed" },
              { value: "onhold", label: "On Hold" },
              { value: "stopped", label: "Stopped" },
              { value: "upcoming", label: "Upcoming" },
            ]}
          />
        </div>

        <div>
          <div style={{ ...S.label, marginBottom: "6px" }}>Date</div>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            format="DD MMM YYYY"
            style={{ borderRadius: 6 }}
          />
        </div>

        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: TOKEN.muted,
              fontSize: "13px",
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: "spin 0.8s linear infinite",
                color: TOKEN.accent,
              }}
            />
            Loading…
          </div>
        )}
        {error && (
          <div style={{ color: TOKEN.red, fontSize: "13px", flex: "1 1 100%" }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* ── KPI Cards (🟢 Fixed Accurate Totals) ── */}
      {data.pagination.total > 0 && (
        <div
          style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <KpiCard
            label="Total Tasks"
            value={metrics.total}
            sub="In period"
            icon={BarChart2}
            color={TOKEN.accent}
          />
          <KpiCard
            label="Overdue"
            value={metrics.overdue}
            sub="Needs attention"
            icon={AlertCircle}
            color={TOKEN.red}
            trend="down"
          />
          <KpiCard
            label="Pending"
            value={metrics.pending}
            sub="Waiting / In Process"
            icon={Hourglass}
            color={TOKEN.amber}
          />
          <KpiCard
            label="Completed"
            value={metrics.completed}
            sub="Closed"
            icon={CheckCircle2}
            color={TOKEN.green}
            trend="up"
          />
          <KpiCard
            label="Active Instances"
            value={metrics.ongoingInstances}
            sub="FMS workflows"
            icon={Layers}
            color={TOKEN.purple}
          />
          <KpiCard
            label="Templates"
            value={data.templateStats.length}
            sub="In this report"
            icon={Target}
            color={TOKEN.teal}
          />
        </div>
      )}

      {/* ── Tabs Navigation ── */}
      {data.pagination.total > 0 && (
        <>
          <div
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "20px",
              background: TOKEN.card,
              padding: "6px",
              borderRadius: "12px",
              border: `1px solid ${TOKEN.border}`,
              width: "fit-content",
            }}
          >
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                style={S.tab(activeTab === id)}
                onClick={() => setActiveTab(id)}
              >
                <Icon
                  size={13}
                  style={{
                    display: "inline",
                    marginRight: "5px",
                    verticalAlign: "middle",
                  }}
                />
                {label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════
              TAB 1: OVERVIEW
          ════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {/* Template Performance Bar Chart */}
              <div
                style={{
                  ...S.card(false),
                  padding: "20px",
                  gridColumn:
                    templateBarData.length === 0 ? "span 2" : "span 1",
                }}
              >
                <div style={S.sectionTitle}>
                  <BarChart2 size={16} color={TOKEN.accent} /> Template
                  Performance
                </div>
                {templateBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={templateBarData} barSize={14}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={TOKEN.border}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: TOKEN.muted, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: TOKEN.muted, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{
                          fontSize: "11px",
                          color: TOKEN.muted,
                          paddingTop: "10px",
                        }}
                      />
                      <Bar
                        dataKey="Assigned"
                        fill={TOKEN.accent}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Overdue"
                        fill={TOKEN.red}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Pending"
                        fill={TOKEN.amber}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Completed"
                        fill={TOKEN.green}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      color: TOKEN.muted,
                      fontSize: "13px",
                      padding: "40px 0",
                      textAlign: "center",
                    }}
                  >
                    No template data available
                  </div>
                )}
              </div>

              {/* Status Pie Chart */}
              <div style={{ ...S.card(false), padding: "20px" }}>
                <div style={S.sectionTitle}>
                  <PieChartIcon size={16} color={TOKEN.purple} /> Task Status
                  Breakdown
                </div>
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        paddingAngle={3}
                        stroke="none"
                      >
                        {statusPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(v) => (
                          <span
                            style={{ color: TOKEN.muted, fontSize: "12px" }}
                          >
                            {v}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      color: TOKEN.muted,
                      fontSize: "13px",
                      padding: "40px 0",
                      textAlign: "center",
                    }}
                  >
                    No status data
                  </div>
                )}
              </div>

              {/* Timeline Line Chart */}
              <div
                style={{
                  ...S.card(false),
                  padding: "20px",
                  gridColumn: "span 2",
                }}
              >
                <div style={S.sectionTitle}>
                  <Activity size={16} color={TOKEN.teal} /> Task Volume Over
                  Time
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={freqData}
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={TOKEN.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: TOKEN.muted, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: TOKEN.muted, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", color: TOKEN.muted }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={TOKEN.accent}
                      strokeWidth={2}
                      dot={{ fill: TOKEN.accent, r: 3 }}
                      name="Total"
                    />
                    <Line
                      type="monotone"
                      dataKey="overdue"
                      stroke={TOKEN.red}
                      strokeWidth={2}
                      dot={{ fill: TOKEN.red, r: 3 }}
                      name="Overdue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              TAB 2: TASK DETAILS TABLE
          ════════════════════════════════════════ */}
          {activeTab === "tasks" && (
            <div style={{ ...S.card(false), overflow: "hidden" }}>
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: `1px solid ${TOKEN.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={S.sectionTitle}>
                  <List size={16} color={TOKEN.accent} /> Task Details
                  <span style={S.badge(TOKEN.accent, "rgba(59,130,246,0.1)")}>
                    {data.pagination.total} tasks
                  </span>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Task ID",
                        "Description",
                        "Template",
                        "Assigned To",
                        "Assigned By",
                        "Dept",
                        "Frequency",
                        "Planned Start",
                        "Due Date",
                        "Status",
                      ].map((h) => (
                        <th key={h} style={S.th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.tasks.map((t, idx) => {
                      const sm = STATUS_META[t.status] || {
                        color: TOKEN.muted,
                        bg: TOKEN.border,
                        label: t.status,
                      };
                      const row = idx % 2 === 0;
                      return (
                        <tr
                          key={t._id || idx}
                          style={{
                            background: row ? "transparent" : "#F8FAFC",
                          }}
                        >
                          <td
                            style={{
                              ...S.td,
                              color: TOKEN.muted,
                              fontSize: "12px",
                            }}
                          >
                            {(data.pagination.current - 1) *
                              data.pagination.limit +
                              idx +
                              1}
                          </td>
                          <td style={S.td}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "12px",
                                background: "#EFF6FF",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                color: TOKEN.accent,
                                border: `1px solid #BFDBFE`,
                              }}
                            >
                              {t.taskId || t.TaskId}
                            </span>
                          </td>
                          <td style={{ ...S.td, maxWidth: "200px" }}>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 500,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t.description || t.title}
                            </div>
                          </td>
                          <td style={S.td}>
                            <div
                              style={{ fontSize: "12px", color: TOKEN.muted }}
                            >
                              {t.fmsInstanceId?.instanceName || "—"}
                            </div>
                          </td>
                          <td style={S.td}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "50%",
                                  background: `linear-gradient(135deg, ${TOKEN.accent}, ${TOKEN.accent2})`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#fff",
                                }}
                              >
                                {t.assignedTo?.name?.charAt(0) || "?"}
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 500,
                                  }}
                                >
                                  {t.assignedTo?.name || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={S.td}>{t.assignedBy?.name || "—"}</td>
                          <td style={S.td}>
                            {t.departmentOfAssignToUser?.name || "—"}
                          </td>
                          <td style={S.td}>
                            <span
                              style={{
                                fontSize: "12px",
                                background: "#F1F5F9",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                color: TOKEN.muted,
                                border: `1px solid ${TOKEN.border}`,
                              }}
                            >
                              {t.frequency || "—"}
                            </span>
                          </td>
                          <td
                            style={{
                              ...S.td,
                              fontSize: "12px",
                              color: TOKEN.muted,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.plannedStartDate
                              ? new Date(t.plannedStartDate).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "Pending"}
                          </td>
                          <td
                            style={{
                              ...S.td,
                              fontSize: "12px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <div
                              style={{
                                color:
                                  t.status === "Overdue"
                                    ? TOKEN.red
                                    : TOKEN.text,
                              }}
                            >
                              {t.plannedDueDate
                                ? new Date(t.plannedDueDate).toLocaleDateString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )
                                : "Pending"}
                            </div>
                          </td>
                          <td style={S.td}>
                            <span style={S.badge(sm.color, sm.bg)}>
                              {sm.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                style={{
                  padding: "14px 20px",
                  borderTop: `1px solid ${TOKEN.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: "12px", color: TOKEN.muted }}>
                  {data.pagination.total === 0
                    ? "No records"
                    : `Showing ${
                        (data.pagination.current - 1) * data.pagination.limit +
                        1
                      } – ${Math.min(
                        data.pagination.current * data.pagination.limit,
                        data.pagination.total,
                      )} of ${data.pagination.total}`}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <button
                    style={S.btn(false)}
                    disabled={data.pagination.current <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>

                  <span
                    style={{
                      fontSize: "13px",
                      color: TOKEN.muted,
                      padding: "0 10px",
                      minWidth: "70px",
                      textAlign: "center",
                    }}
                  >
                    {data.pagination.current} / {data.pagination.pages}
                  </span>

                  <button
                    style={S.btn(false)}
                    disabled={
                      data.pagination.current >= data.pagination.pages ||
                      loading
                    }
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              TAB 3: PERFORMERS
          ════════════════════════════════════════ */}
          {activeTab === "performers" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {/* Leaderboard Table */}
              <div style={{ ...S.card(false), padding: "20px" }}>
                <div style={S.sectionTitle}>
                  <Award size={16} color={TOKEN.amber} /> Leaderboard
                </div>
                {data.topPerformers.length === 0 ? (
                  <div
                    style={{
                      color: TOKEN.muted,
                      fontSize: "13px",
                      textAlign: "center",
                      padding: "40px 0",
                    }}
                  >
                    No performer data
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {data.topPerformers.map((p, i) => (
                      <div
                        key={p.userId || i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px",
                          background:
                            i === 0 ? "rgba(245,158,11,0.06)" : "#F8FAFC",
                          borderRadius: "12px",
                          border: `1px solid ${
                            i === 0
                              ? "rgba(217,119,6,0.25)"
                              : TOKEN.border
                          }`,
                        }}
                      >
                        <RankBadge rank={i + 1} />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{ fontWeight: 600, fontSize: "14px" }}
                          >
                            {p.userName}
                          </div>
                          <div
                            style={{ fontSize: "11px", color: TOKEN.muted }}
                          >
                            {p.role} · {p.totalTasks} tasks
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            <ProgressBar
                              value={p.score}
                              color={
                                p.score >= 80
                                  ? TOKEN.green
                                  : p.score >= 50
                                  ? TOKEN.amber
                                  : TOKEN.red
                              }
                            />
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: "20px",
                              fontWeight: 800,
                              color:
                                p.score >= 80
                                  ? TOKEN.green
                                  : p.score >= 50
                                  ? TOKEN.amber
                                  : TOKEN.red,
                            }}
                          >
                            {p.score}%
                          </div>
                          <div
                            style={{ fontSize: "10px", color: TOKEN.muted }}
                          >
                            score
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Radial Chart */}
              <div style={{ ...S.card(false), padding: "20px" }}>
                <div style={S.sectionTitle}>
                  <Target size={16} color={TOKEN.teal} /> Score Distribution
                </div>
                {performerRadial.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="20%"
                      outerRadius="90%"
                      barSize={14}
                      data={performerRadial}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <RadialBar
                        minAngle={15}
                        dataKey="score"
                        cornerRadius={4}
                        background={{ fill: TOKEN.border }}
                      />
                      <Legend
                        iconSize={8}
                        formatter={(v) => (
                          <span
                            style={{ color: TOKEN.muted, fontSize: "11px" }}
                          >
                            {v}
                          </span>
                        )}
                      />
                      <Tooltip content={<CustomTooltip />} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      color: TOKEN.muted,
                      fontSize: "13px",
                      textAlign: "center",
                      padding: "40px 0",
                    }}
                  >
                    No data
                  </div>
                )}
              </div>

              {/* Score Stats Summary Strip */}
              <div
                style={{
                  gridColumn: "span 2",
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "12px",
                }}
              >
                {data.topPerformers
                  .slice(0, 1)
                  .flatMap((p) => [
                    {
                      label: "Done On Time",
                      value: p.doneOnTime || 0,
                      color: TOKEN.green,
                      icon: CheckCircle2,
                    },
                    {
                      label: "Overdue",
                      value: p.overdueCount || 0,
                      color: TOKEN.red,
                      icon: AlertCircle,
                    },
                    {
                      label: "Pending",
                      value: p.pendingCount || 0,
                      color: TOKEN.amber,
                      icon: Hourglass,
                    },
                    {
                      label: "Not On Time",
                      value: p.notDoneOnTime || 0,
                      color: TOKEN.purple,
                      icon: Clock,
                    },
                    {
                      label: "Late Score",
                      value: `${p.lateScore}%`,
                      color: TOKEN.red,
                      icon: TrendingDown,
                    },
                  ])
                  .map(({ label, value, color, icon: Icon }) => (
                    <div
                      key={label}
                      style={{ ...S.card(false), padding: "16px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            color: TOKEN.muted,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.8px",
                          }}
                        >
                          {label}
                        </div>
                        <Icon size={14} color={color} />
                      </div>
                      <div
                        style={{ fontSize: "28px", fontWeight: 800, color }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              TAB 4: TEMPLATES
          ════════════════════════════════════════ */}
          {activeTab === "templates" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {data.templateStats.length === 0 ? (
                <div
                  style={{
                    ...S.card(false),
                    padding: "48px",
                    textAlign: "center",
                    color: TOKEN.muted,
                    fontSize: "14px",
                  }}
                >
                  No template data available
                </div>
              ) : (
                data.templateStats.map((ts, i) => {
                  const completionPct = ts.completionRate || 0;
                  const onTimePct = ts.onTimeRate || 0;
                  const latePct = ts.lateRate || 0;
                  return (
                    <div
                      key={ts.fmsTemplateId || i}
                      style={{ ...S.card(false), padding: "20px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "12px",
                          marginBottom: "16px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginBottom: "4px",
                            }}
                          >
                            <div
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background:
                                  CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                            <h3
                              style={{
                                fontSize: "16px",
                                fontWeight: 700,
                                margin: 0,
                              }}
                            >
                              {ts.templateName}
                            </h3>
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: TOKEN.muted2,
                              fontFamily: "monospace",
                            }}
                          >
                            {ts.fmsId}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={S.badge(
                              TOKEN.accent,
                              "rgba(59,130,246,0.1)",
                            )}
                          >
                            {ts.assigned} assigned
                          </span>
                          <span
                            style={S.badge(
                              TOKEN.green,
                              "rgba(16,185,129,0.1)",
                            )}
                          >
                            {ts.completed} done
                          </span>
                          <span
                            style={S.badge(
                              TOKEN.red,
                              "rgba(239,68,68,0.1)",
                            )}
                          >
                            {ts.overdue || 0} overdue
                          </span>
                          <span
                            style={S.badge(
                              TOKEN.amber,
                              "rgba(245,158,11,0.1)",
                            )}
                          >
                            {ts.pending || 0} pending
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "16px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: TOKEN.muted,
                              marginBottom: "6px",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Completion</span>
                            <strong style={{ color: TOKEN.green }}>
                              {completionPct}%
                            </strong>
                          </div>
                          <ProgressBar
                            value={completionPct}
                            color={TOKEN.green}
                            height={6}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: TOKEN.muted,
                              marginBottom: "6px",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>On Time</span>
                            <strong style={{ color: TOKEN.accent }}>
                              {onTimePct}%
                            </strong>
                          </div>
                          <ProgressBar
                            value={onTimePct}
                            color={TOKEN.accent}
                            height={6}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: TOKEN.muted,
                              marginBottom: "6px",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Late</span>
                            <strong style={{ color: TOKEN.red }}>
                              {latePct}%
                            </strong>
                          </div>
                          <ProgressBar
                            value={latePct}
                            color={TOKEN.red}
                            height={6}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ── Empty State ── */}
      {!loading && data.pagination.total === 0 && (
        <div
          style={{
            ...S.card(false),
            padding: "80px 40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>
            📊
          </div>
          <div
            style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}
          >
            No data for this period
          </div>
          <div style={{ fontSize: "14px", color: TOKEN.muted }}>
            Try changing the period, template, or member filter above.
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${TOKEN.bg}; }
        ::-webkit-scrollbar-thumb { background: ${TOKEN.border2}; border-radius: 2px; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default FmsReports;