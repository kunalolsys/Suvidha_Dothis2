import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "../components/ui/index.jsx";

import {
  Clock,
  Save,
  Sparkles,
  Info,
  CalendarClock,
  CheckCircle2,
  Users,
  Eye,
  RefreshCw,
  Layers,
  AlertTriangle,
} from "lucide-react";

import { InputNumber, Modal, Tag, Empty, Spin } from "antd";
import api from "../lib/api.js";
import dayjs from "dayjs";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { getSubmodulePermissions } from "../utils/permissionUtils.js";

const PRESET_DAYS = [1, 2, 3, 5, 7, 10];

const TaskBucketAgingMaster = () => {
  // Master State
  const [pendingDaysThreshold, setPendingDaysThreshold] = useState(2);
  const [savedDays, setSavedDays] = useState(2);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [fetchingMaster, setFetchingMaster] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live Employee Aging Counts Preview State
  const [agingUsers, setAgingUsers] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Employee Bucket List Modal State
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [userBuckets, setUserBuckets] = useState([]);
  const [loadingUserBuckets, setLoadingUserBuckets] = useState(false);

  const { permissions, isSuper } = useSelector((state) => state.permissions);
  const { canUpdate } = getSubmodulePermissions(
    permissions,
    "bucket_aging_master",
    isSuper,
  );

  // =========================================================
  // 1. FETCH MASTER CONFIGURATION
  // =========================================================
  const fetchMaster = async () => {
    setFetchingMaster(true);
    try {
      const res = await api.get("/task-buckets/aging/master");
      const data = res?.data?.data;
      if (data) {
        const val = Number(data.pendingDaysThreshold ?? 2);
        setPendingDaysThreshold(val);
        setSavedDays(val);
        setLastUpdatedAt(data.updatedAt || null);
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to load aging master settings",
      );
    } finally {
      setFetchingMaster(false);
    }
  };

  // =========================================================
  // 2. FETCH EMPLOYEE-WISE AGING COUNTS (LIVE IMPACT PREVIEW)
  // =========================================================
  const fetchAgingPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await api.get("/task-buckets/aging/employee-counts");
      setAgingUsers(res?.data?.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchMaster();
    fetchAgingPreview();
  }, []);

  // =========================================================
  // 3. SAVE MASTER CONFIGURATION (PUT /task-buckets/aging/master)
  // =========================================================
  const handleSaveMaster = async () => {
    if (
      pendingDaysThreshold === null ||
      pendingDaysThreshold === undefined ||
      Number(pendingDaysThreshold) < 0
    ) {
      toast.error("Please enter a valid number of days (0 or greater)");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/task-buckets/aging/master", {
        pendingDaysThreshold: Number(pendingDaysThreshold),
      });

      const updated = res?.data?.data;
      const newDays = Number(
        updated?.pendingDaysThreshold ?? pendingDaysThreshold,
      );

      setSavedDays(newDays);
      setPendingDaysThreshold(newDays);
      setLastUpdatedAt(updated?.updatedAt || new Date().toISOString());

      toast.success(
        res?.data?.message || `Aging threshold updated to ${newDays} day(s)!`,
      );

      // Refresh live employee counts with new threshold
      await fetchAgingPreview();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to update aging master",
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // 4. VIEW SPECIFIC EMPLOYEE AGING BUCKET LIST
  // =========================================================
  const handleViewEmployeeBuckets = async (user) => {
    setSelectedUserModal(user);
    setUserBuckets([]);
    setLoadingUserBuckets(true);
    try {
      const res = await api.get(
        `/task-buckets/aging/employee/${encodeURIComponent(user.employeeCode)}/list`,
      );
      setUserBuckets(res?.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to fetch employee bucket list",
      );
    } finally {
      setLoadingUserBuckets(false);
    }
  };

  const hasUnsavedChanges = Number(pendingDaysThreshold) !== Number(savedDays);
  const totalPendingBuckets = agingUsers.reduce(
    (sum, u) => sum + (u.pendingCount || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-4 sm:p-6">
      <div className="mx-auto space-y-6">
        {/* ====================================================== */}
        {/* HERO BANNER */}
        {/* ====================================================== */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-6 sm:p-8 shadow-xl">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-cyan-300/15 blur-lg" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-xs mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                System Configuration Master
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Task Bucket Aging Master
              </h1>
              <p className="text-blue-100 mt-1.5 text-xs sm:text-sm max-w-2xl">
                Define the maximum pending days threshold for undistributed task
                buckets before they are flagged in employee aging reports.
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-white shrink-0">
              <div className="text-[11px] text-blue-100 uppercase font-semibold">
                Active Rule
              </div>
              <div className="text-xl font-bold mt-0.5 flex items-center gap-1.5">
                <Clock className="w-5 h-5 text-cyan-200" />
                &gt; {savedDays} Day{savedDays === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* MAIN GRID: MASTER FORM (LEFT) + LIVE IMPACT PREVIEW (RIGHT) */}
        {/* ====================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: MASTER SETTING CARD (6 cols) */}
          <div className="lg:col-span-6">
            <Card className="rounded-[26px] border border-slate-200/70 shadow-lg bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg text-slate-800">
                        Pending Days Threshold
                      </CardTitle>
                      <p className="text-[11px] text-slate-400">
                        Single global threshold for undistributed buckets
                      </p>
                    </div>
                  </div>

                  {hasUnsavedChanges && (
                    <Tag color="orange" className="m-0 rounded-full font-semibold">
                      Unsaved Change
                    </Tag>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {fetchingMaster ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Spin />
                    <span className="text-xs text-slate-400">
                      Loading master configuration...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* NUMBER INPUT FIELD */}
                    <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Threshold Days (Strictly Greater Than)
                        </label>
                        <span className="text-[11px] font-semibold text-indigo-600">
                          Current Saved: {savedDays}d
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <InputNumber
                          min={0}
                          max={365}
                          size="large"
                          value={pendingDaysThreshold}
                          onChange={(val) =>
                            setPendingDaysThreshold(val !== null ? val : 0)
                          }
                          className="w-36 font-bold text-base rounded-xl"
                        />
                        <span className="text-sm font-semibold text-slate-600">
                          Day(s) after bucket creation
                        </span>
                      </div>

                      {/* QUICK PRESET BUTTONS */}
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-2">
                          Quick Presets:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_DAYS.map((preset) => {
                            const active =
                              Number(pendingDaysThreshold) === preset;
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setPendingDaysThreshold(preset)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                  active
                                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-600 shadow-xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
                                }`}
                              >
                                {preset} {preset === 1 ? "Day" : "Days"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* RULE EXPLANATION INFO BOX */}
                    <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-cyan-50/60 p-4 flex items-start gap-3">
                      <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                        <p className="font-bold text-slate-800">
                          How this rule works:
                        </p>
                        <p>
                          Any task bucket with{" "}
                          <span className="font-semibold text-indigo-700">
                            distributionStatus = Pending
                          </span>{" "}
                          that was created more than{" "}
                          <span className="font-bold text-indigo-700">
                            {pendingDaysThreshold ?? 0} day(s)
                          </span>{" "}
                          ago will automatically appear in the employee aging
                          count &amp; bucket list APIs.
                        </p>
                      </div>
                    </div>

                    {/* FOOTER META & SAVE BUTTON */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
                      <div className="text-[11px] text-slate-400">
                        {lastUpdatedAt ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Last updated:{" "}
                            <strong className="text-slate-600">
                              {dayjs(lastUpdatedAt).format(
                                "DD MMM YYYY, hh:mm A",
                              )}
                            </strong>
                          </span>
                        ) : (
                          "Default threshold active"
                        )}
                      </div>

                      {canUpdate && (
                        <Button
                          disabled={saving}
                          onClick={handleSaveMaster}
                          className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-700 text-white font-semibold shadow-md shadow-indigo-600/20"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saving ? "Saving Master..." : "Save Master Setting"}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: LIVE EMPLOYEE AGING COUNTS PREVIEW (6 cols) */}
          <div className="lg:col-span-6">
            <Card className="rounded-[26px] border border-slate-200/70 shadow-lg bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg text-slate-800">
                        Live Aging Impact (&gt; {savedDays}d)
                      </CardTitle>
                      <p className="text-[11px] text-slate-400">
                        Employees with undistributed buckets exceeding threshold
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fetchAgingPreview}
                    disabled={loadingPreview}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-xs font-semibold transition-colors"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loadingPreview ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                </div>

                {/* MINI KPI STRIP */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 px-3.5 py-2.5">
                    <div className="text-[10px] font-bold text-indigo-500 uppercase">
                      Impacted Employees
                    </div>
                    <div className="text-lg font-bold text-indigo-900 mt-0.5">
                      {agingUsers.length}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50/80 border border-amber-200/70 px-3.5 py-2.5">
                    <div className="text-[10px] font-bold text-amber-600 uppercase">
                      Total Overdue Buckets
                    </div>
                    <div className="text-lg font-bold text-amber-900 mt-0.5">
                      {totalPendingBuckets}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                {loadingPreview ? (
                  <div className="h-[290px] flex items-center justify-center">
                    <Spin />
                  </div>
                ) : agingUsers.length === 0 ? (
                  <div className="h-[290px] flex flex-col items-center justify-center text-center">
                    <Empty
                      description={
                        <span className="text-xs text-slate-400">
                          No employees have undistributed buckets older than{" "}
                          {savedDays} day(s)
                        </span>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {agingUsers.map((u) => (
                      <div
                        key={u.employeeCode}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/90 hover:border-indigo-300 bg-white transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {(u.name || "U")
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm truncate">
                                {u.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold">
                                {u.employeeCode}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            {u.pendingCount}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleViewEmployeeBuckets(u)}
                            className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-colors"
                            title="View Pending Buckets"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* EMPLOYEE AGING BUCKET LIST MODAL */}
      {/* ====================================================== */}
      <Modal
        title={
          selectedUserModal
            ? `Pending Aging Buckets — ${selectedUserModal.name} (${selectedUserModal.employeeCode})`
            : "Pending Aging Buckets"
        }
        open={Boolean(selectedUserModal)}
        onCancel={() => {
          setSelectedUserModal(null);
          setUserBuckets([]);
        }}
        footer={null}
        width={680}
      >
        {loadingUserBuckets ? (
          <div className="py-12 flex justify-center">
            <Spin />
          </div>
        ) : userBuckets.length === 0 ? (
          <Empty description="No pending buckets found" />
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 pt-2">
            {userBuckets.map((b) => (
              <div
                key={b._id}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[11px] font-bold">
                      {b.bucketId}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {b.title}
                    </span>
                  </div>

                  <Tag color="volcano" className="m-0 rounded-md font-semibold">
                    Pending since {b.pendingSinceDays} day(s)
                  </Tag>
                </div>

                <p className="text-xs text-slate-600">{b.description}</p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-500" />
                    End Days: <strong className="text-slate-600">{b.taskEndDays ?? "-"}</strong>
                  </span>
                  <span>
                    Created:{" "}
                    <strong className="text-slate-600">
                      {dayjs(b.createdAt).format("DD MMM YYYY, hh:mm A")}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskBucketAgingMaster;