import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "../../components/ui/index.jsx";

import {
  Briefcase,
  CalendarDays,
  Repeat,
  CheckCircle2,
  Send,
  Search,
  UserCheck,
  Clock,
  Layers,
  X,
  Sparkles,
  Building2,
  Mail,
  ArrowRight,
  CheckSquare,
  ListChecks,
  Pencil,
  Loader2,
  Lock,
  Award,
} from "lucide-react";

import { Checkbox, Empty, Input, InputNumber, Modal, Tag, Tooltip } from "antd";
import api from "../../lib/api.js";
import dayjs from "dayjs";
import { useDebounce } from "../../lib/debounce.js";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { getSubmodulePermissions } from "../../utils/permissionUtils.js";

const { TextArea } = Input;

const TaskDistribution = () => {
  // Bucket List & Filters
  const [buckets, setBuckets] = useState([]);
  const [activeTab, setActiveTab] = useState("Pending"); // "Pending" | "Distributed" | "Completed"
  const [bucketSearch, setBucketSearch] = useState("");
  const debouncedBucketSearch = useDebounce(bucketSearch, 350);

  // Multi-Bucket Selection & Editable Fields
  const [selectedBucketsMap, setSelectedBucketsMap] = useState({});
  const [bulkDaysValue, setBulkDaysValue] = useState(null);

  // Per-bucket live saving status
  const [savingStatusMap, setSavingStatusMap] = useState({});
  const debounceTimersRef = useRef({});

  // Complete Bucket Modal State (Same as earlier flow)
  const [completeModalBucket, setCompleteModalBucket] = useState(null);
  const [completeRemark, setCompleteRemark] = useState("");
  const [completingBucket, setCompletingBucket] = useState(false);

  // Single Employee Search State
  const [allEmployees, setAllEmployees] = useState([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [loading, setLoading] = useState(false);

  const { permissions, isSuper } = useSelector((state) => state.permissions);
  const { canUpdate } = getSubmodulePermissions(
    permissions,
    "my_bucket",
    isSuper,
  );

  // =========================================================
  // 1. FETCH BUCKETS BY TAB (Pending / Distributed / Completed)
  // =========================================================
  const fetchBuckets = async () => {
    try {
      const apiStatus = activeTab === "Completed" ? "Completed" : "Pending";
      const res = await api.get("/task-buckets", {
        params: {
          search: debouncedBucketSearch || undefined,
          status: activeTab,
        },
      });
      const list = (res?.data?.data || []).filter((b) => !b.isDeleted);
      setBuckets(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch task buckets");
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, [debouncedBucketSearch, activeTab]);

  // =========================================================
  // 2. FETCH ACTIVE EMPLOYEES
  // =========================================================
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await api.get("/users/allUsers");
      const raw =
        res?.data?.data?.users ||
        res?.data?.data ||
        res?.data?.users ||
        (Array.isArray(res?.data) ? res.data : []);

      const employeesOnly = raw.filter(
        (u) =>
          !u.isDeleted && u.role?.name?.trim().toLowerCase() === "employee",
      );
      setAllEmployees(employeesOnly);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // =========================================================
  // 3. SINGLE MATCHED EMPLOYEE ON SEARCH
  // =========================================================
  const matchedEmployee = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return null;

    const exactCode = allEmployees.find(
      (u) =>
        String(u.employeeCode || "")
          .trim()
          .toLowerCase() === q,
    );
    if (exactCode) return exactCode;

    const exactName = allEmployees.find(
      (u) =>
        String(u.name || "")
          .trim()
          .toLowerCase() === q,
    );
    if (exactName) return exactName;

    return (
      allEmployees.find(
        (u) =>
          String(u.employeeCode || "")
            .toLowerCase()
            .includes(q) ||
          String(u.name || "")
            .toLowerCase()
            .includes(q),
      ) || null
    );
  }, [allEmployees, employeeQuery]);

  useEffect(() => {
    setSelectedEmployee(matchedEmployee);
  }, [matchedEmployee]);

  // =========================================================
  // 4. HELPER: CHECK BUCKET DISTRIBUTION & TASK COMPLETION
  // =========================================================
  const isBucketDistributed = (bucket) => {
    return (
      bucket.distributionStatus === "Distributed" ||
      (Array.isArray(bucket.generatedTasks) && bucket.generatedTasks.length > 0)
    );
  };

  const areBucketTasksCompleted = (bucket) => {
    if (!isBucketDistributed(bucket)) return false;
    const tasks = Array.isArray(bucket.generatedTasks)
      ? bucket.generatedTasks
      : [];
    // If populated task objects exist, check all are Completed; otherwise allow when distributed
    const objectTasks = tasks.filter(
      (t) => t && typeof t === "object" && t.status,
    );
    if (objectTasks.length > 0) {
      return objectTasks.every((t) => t.status === "Completed");
    }
    return true;
  };

  // Filter buckets per active tab ("Pending" | "Distributed" | "Completed")
  const displayedBuckets = useMemo(() => {
    if (activeTab === "Completed") {
      return buckets.filter((b) => b.status === "Completed");
    }
    if (activeTab === "Distributed") {
      return buckets.filter(
        (b) => b.status !== "Completed" && isBucketDistributed(b),
      );
    }
    return buckets.filter(
      (b) => b.status !== "Completed" && !isBucketDistributed(b),
    );
  }, [buckets, activeTab]);

  // =========================================================
  // 5. LIVE UPDATE BUCKET (PUT /task-buckets/:id)
  // =========================================================
  const persistBucketChanges = async (bucket, overrides = {}) => {
    if (
      !bucket?._id ||
      bucket.status === "Completed" ||
      isBucketDistributed(bucket)
    ) {
      return;
    }

    const nextDescription =
      overrides.description !== undefined
        ? overrides.description
        : bucket.description;
    const nextTaskEndDays =
      overrides.taskEndDays !== undefined
        ? overrides.taskEndDays
        : bucket.taskEndDays;

    if (!String(nextDescription || "").trim()) {
      toast.error("Description cannot be empty");
      return;
    }

    setSavingStatusMap((prev) => ({ ...prev, [bucket._id]: "saving" }));

    try {
      const formData = new FormData();
      formData.append("title", bucket.title);
      formData.append("description", String(nextDescription).trim());
      formData.append("assignmentMode", bucket.assignmentMode || "Role");

      if (bucket.assignmentMode === "Users") {
        const userIds = (bucket.targetUsers || []).map((u) => u._id || u);
        formData.append("targetUsers", JSON.stringify(userIds));
      } else if (bucket.targetRole) {
        formData.append(
          "targetRole",
          bucket.targetRole?._id || bucket.targetRole,
        );
      }

      if (!bucket.isDependent && bucket.startDate) {
        formData.append("startDate", new Date(bucket.startDate).toISOString());
      }

      if (!bucket.isRecurrent && nextTaskEndDays) {
        formData.append("taskEndDays", String(Number(nextTaskEndDays)));
      }

      formData.append("checklist", JSON.stringify(bucket.checklist || []));
      formData.append("isDependent", String(Boolean(bucket.isDependent)));

      if (bucket.isDependent && bucket.dependencyConfig) {
        const dep = bucket.dependencyConfig;
        if (dep.taskDependent) {
          formData.append(
            "taskDependent",
            dep.taskDependent?._id || dep.taskDependent,
          );
        }
        if (dep.startTimeSetting) {
          formData.append("startTimeSetting", dep.startTimeSetting);
        }
        if (dep.isDependentFrequency) {
          formData.append("isDependentFrequency", dep.isDependentFrequency);
        }
        if (dep.xValue !== null && dep.xValue !== undefined) {
          formData.append("xValue", String(dep.xValue));
        }
      }

      formData.append("isRecurrent", String(Boolean(bucket.isRecurrent)));
      if (bucket.isRecurrent) {
        if (bucket.frequency) formData.append("frequency", bucket.frequency);
        formData.append("weekDays", JSON.stringify(bucket.weekDays || []));
        if (bucket.endDate) {
          formData.append("endDate", new Date(bucket.endDate).toISOString());
        }
      }

      if (bucket.remark) {
        formData.append("remark", bucket.remark);
      }

      const res = await api.put(`/task-buckets/${bucket._id}`, formData);
      const updatedBucket = res?.data?.data;

      if (updatedBucket) {
        setBuckets((prev) =>
          prev.map((b) =>
            b._id === bucket._id
              ? {
                  ...b,
                  description: updatedBucket.description,
                  taskEndDays: updatedBucket.taskEndDays,
                }
              : b,
          ),
        );

        setSelectedBucketsMap((prev) => {
          if (!prev[bucket._id]) return prev;
          return {
            ...prev,
            [bucket._id]: {
              ...prev[bucket._id],
              bucket: {
                ...prev[bucket._id].bucket,
                description: updatedBucket.description,
                taskEndDays: updatedBucket.taskEndDays,
              },
              description: updatedBucket.description,
              taskEndDays: updatedBucket.taskEndDays ?? nextTaskEndDays,
            },
          };
        });
      }

      setSavingStatusMap((prev) => ({ ...prev, [bucket._id]: "saved" }));
      setTimeout(() => {
        setSavingStatusMap((prev) => {
          const copy = { ...prev };
          if (copy[bucket._id] === "saved") delete copy[bucket._id];
          return copy;
        });
      }, 2000);
    } catch (err) {
      console.error(err);
      setSavingStatusMap((prev) => {
        const copy = { ...prev };
        delete copy[bucket._id];
        return copy;
      });
      toast.error(
        err?.response?.data?.message || "Failed to update task bucket",
      );
    }
  };

  const scheduleBucketSave = (bucket, overrides) => {
    if (debounceTimersRef.current[bucket._id]) {
      clearTimeout(debounceTimersRef.current[bucket._id]);
    }
    debounceTimersRef.current[bucket._id] = setTimeout(() => {
      persistBucketChanges(bucket, overrides);
    }, 600);
  };

  // =========================================================
  // 6. SELECTION & INLINE EDIT HANDLERS
  // =========================================================
  const toggleBucketSelection = (bucket, checked) => {
    if (bucket.status === "Completed" || isBucketDistributed(bucket)) return;

    setSelectedBucketsMap((prev) => {
      const updated = { ...prev };
      if (checked) {
        updated[bucket._id] = {
          bucket,
          description: bucket.description || "",
          taskEndDays: bucket.taskEndDays ?? 1,
        };
      } else {
        delete updated[bucket._id];
      }
      return updated;
    });
  };

  const selectableBuckets = useMemo(
    () =>
      displayedBuckets.filter(
        (b) => b.status !== "Completed" && !isBucketDistributed(b),
      ),
    [displayedBuckets],
  );

  const handleSelectAllBuckets = (checked) => {
    if (!checked) {
      setSelectedBucketsMap({});
      return;
    }
    const allMap = {};
    selectableBuckets.forEach((b) => {
      allMap[b._id] = {
        bucket: b,
        description:
          selectedBucketsMap[b._id]?.description ?? b.description ?? "",
        taskEndDays:
          selectedBucketsMap[b._id]?.taskEndDays ?? b.taskEndDays ?? 1,
      };
    });
    setSelectedBucketsMap(allMap);
  };

  const handleDescriptionChange = (bucketId, value) => {
    const entry = selectedBucketsMap[bucketId];
    if (!entry) return;

    setSelectedBucketsMap((prev) => ({
      ...prev,
      [bucketId]: {
        ...prev[bucketId],
        description: value,
      },
    }));

    scheduleBucketSave(entry.bucket, {
      description: value,
      taskEndDays: entry.taskEndDays,
    });
  };

  const handleTaskEndDaysChange = (bucketId, value) => {
    const entry = selectedBucketsMap[bucketId];
    if (!entry) return;

    const days = value !== null && value !== undefined ? Number(value) : 1;

    setSelectedBucketsMap((prev) => ({
      ...prev,
      [bucketId]: {
        ...prev[bucketId],
        taskEndDays: days,
      },
    }));

    scheduleBucketSave(entry.bucket, {
      description: entry.description,
      taskEndDays: days,
    });
  };

  const applyBulkDaysToSelected = async () => {
    if (!bulkDaysValue || bulkDaysValue < 1) return;
    const daysNum = Number(bulkDaysValue);

    const entries = Object.values(selectedBucketsMap);
    setSelectedBucketsMap((prev) => {
      const updated = {};
      Object.keys(prev).forEach((id) => {
        updated[id] = {
          ...prev[id],
          taskEndDays: daysNum,
        };
      });
      return updated;
    });

    await Promise.all(
      entries.map((entry) =>
        persistBucketChanges(entry.bucket, {
          description: entry.description,
          taskEndDays: daysNum,
        }),
      ),
    );

    toast.success(
      `Updated all ${entries.length} bucket(s) to ${daysNum} day(s)`,
    );
  };

  const selectedBucketIds = Object.keys(selectedBucketsMap);

  // =========================================================
  // 7. DISTRIBUTE SELECTED BUCKETS (LOCKS BUCKET AS DISTRIBUTED)
  // =========================================================
  const handleDistribute = async () => {
    if (selectedBucketIds.length === 0) {
      toast.error("Please select at least one undistributed task bucket");
      return;
    }

    if (!selectedEmployee?._id) {
      toast.error("Please search and select an employee");
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        selectedBucketIds.map((bucketId) => {
          const item = selectedBucketsMap[bucketId];
          return api.post(`/task-buckets/${bucketId}/distribute`, {
            selectedUsers: [selectedEmployee._id],
            assignments: [
              {
                userId: selectedEmployee._id,
                taskEndDays: item.taskEndDays,
                description: item.description,
              },
            ],
            taskEndDays: item.taskEndDays,
            description: item.description,
          });
        }),
      );

      toast.success(
        `${selectedBucketIds.length} bucket(s) distributed to ${selectedEmployee.name}!`,
      );

      setSelectedBucketsMap({});
      setBulkDaysValue(null);
      setEmployeeQuery("");
      setSelectedEmployee(null);
      await fetchBuckets();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to distribute tasks");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // 8. MARK DISTRIBUTED BUCKET AS COMPLETED (SAME AS EARLIER)
  // =========================================================
  const handleConfirmCompleteBucket = async () => {
    if (!completeModalBucket?._id) return;
    setCompletingBucket(true);
    try {
      await api.patch(`/task-buckets/${completeModalBucket._id}/complete`, {
        remark: completeRemark.trim(),
      });

      toast.success("Task bucket marked as Completed!");
      setCompleteModalBucket(null);
      setCompleteRemark("");
      await fetchBuckets();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to complete task bucket",
      );
    } finally {
      setCompletingBucket(false);
    }
  };

  const isAllSelected =
    selectableBuckets.length > 0 &&
    selectableBuckets.every((b) => Boolean(selectedBucketsMap[b._id]));

  const currentStep =
    selectedBucketIds.length === 0 ? 1 : !selectedEmployee ? 2 : 3;

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-4 sm:p-6">
      <div className="space-y-6">
        {/* HERO HEADER */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-6 sm:p-8 shadow-xl">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-cyan-300/15 blur-lg" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-xs mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                Smart Bucket Dispatch
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Task Bucket Distribution
              </h1>
              <p className="text-blue-100 mt-1.5 text-xs sm:text-sm max-w-2xl">
                Pick undistributed task buckets, customize description &
                completion days live, and assign them to an employee.
              </p>
            </div>

            {/* 3-Step Visual Progress Pill */}
            <div className="flex flex-wrap items-center gap-2 bg-white/15 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 shrink-0">
              {[
                { step: 1, label: "Select & Edit Buckets" },
                { step: 2, label: "Find Employee" },
                { step: 3, label: "Distribute" },
              ].map((s, idx) => {
                const isDone = currentStep > s.step;
                const isActive = currentStep === s.step;
                return (
                  <React.Fragment key={s.step}>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-white text-indigo-700 shadow-sm"
                          : isDone
                            ? "bg-emerald-400/25 text-white"
                            : "text-blue-100/80"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : isDone
                              ? "bg-emerald-400 text-slate-900"
                              : "bg-white/20 text-white"
                        }`}
                      >
                        {isDone ? "✓" : s.step}
                      </span>
                      <span>{s.label}</span>
                    </div>
                    {idx < 2 && (
                      <ArrowRight className="w-3.5 h-3.5 text-blue-200/70 hidden sm:block" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN 2-COLUMN WORKSPACE */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: TABS + BUCKETS (7 cols) */}
          <div className="xl:col-span-7">
            <Card className="rounded-[26px] border border-slate-200/70 shadow-lg bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg text-slate-800">
                        Available Task Buckets
                      </CardTitle>
                      <p className="text-[11px] text-slate-400">
                        Distributed buckets lock automatically & can be marked
                        complete once tasks finish
                      </p>
                    </div>
                  </div>

                  {/* PENDING / DISTRIBUTED / COMPLETED SEGMENTED TABS */}
                  <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex items-center gap-1">
                    {["Pending", "Distributed", "Completed"].map((tab) => {
                      const active = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab);
                            setSelectedBucketsMap({});
                          }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            active
                              ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search + Select All */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <Input
                    allowClear
                    prefix={<Search className="w-4 h-4 text-slate-400" />}
                    placeholder="Search buckets by title or ID..."
                    value={bucketSearch}
                    onChange={(e) => setBucketSearch(e.target.value)}
                    className="rounded-xl h-9"
                  />

                  {activeTab === "Pending" && selectableBuckets.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0 px-3.5 h-9 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                      <Checkbox
                        checked={isAllSelected}
                        onChange={(e) =>
                          handleSelectAllBuckets(e.target.checked)
                        }
                      >
                        <span className="text-xs font-semibold text-indigo-800">
                          Select All ({selectableBuckets.length})
                        </span>
                      </Checkbox>
                    </div>
                  )}
                </div>

                {/* Bulk End Days Quick Toolbar */}
                {selectedBucketIds.length >= 2 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80">
                    <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                      {selectedBucketIds.length} buckets selected — Set common
                      End Days:
                    </span>
                    <div className="flex items-center gap-2">
                      <InputNumber
                        min={1}
                        max={365}
                        size="small"
                        placeholder="Days"
                        value={bulkDaysValue}
                        onChange={(val) => setBulkDaysValue(val)}
                        className="w-20"
                      />
                      <button
                        type="button"
                        onClick={applyBulkDaysToSelected}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                      >
                        Apply All
                      </button>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-5 mt-2">
                {displayedBuckets.length === 0 ? (
                  <div className="h-[380px] flex flex-col items-center justify-center text-center">
                    <Empty
                      description={
                        <span className="text-xs text-slate-400">
                          No {activeTab.toLowerCase()} task buckets found
                        </span>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                    {displayedBuckets.map((bucket) => {
                      const selectedEntry = selectedBucketsMap[bucket._id];
                      const isSelected = Boolean(selectedEntry);
                      const isCompleted = bucket.status === "Completed";
                      const distributed = isBucketDistributed(bucket);
                      const canMarkComplete =
                        !isCompleted &&
                        distributed &&
                        areBucketTasksCompleted(bucket);
                      const saveState = savingStatusMap[bucket._id];

                      const currentDescription = isSelected
                        ? selectedEntry.description
                        : bucket.description;

                      const currentEndDays = isSelected
                        ? selectedEntry.taskEndDays
                        : (bucket.taskEndDays ?? 1);

                      const assignedPerson =
                        Array.isArray(bucket.assignedTargetUsers) &&
                        bucket.assignedTargetUsers.length > 0
                          ? bucket.assignedTargetUsers[0]
                          : null;

                      return (
                        <div
                          key={bucket._id}
                          onClick={() => {
                            if (!isCompleted && !distributed) {
                              toggleBucketSelection(bucket, !isSelected);
                            }
                          }}
                          className={`group relative rounded-2xl border p-4 transition-all duration-150 ${
                            isCompleted
                              ? "bg-slate-50/90 border-slate-200/80 opacity-85 cursor-default"
                              : distributed
                                ? "bg-emerald-50/35 border-emerald-200/90 cursor-default"
                                : isSelected
                                  ? "bg-gradient-to-r from-indigo-50/80 via-blue-50/40 to-white border-indigo-400 shadow-sm cursor-pointer"
                                  : "bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-2xs cursor-pointer"
                          }`}
                        >
                          {/* Left Active Accent Bar */}
                          {isSelected && !isCompleted && !distributed && (
                            <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-indigo-600 to-cyan-500" />
                          )}

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {!isCompleted && !distributed ? (
                                <Checkbox
                                  checked={isSelected}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    toggleBucketSelection(
                                      bucket,
                                      e.target.checked,
                                    )
                                  }
                                  className="mt-1"
                                />
                              ) : (
                                <div className="mt-1 p-1 rounded-md bg-slate-100 text-slate-500">
                                  <Lock className="w-3.5 h-3.5" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {bucket.bucketId && (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono text-[11px] font-semibold">
                                      {bucket.bucketId}
                                    </span>
                                  )}
                                  <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-700 transition-colors">
                                    {bucket.title}
                                  </h3>

                                  {distributed && !isCompleted && (
                                    <Tag
                                      color="green"
                                      className="m-0 rounded-md font-semibold"
                                    >
                                      Distributed
                                    </Tag>
                                  )}

                                  {bucket.isRecurrent && (
                                    <Tag
                                      color="cyan"
                                      className="m-0 rounded-md"
                                    >
                                      <Repeat className="w-3 h-3 inline mr-1" />
                                      {bucket.frequency}
                                    </Tag>
                                  )}

                                  {/* Live DB Sync Badge */}
                                  {saveState === "saving" && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Saving...
                                    </span>
                                  )}
                                  {saveState === "saved" && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                      ✓ Updated
                                    </span>
                                  )}
                                </div>

                                {/* EDITABLE DESCRIPTION ONLY WHEN SELECTED & NOT DISTRIBUTED */}
                                {isSelected && !isCompleted && !distributed ? (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-2"
                                  >
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 mb-1">
                                      <Pencil className="w-2.5 h-2.5" />
                                      Description (Auto-saves)
                                    </div>
                                    <TextArea
                                      autoSize={{ minRows: 2, maxRows: 4 }}
                                      value={currentDescription}
                                      placeholder="Enter task description..."
                                      onChange={(e) =>
                                        handleDescriptionChange(
                                          bucket._id,
                                          e.target.value,
                                        )
                                      }
                                      className="text-xs rounded-xl border-indigo-200 focus:border-indigo-500 bg-white"
                                    />
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                    {bucket.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 mt-3 flex-wrap text-[11px] text-slate-500">
                                  {bucket.startDate && (
                                    <span className="inline-flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-md">
                                      <CalendarDays className="w-3 h-3 text-indigo-600" />
                                      Start:{" "}
                                      <strong className="text-slate-700">
                                        {dayjs(bucket.startDate).format(
                                          "DD MMM YYYY",
                                        )}
                                      </strong>
                                    </span>
                                  )}

                                  {assignedPerson?.name && (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                                      <UserCheck className="w-3 h-3" />
                                      Assigned to: {assignedPerson.name}
                                    </span>
                                  )}

                                  {Array.isArray(bucket.checklist) &&
                                    bucket.checklist.length > 0 && (
                                      <span className="inline-flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-md">
                                        <ListChecks className="w-3 h-3 text-blue-600" />
                                        {bucket.checklist.length} steps
                                      </span>
                                    )}

                                  <Tag
                                    color={isCompleted ? "green" : "blue"}
                                    className="m-0 rounded-md text-[10px]"
                                  >
                                    {bucket.status}
                                  </Tag>
                                </div>

                                {/* COMPLETE BUCKET ACTION (WHEN DISTRIBUTED & TASKS COMPLETED) */}
                                {canUpdate && canMarkComplete && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-3 pt-2.5 border-t border-emerald-200/70 flex items-center justify-between"
                                  >
                                    <span className="text-[11px] text-emerald-700 font-medium">
                                      Ready to close this distributed bucket
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCompleteModalBucket(bucket);
                                        setCompleteRemark(bucket.remark || "");
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                                    >
                                      <Award className="w-3.5 h-3.5" />
                                      Mark Complete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* INLINE EDITABLE taskEndDays BOX */}
                            <Tooltip
                              title={
                                isCompleted || distributed
                                  ? "Locked after distribution"
                                  : !isSelected
                                    ? "Select bucket to edit End Days"
                                    : "Edit completion days (Auto-saves to bucket)"
                              }
                            >
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`shrink-0 rounded-xl px-3 py-2 border text-right transition-all ${
                                  isSelected && !distributed
                                    ? "bg-white border-indigo-200 shadow-2xs"
                                    : "bg-slate-50/70 border-slate-200/80"
                                }`}
                              >
                                <div className="flex items-center justify-end gap-1 mb-1">
                                  <Clock className="w-3 h-3 text-indigo-600" />
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                                    End Days
                                  </span>
                                </div>
                                <InputNumber
                                  min={1}
                                  max={365}
                                  size="small"
                                  disabled={
                                    isCompleted ||
                                    distributed ||
                                    !isSelected ||
                                    bucket.isRecurrent
                                  }
                                  value={currentEndDays}
                                  onChange={(val) =>
                                    handleTaskEndDaysChange(bucket._id, val)
                                  }
                                  className="w-20 font-bold"
                                />
                              </div>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL: SINGLE EMPLOYEE SEARCH & ASSIGN SUMMARY (5 cols) */}
          <div className="xl:col-span-5 xl:sticky xl:top-6">
            <Card className="rounded-[26px] border border-slate-200/70 shadow-lg bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg text-slate-800">
                      Assign to Employee
                    </CardTitle>
                    <p className="text-[11px] text-slate-400">
                      Search single assignee by Employee Code or Name
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 block">
                    Employee Code or Name
                  </label>
                  <Input
                    size="large"
                    allowClear
                    prefix={<Search className="w-4 h-4 text-indigo-500" />}
                    placeholder="Type EMP001 or employee name..."
                    value={employeeQuery}
                    onChange={(e) => setEmployeeQuery(e.target.value)}
                    className="rounded-xl border-slate-200 hover:border-indigo-400 focus:border-indigo-500"
                  />
                </div>

                {/* SINGLE MATCHED USER SPOTLIGHT CARD */}
                {!employeeQuery.trim() ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-7 text-center">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5 border border-indigo-100">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600">
                      No Employee Selected Yet
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Enter employee code or name above to preview assignee
                    </p>
                  </div>
                ) : loadingEmployees ? (
                  <div className="p-6 text-center text-xs text-indigo-600 font-medium">
                    Searching employee directory...
                  </div>
                ) : !selectedEmployee ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 text-center">
                    <p className="text-xs font-semibold text-rose-600">
                      No active employee found for "{employeeQuery}"
                    </p>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-blue-50/60 to-cyan-50/70 p-4 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                          {(selectedEmployee.name || "E")
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {selectedEmployee.name}
                            </span>
                            {selectedEmployee.employeeCode && (
                              <span className="px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200 font-mono text-[11px] font-bold">
                                #{selectedEmployee.employeeCode}
                              </span>
                            )}
                          </div>

                          {selectedEmployee.email && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 truncate">
                              <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">
                                {selectedEmployee.email}
                              </span>
                            </div>
                          )}

                          {selectedEmployee.department && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1">
                              <Building2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                              <span className="font-medium truncate">
                                {Array.isArray(selectedEmployee.department)
                                  ? selectedEmployee.department
                                      .map((d) => d.name)
                                      .filter(Boolean)
                                      .join(", ")
                                  : selectedEmployee.department?.name || "-"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700 mt-0.5">
                          Matched
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SELECTED BUCKETS SUMMARY */}
                <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      Selected Buckets
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                        {selectedBucketIds.length}
                      </span>
                    </span>
                    {selectedBucketIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedBucketsMap({})}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {selectedBucketIds.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">
                      Select one or more undistributed buckets from the left
                      panel to build your dispatch queue.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {selectedBucketIds.map((id) => {
                        const { bucket, description, taskEndDays } =
                          selectedBucketsMap[id];
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-slate-200/90 text-xs shadow-2xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold text-slate-800 block truncate">
                                {bucket.title}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {description}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold text-[11px]">
                                {taskEndDays} Day{taskEndDays > 1 ? "s" : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleBucketSelection(bucket, false)
                                }
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* DISTRIBUTE ACTION BUTTON */}
                {canUpdate && (
                  <Button
                    disabled={
                      loading ||
                      selectedBucketIds.length === 0 ||
                      !selectedEmployee
                    }
                    onClick={handleDistribute}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-700 text-white font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {loading
                      ? "Distributing Buckets..."
                      : selectedBucketIds.length > 0 && selectedEmployee
                        ? `Distribute ${selectedBucketIds.length} Bucket(s) to ${selectedEmployee.name}`
                        : "Select Buckets & Employee to Distribute"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* MARK BUCKET COMPLETE MODAL (SAME AS EARLIER FLOW) */}
      <Modal
        title="Mark Task Bucket as Completed"
        open={Boolean(completeModalBucket)}
        onCancel={() => {
          setCompleteModalBucket(null);
          setCompleteRemark("");
        }}
        onOk={handleConfirmCompleteBucket}
        confirmLoading={completingBucket}
        okText="Complete Bucket"
        okButtonProps={{
          className: "bg-emerald-600 hover:bg-emerald-700",
        }}
      >
        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-600">
            Completing bucket:{" "}
            <strong className="text-slate-900">
              {completeModalBucket?.title}
            </strong>
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Completion Remark (Optional)
            </label>
            <TextArea
              rows={3}
              value={completeRemark}
              onChange={(e) => setCompleteRemark(e.target.value)}
              placeholder="Enter any closing notes or remarks..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TaskDistribution;
