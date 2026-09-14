import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../../context/SocketContext";
import {
  completeFMSTask,
  exportMyFMSTasks,
  fetchMyTasks,
  fetchTaskCounts,
  getFilterFMSTasks,
  getMyFMSTaskStats,
  updateFMSTaskChecklistItems,
  updateMyTaskChecklistItems,
  updateMyTaskFormData,
} from "../../redux/slices/myTask/myTaskSlice";
import api from "../../lib/api";
import { toast } from "sonner";
import Cookies from "js-cookie";

import {
  Plus,
  CheckCircle,
  Upload,
  FileText,
  Search,
  Clock,
  CheckCircle2,
  ClipboardList,
  RefreshCcw,
  AlertCircle,
  Download,
  FormInputIcon,
  ListChecks,
  RotateCcw,
  Calendar,
  Activity,
  PauseCircle,
  StopCircle,
  XCircle,
  MessageCircle,
  MessageSquarePlus,
  Eye,
  Lock,
  GitBranch,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import * as XLSX from "xlsx";
import { formatDate, formatLabel, getDueStatus } from "../../lib/utilFunctions";
import ViewLink from "./attachmentViewer";
import { useDebounce } from "../../lib/debounce";
import {
  DatePicker,
  Popover,
  Modal as AntdModal,
  Descriptions,
  Modal,
} from "antd";
const { RangePicker } = DatePicker;
import * as Yup from "yup";
import { useFormik } from "formik";
import RaiseQueryModal from "../../components/RaiseQueryModal";
import QueryDrawer from "../../components/QueryDrawer";
import TaskChat from "../../components/TaskChat";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { FileTextOutlined } from "@ant-design/icons";
import { Textarea } from "../../components/ui";
import PublicOpenForm from "../public-form/PublicOpenForm";
import dayjs from "dayjs";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

// --- Helper: Status Badge ---
const getStatusBadge = (status) => {
  switch (status) {
    case "Overdue":
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </Badge>
      );

    case "Due Today":
    case "Delayed":
      return (
        <Badge className="flex items-center gap-1 text-yellow-600 border-yellow-300 bg-yellow-50">
          <Clock className="h-3 w-3" />
          {status}
        </Badge>
      );

    case "Completed":
      return (
        <Badge className="flex items-center gap-1 text-green-600 border-green-300 bg-green-50">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );

    case "Pending":
      return (
        <Badge className="flex items-center gap-1 text-blue-600 border-blue-300 bg-blue-50">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );

    case "Upcoming":
      return (
        <Badge className="flex items-center gap-1 text-indigo-600 border-indigo-300 bg-indigo-50">
          <Calendar className="h-3 w-3" />
          Upcoming
        </Badge>
      );

    case "Ongoing":
    case "InProcess":
      return (
        <Badge className="flex items-center gap-1 text-cyan-600 border-cyan-300 bg-cyan-50">
          <Activity className="h-3 w-3" />
          In Process
        </Badge>
      );

    case "Onhold":
      return (
        <Badge className="flex items-center gap-1 text-orange-600 border-orange-300 bg-orange-50">
          <PauseCircle className="h-3 w-3" />
          On Hold
        </Badge>
      );

    case "Stopped":
      return (
        <Badge className="flex items-center gap-1 text-red-600 border-red-300 bg-red-50">
          <StopCircle className="h-3 w-3" />
          Stopped
        </Badge>
      );

    case "Cancelled":
      return (
        <Badge className="flex items-center gap-1 text-gray-600 border-gray-300 bg-gray-100">
          <XCircle className="h-3 w-3" />
          Cancelled
        </Badge>
      );
    case "Not Done":
      return (
        <Badge className="flex items-center gap-1 text-rose-600 border-rose-300 bg-rose-50">
          <XCircle className="h-3 w-3" />
          Not Done
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// --- Helper: Action Buttons ---
const TaskActions = ({
  task,
  onChecklist,
  onToggleComplete,
  handleNotDoneClick,
  handleCompleteClick,
  setSelectedQueryTask,
  setQueryDrawerOpen,
  setRaiseQueryModalOpen,
  unreadCount,
  setUnreadMap,
  assignedByUser,
  assignedToUser,
  setSubmissionModalOpen,
  setSelectedSubmissionTask,
}) => {
  const isCompleted = task.status === "Completed";
  const notDone = task.status === "Not Done";
  const upComing = task.status == "Upcoming";
  const onHold = task.status == "Onhold";
  const stopped = task.status == "Stopped";
  const isFms = task.taskType == "FmsInstanceTask";
  const isWaitingForParent = Boolean(task?.waitingForParent);
  return (
    <div className="flex gap-1">
      {/* Checklist Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600 hover:bg-gray-50"
            onClick={() => onChecklist(task)}
            disabled={
              !task.checklist ||
              task.checklist.length === 0 ||
              onHold ||
              stopped
            }
          >
            <ClipboardList className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>View Checklist</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600 hover:bg-gray-50"
            onClick={() => handleCompleteClick(task)}
            disabled={
              !task.createdForm ||
              task.createdForm.length === 0 ||
              onHold ||
              stopped
            }
          >
            <ListChecks className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>View Form</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={!isFms || !task?.submissionData}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
            onClick={() => {
              setSelectedSubmissionTask(task);
              setSubmissionModalOpen(true);
            }}
          >
            <FileTextOutlined />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>View Submissions</p>
        </TooltipContent>
      </Tooltip>

      {/* Complete Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              disabled={
                upComing ||
                onHold ||
                stopped ||
                isCompleted ||
                notDone ||
                isWaitingForParent
              }
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:bg-green-50"
              onClick={() => onToggleComplete(task)}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isWaitingForParent
              ? "Waiting for parent task completion"
              : "Mark as Done"}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Not Done Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              disabled={
                upComing ||
                onHold ||
                stopped ||
                isCompleted ||
                notDone ||
                isWaitingForParent
              }
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:bg-red-50"
              onClick={() => handleNotDoneClick(task)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isWaitingForParent
              ? "Waiting for parent task completion"
              : "Mark as Not Done"}
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Button
              disabled={assignedByUser?._id === assignedToUser?._id || notDone}
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
              onClick={() => {
                setSelectedQueryTask(task);
                setQueryDrawerOpen(true);

                setUnreadMap((prev) => ({
                  ...prev,
                  [task.conversationId]: 0,
                }));
              }}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full shadow">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Open Conversation</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={assignedByUser?._id === assignedToUser?._id || notDone}
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 transition-all duration-200"
            onClick={() => {
              setSelectedQueryTask(task);
              setRaiseQueryModalOpen(true);
            }}
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Raise Query</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

const getFieldKey = (fieldName) =>
  fieldName.replace(/[.[\]]/g, "_").replace(/\s+/g, "_");

const buildValidationSchema = (fields) => {
  const shape = {};

  fields.forEach((field) => {
    let validator;

    switch (field.fieldType) {
      case "email":
        validator = Yup.string().email("Invalid email");
        break;

      case "number":
        validator = Yup.number().typeError("Must be a number");
        break;

      case "checkbox":
        validator = Yup.boolean();
        break;

      case "date":
        validator = Yup.date().typeError("Invalid date");
        break;

      default:
        validator = Yup.string().trim();
    }

    if (field.isMandatory) {
      validator = validator.required(
        `${formatLabel(field.fieldName)} is required`,
      );
    }

    shape[getFieldKey(field.fieldName)] = validator;
  });

  return Yup.object().shape(shape);
};

/* ------------------ Component ------------------ */
const FmsFormModal = ({
  open,
  onClose,
  task,
  onSubmit,
  initialValues,
  setRefreshUI,
}) => {
  const formatLabel = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  useEffect(() => {
    if (open) {
      formik.resetForm({
        values: initialValues,
      });
    }
  }, [task, open]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues,
    validationSchema: buildValidationSchema(task?.createdForm || []),

    onSubmit: (values) => {
      const finalValues = {};

      task.createdForm.forEach((field) => {
        const key = getFieldKey(field.fieldName);
        finalValues[field.fieldName] = values[key];
      });

      onSubmit(finalValues);
      formik.resetForm({
        values: formik.values,
      });
      setRefreshUI((prev) => !prev);
    },
  });

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-[480px] max-h-[80vh] overflow-y-auto border">
        <div className="px-5 py-3 border-b">
          <h2 className="text-base font-semibold text-gray-800">
            Fill Task Form
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {task.createdForm.map((field, index) => {
            const key = getFieldKey(field.fieldName);

            return (
              <div key={index}>
                <label className="block text-sm text-gray-700 mb-1">
                  {formatLabel(field.fieldName)}
                  {field.isMandatory && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                {["text", "email"].includes(field.fieldType) && (
                  <input
                    type={field.fieldType}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    {...formik.getFieldProps(key)}
                  />
                )}

                {field.fieldType === "number" && (
                  <input
                    type="number"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    {...formik.getFieldProps(key)}
                  />
                )}

                {field.fieldType === "textarea" && (
                  <textarea
                    rows={3}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    {...formik.getFieldProps(key)}
                  />
                )}

                {field.fieldType === "dropdown" && (
                  <Select
                    value={formik.values[key] || ""}
                    onValueChange={(value) => formik.setFieldValue(key, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={`Select ${formatLabel(field.fieldName)}`}
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {field.options?.map((opt, i) => (
                        <SelectItem key={i} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.fieldType === "checkbox" && (
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={formik.values[key] || false}
                      onChange={(e) =>
                        formik.setFieldValue(key, e.target.checked)
                      }
                    />
                  </div>
                )}

                {field.fieldType === "date" && (
                  <input
                    type="date"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    {...formik.getFieldProps(field.fieldName)}
                  />
                )}

                {formik.touched[key] && formik.errors[key] && (
                  <p className="text-red-500 text-xs mt-1">
                    {formik.errors[key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm border rounded-md text-gray-700"
          >
            Cancel
          </button>

          {task.status != "Completed" && (
            <button
              onClick={formik.handleSubmit}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Helper: Pagination ---
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
    <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4 px-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 w-50">Rows per page:</span>
        <Select
          value={String(itemsPerPage)}
          onValueChange={(val) => {
            setItemsPerPage(Number(val));
            onPageChange(1);
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[70px] h-8 bg-white">
            <SelectValue placeholder={itemsPerPage} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700 font-medium mr-2">
          Page <span className="font-bold">{currentPage}</span> of{" "}
          <span className="font-bold">{totalPages || 1}</span>
        </span>
        <Button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isLoading}
          variant="outline"
          size="sm"
          className="h-8"
        >
          Previous
        </Button>
        <Button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || isLoading}
          variant="outline"
          size="sm"
          className="h-8"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

// --- Helper: Stats Cards ---
const StatsCards = ({ counts, selectedStat, onStatClick }) => {
  const getCardClass = (type, color) => `
    cursor-pointer transition-all duration-200 transform hover:scale-105
    ${selectedStat === type ? `ring-2 ring-${color}-500 shadow-lg scale-105` : ""}
  `;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <Card
        className={`${getCardClass("total", "blue")} bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200`}
        onClick={() => onStatClick("total")}
      >
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Tasks</p>
              <p className="text-2xl font-bold text-blue-700">{counts.total}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className={`${getCardClass("pending", "yellow")} bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200`}
        onClick={() => onStatClick("pending")}
      >
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">Pending</p>
              <p className="text-2xl font-bold text-yellow-800">
                {counts.pending}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-700" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className={`${getCardClass("overdue", "red")} bg-gradient-to-br from-red-50 to-red-100 border-red-200`}
        onClick={() => onStatClick("overdue")}
      >
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Overdue</p>
              <p className="text-2xl font-bold text-red-700">
                {counts.overdue}
              </p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className={`${getCardClass("completed", "green")} bg-gradient-to-br from-green-50 to-green-100 border-green-200`}
        onClick={() => onStatClick("completed")}
      >
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-700">
                {counts.completed}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Helper: Filter Bar ---
const FilterBar = ({
  searchTerm,
  setSearchTerm,
  selectedFilterTaskType,
  setSelectedFilterTaskType,
  selectedFilterStatus,
  onFilterStatusChange, // 🟢 SYNCHRONIZED DROPDOWN CHANGE
  showExport = false,
  onExport,
  isExporting,
  selectedStatFilter,
  dateRange,
  setDateRange,
  isDoThisEnable,
  isFMSEnable,
}) => (
  <div className="flex flex-col md:flex-row gap-3 mb-1 p-4 bg-gray-50 rounded-lg border">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Search by Task ID or Title..."
        className="pl-10 bg-white"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
    <div>
      <RangePicker
        value={dateRange}
        onChange={(dates) => setDateRange(dates)}
        format="DD MMM YYYY"
        style={{ height: "36px" }}
      />
    </div>

    <div className="flex flex-col sm:flex-row gap-2 flex-1">
      <Select
        value={selectedFilterStatus}
        onValueChange={onFilterStatusChange} // 🟢 SYNCHRONIZED DROPDOWN CHANGE
      >
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="Not Done">Not Done</SelectItem>
          <SelectItem value="Overdue">Overdue</SelectItem>
          <SelectItem value="Delayed">Delayed</SelectItem>
          {isFMSEnable && <SelectItem value="Stopped">Stopped</SelectItem>}
        </SelectContent>
      </Select>
    </div>

    {showExport && (
      <Button
        className="bg-gray-800 hover:bg-gray-900 text-white whitespace-nowrap"
        onClick={onExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> Exporting...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" /> Export CSV
          </>
        )}
      </Button>
    )}
  </div>
);

// --- Helper: Main Table (Crash-Proof & Dynamic) ---
const TodayTasksTable = ({
  tasks,
  upcomingRecurringTasks,
  onChecklist,
  onToggleComplete,
  handleNotDoneClick,
  onViewDescription,
  currentPage,
  itemsPerPage,
  allUsers,
  handleCompleteClick,
  setSelectedQueryTask,
  setQueryDrawerOpen,
  setRaiseQueryModalOpen,
  unreadMap,
  setUnreadMap,
  setSubmissionModalOpen,
  setSelectedSubmissionTask,
  canUpdate,
}) => {
  const combinedTasks = useMemo(
    () => [...(tasks || []), ...(upcomingRecurringTasks || [])],
    [tasks, upcomingRecurringTasks],
  );

  const tableColumns = useMemo(() => {
    const columnsMap = new Map();

    combinedTasks.forEach((task) => {
      if (task?.submissionData && typeof task.submissionData === "object") {
        Object.entries(task.submissionData).forEach(([key, field]) => {
          if (field && typeof field === "object") {
            if (field.isTableColumn === true) {
              const columnLabel = field.label || formatLabel(key);
              columnsMap.set(key, {
                label: columnLabel,
                fieldType: field.fieldType,
              });
            }
          }
        });
      }
    });

    return Array.from(columnsMap.entries());
  }, [combinedTasks]);

  const renderCellValue = (val, fieldType) => {
    if (val === null || val === undefined || val === "") return "-";

    if (typeof val === "boolean") return val ? "Yes" : "No";

    if (fieldType === "date" && val) {
      const parsedDate = dayjs(val);
      return parsedDate.isValid()
        ? parsedDate.format("DD MMM YYYY")
        : String(val);
    }

    if (typeof val === "object") {
      if (val instanceof Date) return dayjs(val).format("DD MMM YYYY");

      if (Array.isArray(val)) {
        return val.length > 0
          ? val
              .map((item) =>
                typeof item === "object" ? JSON.stringify(item) : String(item),
              )
              .join(", ")
          : "-";
      }

      try {
        return JSON.stringify(val);
      } catch {
        return "[Object]";
      }
    }

    return String(val);
  };

  return (
    <div className="overflow-x-auto border rounded-lg bg-white">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead>Sr. No.</TableHead>
            <TableHead>Task Title</TableHead>
            {tableColumns.map(([key, colMeta]) => (
              <TableHead
                key={key}
                className="font-semibold text-blue-700 whitespace-nowrap"
              >
                {colMeta.label}
              </TableHead>
            ))}
            <TableHead>Description</TableHead>
            <TableHead>Due Date & Time</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Time Left</TableHead>
            <TableHead>Status</TableHead>
            {canUpdate && <TableHead>Actions</TableHead>}{" "}
          </TableRow>
        </TableHeader>

        <TableBody>
          {combinedTasks.length > 0 ? (
            combinedTasks.map((task, index) => {
              const assignedByUser =
                allUsers?.find(
                  (u) => String(u._id) === String(task?.assignedBy?._id),
                ) || null;

              const assignedToUser =
                allUsers?.find(
                  (u) => String(u._id) === String(task?.assignedTo?._id),
                ) || null;

              return (
                <React.Fragment key={task?._id || index}>
                  <TableRow
                    className={`
                      ${task?.isOverdue ? "bg-red-50" : ""}
                      ${task?.isReopen ? "bg-yellow-50 border-l-4 border-yellow-500" : ""}
                    `}
                  >
                    <TableCell>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>

                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{task?.title || "-"}</span>

                          {task?.isReopen && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                              <RotateCcw className="h-3 w-3" />
                              Reopened
                            </span>
                          )}
                        </div>

                        {task?.reopenedReason && (
                          <div>
                            <Popover
                              trigger="click"
                              placement="topLeft"
                              content={
                                <div className="w-[280px] space-y-3">
                                  <div className="flex items-center gap-2 border-b pb-2">
                                    <div className="p-1.5 rounded-full bg-yellow-100">
                                      <RotateCcw className="h-4 w-4 text-yellow-700" />
                                    </div>

                                    <div>
                                      <h4 className="font-semibold text-sm">
                                        Reopened Task
                                      </h4>

                                      <p className="text-xs text-gray-500">
                                        {task?.reopenedAt
                                          ? formatDate(task.reopenedAt)
                                          : "-"}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">
                                      Reason
                                    </p>

                                    <div className="text-sm bg-gray-50 border rounded-lg p-3 whitespace-pre-wrap break-words text-gray-700">
                                      {task.reopenedReason}
                                    </div>
                                  </div>

                                  {task?.reopenedBy?.name && (
                                    <div className="text-xs text-gray-500">
                                      Reopened By:
                                      <span className="ml-1 font-medium text-gray-700">
                                        {task.reopenedBy.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              }
                            >
                              <button className="text-[11px] text-blue-600 cursor-pointer hover:text-blue-800 hover:underline">
                                View Reason
                              </button>
                            </Popover>
                          </div>
                        )}

                        {task?.isReopen && task?.reopenedAt && (
                          <span className="text-[11px] text-gray-500">
                            Reopened on {formatDate(task.reopenedAt)}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {tableColumns.map(([key, colMeta]) => {
                      const rawData = task?.submissionData?.[key];

                      let cellVal = "-";
                      if (rawData && typeof rawData === "object") {
                        cellVal =
                          rawData.value !== undefined ? rawData.value : "-";
                      } else if (rawData !== undefined && rawData !== null) {
                        cellVal = rawData;
                      }

                      return (
                        <TableCell
                          key={key}
                          className="whitespace-nowrap font-medium text-gray-700"
                        >
                          {renderCellValue(cellVal, colMeta.fieldType)}
                        </TableCell>
                      );
                    })}

                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-blue-600"
                        onClick={() => onViewDescription(task)}
                        disabled={!task?.description}
                      >
                        View
                      </Button>
                    </TableCell>

                    <TableCell>
                      {task?.dueDate ? formatDate(task.dueDate) : "-"}
                    </TableCell>
                    <TableCell>{task?.frequency ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        if (task?.status === "Completed") return "-";

                        if (task?.status === "Not Done") {
                          return (
                            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
                              <Lock className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-xs font-semibold text-slate-700">
                                  Tracking Closed
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Marked as Not Done
                                </p>
                              </div>
                            </div>
                          );
                        }

                        const dueStatus = getDueStatus(task?.dueDate);

                        if (!dueStatus) return "-";
                        return (
                          <div
                            className={`relative inline-flex items-center overflow-hidden rounded-lg border bg-white px-3 py-2 shadow-sm
                              transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
                              ${
                                dueStatus.type === "overdue"
                                  ? "border-l-4 border-l-red-500"
                                  : dueStatus.type === "today"
                                    ? "border-l-4 border-l-amber-500"
                                    : "border-l-4 border-l-emerald-500"
                              }`}
                          >
                            <div className="mr-3 relative flex h-3 w-3 items-center justify-center">
                              {(dueStatus.type === "overdue" ||
                                dueStatus.type === "today" ||
                                dueStatus.type === "upcoming") && (
                                <span
                                  className={`absolute inline-flex h-full w-full rounded-full opacity-75
                                    ${
                                      dueStatus.type === "overdue"
                                        ? "bg-red-500 animate-ping"
                                        : dueStatus.type === "today"
                                          ? "bg-amber-500 animate-ping"
                                          : "bg-emerald-500 animate-ping"
                                    }`}
                                />
                              )}

                              <span
                                className={`relative inline-flex h-3 w-3 rounded-full
                                  ${
                                    dueStatus.type === "overdue"
                                      ? "bg-red-500"
                                      : dueStatus.type === "today"
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                  }`}
                              />
                            </div>

                            <div>
                              <p
                                className={`text-xs font-semibold
                                  ${
                                    dueStatus.type === "overdue"
                                      ? "text-red-700"
                                      : dueStatus.type === "today"
                                        ? "text-amber-700"
                                        : "text-emerald-700"
                                  }`}
                              >
                                {dueStatus.label}
                              </p>

                              <p className="text-[11px] text-muted-foreground">
                                {dueStatus.text}
                              </p>
                            </div>

                            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
                              <span className="absolute -left-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-all duration-700 hover:left-full" />
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(task?.status)}{" "}
                        {task?.status === "Not Done" && task?.notDoneRemark && (
                          <div>
                            <Popover
                              trigger="click"
                              placement="topLeft"
                              content={
                                <div className="w-[300px] space-y-3">
                                  <div className="flex items-center gap-2 border-b pb-2">
                                    <div className="p-2 rounded-full bg-rose-100">
                                      <XCircle className="h-4 w-4 text-rose-600" />
                                    </div>

                                    <div>
                                      <h4 className="font-semibold text-sm">
                                        Task Marked as Not Done
                                      </h4>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">
                                      Remark
                                    </p>

                                    <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                                      {task.notDoneRemark}
                                    </div>
                                  </div>

                                  {task?.notDoneBy?.name && (
                                    <div className="border-t pt-2 text-xs text-gray-500">
                                      Marked by{" "}
                                      <span className="font-semibold text-gray-800">
                                        {task.notDoneBy.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              }
                            >
                              <button className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline">
                                <Eye className="h-5 w-5 cursor-pointer" />
                              </button>
                            </Popover>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {canUpdate && (
                      <TableCell>
                        <div className="flex items-center">
                          <TaskActions
                            task={task}
                            onChecklist={onChecklist}
                            onToggleComplete={onToggleComplete}
                            handleNotDoneClick={handleNotDoneClick}
                            handleCompleteClick={handleCompleteClick}
                            setSelectedQueryTask={setSelectedQueryTask}
                            setQueryDrawerOpen={setQueryDrawerOpen}
                            setRaiseQueryModalOpen={setRaiseQueryModalOpen}
                            unreadCount={unreadMap[task?.conversationId] || 0}
                            setUnreadMap={setUnreadMap}
                            assignedByUser={assignedByUser}
                            assignedToUser={assignedToUser}
                            setSubmissionModalOpen={setSubmissionModalOpen}
                            setSelectedSubmissionTask={
                              setSelectedSubmissionTask
                            }
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                </React.Fragment>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={8 + tableColumns.length}
                className="text-center py-8 text-gray-500"
              >
                No tasks found for this filter
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

// --- MAIN COMPONENT ---
const FmsTasks = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const currentUser = useSelector((state) => state.users.currentUser);
  const source = location.state?.source;
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canRead, canUpdate } = getSubmodulePermissions(
    permissions,
    "fms_tasks",
    isSuper,
  );
  if (location.pathname !== "/") {
    const redirectPath = location.pathname + location.search + location.hash;
    localStorage.setItem("redirectAfterLogin", redirectPath);
  }

  const taskId = searchParams.get("taskId");
  const {
    tasks: fetchedTasks,
    upcomingRecurringTasks,
    taskCounts,
    status,
    error,
    totalTasks,
  } = useSelector((state) => state.myTasks);

  const fetchTaskById = async () => {
    try {
      const res = await api.get(`/tasks/${taskId}`);
      const task = res.data.data || [];
      if (!task) return;

      const currentUserId = currentUser?._id?.toString();
      const assignedToId =
        task?.assignedTo?._id?.toString() || task?.assignedTo?.id?.toString();

      const hasAccess = currentUserId === assignedToId;
      if (!hasAccess) return;

      setSelectedQueryTask(task);
      setQueryDrawerOpen(true);

      if (task?.conversationId) {
        setUnreadMap((prev) => ({
          ...prev,
          [task.conversationId]: 0,
        }));
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    fetchTaskById();
  }, [taskId, currentUser]);

  // UI State
  const [activeTab, setActiveTab] = useState("today");
  const [configOpen, setConfigOpen] = useState(false);
  const { isConnected, socket, events } = useSocket();
  const [unreadMap, setUnreadMap] = useState({});

  useEffect(() => {
    if (!socket) return;

    socket.on("unread-count", ({ conversationId, count }) => {
      setUnreadMap((prev) => ({
        ...prev,
        [conversationId]: count,
      }));
    });

    return () => {
      socket.off("unread-count");
    };
  }, [socket]);

  const [selectedStatFilter, setSelectedStatFilter] = useState(null);
  useEffect(() => {
    if (!source) return;
    setSelectedStatFilter(source);
  }, [source]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilterTaskType, setSelectedFilterTaskType] = useState("all");
  const [selectedFilterStatus, setSelectedFilterStatus] = useState("all");

  // 🟢 BIDIRECTIONAL SYNCHRONIZATION: DROPDOWN SELECT -> STATS CARD SELECTION
  const handleDropdownStatusChange = (val) => {
    setSelectedFilterStatus(val);
    setLocalCurrentPage(1);

    switch (val) {
      case "Pending":
        setSelectedStatFilter("pending");
        break;
      case "Completed":
        setSelectedStatFilter("completed");
        setActiveTab("completed");
        break;
      case "Overdue":
        setSelectedStatFilter("overdue");
        setActiveTab("today");
        break;
      case "all":
      default:
        setSelectedStatFilter("total");
        break;
    }
  };

  // Pagination States
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localItemsPerPage, setLocalItemsPerPage] = useState(10);

  // Dialog States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [fullDescription, setFullDescription] = useState("");
  const [selectedTaskForChecklist, setSelectedTaskForChecklist] =
    useState(null);
  const [checklistItems, setChecklistItems] = useState([]);

  // Decision Step Dialog States
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = useState(false);
  const [decisionTask, setDecisionTask] = useState(null);
  const [decisionChoice, setDecisionChoice] = useState(null);
  const [decisionRemark, setDecisionRemark] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // OpenForm Dialog States
  const [linkedFormModalOpen, setLinkedFormModalOpen] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);

  // Edit Form States
  const [editTitle, setEditTitle] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [isFetching, setIsFetching] = useState(false);
  const [dateRange, setDateRange] = useState([]);
  const [refetch, setRefetch] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [notDoneModalOpen, setNotDoneModalOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [queryDrawerOpen, setQueryDrawerOpen] = useState(false);
  const [selectedQueryTask, setSelectedQueryTask] = useState(null);
  const [raiseQueryModalOpen, setRaiseQueryModalOpen] = useState(false);
  const [refreshTaskAfterReopen, setRefreshTaskAfterReopen] = useState(false);
  const [refreshUI, setRefreshUI] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [selectedSubmissionTask, setSelectedSubmissionTask] = useState(null);

  useEffect(() => {
    if (currentUser?._id) {
      dispatch(fetchTaskCounts(currentUser._id));
    }
  }, [currentUser, dispatch, refetch]);

  const [allUsers, setAllUsers] = useState([]);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/setup/users/allUsers");
        const users = response.data?.data || [];
        setAllUsers(users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast.error("Could not load users.");
      }
    };

    if (currentUser?._id) {
      fetchUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    setLocalCurrentPage(1);
  }, [
    activeTab,
    selectedStatFilter,
    selectedFilterStatus,
    selectedFilterTaskType,
    debouncedSearch,
    dateRange,
  ]);

  useEffect(() => {
    let mounted = true;
    if (currentUser?._id) {
      setIsFetching(true);
      dispatch(
        getMyFMSTaskStats({
          userId: currentUser._id,
          role: currentUser.role?.name,
        }),
      );
      dispatch(
        getFilterFMSTasks({
          userId: currentUser._id,
          role: currentUser.role?.name,
          page: localCurrentPage,
          limit: localItemsPerPage,
          dateRange,
          search: debouncedSearch || undefined,
          filters: {
            stat: selectedStatFilter || null,
            taskCategory: selectedStatFilter
              ? null
              : activeTab === "today"
                ? "today_backlog"
                : activeTab === "upcoming"
                  ? "upcoming"
                  : activeTab === "completed"
                    ? "completed"
                    : null,
            taskType:
              selectedFilterTaskType === "all" ? null : selectedFilterTaskType,
            status:
              selectedFilterStatus === "all" ? null : selectedFilterStatus,
          },
        }),
      )
        .catch(() => {})
        .finally(() => {
          if (mounted) setIsFetching(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [
    currentUser,
    dispatch,
    activeTab,
    selectedStatFilter,
    selectedFilterStatus,
    selectedFilterTaskType,
    localCurrentPage,
    localItemsPerPage,
    debouncedSearch,
    dateRange,
    refetch,
    refreshUI,
  ]);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const response = await dispatch(
        exportMyFMSTasks({
          userId: currentUser._id,
          dateRange,
          search: debouncedSearch || undefined,
          filters: {
            stat: selectedStatFilter || null,
            taskCategory: selectedStatFilter
              ? null
              : activeTab === "today"
                ? "today_backlog"
                : activeTab === "upcoming"
                  ? "upcoming"
                  : activeTab === "completed"
                    ? "completed"
                    : null,
            taskType:
              selectedFilterTaskType === "all" ? null : selectedFilterTaskType,
            status:
              selectedFilterStatus === "all" ? null : selectedFilterStatus,
          },
        }),
      ).unwrap();

      const filteredData = response?.data || [];

      if (!filteredData.length) {
        toast.warning("No data to export");
        return;
      }

      const dataToExport = filteredData.map((task, index) => ({
        "Sr. No.": index + 1,
        "Task ID": task?.TaskId || "-",
        "Task Title": task?.title || "-",
        Description: task?.description || "-",
        Type: task?.taskType || "-",
        Frequency: task?.frequency || "-",
        Status: task?.status || "-",
        Source: task?.assignedBy?.name || "Self",
        Assignee: task?.assignedTo?.name || "-",
        Department: task?.departmentOfAssignToUser?.name || "-",
        Attachment: task?.attachmentFile?.length > 0 ? "Yes" : "No",
        "Checklist Count": task?.checklist?.length || 0,
        "Start Date": task?.startDate
          ? new Date(task.startDate).toLocaleDateString()
          : "-",
        "Due Date": task?.dueDate
          ? new Date(task.dueDate).toLocaleDateString()
          : "-",
        Delay: task?.delay || "-",
        "Created At": task?.createdAt
          ? new Date(task.createdAt).toLocaleString()
          : "-",
        "Updated At": task?.updatedAt
          ? new Date(task.updatedAt).toLocaleString()
          : "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "My Tasks");
      const timestamp = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `MyTasks_${timestamp}.xlsx`);

      toast.success("Export completed successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error?.message || "Failed to export tasks");
    } finally {
      setIsExporting(false);
    }
  };

  // 🟢 BIDIRECTIONAL SYNCHRONIZATION: STATS CARD CLICK -> DROPDOWN SELECTION
  const handleStatClick = (statType) => {
    setSelectedStatFilter(statType);
    setLocalCurrentPage(1);
    setSearchTerm("");

    if (statType === "overdue") {
      setSelectedFilterStatus("Overdue");
      setActiveTab("today");
    } else if (statType === "completed") {
      setSelectedFilterStatus("Completed");
      setActiveTab("completed");
    } else if (statType === "pending") {
      setSelectedFilterStatus("Pending");
      setActiveTab("today");
    } else {
      setSelectedFilterStatus("all");
      setSelectedFilterTaskType("all");
      setActiveTab("today");
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSelectedStatFilter(null);
    setSelectedFilterStatus("all");
    setLocalCurrentPage(1);
    setSearchTerm("");
  };

  const handleToggleComplete = async (task) => {
    if (task?.waitingForParent) {
      toast.warning(
        "Cannot complete task: Waiting for parent task to be completed first.",
      );
      return;
    }
    Modal.confirm({
      title: `Confirm Completion`,
      content: `Are you sure you want to mark this task as completed?`,
      okText: "Yes",
      cancelText: "No",
      centered: true,
      onOk: async () => {
        executeStandardCompletion(task);
      },
    });
  };

  const executeStandardCompletion = async (task) => {
    setRefreshUI(true);
    const newStatus = task.status !== "Completed";
    const isFMSTask = task.taskType === "FmsInstanceTask";

    try {
      if (!isFMSTask) {
        await api.patch(`/tasks/${task._id || task.id}/completion`, {
          completeStatus: newStatus,
        });
      } else {
        await dispatch(
          completeFMSTask({
            id: task.fmsInstanceId,
            taskId: task.TaskId || task.taskId,
            status: newStatus,
          }),
        ).unwrap();
      }

      toast.success("Task Completed Successfully");
    } catch (error) {
      console.error("COMPLETE TASK ERROR:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update status";

      toast.error(errorMessage);
    } finally {
      setRefreshUI(false);
    }
  };

  const handleNotDoneClick = async (task) => {
    if (task?.waitingForParent) {
      toast.warning(
        "Cannot update status: Waiting for parent task to be completed first.",
      );
      return;
    }
    setSelectedTask(task);
    try {
      const res = await api.get(
        `/fms-decision/${task._id || task.id}/decision-info`,
      );
      const decisionData = res.data?.data;

      if (decisionData?.hasDecision) {
        setDecisionTask({
          ...task,
          decisionYesAction: decisionData.decisionYesAction,
          triggerFmsTemplate: decisionData.triggerFmsTemplate,
          linkedForm: decisionData.linkedForm,
        });
        setDecisionChoice(null);
        setDecisionRemark("");
        setIsDecisionDialogOpen(true);
        return;
      }

      setRemark("");
      setNotDoneModalOpen(true);
    } catch (error) {
      console.error("Decision Info Check Error:", error);
      setRemark("");
      setNotDoneModalOpen(true);
    }
  };

  const executeDecisionApi = async (payload) => {
    setRefreshUI(true);
    setIsSubmittingDecision(true);
    try {
      const res = await api.post(
        `/fms-decision/${decisionTask._id || decisionTask.id}/decision`,
        {
          ...payload,
          status: "Not Done",
        },
      );

      if (res.data?.success) {
        toast.success(res.data.message || "Decision processed successfully.");

        if (res.data?.data?.alertMessage) {
          toast.warning(res.data.data.alertMessage);
        }
      }

      setIsDecisionDialogOpen(false);
      setDecisionTask(null);
      setDecisionChoice(null);
      setDecisionRemark("");
    } catch (error) {
      console.error("DECISION SUBMIT ERROR:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to process decision step.",
      );
    } finally {
      setIsSubmittingDecision(false);
      setRefreshUI(false);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!decisionChoice) {
      toast.error("Please select an option.");
      return;
    }

    if (!decisionRemark.trim()) {
      toast.error("Please enter a remark.");
      return;
    }

    if (
      decisionChoice === "yes" &&
      decisionTask?.decisionYesAction === "trigger_fms" &&
      decisionTask?.linkedForm
    ) {
      setIsDecisionDialogOpen(false);
      setLinkedFormModalOpen(true);
      return;
    }

    executeDecisionApi({
      answer: decisionChoice,
      remark: decisionRemark.trim(),
    });
  };

  const handleLinkedFormComplete = async ({ submissionId }) => {
    setLinkedFormModalOpen(false);

    await executeDecisionApi({
      answer: "yes",
      remark: decisionRemark.trim(),
      submissionId,
    });
  };

  const handleEditClick = (task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsEditOpen(false);
    toast.success("Task updated");
    dispatch(
      getFilterFMSTasks({
        userId: currentUser._id,
        role: currentUser.role?.name,
        page: localCurrentPage,
        limit: localItemsPerPage,
        search: debouncedSearch || undefined,
        filters: {
          stat: selectedStatFilter || null,
          taskCategory: selectedStatFilter
            ? null
            : activeTab === "today"
              ? "today_backlog"
              : activeTab === "upcoming"
                ? "upcoming"
                : activeTab === "completed"
                  ? "completed"
                  : null,
          taskType:
            selectedFilterTaskType === "all" ? null : selectedFilterTaskType,
          status: selectedFilterStatus === "all" ? null : selectedFilterStatus,
        },
      }),
    );
  };

  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/tasks/${taskToDelete._id}`);
      setIsDeleteOpen(false);
      toast.success("Deleted");
      dispatch(
        getFilterFMSTasks({
          userId: currentUser._id,
          role: currentUser.role?.name,
          page: localCurrentPage,
          limit: localItemsPerPage,
          search: debouncedSearch || undefined,
          filters: {
            stat: selectedStatFilter || null,
            taskCategory: selectedStatFilter
              ? null
              : activeTab === "today"
                ? "today_backlog"
                : activeTab === "upcoming"
                  ? "upcoming"
                  : activeTab === "completed"
                    ? "completed"
                    : null,
            taskType:
              selectedFilterTaskType === "all" ? null : selectedFilterTaskType,
            status:
              selectedFilterStatus === "all" ? null : selectedFilterStatus,
          },
        }),
      );
      dispatch(fetchTaskCounts(currentUser._id));
    } catch (e) {
      toast.error("Failed");
    }
  };

  const handleChecklistClick = (task) => {
    setSelectedTaskForChecklist(task);
    setChecklistItems(task.checklist || []);
    setIsChecklistDialogOpen(true);
  };

  const handleViewDescription = (desc) => {
    setFullDescription(desc);
    setIsDescriptionDialogOpen(true);
  };

  const handleChecklistToggle = async (task, taskID, index, currentValue) => {
    setRefetch(true);
    const isFMStask = task.taskType == "FmsInstanceTask";
    try {
      const updated = checklistItems.map((item, i) =>
        i === index ? { ...item, isCompleted: !currentValue } : item,
      );

      setChecklistItems(updated);

      if (!isFMStask) {
        await dispatch(
          updateMyTaskChecklistItems({
            id: taskID,
            index,
            completed: !currentValue,
          }),
        ).unwrap();
      } else {
        await dispatch(
          updateFMSTaskChecklistItems({
            id: task.fmsInstanceId,
            taskId: task.taskId,
            index,
            completed: !currentValue,
          }),
        ).unwrap();
      }
    } catch (err) {
      console.error(err);
      const reverted = checklistItems.map((item, i) =>
        i === index ? { ...item, isCompleted: currentValue } : item,
      );
      setChecklistItems(reverted);
    } finally {
      setRefetch(false);
    }
  };

  const handleCompleteClick = (task) => {
    if (task.taskType === "FmsInstanceTask" && task.createdForm?.length > 0) {
      setSelectedTask(task);
      setShowFormModal(true);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      setRefetch(true);
      await dispatch(
        updateMyTaskFormData({
          id: selectedTask.fmsInstanceId,
          taskId: selectedTask.taskId,
          data: formData,
        }),
      );
      toast.success("Task updated successfully!");
      setShowFormModal(false);
    } catch (err) {
      setRefetch(false);
      const errorMessage =
        err?.message || "Failed to update task. Please try again.";
      toast.error(errorMessage);
    }
  };

  const [modules, setModules] = useState([]);
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await api.get("/setup/modules/list");
        const data = res.data?.data ?? res.data;
        setModules(Array.isArray(data) ? data : (data?.modules ?? []));
      } catch (e) {
        console.log(e?.response?.data?.message || "Failed to load modules");
      }
    };
    fetch_();
  }, []);

  const role = Cookies.get("role") || "";
  const isSuperUser = role === "Super";
  const isModuleEnabled = (moduleKey) => {
    if (isSuperUser) return true;
    return modules.some((m) => m.moduleKey === moduleKey && m.isEnabled);
  };
  const isDoThisEnable = isModuleEnabled("DO_THIS2");
  const isFMSEnable = isModuleEnabled("FMS_ENGINE");

  const initialValues = useMemo(() => {
    return (
      selectedTask?.createdForm?.reduce((acc, field) => {
        const key = getFieldKey(field.fieldName);

        acc[key] =
          selectedTask?.formData?.[field.fieldName] ??
          (field.fieldType === "checkbox" ? false : "");

        return acc;
      }, {}) || {}
    );
  }, [selectedTask]);

  const handleMarkNotDone = async (task, remarkText) => {
    if (!remarkText.trim()) {
      toast.error("Please enter a remark.");
      return;
    }

    try {
      await api.patch(
        `/fms/instances/${task.fmsInstanceId}/tasks/${task.taskId}`,
        {
          status: "Not Done",
          notDoneRemark: remarkText.trim(),
        },
      );

      toast.success("Task marked as Not Done.");

      setNotDoneModalOpen(false);
      setRemark("");
      setSelectedTask(null);
      setRefreshUI((prev) => !prev);
    } catch (err) {
      toast.error(
        err?.response?.data?.error || "Failed to mark task as Not Done.",
      );
    }
  };

  if (status === "failed")
    return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="mx-auto">
        <Card className="shadow-xl border-0 overflow-hidden">
          <div className="flex justify-between items-center px-6">
            <h1 className="text-2xl font-bold">FMS Task</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch(fetchTaskCounts(currentUser._id));
                dispatch(
                  getFilterFMSTasks({
                    userId: currentUser._id,
                    role: currentUser.role?.name,
                    page: localCurrentPage,
                    limit: localItemsPerPage,
                    search: debouncedSearch || undefined,
                    filters: {
                      stat: selectedStatFilter || null,
                      taskCategory: selectedStatFilter
                        ? null
                        : activeTab === "today"
                          ? "today_backlog"
                          : activeTab === "upcoming"
                            ? "upcoming"
                            : activeTab === "completed"
                              ? "completed"
                              : null,
                      taskType:
                        selectedFilterTaskType === "all"
                          ? null
                          : selectedFilterTaskType,
                      status:
                        selectedFilterStatus === "all"
                          ? null
                          : selectedFilterStatus,
                    },
                  }),
                );
              }}
            >
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh Stats
            </Button>
          </div>

          <CardContent className="px-6 pb-6">
            <StatsCards
              counts={taskCounts}
              selectedStat={selectedStatFilter}
              onStatClick={handleStatClick}
            />

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-lg">
                <TabsTrigger value="today">Today's Task (Pending)</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming Tasks</TabsTrigger>
              </TabsList>

              <FilterBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedFilterTaskType={selectedFilterTaskType}
                setSelectedFilterTaskType={setSelectedFilterTaskType}
                selectedFilterStatus={selectedFilterStatus}
                onFilterStatusChange={handleDropdownStatusChange} // 🟢 SYNCHRONIZED STATUS CHANGE
                showExport={true}
                onExport={handleExport}
                isExporting={isExporting}
                selectedStatFilter={selectedStatFilter}
                dateRange={dateRange}
                setDateRange={setDateRange}
                isDoThisEnable={isDoThisEnable}
                isFMSEnable={isFMSEnable}
              />

              <div className="space-y-4">
                {status === "loading" || isFetching ? (
                  <div className="text-center py-10 flex flex-col items-center gap-2">
                    <RefreshCcw className="animate-spin h-6 w-6 text-blue-500" />
                    <p>Loading tasks...</p>
                  </div>
                ) : (
                  <>
                    {selectedStatFilter === "total" && (
                      <div className="text-sm font-bold text-blue-600 mb-2">
                        Showing All Assigned Tasks
                      </div>
                    )}
                    {selectedStatFilter === "overdue" && (
                      <div className="text-sm font-bold text-red-600 mb-2">
                        Showing Overdue Pending Tasks
                      </div>
                    )}
                    {selectedStatFilter === "pending" && (
                      <div className="text-sm font-bold text-yellow-600 mb-2">
                        Showing Pending Tasks
                      </div>
                    )}

                    {searchTerm && (
                      <div className="text-sm text-gray-600 mb-2">
                        Searching for: "
                        <span className="font-semibold">{searchTerm}</span>"
                      </div>
                    )}

                    <TooltipProvider>
                      <TodayTasksTable
                        tasks={fetchedTasks}
                        upcomingRecurringTasks={upcomingRecurringTasks}
                        onEdit={handleEditClick}
                        onChecklist={handleChecklistClick}
                        onToggleComplete={handleToggleComplete}
                        handleNotDoneClick={handleNotDoneClick}
                        onDelete={handleDeleteClick}
                        onViewDescription={(task) =>
                          handleViewDescription(task.description)
                        }
                        currentPage={localCurrentPage}
                        itemsPerPage={localItemsPerPage}
                        allUsers={allUsers}
                        handleCompleteClick={handleCompleteClick}
                        setSelectedQueryTask={setSelectedQueryTask}
                        setQueryDrawerOpen={setQueryDrawerOpen}
                        setRaiseQueryModalOpen={setRaiseQueryModalOpen}
                        unreadMap={unreadMap}
                        setUnreadMap={setUnreadMap}
                        setSubmissionModalOpen={setSubmissionModalOpen}
                        setSelectedSubmissionTask={setSelectedSubmissionTask}
                        canUpdate={canUpdate}
                      />
                    </TooltipProvider>

                    <Pagination
                      totalItems={totalTasks}
                      itemsPerPage={localItemsPerPage}
                      setItemsPerPage={setLocalItemsPerPage}
                      currentPage={localCurrentPage}
                      onPageChange={setLocalCurrentPage}
                      isLoading={status === "loading"}
                    />
                  </>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* DIALOGS */}
      <Dialog
        open={isDecisionDialogOpen}
        onOpenChange={setIsDecisionDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-600">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Decision Step (Not Done Action)</DialogTitle>
                <DialogDescription>
                  This task requires a decision choice when marking as Not Done.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 border rounded-lg p-3 text-sm">
              <p className="font-semibold text-slate-800">
                {decisionTask?.title}
              </p>
              <p className="text-slate-600 text-xs mt-1">
                {decisionTask?.description}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Select Choice *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setDecisionChoice("yes")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border font-semibold text-sm transition-all ${
                    decisionChoice === "yes"
                      ? "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-400 shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-red-600" />
                  <span>
                    {decisionTask?.decisionYesAction === "terminate"
                      ? "Terminate FMS"
                      : decisionTask?.decisionYesAction === "trigger_fms"
                        ? decisionTask?.linkedForm
                          ? "Open Form & Trigger FMS"
                          : "Trigger Another FMS"
                        : "Yes (Proceed)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionChoice("no")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border font-semibold text-sm transition-all ${
                    decisionChoice === "no"
                      ? "bg-slate-100 border-slate-500 text-slate-800 ring-2 ring-slate-400 shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <XCircle className="h-4 w-4 text-slate-600" />
                  <span>Normal Not Done</span>
                </button>
              </div>
            </div>

            {decisionChoice === "yes" &&
              decisionTask?.decisionYesAction === "trigger_fms" &&
              decisionTask?.linkedForm && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      📋 Linked Form Required:{" "}
                      {decisionTask.linkedForm.formName}
                    </p>
                    <p className="text-[11px] text-indigo-600 mt-0.5">
                      Submitting this form will automatically launch the linked
                      FMS.
                    </p>
                  </div>
                </div>
              )}

            {decisionChoice && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <Label className="text-xs font-semibold text-slate-700">
                  Remark *
                </Label>
                <Textarea
                  placeholder="Enter reason or remark for Not Done..."
                  value={decisionRemark}
                  onChange={(e) => setDecisionRemark(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDecisionDialogOpen(false);
                setDecisionTask(null);
                setDecisionChoice(null);
                setDecisionRemark("");
              }}
              disabled={isSubmittingDecision}
            >
              Cancel
            </Button>

            <Button
              onClick={handleDecisionSubmit}
              disabled={
                !decisionChoice ||
                !decisionRemark.trim() ||
                isSubmittingDecision
              }
              className={
                decisionChoice === "no"
                  ? "bg-slate-700 hover:bg-slate-800 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {isSubmittingDecision ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Submitting...
                </>
              ) : decisionChoice === "yes" &&
                decisionTask?.decisionYesAction === "trigger_fms" &&
                decisionTask?.linkedForm ? (
                "Open Linked Form"
              ) : (
                "Submit Decision"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkedFormModalOpen} onOpenChange={setLinkedFormModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-lg font-bold text-slate-800">
              Fill Linked Form: {decisionTask?.linkedForm?.formName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete the form below. Once submitted, the decision task will be
              marked as Not Done and the workflow action will trigger.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {decisionTask?.linkedForm?.slug && (
              <PublicOpenForm
                slug={decisionTask.linkedForm.slug}
                propEmployeeCode={Cookies.get("empCode")}
                remark={decisionRemark}
                onFormSubmitted={handleLinkedFormComplete}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        className="sm:max-w-4xl px-8"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label>Title</Label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDescriptionDialogOpen}
        onOpenChange={setIsDescriptionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Description</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">{fullDescription}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDescriptionDialogOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isChecklistDialogOpen}
        onOpenChange={setIsChecklistDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Checklist: {selectedTaskForChecklist?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-60 overflow-y-auto">
            {checklistItems.length > 0 ? (
              <ul className="space-y-2">
                {checklistItems.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center p-2 bg-gray-50 rounded-md border"
                  >
                    <Checkbox
                      id={`chk-${index}`}
                      checked={item.isCompleted || item.completed}
                      onCheckedChange={() =>
                        handleChecklistToggle(
                          selectedTaskForChecklist,
                          selectedTaskForChecklist._id,
                          index,
                          item.isCompleted || item.completed,
                        )
                      }
                      disabled={
                        selectedTaskForChecklist?.status === "Completed"
                      }
                      className="mr-3"
                    />

                    <label
                      className={`text-sm ${
                        item.isCompleted || item.completed
                          ? "line-through text-gray-500"
                          : ""
                      }`}
                    >
                      {item.text || item.title}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 text-center">No items.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsChecklistDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FmsFormModal
        key={`${selectedTask?._id}-${JSON.stringify(selectedTask?.formData || {})}`}
        open={showFormModal}
        task={selectedTask}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
        initialValues={initialValues}
        setRefreshUI={setRefreshUI}
      />

      <RaiseQueryModal
        task={selectedQueryTask}
        open={raiseQueryModalOpen}
        onClose={() => setRaiseQueryModalOpen(false)}
      />

      {queryDrawerOpen && selectedQueryTask && (
        <TaskChat
          task={selectedQueryTask}
          open={queryDrawerOpen}
          onClose={() => {
            if (selectedQueryTask?.conversationId) {
              setUnreadMap((prev) => ({
                ...prev,
                [selectedQueryTask.conversationId]: 0,
              }));
            }
            setQueryDrawerOpen(false);
          }}
          setRefreshTaskAfterReopen={setRefreshTaskAfterReopen}
        />
      )}

      <AntdModal
        title="Form Submission Details"
        open={submissionModalOpen}
        onCancel={() => {
          setSubmissionModalOpen(false);
          setSelectedSubmissionTask(null);
        }}
        footer={null}
        width={800}
      >
        {selectedSubmissionTask?.submissionData && (
          <Descriptions bordered column={1} size="small">
            {Object.entries(selectedSubmissionTask.submissionData).map(
              ([key, { label, value }]) => (
                <Descriptions.Item key={key} label={label || formatLabel(key)}>
                  {typeof value === "boolean"
                    ? value
                      ? "Yes"
                      : "No"
                    : value || "-"}
                </Descriptions.Item>
              ),
            )}
          </Descriptions>
        )}
      </AntdModal>

      <Dialog open={notDoneModalOpen} onOpenChange={setNotDoneModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Not Done</DialogTitle>
            <DialogDescription>
              Please provide a reason for not completing this task.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Enter your remarks..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotDoneModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={() => handleMarkNotDone(selectedTask, remark)}
              disabled={!remark.trim()}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FmsTasks;
