import React, { useState, useEffect, useCallback, useMemo } from "react";
import Cookies from "js-cookie";
import dayjs from "dayjs";
import {
  DatePicker,
  Table,
  Tag,
  Button,
  Drawer,
  Modal,
  Input,
  Select,
  Progress,
  Badge,
  Tooltip,
  Empty,
  Skeleton,
} from "antd";
import { toast } from "sonner";
import api from "../lib/api";

/* ─── Inline SVGs (Matching SuperModuleSettings & OpenFormBucketMaster) ─── */
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
  play: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  refresh: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  checkCircle: (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
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
  sparkles: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
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
};

const RecurringTaskMonitor = () => {
  const role = Cookies.get("role") || "";
  const isSuper = role === "Super";

  const todayIST = dayjs().format("YYYY-MM-DD");

  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState({
    date: todayIST,
    day: dayjs().format("dddd"),
    totalDue: 0,
    generated: 0,
    pendingOrSkipped: 0,
  });
  const [missingTasks, setMissingTasks] = useState([]);

  // Filter states
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState("ALL");

  // Execution & Modal/Drawer states
  const [runningFullCron, setRunningFullCron] = useState(false);
  const [confirmCronModal, setConfirmCronModal] = useState(false);
  const [triggeringTaskId, setTriggeringTaskId] = useState(null);
  const [drawerTask, setDrawerTask] = useState(null);

  const selectedDateStr = selectedDate
    ? selectedDate.format("YYYY-MM-DD")
    : todayIST;
  const isTodaySelected = selectedDateStr === todayIST;

  const fetchAuditReport = useCallback(async () => {
    if (!isSuper) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/recurring-monitor/audit", {
        params: { date: selectedDateStr },
      });
      if (res.data?.success) {
        setSummary(res.data.summary);
        setMissingTasks(res.data.data || []);
      }
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Failed to load recurring task audit report",
      );
    } finally {
      setLoading(false);
    }
  }, [isSuper, selectedDateStr]);

  useEffect(() => {
    fetchAuditReport();
  }, [fetchAuditReport]);

  const handleRunFullCron = async () => {
    setConfirmCronModal(false);
    setRunningFullCron(true);
    try {
      const res = await api.post("/recurring-monitor/trigger", {});
      toast.success(
        res.data?.message || "Full recurring cron executed successfully",
      );
      await fetchAuditReport();
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "Failed to execute recurring cron",
      );
    } finally {
      setRunningFullCron(false);
    }
  };

  const handleGenerateSingle = async (taskId, e) => {
    if (e) e.stopPropagation();
    setTriggeringTaskId(taskId);
    try {
      const res = await api.post("/recurring-monitor/trigger", {
        recurringTaskId: taskId,
      });
      toast.success(res.data?.message || "Task generated successfully");
      if (drawerTask?._id === taskId) {
        setDrawerTask(null);
      }
      await fetchAuditReport();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to generate task");
    } finally {
      setTriggeringTaskId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    return missingTasks.filter((item) => {
      if (statusFilter !== "ALL" && item.statusType !== statusFilter) {
        return false;
      }
      if (frequencyFilter !== "ALL" && item.frequency !== frequencyFilter) {
        return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        return (
          item.recurringTaskId?.toLowerCase().includes(q) ||
          item.title?.toLowerCase().includes(q) ||
          item.assignedTo?.name?.toLowerCase().includes(q) ||
          item.assignedTo?.employeeCode?.toLowerCase().includes(q) ||
          item.department?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [missingTasks, statusFilter, frequencyFilter, searchText]);

  const frequencyOptions = useMemo(() => {
    const freqs = [
      ...new Set(missingTasks.map((t) => t.frequency).filter(Boolean)),
    ];
    return [
      { value: "ALL", label: "All Frequencies" },
      ...freqs.map((f) => ({ value: f, label: f })),
    ];
  }, [missingTasks]);

  const completionPercent =
    summary.totalDue > 0
      ? Math.round((summary.generated / summary.totalDue) * 100)
      : 100;

  /* ── Access Denied Screen (Exact match with OpenFormBucketMaster) ── */
  if (!isSuper) {
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
            This monitor is available to Super administrators only. Your current
            role does not have permission.
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
  }

  /* ── Ant Design Table Columns ── */
  const columns = [
    {
      title: "Recurring Task",
      dataIndex: "title",
      key: "title",
      width: 260,
      render: (_, record) => (
        <div>
          <Tag
            color="geekblue"
            style={{
              fontWeight: 700,
              borderRadius: "6px",
              marginBottom: "4px",
            }}
          >
            {record.recurringTaskId}
          </Tag>
          <div
            style={{
              fontWeight: 600,
              color: "#0F172A",
              fontSize: "13px",
              lineHeight: 1.4,
            }}
          >
            {record.title}
          </div>
        </div>
      ),
    },
    {
      title: "Frequency",
      dataIndex: "frequency",
      key: "frequency",
      width: 130,
      render: (freq) => (
        <Tag
          style={{
            borderRadius: "8px",
            fontWeight: 600,
            background: "#F1F5F9",
            color: "#334155",
            border: "1px solid #E2E8F0",
          }}
        >
          {freq}
        </Tag>
      ),
    },
    {
      title: "Scheduled Date",
      dataIndex: "expectedDate",
      key: "expectedDate",
      width: 165,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "13px" }}>
            {dayjs(record.expectedDate).format("DD MMM YYYY")}
          </div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            {record.expectedDay}
          </div>
        </div>
      ),
    },
    {
      title: "Assigned To",
      dataIndex: "assignedTo",
      key: "assignedTo",
      width: 210,
      render: (_, record) =>
        record.assignedTo ? (
          <div>
            <div
              style={{ fontWeight: 600, color: "#0F172A", fontSize: "13px" }}
            >
              {record.assignedTo.name}
            </div>
            <div style={{ fontSize: "11.5px", color: "#64748B" }}>
              {record.assignedTo.employeeCode || "-"} • {record.department}
            </div>
          </div>
        ) : (
          <Tag color="error">Unassigned</Tag>
        ),
    },
    {
      title: "Diagnostic Reason",
      dataIndex: "reasonMessage",
      key: "reasonMessage",
      render: (_, record) => (
        <div style={{ maxWidth: "340px" }}>
          <Tag
            color={record.statusType === "NOT_GENERATED" ? "error" : "warning"}
            style={{
              fontWeight: 700,
              fontSize: "11px",
              borderRadius: "6px",
              marginBottom: "4px",
            }}
          >
            {record.statusType === "NOT_GENERATED"
              ? "Cron Missed / Pending"
              : "Skipped by Rule"}
          </Tag>
          <div
            style={{
              fontSize: "12.5px",
              color: "#475569",
              lineHeight: 1.45,
            }}
          >
            {record.reasonMessage}
          </div>
        </div>
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      width: 160,
      render: (_, record) =>
        record.canRetry && isTodaySelected ? (
          <Button
            type="primary"
            size="middle"
            loading={triggeringTaskId === record._id}
            onClick={(e) => handleGenerateSingle(record._id, e)}
            icon={!triggeringTaskId && Icon.sparkles}
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
              border: "none",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "12.5px",
              boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
            }}
          >
            {triggeringTaskId === record._id ? "Generating..." : "Generate Now"}
          </Button>
        ) : (
          <Tooltip
            title={
              !isTodaySelected
                ? "Manual generation is available for today's schedules only"
                : "Click row to inspect rule details"
            }
          >
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setDrawerTask(record);
              }}
              style={{
                borderRadius: "8px",
                fontSize: "12px",
                color: "#64748B",
              }}
            >
              Inspect
            </Button>
          </Tooltip>
        ),
    },
  ];

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
        @keyframes blink   { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes slideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        .monitor-table .ant-table-thead > tr > th {
          background: #F8FAFC !important;
          color: #475569 !important;
          font-size: 11.5px !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .monitor-table .ant-table-tbody > tr {
          cursor: pointer;
        }
      `}</style>

      <div style={{ margin: "0 auto" }}>
        {/* ── Page Header ── */}
        <div style={{ marginBottom: "24px", animation: "fadeIn 0.4s ease" }}>
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
                  Recurring Task Monitor
                </h1>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    marginTop: "2px",
                  }}
                >
                  Exception-only audit view for due recurring schedules and
                  manual cron execution
                </div>
              </div>
            </div>

            {/* Header Controls (Ant Design DatePicker + Buttons) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <DatePicker
                value={selectedDate}
                format="DD MMM YYYY"
                allowClear={false}
                disabledDate={(current) =>
                  current && current > dayjs().endOf("day")
                }
                onChange={(val) => val && setSelectedDate(val)}
                size="large"
                style={{
                  borderRadius: "12px",
                  fontWeight: 600,
                  width: "165px",
                }}
              />

              <Button
                size="large"
                icon={Icon.refresh}
                loading={loading}
                onClick={fetchAuditReport}
                style={{
                  borderRadius: "12px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Refresh
              </Button>

              <Tooltip
                title={
                  !isTodaySelected
                    ? "Full cron can only be triggered for today's date"
                    : "Execute full recurring cron for all due schedules today"
                }
              >
                <Button
                  type="primary"
                  size="large"
                  icon={Icon.play}
                  loading={runningFullCron}
                  disabled={!isTodaySelected}
                  onClick={() => setConfirmCronModal(true)}
                  style={{
                    background: isTodaySelected
                      ? "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)"
                      : undefined,
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontFamily: "'Outfit', sans-serif",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: isTodaySelected
                      ? "0 4px 12px rgba(37,99,235,0.25)"
                      : "none",
                  }}
                >
                  {runningFullCron ? "Running Cron..." : "Run Full Cron"}
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* ── Main Card Container ── */}
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
          {/* Card Top Bar with Health Progress & Summary Counters */}
          <div
            style={{
              padding: "18px 24px",
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
                Schedule Audit — {dayjs(summary.date).format("DD MMM YYYY")} (
                {summary.day})
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: "12.5px", color: "#475569" }}>
                Total Due:{" "}
                <strong style={{ color: "#0F172A" }}>{summary.totalDue}</strong>
              </div>
              <div style={{ fontSize: "12.5px", color: "#059669" }}>
                Generated: <strong>{summary.generated}</strong>
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  color: missingTasks.length > 0 ? "#DC2626" : "#64748B",
                }}
              >
                Un-Generated / Skipped: <strong>{missingTasks.length}</strong>
              </div>

              <div style={{ width: "140px" }}>
                <Progress
                  percent={completionPercent}
                  size="small"
                  strokeColor={
                    completionPercent === 100 ? "#059669" : "#2563EB"
                  }
                />
              </div>
            </div>
          </div>

          {/* Error Banner */}
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

          {/* Body Content */}
          <div style={{ padding: "24px" }}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : missingTasks.length === 0 ? (
              /* ── ZERO STATE: All due tasks generated ── */
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "20px",
                  padding: "48px 24px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "18px",
                    background: "rgba(5,150,105,0.1)",
                    border: "1px solid rgba(5,150,105,0.2)",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  {Icon.checkCircle}
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#0F172A",
                    fontFamily: "'Outfit', sans-serif",
                    marginBottom: "6px",
                  }}
                >
                  All Clear — All Recurring Tasks Generated
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748B",
                    maxWidth: "460px",
                    margin: "0 auto",
                    lineHeight: 1.6,
                  }}
                >
                  All <strong>{summary.totalDue}</strong> recurring tasks due on{" "}
                  <strong>
                    {dayjs(summary.date).format("DD MMM YYYY")} ({summary.day})
                  </strong>{" "}
                  have been generated successfully. No pending actions remain.
                </div>
              </div>
            ) : (
              /* ── EXCEPTION TOOLBAR + ANT DESIGN TABLE ── */
              <div>
                {/* Filter Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <Input.Search
                      allowClear
                      placeholder="Search Task ID, title, or assignee..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: "270px" }}
                    />

                    <Select
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val)}
                      style={{ width: "185px" }}
                      options={[
                        {
                          value: "ALL",
                          label: `All Exceptions (${missingTasks.length})`,
                        },
                        {
                          value: "NOT_GENERATED",
                          label: `Actionable (${missingTasks.filter((t) => t.statusType === "NOT_GENERATED").length})`,
                        },
                        {
                          value: "SKIPPED",
                          label: `Skipped by Rule (${missingTasks.filter((t) => t.statusType === "SKIPPED").length})`,
                        },
                      ]}
                    />

                    <Select
                      value={frequencyFilter}
                      onChange={(val) => setFrequencyFilter(val)}
                      style={{ width: "165px" }}
                      options={frequencyOptions}
                    />
                  </div>

                  <Badge
                    status="processing"
                    text={
                      <span style={{ fontSize: "12px", color: "#64748B" }}>
                        Click any row for full diagnostic details
                      </span>
                    }
                  />
                </div>

                {/* Ant Design Data Table */}
                <Table
                  className="monitor-table"
                  rowKey="_id"
                  columns={columns}
                  dataSource={filteredTasks}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} un-generated tasks`,
                  }}
                  locale={{
                    emptyText: (
                      <Empty description="No un-generated tasks match your current filters" />
                    ),
                  }}
                  onRow={(record) => ({
                    onClick: () => setDrawerTask(record),
                  })}
                />
              </div>
            )}
          </div>

          {/* Footer Note (Matching OpenFormBucketMaster) */}
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
              <strong>Super Admin Control:</strong> Only un-generated or
              rule-skipped recurring tasks appear on this screen. Triggering
              generation uses idempotent instance keys to prevent duplicates.
            </div>
          </div>
        </div>
      </div>

      {/* ── ANT DESIGN DIAGNOSTIC DRAWER ── */}
      <Drawer
        title={
          drawerTask ? (
            <div>
              <Tag color="geekblue" style={{ fontWeight: 700 }}>
                {drawerTask.recurringTaskId}
              </Tag>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#0F172A",
                  marginTop: "6px",
                }}
              >
                {drawerTask.title}
              </div>
            </div>
          ) : (
            "Task Diagnostics"
          )
        }
        placement="right"
        width={440}
        open={Boolean(drawerTask)}
        onClose={() => setDrawerTask(null)}
        footer={
          drawerTask && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <Button onClick={() => setDrawerTask(null)}>Close</Button>
              {drawerTask.canRetry && isTodaySelected && (
                <Button
                  type="primary"
                  loading={triggeringTaskId === drawerTask._id}
                  onClick={() => handleGenerateSingle(drawerTask._id)}
                  icon={Icon.sparkles}
                  style={{
                    background:
                      "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
                    border: "none",
                    fontWeight: 600,
                  }}
                >
                  Generate Task Now
                </Button>
              )}
            </div>
          )
        }
      >
        {drawerTask && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            <div
              style={{
                background:
                  drawerTask.statusType === "NOT_GENERATED"
                    ? "#FEF2F2"
                    : "#FFFBEB",
                border:
                  drawerTask.statusType === "NOT_GENERATED"
                    ? "1px solid #FECACA"
                    : "1px solid #FDE68A",
                borderRadius: "12px",
                padding: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color:
                    drawerTask.statusType === "NOT_GENERATED"
                      ? "#B91C1C"
                      : "#92400E",
                  marginBottom: "4px",
                }}
              >
                {drawerTask.statusType === "NOT_GENERATED"
                  ? "Action Required: Missed Cron Execution"
                  : "Skipped by Schedule / Holiday Rule"}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#1E293B",
                  lineHeight: 1.5,
                }}
              >
                {drawerTask.reasonMessage}
              </div>
            </div>

            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748B" }}>Scheduled Date</span>
                <strong style={{ color: "#0F172A" }}>
                  {dayjs(drawerTask.expectedDate).format("DD MMM YYYY")} (
                  {drawerTask.expectedDay})
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748B" }}>Frequency</span>
                <strong style={{ color: "#0F172A" }}>
                  {drawerTask.frequency}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748B" }}>Assignee</span>
                <strong style={{ color: "#0F172A" }}>
                  {drawerTask.assignedTo?.name || "Unassigned"} (
                  {drawerTask.assignedTo?.employeeCode || "-"})
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748B" }}>Department</span>
                <strong style={{ color: "#0F172A" }}>
                  {drawerTask.department}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#64748B" }}>Instance Key</span>
                <code
                  style={{
                    fontSize: "11px",
                    background: "#E2E8F0",
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  {drawerTask._id}_{drawerTask.expectedDate}
                </code>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── ANT DESIGN CONFIRMATION MODAL ── */}
      <Modal
        title="Run Full Recurring Task Cron?"
        open={confirmCronModal}
        onCancel={() => setConfirmCronModal(false)}
        onOk={handleRunFullCron}
        okText="Confirm & Execute"
        okButtonProps={{
          style: {
            background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
            border: "none",
            fontWeight: 600,
          },
        }}
      >
        <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: 1.6 }}>
          This will scan all active recurring schedules due on{" "}
          <strong>{dayjs().format("DD MMM YYYY")}</strong> and generate any
          missing delegation tasks. Already generated tasks are safely skipped.
        </p>
      </Modal>
    </div>
  );
};

export default RecurringTaskMonitor;
