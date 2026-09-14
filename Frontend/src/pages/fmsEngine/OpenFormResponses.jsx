import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  FileText,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Inbox,
  Edit3,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Hash,
  UserCheck,
} from "lucide-react";
import api from "../../lib/api";
import {
  Select as AntdSelect,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Tag,
} from "antd";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

// --- Animation Variants ---
const fadeUpVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

/* ─── Skeleton Loader for Table ─── */
const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-slate-100">
    <td className="py-3 px-5"><div className="h-3 w-4 bg-slate-200 rounded"></div></td>
    <td className="py-3 px-5">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-slate-200 rounded-full shrink-0"></div>
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-28 bg-slate-200 rounded"></div>
          <div className="h-2.5 w-16 bg-slate-100 rounded"></div>
        </div>
      </div>
    </td>
    <td className="py-3 px-5"><div className="h-3.5 w-28 bg-slate-200 rounded"></div></td>
    <td className="py-3 px-5"><div className="h-3.5 w-24 bg-slate-200 rounded"></div></td>
    <td className="py-3 px-5 text-right"><div className="h-5 w-16 bg-slate-200 rounded-md ml-auto"></div></td>
  </tr>
);

/* ─── Field Response Renderer for Right Inspector ─── */
const SubmissionFieldCard = ({ fieldKey, field }) => {
  const labelText = useMemo(() => {
    if (typeof field === "object" && field !== null && field?.label) {
      return field.label;
    }
    return String(fieldKey || "")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  }, [field, fieldKey]);

  const renderedValue = useMemo(() => {
    if (field === null || field === undefined) return "—";
    let val = field;
    if (typeof field === "object" && field !== null && !Array.isArray(field)) {
      if ("value" in field) val = field.value;
      else return "—";
    }
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (Array.isArray(val)) {
      return val.length > 0
        ? val
            .map((item) =>
              typeof item === "object" && item !== null
                ? JSON.stringify(item)
                : String(item ?? "")
            )
            .filter(Boolean)
            .join(", ")
        : "—";
    }
    if (typeof val === "object") return "—";
    return String(val);
  }, [field]);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1 hover:border-indigo-300 transition-colors">
      <div className="flex items-center gap-1.5">
        <Hash className="w-3 h-3 text-indigo-500" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          {labelText}
        </span>
      </div>
      <span className="text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed block pl-4.5">
        {renderedValue}
      </span>
    </div>
  );
};

/* ─── Admin Response Edit Modal ─── */
const EditSubmissionModal = ({ open, submission, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fields = useMemo(() => {
    if (!submission?.submissionData) return [];
    return Object.entries(submission.submissionData).map(([key, item]) => ({
      key,
      label: typeof item === "object" && item?.label ? item.label : key,
      value:
        typeof item === "object" && item !== null && "value" in item
          ? item.value
          : item,
      fieldType: typeof item === "object" && item?.fieldType ? item.fieldType : "text",
    }));
  }, [submission]);

  useEffect(() => {
    if (open && fields.length > 0) {
      const initialValues = {};
      fields.forEach((f) => {
        if (f.fieldType === "date" && f.value) {
          initialValues[f.key] = dayjs(f.value);
        } else {
          initialValues[f.key] = f.value;
        }
      });
      form.setFieldsValue(initialValues);
    }
  }, [open, fields, form]);

  const handleSave = async (values) => {
    try {
      setSaving(true);
      const payloadData = {};
      Object.entries(values).forEach(([k, val]) => {
        if (dayjs.isDayjs(val)) {
          payloadData[k] = val.format("YYYY-MM-DD");
        } else {
          payloadData[k] = val;
        }
      });

      const res = await api.put(
        `/open-forms/submission/${submission._id}/edit`,
        { submissionData: payloadData }
      );

      message.success(
        res.data?.message || "Response updated and synced to all tasks!"
      );
      if (onSuccess) await onSuccess(submission._id, payloadData);
      onClose();
    } catch (err) {
      message.error(
        err.response?.data?.message || "Failed to update response."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm pb-2 border-b border-slate-100">
          <Edit3 size={16} className="text-indigo-600" />
          Edit Open Form Response
        </div>
      }
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      okText="Save & Cascade Sync"
      okButtonProps={{
        className: "bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-lg text-xs",
      }}
      cancelButtonProps={{ className: "rounded-lg text-xs font-medium" }}
      destroyOnClose
      width={500}
      closeIcon={<XCircle size={16} className="text-slate-400 hover:text-slate-600" />}
    >
      <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4 space-y-3">
        {fields.map((f) => (
          <Form.Item
            key={f.key}
            name={f.key}
            label={<span className="font-semibold text-xs text-slate-600">{f.label}</span>}
            className="mb-0"
          >
            {f.fieldType === "number" ? (
              <InputNumber style={{ width: "100%" }} className="rounded-lg" />
            ) : f.fieldType === "textarea" ? (
              <Input.TextArea rows={2} className="rounded-lg text-xs" />
            ) : f.fieldType === "date" ? (
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" className="rounded-lg" />
            ) : (
              <Input className="rounded-lg text-xs" />
            )}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
};

/* ─── Main Open Form Responses Dashboard ─── */
export default function OpenFormResponses() {
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("all");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 10;
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "responses",
    isSuper,
  );
  const currentUser = useSelector((state) => state.users?.currentUser);

  const isAdmin = useMemo(() => {
    const roleName = currentUser?.role?.name || currentUser?.role;
    return ["Admin", "Owner", "SuperAdmin"].includes(roleName);
  }, [currentUser]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const formsRes = await api.post(`/open-forms/get-forms`, {
        role: currentUser?.role?.name,
      });
      const formsList = formsRes.data?.data || [];
      setForms(formsList);

      if (formsList.length > 0) {
        const results = await Promise.allSettled(
          formsList.map((form) => api.get(`/open-forms/${form._id}/submissions`))
        );

        const combined = results.flatMap((result, index) => {
          if (result.status === "fulfilled") {
            const data = result.value.data?.data || [];
            return data.map((item) => ({
              ...item,
              parentFormName: formsList[index]?.formName || "Unnamed Form",
              parentFormId: formsList[index]?._id,
            }));
          }
          return [];
        });

        combined.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setSubmissions(combined);
      }
    } catch (err) {
      console.error("Failed to load submission logs:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Filter Pipeline
  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return submissions.filter((item) => {
      const matchesForm = selectedFormId === "all" || item.parentFormId === selectedFormId;
      const name = item?.submittedBy?.name?.toLowerCase() || "";
      const code = item?.submittedBy?.employeeCode?.toLowerCase() || "";
      const matchesSearch = !query || name.includes(query) || code.includes(query);

      const isTriggered = item.status === "Triggered";
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "success" && isTriggered) ||
        (statusFilter === "failed" && !isTriggered);

      return matchesForm && matchesSearch && matchesStatus;
    });
  }, [submissions, selectedFormId, searchQuery, statusFilter]);

  // FIX: Keep Right-Side Inspector Card Refreshed Live
  useEffect(() => {
    if (selectedSubmission?._id) {
      const updatedMatch = submissions.find((s) => s._id === selectedSubmission._id);
      if (updatedMatch) {
        setSelectedSubmission(updatedMatch);
        return;
      }
    }
    if (filteredSubmissions.length > 0) {
      setSelectedSubmission(filteredSubmissions[0]);
    } else {
      setSelectedSubmission(null);
    }
  }, [submissions, filteredSubmissions]);

  const stats = useMemo(() => {
    const total = filteredSubmissions.length;
    const triggered = filteredSubmissions.filter((s) => s.status === "Triggered").length;
    const failed = total - triggered;
    return { total, triggered, failed };
  }, [filteredSubmissions]);

  const paginatedSubmissions = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredSubmissions.slice(start, start + limit);
  }, [filteredSubmissions, page, limit]);

  const totalPages = Math.ceil(filteredSubmissions.length / limit) || 1;

  const formOptions = useMemo(
    () => [
      { value: "all", label: "All Form Registries" },
      ...forms.map((f) => ({
        value: f._id,
        label: f.formName || "Untitled Form",
      })),
    ],
    [forms]
  );

  const handleEditSuccess = async (subId, updatedData) => {
    await fetchInitialData();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-5 space-y-5 font-sans">
      
      {/* ── 1. COMPACT & PROFESSIONAL TOP BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
              Open Form Submissions
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time response audit trail & cascade synced tasks
            </p>
          </div>
        </div>

        {/* Compact Quick Stats */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 border border-slate-200/70 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-xs text-slate-600 font-medium">Triggered: <b className="text-slate-900">{stats.triggered}</b></span>
          </div>
          <div className="bg-slate-50 border border-slate-200/70 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-500" />
            <span className="text-xs text-slate-600 font-medium">Failed: <b className="text-slate-900">{stats.failed}</b></span>
          </div>
        </div>
      </div>

      {/* ── 2. FILTER & CONTROL STRIP ── */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          
          <div className="w-56">
            <AntdSelect
              size="middle"
              value={selectedFormId}
              onChange={(v) => { setSelectedFormId(v); setPage(1); }}
              className="w-full text-xs"
              options={formOptions}
              popupClassName="rounded-xl"
            />
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {[
              { id: "all", label: "All Items" },
              { id: "success", label: "Triggered" },
              { id: "failed", label: "Failed" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 border border-slate-200 bg-slate-50/50 px-3 py-1.5 rounded-xl w-60 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search submitter name or ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="bg-transparent border-none outline-none flex-1 text-xs text-slate-800 font-medium placeholder:text-slate-400"
            />
          </div>
        </div>

        <button
          onClick={fetchInitialData}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-indigo-600" : "text-slate-500"} />
          Refresh
        </button>
      </div>

      {/* ── 3. MAIN WORKSPACE ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        
        {/* ── LEFT LEDGER TABLE (SPAN 8) ── */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col min-h-[520px]">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} className="text-indigo-600" /> Submissions List
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              Showing {filteredSubmissions.length} records
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-5 w-12">#</th>
                  <th className="py-2.5 px-5">Submitter Details</th>
                  <th className="py-2.5 px-5">Form Name</th>
                  <th className="py-2.5 px-5">Timestamp</th>
                  <th className="py-2.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400">
                      <Inbox size={28} className="mx-auto mb-2 text-slate-300" />
                      <span className="text-xs font-medium">No submission logs found</span>
                    </td>
                  </tr>
                ) : (
                  paginatedSubmissions.map((item, idx) => {
                    const isSelected = selectedSubmission?._id === item._id;
                    const isTriggered = item.status === "Triggered";

                    return (
                      <tr
                        key={item._id}
                        onClick={() => setSelectedSubmission(item)}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? "bg-indigo-50/70 border-l-4 border-l-indigo-600"
                            : "hover:bg-slate-50/70"
                        }`}
                      >
                        <td className="py-3 px-5 text-slate-400 font-mono text-[11px]">
                          {(page - 1) * limit + idx + 1}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                              {item?.submittedBy?.name?.charAt(0) || "U"}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 text-xs leading-tight">
                                {item?.submittedBy?.name || "Anonymous User"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {item?.submittedBy?.employeeCode || "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5 font-medium text-slate-700 text-xs">
                          {item.parentFormName}
                        </td>
                        <td className="py-3 px-5 text-slate-400 font-mono text-[11px]">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <Tag
                            color={isTriggered ? "success" : "error"}
                            className="rounded-full px-2.5 py-0.5 font-bold text-[10px] m-0 border-0"
                          >
                            {isTriggered ? "Triggered" : "Failed"}
                          </Tag>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              Showing {filteredSubmissions.length > 0 ? ((page - 1) * limit) + 1 : 0}–{Math.min(page * limit, filteredSubmissions.length)} of {filteredSubmissions.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-30 cursor-pointer hover:bg-slate-50"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-slate-600 px-2 font-mono">
                {page}/{totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-30 cursor-pointer hover:bg-slate-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT INSPECTOR CARD (SPAN 4) ── */}
        <div className="xl:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs sticky top-5 overflow-hidden flex flex-col max-h-[82vh]">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={14} className="text-indigo-600" /> Response Inspector
              </h3>
              {canUpdate&& isAdmin && selectedSubmission && (
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                >
                  <Edit3 size={12} /> Edit
                </button>
              )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {selectedSubmission ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* User Profile Card */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-0.5">
                      Submitter
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {selectedSubmission.submittedBy?.name || "Anonymous User"}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Code: {selectedSubmission.submittedBy?.employeeCode || "—"}
                    </p>
                  </div>

                  {/* Field Values List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">
                      Payload Data
                    </span>

                    {Object.entries(selectedSubmission?.submissionData || {}).map(
                      ([key, field]) => (
                        <SubmissionFieldCard
                          key={key}
                          fieldKey={key}
                          field={field}
                        />
                      )
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs">
                  Select a row from the left table to inspect form fields.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Admin Edit Modal */}
      <EditSubmissionModal
        open={editModalOpen}
        submission={selectedSubmission}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}