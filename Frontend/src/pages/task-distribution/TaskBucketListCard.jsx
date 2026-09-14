import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Users,
  CalendarDays,
  Clock,
  Repeat,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import dayjs from "dayjs";
import { Select, Modal, Input, Button, message } from "antd";
import api from "../../lib/api";

const { Option } = Select;
const { TextArea } = Input;

/* ─── Design tokens — consistent with project theme ─────────────────────── */
const T = {
  bg: "#F1F5F9",
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
  purple: "#7C3AED",
  purpleL: "#F5F3FF",
  purpleB: "#DDD6FE",
  text: "#0F172A",
  text2: "#334155",
  muted: "#64748B",
  muted2: "#94A3B8",
};

const STATUS_META = {
  Distributed: {
    color: T.green,
    bg: T.greenL,
    border: T.greenB,
    icon: CheckCircle2,
    label: "Distributed",
  },
  Pending: {
    color: T.amber,
    bg: T.amberL,
    border: T.amberB,
    icon: AlertCircle,
    label: "Pending",
  },
  Processing: {
    color: T.accent,
    bg: T.accentL,
    border: T.accentB,
    icon: Loader2,
    label: "Processing",
  },
  Failed: {
    color: T.red,
    bg: T.redL,
    border: "#FECACA",
    icon: AlertCircle,
    label: "Failed",
  },
};
const getStatus = (s) => STATUS_META[s] || STATUS_META.Pending;

const fmt = (iso) => (iso ? dayjs(iso).format("DD MMM YYYY") : "—");

/* ─── Pill badge ─────────────────────────────────────────────────────────── */
const Pill = ({ children, color, bg, border, dot }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      padding: "2px 7px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${border}`,
      whiteSpace: "nowrap",
      flexShrink: 0,
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

const BucketCard = ({
  bucket,
  reportingUsers = [],
  isSelected,
  onClick,
  onComplete,
}) => {
  const [hov, setHov] = useState(false);

  const sm = getStatus(bucket.distributionStatus);

  const StatusIcon = sm.icon;

  // =====================================================
  // TASK USERS
  // =====================================================

  const taskUsers = reportingUsers.filter((u) => u.hasBucketTask);

  const total = taskUsers.length;

  const completed = taskUsers.filter(
    (u) => u.completedStatus === "Completed",
  ).length;

  // =====================================================
  // BUCKET STATES
  // =====================================================

  const bucketCompleted = bucket.status === "Completed";

  const isDistributed =
    bucket.distributionStatus === "Distributed" ||
    bucket.distributionStatus === "Partially Distributed";

  const allUsersCompleted = total > 0 && completed === total;

  const canComplete = isDistributed && allUsersCompleted && !bucketCompleted;

  // =====================================================
  // AUDIENCE LABEL
  // =====================================================

  const isRole = bucket.assignmentMode === "Role";

  const audienceLabel = isRole
    ? bucket.targetRole?.name || "Role"
    : `${bucket.targetUsers?.length || 0} user${
        bucket.targetUsers?.length !== 1 ? "s" : ""
      }`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderLeft: `3px solid ${isSelected ? T.accent : "transparent"}`,
        background: isSelected ? T.accentL : hov ? T.surf : T.card,
        borderBottom: `1px solid ${T.border}`,
        padding: "10px 12px",
        cursor: "pointer",
        transition: "all 0.12s ease",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 5,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: T.text,
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: 2,
              alignItems: "center",
            }}
          >
            {bucket.title}{" "}
            <Pill color={T.blue} bg={T.accentL} border={T.accentB}>
              {bucket.bucketId}
            </Pill>{" "}
          </div>

          <div
            style={{
              fontSize: 10,
              color: T.muted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {bucket.description || "No description"}
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 7px",
            borderRadius: 20,
            flexShrink: 0,
            fontSize: 9,
            fontWeight: 700,
            color: sm.color,
            background: sm.bg,
            border: `1px solid ${sm.border}`,
          }}
        >
          <StatusIcon size={8} />

          {sm.label}
        </div>
      </div>

      {/* META ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <Pill color={T.accent} bg={T.accentL} border={T.accentB}>
          <Users size={8} />

          {audienceLabel}
        </Pill>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            fontSize: 9,
            color: T.muted2,
          }}
        >
          <CalendarDays size={8} />

          {fmt(bucket.startDate || bucket.createdAt)}
        </span>

        {bucket.isRecurrent ? (
          <Pill color={T.purple} bg={T.purpleL} border={T.purpleB}>
            <Repeat size={8} />

            {bucket.frequency || "Recurring"}
          </Pill>
        ) : (
          <Pill color={T.muted} bg={T.surf} border={T.border}>
            One-time
          </Pill>
        )}

        {/* BUCKET STATUS */}
        {bucketCompleted && (
          <Pill color={T.green} bg={T.greenL} border={T.greenB}>
            <CheckCircle2 size={8} />
            Completed
          </Pill>
        )}
      </div>

      {/* FOOTER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {/* COMPLETION */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: bucketCompleted
              ? T.green
              : allUsersCompleted
                ? T.green
                : T.amber,
            whiteSpace: "nowrap",
          }}
        >
          {bucketCompleted
            ? "Bucket Completed"
            : `${completed}/${total} completed`}
        </div>

        {/* BUTTON */}
        <Button
          type={bucketCompleted ? "primary" : "default"}
          size="small"
          disabled={!canComplete}
          onClick={(e) => {
            e.stopPropagation();
            onComplete(bucket);
          }}
          style={{
            borderRadius: 7,
            height: 26,
            paddingInline: 10,
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {bucketCompleted ? "Completed" : "Complete"}
        </Button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN CARD COMPONENT — drop-in replacement for the Card in your page
═══════════════════════════════════════════════════════════════════════════ */
export function TaskBucketListCard({
  buckets = [], // array from your API
  selectedBucket, // currently selected bucket object
  onSelectBucket, // (bucket) => void
  onBucketCompleted,
  reportingUsers,
  setSearch,
  search,
  setFilterType,
  filterType,
  setSortBy,
  sortBy,
}) {
  const [completeModal, setCompleteModal] = useState(false);

  const [selectedCompleteBucket, setSelectedCompleteBucket] = useState(null);

  const [remark, setRemark] = useState("");

  const [loading, setLoading] = useState(false);

  // Derived stats
  const stats = useMemo(
    () => ({
      total: buckets.length,
      distributed: buckets.filter((b) => b.distributionStatus === "Distributed")
        .length,
      pending: buckets.filter((b) => b.distributionStatus === "Pending").length,
      recurring: buckets.filter((b) => b.isRecurrent).length,
    }),
    [buckets],
  );

  const openCompleteModal = (bucket) => {
    setSelectedCompleteBucket(bucket);
    setCompleteModal(true);
  };

  /* ───────────────────────────────────────── */

  const handleCompleteBucket = async () => {
    try {
      setLoading(true);

      await api.patch(`/task-buckets/${selectedCompleteBucket._id}/complete`, {
        remark,
      });

      message.success("Bucket completed successfully");

      setCompleteModal(false);

      setRemark("");

      setSelectedCompleteBucket(null);

      if (onBucketCompleted) {
        onBucketCompleted();
      }
    } catch (err) {
      console.error(err);

      message.error(
        err?.response?.data?.message || "Failed to complete bucket",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #94A3B8; font-size: 12px; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${T.border}`,
          background: T.surf,
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: T.accentL,
                border: `1px solid ${T.accentB}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={14} color={T.accent} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              Task Buckets
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.accent,
              background: T.accentL,
              border: `1px solid ${T.accentB}`,
              padding: "2px 8px",
              borderRadius: 20,
            }}
          >
            {buckets.length}
          </span>
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: T.card,
            border: `1px solid ${T.border2}`,
            borderRadius: 9,
            padding: "0 10px",
            marginBottom: 8,
          }}
        >
          <Search size={13} color={T.muted2} style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, role…"
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 12,
              color: T.text,
              flex: 1,
              padding: "7px 0",
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
                color: T.muted2,
                fontSize: 14,
                display: "flex",
                padding: 2,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter + Sort */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          {/* FILTER TYPE */}
          <Select
            value={filterType}
            onChange={(value) => setFilterType(value)}
            size="middle"
            style={{
              width: "100%",
            }}
            dropdownStyle={{
              borderRadius: 12,
            }}
          >
            <Option value="all">All types</Option>

            <Option value="Pending">Pending</Option>

            <Option value="Completed">Completed</Option>
          </Select>

          {/* SORT */}
          <Select
            value={sortBy}
            onChange={(value) => setSortBy(value)}
            size="middle"
            style={{
              width: "100%",
            }}
            dropdownStyle={{
              borderRadius: 12,
            }}
          >
            <Option value="newest">Newest First</Option>

            <Option value="oldest">Oldest First</Option>

            <Option value="title_asc">Title A-Z</Option>

            <Option value="title_desc">Title Z-A</Option>

            <Option value="status">Status</Option>
          </Select>
        </div>
      </div>

      {/* ── Bucket list ─────────────────────────────────────────────────── */}
      <div
        style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 360px)" }}
      >
        {buckets.length === 0 ? (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>
              📭
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>
              No buckets found
            </div>
            <div style={{ fontSize: 11, color: T.muted2, marginTop: 4 }}>
              {search
                ? "Try a different search"
                : "Create your first task bucket"}
            </div>
          </div>
        ) : (
          buckets.map((bucket) => (
            <BucketCard
              key={bucket._id}
              bucket={bucket}
              reportingUsers={
                selectedBucket?._id === bucket._id ? reportingUsers : []
              }
              isSelected={selectedBucket?._id === bucket._id}
              onClick={() => onSelectBucket(bucket)}
              onComplete={openCompleteModal}
            />
          ))
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {buckets.length > 0 && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: `1px solid ${T.border}`,
            background: T.surf,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: T.muted2 }}>
            {buckets.length === buckets.length
              ? `${buckets.length} bucket${buckets.length !== 1 ? "s" : ""} total`
              : `${buckets.length} of ${buckets.length} shown`}
          </span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: T.green,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 11, color: T.muted2 }}>
              {stats.distributed} distributed
            </span>
          </div>
        </div>
      )}
      <Modal
        open={completeModal}
        title="Complete Bucket"
        onCancel={() => {
          setCompleteModal(false);
          setRemark("");
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setCompleteModal(false);
              setRemark("");
            }}
          >
            Cancel
          </Button>,

          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleCompleteBucket}
          >
            Complete Bucket
          </Button>,
        ]}
      >
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Completion Remark
          </div>

          <TextArea
            rows={4}
            placeholder="Enter completion remark..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

export default TaskBucketListCard;
