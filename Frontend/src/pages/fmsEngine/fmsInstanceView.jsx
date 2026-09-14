import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import api from "../../lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import {
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  AlertTriangleIcon,
  RefreshCw,
  PauseCircle,
  StopCircle,
  XCircle,
} from "lucide-react";

const STATUS_COLUMNS = [
  {
    key: "upcoming",
    label: "Upcoming",
    icon: TrendingUp,
    gradient: "from-blue-400 to-indigo-500",
    iconBg: "from-blue-500 to-indigo-600",
  },
  {
    key: "delayed",
    label: "Delayed",
    icon: AlertTriangleIcon,
    gradient: "from-red-500 to-rose-600",
    iconBg: "from-red-600 to-rose-700",
  },
  {
    key: "pending",
    label: "In Progress",
    icon: Clock,
    gradient: "from-orange-400 to-yellow-500",
    iconBg: "from-orange-500 to-yellow-600",
  },
  {
    key: "overdue",
    label: "Overdue",
    icon: AlertCircle,
    gradient: "from-red-400 to-rose-500",
    iconBg: "from-red-500 to-rose-600",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    gradient: "from-emerald-400 to-green-500",
    iconBg: "from-emerald-500 to-green-600",
  },
  {
    key: "onhold",
    label: "On Hold",
    icon: PauseCircle, // or Pause
    gradient: "from-yellow-400 to-amber-500",
    iconBg: "from-yellow-500 to-amber-600",
  },
  {
    key: "stopped",
    label: "Stopped",
    icon: StopCircle, // or XCircle
    gradient: "from-red-400 to-rose-500",
    iconBg: "from-red-500 to-rose-600",
  },
  {
    key: "terminated",
    label: "Terminated",
    icon: XCircle,
    gradient: "from-rose-600 to-red-800", // 🔴 Dark Crimson Red gradient for Terminated
    iconBg: "from-rose-700 to-red-900",
  },
];

export default function FmsPremiumView() {
  const { id } = useParams();

  const [instance, setInstance] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchData = async () => {
    const res = await api.get(`/fms/instances/${id}`);
    setInstance(res.data.data);
  };
  const fetchTask = async () => {
    const res = await api.get(`/fms/instances/${id}/tasks`);
    setTasks(res.data.data);
  };

  useEffect(() => {
    fetchData();
    fetchTask();
  }, [id]);
  if (!instance)
    return (
      <div className="p-6 animate-pulse">
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const getStatusGradient = (status, isTerminated = false) => {
    // If the boolean flag is active, prioritize Terminated gradient
    if (isTerminated) {
      return "from-rose-600 to-red-800";
    }

    const styles = {
      Upcoming: "from-blue-400 to-indigo-500",
      "In Progress": "from-orange-400 to-yellow-500",
      Completed: "from-emerald-400 to-green-500",
      Ongoing: "from-red-400 to-rose-500",

      // 🔥 Added Statuses
      Terminated: "from-rose-600 to-red-800",
      terminated: "from-rose-600 to-red-800",
      Stopped: "from-slate-600 to-zinc-700",
      stopped: "from-slate-600 to-zinc-700",

      // Additional useful statuses
      Pending: "from-slate-400 to-gray-500",
      Overdue: "from-red-500 to-pink-600",
      Cancelled: "from-zinc-400 to-zinc-600",
      Failed: "from-red-600 to-red-800",
      Approved: "from-green-500 to-emerald-600",
      Rejected: "from-rose-500 to-red-600",
      OnHold: "from-yellow-400 to-amber-500",
      onhold: "from-yellow-400 to-amber-500",
      Deferred: "from-purple-400 to-indigo-500",
    };

    return styles[status] || "from-gray-400 to-gray-500";
  };
  const handleRefresh = async () => {
    try {
      setLoading(true);

      // call all your APIs here
      await Promise.all([fetchData(), fetchTask()]);
    } finally {
      setLoading(false);
    }
  };

  const formatFieldValue = (field, value) => {
    if (value === undefined || value === null || value === "")
      return "Not filled";

    switch (field.fieldType) {
      case "date":
      case "datetime":
        return new Date(value).toLocaleString();

      case "file":
      case "image":
        return value?.path ? "📎 Uploaded" : "Not uploaded";

      case "checkbox":
        return value ? "Yes" : "No";

      case "multiselect":
        return Array.isArray(value) ? value.join(", ") : "-";

      case "textarea":
        return value.length > 20 ? value.slice(0, 20) + "..." : value;

      default:
        return String(value);
    }
  };
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-900/20 dark:to-purple-900/20"
    >
      <div className="mt-2 pb-12 px-2 sm:px-4 lg:px-6">
        {/* 🔥 PREMIUM STICKY HEADER */}
        <motion.div
          className=" w-full bg-gradient-to-br from-white/95 via-white/85 to-white/60 backdrop-blur-3xl border border-white/40 shadow-xl ring-1 ring-white/30 rounded-2xl p-6 mb-6 transform-gpu max-w-none"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl p-5 flex items-center justify-center shrink-0">
                  <Calendar className="w-10 h-10 text-white drop-shadow-lg" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl lg:text-2xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg leading-tight mb-3">
                    {instance.instanceName}
                  </h1>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className="font-mono text-sm px-3 py-1.5 backdrop-blur border-slate-200/50 shadow-md"
                    >
                      {instance.instanceId}
                    </Badge>
                    <Badge
                      className={`font-bold text-sm px-4 py-1.5 shadow-lg bg-gradient-to-r ${getStatusGradient(
                        instance.status,
                        instance.isTerminated,
                      )} text-white rounded-xl backdrop-blur-sm border-0`}
                    >
                      {instance.isTerminated ? "Terminated" : instance.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Managers */}
              <div className="flex flex-wrap gap-3">
                {/* MANAGER */}
                {instance.manager && (
                  <motion.div
                    className="group flex items-center gap-2 p-3 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 backdrop-blur rounded-xl border border-blue-100/50 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 min-w-[140px]"
                    whileHover={{ y: -2 }}
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900 text-xs leading-tight">
                        {instance.manager.name}
                      </p>
                      <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">
                        Manager
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* SR MANAGER */}
                {instance.srManager && (
                  <motion.div
                    className="group flex items-center gap-2 p-3 bg-gradient-to-br from-emerald-50/80 to-green-50/60 backdrop-blur rounded-xl border border-emerald-100/50 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 min-w-[140px]"
                    whileHover={{ y: -2 }}
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900 text-xs leading-tight">
                        {instance.srManager.name}
                      </p>
                      <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">
                        Sr. Manager
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Progress Section */}
            <div className="flex flex-col items-end gap-4 shrink-0">
              <div className="w-full flex justify-end">
                <motion.button
                  onClick={handleRefresh}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl 
  bg-gradient-to-r from-indigo-500 to-purple-600 text-white 
  shadow-lg hover:shadow-xl transition-all duration-300 
  backdrop-blur border border-white/20"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span className="text-sm font-semibold">Refresh</span>
                </motion.button>
              </div>
              <motion.div
                className="text-right"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.p
                  className="text-xl lg:text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent drop-shadow-lg mb-1"
                  key={instance.progress?.rate}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                >
                  {instance.progress?.rate || 0}%
                </motion.p>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Overall Progress
                </p>
              </motion.div>

              <div className="w-80">
                <div className="relative">
                  <Progress
                    value={instance.progress?.rate || 0}
                    className="h-3 rounded-2xl shadow-inner overflow-hidden relative"
                  />
                  <div className="absolute inset-0 h-3 bg-gradient-to-r from-emerald-400/40 via-blue-400/40 to-purple-400/40 rounded-2xl backdrop-blur-sm animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            {/* COMPLETED */}
            <motion.div
              className="group p-4 bg-gradient-to-br from-emerald-50/80 to-green-50/60 backdrop-blur rounded-xl border border-emerald-100/50 shadow-md hover:-translate-y-1 transition-all duration-300 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-2 group-hover:animate-bounce" />

              <p className="text-lg font-bold text-emerald-700">
                {instance.progress?.completedTasks || 0}
              </p>

              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                Completed Tasks
              </p>
            </motion.div>

            {/* TOTAL */}
            <motion.div
              className="group p-4 bg-gradient-to-br from-slate-50/80 to-blue-50/60 backdrop-blur rounded-xl border border-slate-200/50 shadow-md hover:-translate-y-1 transition-all duration-300 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <TrendingUp className="w-6 h-6 mx-auto text-slate-600 mb-2 group-hover:animate-bounce" />

              <p className="text-lg font-bold text-slate-800">
                {instance.progress?.totalTasks || 0}
              </p>

              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Total Tasks
              </p>
            </motion.div>

            {/* PENDING */}
            <motion.div
              className="group p-4 bg-gradient-to-br from-orange-50/80 to-yellow-50/60 backdrop-blur rounded-xl border border-orange-200/50 shadow-md hover:-translate-y-1 transition-all duration-300 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Clock className="w-6 h-6 mx-auto text-orange-600 mb-2 group-hover:animate-bounce" />

              <p className="text-lg font-bold text-orange-700">
                {(instance.progress?.totalTasks || 0) -
                  (instance.progress?.completedTasks || 0)}
              </p>

              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                Not Done
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* 🧠 PREMIUM KANBAN BOARD */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8"
          variants={containerVariants}
        >
          {STATUS_COLUMNS.map((col, index) => {
            const Icon = col.icon;
            const columnTasks = tasks.filter((t) => {
              const taskStatus = String(t.status || "")
                .toLowerCase()
                .trim();
              const isTaskTerminated =
                t.isTerminated === true || taskStatus === "terminated";

              // 🔴 1. TERMINATED COLUMN
              if (col.key === "terminated") {
                return isTaskTerminated;
              }

              // If a task is terminated, exclude it from all other columns
              if (isTaskTerminated) {
                return false;
              }

              // 🟠 2. PENDING / IN PROGRESS COLUMN
              if (col.key === "pending") {
                return (
                  taskStatus === "pending" ||
                  taskStatus === "in progress" ||
                  taskStatus === "inprocess"
                );
              }

              // 🟡 3. ON HOLD COLUMN
              if (col.key === "onhold") {
                return taskStatus === "onhold" || taskStatus === "on hold";
              }

              // 🔴 4. DELAYED / OVERDUE COLUMNS
              if (col.key === "delayed") {
                return taskStatus === "delayed";
              }

              if (col.key === "overdue") {
                return taskStatus === "overdue";
              }

              // ⚪ 5. STOPPED / NOT DONE COLUMN
              if (col.key === "stopped") {
                return taskStatus === "stopped" || taskStatus === "not done";
              }

              // 🟢 6. UPCOMING & COMPLETED COLUMNS (Exact Match)
              return taskStatus === col.key;
            });

            return (
              <motion.div
                key={col.key}
                className="group"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* ✅ Slightly bigger + flex fix */}
                <Card className="relative h-[560px] flex flex-col overflow-hidden bg-gradient-to-br from-white/70 via-white/50 to-white/30 backdrop-blur-2xl border border-white/40 shadow-xl hover:shadow-2xl hover:border-white/60 rounded-2xl py-4 lg:py-4 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  {/* Header */}
                  <CardHeader className=" sticky top-0 bg-gradient-to-r from-white/90 backdrop-blur z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div
                          className={`p-2.5 rounded-2xl bg-gradient-to-r ${col.iconBg} shadow-md shrink-0`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>

                        {/* Title + Subtitle */}
                        <div>
                          <CardTitle
                            className={`text-base font-semibold bg-gradient-to-r ${col.gradient} bg-clip-text text-transparent`}
                          >
                            {col.label}
                          </CardTitle>

                          {/* ✅ Better text */}
                          <p className="text-xs text-slate-500 font-medium">
                            {columnTasks.length} task
                            {columnTasks.length !== 1 ? "s" : ""} in this stage
                          </p>
                        </div>
                      </div>

                      {/* Count Badge */}
                      <Badge className="text-sm font-semibold backdrop-blur border-white/40 text-white px-3 py-1.5 shadow-sm">
                        {columnTasks.length}
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* ✅ FLEX SCROLL FIX */}
                  <CardContent className="flex-1 w-full pt-0 overflow-y-auto space-y-3 pt-1  scrollbar-thin scrollbar-thumb-slate-300/50 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
                    <AnimatePresence>
                      {columnTasks.map((task, taskIndex) => (
                        <motion.div
                          key={task._id}
                          layout
                          initial={{ opacity: 0, y: 20, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.97 }}
                          transition={{
                            delay: taskIndex * 0.03,
                            type: "spring",
                            bounce: 0.2,
                          }}
                          className="group/task w-full p-4 rounded-xl bg-white/70 backdrop-blur-xl 
                                    border border-white/30 
                                    shadow-[0_4px_14px_rgba(0,0,0,0.08)] 
                                    hover:shadow-[0_10px_30px_rgba(0,0,0,0.15)] 
                                    hover:border-indigo-200/60 hover:-translate-y-1 
                                    transition-all duration-300 relative overflow-hidden hover:bg-white/90"
                        >
                          {/* shimmer */}
                          <div className=" inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 opacity-0 group-hover/task:opacity-100 transition duration-500 transform -translate-x-full group-hover/task:translate-x-full" />

                          <div className="relative z-10 flex flex-col gap-2">
                            {/* 🔹 Top Row */}
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-semibold text-sm text-slate-900 leading-snug line-clamp-2">
                                {task.description}
                              </h4>

                              {/* Frequency badge */}
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0 font-medium">
                                {task.frequency}
                              </span>
                            </div>

                            {/* 🔹 Assignee */}
                            <div className="flex flex-row justify-between gap-1 text-xs text-slate-600">
                              {/* Assigned To */}
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span className="font-medium">
                                  {task.assignedTo?.name || "Unassigned"}
                                </span>
                              </div>

                              {/* Assigned By */}
                              <div className="text-[11px] text-slate-400 ml-4">
                                Assigned by:{" "}
                                {task.fmsTaskId?.assignedBy?.name || "-"}
                              </div>
                            </div>

                            {/* 🔹 Department (NEW useful info) */}
                            <div className="text-[11px] text-slate-500">
                              Dept: {task.departmentOfAssignToUser?.name || "-"}
                            </div>
                            {/* 🔹 Checklist Preview */}
                            {task.checklist?.length > 0 && (
                              <div className="mt-2">
                                <div className="text-[11px] text-slate-500 mb-1">
                                  Checklist:{" "}
                                  <span className="font-semibold text-slate-700">
                                    {
                                      task.checklist.filter((c) => c.completed)
                                        .length
                                    }
                                    /{task.checklist.length}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-1 max-h-20 overflow-y-auto pr-1 scrollbar-thin">
                                  {task.checklist.map((item) => (
                                    <div
                                      key={item._id}
                                      className="flex items-center gap-1 text-[11px]"
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          item.completed
                                            ? "bg-emerald-500"
                                            : "bg-slate-300"
                                        }`}
                                      />
                                      <span
                                        className={
                                          item.completed
                                            ? "line-through text-slate-400"
                                            : "text-slate-600"
                                        }
                                      >
                                        {item.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* 🔹 Form Data */}
                            {task.createdForm?.length > 0 && (
                              <div className="mt-2 p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                                {/* Header */}
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[11px] font-semibold text-indigo-700">
                                    Form Data
                                  </span>

                                  {/* Filled count */}
                                  <span className="text-[10px] text-indigo-500">
                                    {
                                      task.createdForm.filter((f) => {
                                        const val =
                                          task.formData?.[f.fieldName];
                                        return (
                                          val !== undefined &&
                                          val !== null &&
                                          val !== ""
                                        );
                                      }).length
                                    }
                                    /{task.createdForm.length}
                                  </span>
                                </div>

                                {/* Scrollable fields */}
                                <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                                  {task.createdForm.map((field, i) => {
                                    const value =
                                      task.formData?.[field.fieldName];

                                    const isFilled =
                                      value !== undefined &&
                                      value !== null &&
                                      value !== "";

                                    return (
                                      <div
                                        key={i}
                                        className="flex justify-between gap-2 text-[11px]"
                                      >
                                        {/* Field Name */}
                                        <span className="text-slate-500 truncate">
                                          {field.fieldName}
                                        </span>

                                        {/* Value */}
                                        <span
                                          className={`font-medium text-right truncate max-w-[120px] ${
                                            isFilled
                                              ? "text-slate-700"
                                              : "text-slate-400 italic"
                                          }`}
                                        >
                                          {formatFieldValue(field, value)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 🔹 Bottom Row */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 text-[11px] text-slate-800">
                              <div className="flex flex-col">
                                <span className="font-mono">{task.taskId}</span>

                                {task.dependentOn && (
                                  <span className="text-orange-600">
                                    Depends on: {task.dependentOn}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col items-end">
                                <span>
                                  Start:{" "}
                                  {task.plannedStartDate
                                    ? new Date(
                                        task.plannedStartDate,
                                      ).toLocaleString([], {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "--"}
                                </span>

                                <span>
                                  Due:{" "}
                                  {task.plannedDueDate
                                    ? new Date(
                                        task.plannedDueDate,
                                      ).toLocaleString([], {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "--"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Empty */}
                    {columnTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div
                          className={`w-13 h-13 mb-4 p-4 rounded-3xl bg-gradient-to-r ${col.iconBg} flex items-center justify-center`}
                        >
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-slate-400 font-medium">
                          No tasks yet
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
