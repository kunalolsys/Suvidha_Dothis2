import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search,
  RefreshCcw,
  Layers3,
  CheckCircle2,
  Users,
  Clock3,
  CalendarDays,
  AlertCircle,
  ChevronRight,
  Edit,
  Trash2,
} from "lucide-react";

import api from "../../lib/api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/index";
import { Input, Select, Modal, Popconfirm } from "antd";
import { ExportOutlined, SearchOutlined } from "@ant-design/icons";

const { Option } = Select;

import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

/* ───────────────────────────────────────────── */

const STATUS_META = {
  Distributed: {
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },

  "Partially Distributed": {
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },

  Pending: {
    color: "#64748B",
    bg: "#F8FAFC",
    border: "#E2E8F0",
  },

  Completed: {
    color: "#0F766E",
    bg: "#F0FDFA",
    border: "#99F6E4",
  },

  Failed: {
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
  },
};

const getStatusMeta = (status) => STATUS_META[status] || STATUS_META.Pending;

/* ───────────────────────────────────────────── */

const StatCard = ({ title, value, icon: Icon, color, bg, border }) => {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
            {title}
          </div>

          <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
        </div>

        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: bg,
            border: `1px solid ${border}`,
          }}
        >
          <Icon size={18} color={color} />
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────── */

const Pagination = ({
  totalItems,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  onPageChange,
  isLoading,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-2 py-2">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Rows per page</span>

        <Select
          value={String(itemsPerPage)}
          onChange={(val) => {
            setItemsPerPage(Number(val));
            onPageChange(1);
          }}
          disabled={isLoading}
          size="middle"
          style={{
            width: 80,
          }}
          options={[
            { value: "5", label: "5" },
            { value: "10", label: "10" },
            { value: "20", label: "20" },
            { value: "50", label: "50" },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-500">
          Page{" "}
          <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
          <span className="font-semibold text-slate-800">
            {totalPages || 1}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            disabled={currentPage === 1 || isLoading}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            Previous
          </Button>

          <Button
            className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800"
            disabled={currentPage === totalPages || isLoading}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────── */

export default function BucketListingPage() {
  const navigate = useNavigate();
  const [buckets, setBuckets] = useState([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [localCurrentPage, setLocalCurrentPage] = useState(1);

  const [localItemsPerPage, setLocalItemsPerPage] = useState(10);

  const [totalTasks, setTotalTasks] = useState(0);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    bucket: null,
  });
  const [deleteRemark, setDeleteRemark] = useState("");

  const [deleteLoading, setDeleteLoading] = useState(false);
  // =====================================================
  // OPEN DELETE MODAL
  // =====================================================
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "bucket_view",
    isSuper,
  );
  const openDeleteModal = (bucket) => {
    setDeleteModal({
      open: true,
      bucket,
    });

    setDeleteRemark("");
  };

  // =====================================================
  // CLOSE DELETE MODAL
  // =====================================================

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      bucket: null,
    });

    setDeleteRemark("");
  };

  // =====================================================
  // DELETE BUCKET
  // =====================================================

  const handleDeleteBucket = async () => {
    try {
      if (!deleteRemark?.trim()) {
        return toast.warning("Please enter delete remark");
      }

      setDeleteLoading(true);

      await api.delete(`/task-buckets/${deleteModal.bucket._id}`, {
        data: {
          remark: deleteRemark,
        },
      });

      toast.success("Bucket deleted successfully");

      closeDeleteModal();

      fetchBuckets();
    } catch (err) {
      console.log(err);

      toast.error(err?.response?.data?.message || "Failed to delete bucket");
    } finally {
      setDeleteLoading(false);
    }
  };
  const handleExportBuckets = async () => {
    try {
      const response = await api.get("/task-buckets/bucket/export", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "task-buckets.xlsx");

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Bucket exported successfully");
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.message || "Failed to export buckets.");
    }
  };
  /* ───────────────────────────────────── */

  const fetchBuckets = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.get("/task-buckets/list", {
        params: {
          page: localCurrentPage,
          limit: localItemsPerPage,
          search: search || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        },
      });

      setBuckets(res?.data?.data || []);

      setTotalTasks(res?.data?.pagination?.total || 0);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }, [localCurrentPage, localItemsPerPage, search, statusFilter]);

  /* ───────────────────────────────────── */

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  /* ───────────────────────────────────── */

  const stats = useMemo(() => {
    return {
      total: totalTasks,

      completed: buckets.filter((b) => b.status === "Completed").length,

      pending: buckets.filter((b) => b.status === "Pending").length,
    };
  }, [buckets, totalTasks]);

  /* ───────────────────────────────────── */

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center">
              <Layers3 className="w-7 h-7 text-white" />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Task Buckets
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage and monitor task bucket records
              </p>
            </div>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={handleExportBuckets}
              className="h-10 rounded-xl bg-white me-1"
            >
              <ExportOutlined size={15} />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={fetchBuckets}
              disabled={loading}
              className="h-10 rounded-xl bg-white"
            >
              <RefreshCcw
                size={15}
                className={`mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* STATS */}
      {/* ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Buckets"
          value={stats.total}
          icon={Layers3}
          color="#2563EB"
          bg="#EFF6FF"
          border="#BFDBFE"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={Clock3}
          color="#D97706"
          bg="#FFFBEB"
          border="#FDE68A"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          color="#0F766E"
          bg="#F0FDFA"
          border="#99F6E4"
        />
      </div>

      {/* ====================================================== */}
      {/* FILTERS */}
      {/* ====================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-5">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          {/* SEARCH */}
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLocalCurrentPage(1);
              }}
              placeholder="Search bucket..."
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              allowClear
              size="large"
              style={{
                borderRadius: 12,
                // background: "#f8fafc",
              }}
            />
          </div>

          {/* FILTER */}
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setLocalCurrentPage(1);
            }}
            size="large"
            style={{
              width: 220,
              borderRadius: 12,
            }}
            options={[
              { value: "all", label: "All Status" },
              { value: "Pending", label: "Pending" },
              { value: "Completed", label: "Completed" },
            ]}
          />
        </div>
      </div>

      {/* ====================================================== */}
      {/* TABLE */}
      {/* ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="hover:bg-slate-50/80">
              <TableHead className="h-12 pl-6 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Bucket ID
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Bucket Name
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Description
              </TableHead>
              {/* <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Assigned Target
              </TableHead> */}
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Created By
              </TableHead>{" "}
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Assigned To
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Created At
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Status
              </TableHead>{" "}
              {(canUpdate || canDelete) && (
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Action
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <div className="h-12 rounded-lg bg-slate-100 animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : buckets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="py-20 flex flex-col items-center justify-center">
                    <AlertCircle size={40} className="text-slate-300 mb-3" />

                    <div className="text-lg font-medium text-slate-700">
                      No Buckets Found
                    </div>

                    <div className="text-sm text-slate-400 mt-1">
                      Try changing filters or search
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              buckets.map((bucket) => {
                const users =
                  bucket.targetUsers?.length > 0
                    ? bucket.targetUsers
                    : bucket.assignedTargetUsers || [];
                return (
                  <TableRow
                    key={bucket._id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* BUCKET ID */}
                    <TableCell className="pl-6 py-4">
                      <span className="text-sm text-slate-700 font-medium">
                        {bucket.bucketId || "-"}
                      </span>
                    </TableCell>
                    {/* BUCKET NAME */}
                    <TableCell>
                      <div className="text-sm font-medium text-slate-800">
                        {bucket.title}
                      </div>
                    </TableCell>
                    {/* DESCRIPTION */}
                    <TableCell>
                      <div className="max-w-[260px]">
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {bucket.description || "No description"}
                        </p>
                      </div>
                    </TableCell>
                    {/* ASSIGNED TARGET */}
                    {/* <TableCell>
                    {bucket.assignmentMode === "Role" ? (
                      <div>
                        <div className="text-sm font-medium text-slate-700">
                          {bucket.targetRole?.name || "-"}
                        </div>

                        <div className="text-xs text-slate-500 mt-1">
                          {bucket.assignedTargetUsers?.length || 0} users
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {bucket.targetUsers?.slice(0, 2)?.map((user) => (
                          <span
                            key={user._id}
                            className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-700"
                          >
                            {user.name}
                          </span>
                        ))}

                        {bucket.targetUsers?.length > 2 && (
                          <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-[11px] text-blue-700">
                            +{bucket.targetUsers.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell> */}
                    {/* CREATED BY */}
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium text-slate-700">
                          {bucket.createdBy?.name || "-"}
                        </div>

                        <div className="text-xs text-slate-500 mt-1">
                          {bucket.createdBy?.email || "-"}
                        </div>
                      </div>
                    </TableCell>{" "}
                    <TableCell>
                      {(() => {
                        const users =
                          bucket.targetUsers?.length > 0
                            ? bucket.targetUsers
                            : bucket.assignedTargetUsers || [];

                        return (
                          <div className="flex flex-wrap items-center gap-1">
                            {users.slice(0, 3).map((user) => (
                              <span
                                key={user._id}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                              >
                                {user.name}
                              </span>
                            ))}

                            {users.length > 3 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full cursor-pointer hover:bg-slate-200">
                                      +{users.length - 3} more
                                    </span>
                                  </TooltipTrigger>

                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs p-3"
                                  >
                                    <div className="space-y-2">
                                      {users.slice(3).map((user) => (
                                        <div key={user._id}>
                                          <div className="font-medium">
                                            {user.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {user.email}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    {/* CREATED AT */}
                    <TableCell>
                      <div className="text-sm text-slate-700">
                        {new Date(bucket.createdAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(bucket.createdAt).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </div>
                    </TableCell>
                    {/* STATUS */}
                    <TableCell>
                      <div
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[11px] font-medium"
                        style={{
                          color:
                            bucket.distributionStatus === "Distributed"
                              ? "#0D9488"
                              : "#D97706",

                          background:
                            bucket.distributionStatus === "Distributed"
                              ? "#F0FDFA"
                              : "#FFFBEB",

                          borderColor:
                            bucket.distributionStatus === "Distributed"
                              ? "#99F6E4"
                              : "#FDE68A",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              bucket.distributionStatus === "Distributed"
                                ? "#0D9488"
                                : "#D97706",
                          }}
                        />

                        {bucket.distributionStatus}
                      </div>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="">
                        <div className="flex items-center gap-2">
                          {/* EDIT */}

                          {canUpdate && (
                            <button
                              onClick={() =>
                                navigate(
                                  `/delegate/task-buckets/edit/${bucket._id}`,
                                )
                              }
                              className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 flex items-center justify-center transition-all"
                            >
                              <Edit size={16} className="text-blue-600" />
                            </button>
                          )}

                          {/* DELETE */}

                          {canDelete && (
                            <button
                              onClick={() => openDeleteModal(bucket)}
                              className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-all"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {/* ====================================================== */}
      {/* PAGINATION */}
      {/* ====================================================== */}

      {totalTasks > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3">
          <Pagination
            totalItems={totalTasks || 0}
            itemsPerPage={localItemsPerPage}
            setItemsPerPage={setLocalItemsPerPage}
            currentPage={localCurrentPage}
            onPageChange={setLocalCurrentPage}
            isLoading={loading}
          />
        </div>
      )}
      <Modal
        open={deleteModal.open}
        onCancel={closeDeleteModal}
        footer={null}
        centered
        width={500}
      >
        <div className="pt-2">
          <h2 className="text-xl font-semibold text-slate-800">
            Delete Task Bucket
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Please enter reason before deleting this bucket.
          </p>

          {/* REMARK */}

          <div className="mt-5">
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Delete Remark
            </label>

            <Input.TextArea
              rows={4}
              placeholder="Enter delete remark..."
              value={deleteRemark}
              onChange={(e) => setDeleteRemark(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* ACTIONS */}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={closeDeleteModal}
              className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
              onClick={handleDeleteBucket}
            >
              Delete Bucket
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
