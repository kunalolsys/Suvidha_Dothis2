import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  Calendar as CalendarIcon,
  Zap,
  Search,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  ListTodo,
  ClipboardList,
  Users,
  Download,
  UploadCloud,
  FileText,
  AlertCircle,
  FilePenLine,
  X,
  Folder,
  FileSpreadsheet,
  CheckSquare,
  Hash,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useDispatch, useSelector } from "react-redux";
import api from "../lib/api";
import { Button as AntButton, Modal, TimePicker } from "antd";
import { cn, frequencyMap } from "./utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Textarea,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  RadioGroup,
  RadioGroupItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/index.jsx";
import { Tabs as AntdTabs, Input as AntdInput } from "antd";
import {
  Dropdown,
  Button as AntdBTN,
  Checkbox as AntdCheckBox,
  Divider,
} from "antd";
import { SearchOutlined, SettingOutlined } from "@ant-design/icons";
import { formatDate, getDueStatus } from "../lib/utilFunctions.js";
import dayjs from "dayjs";
import { DatePicker, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useDebounce } from "../lib/debounce.js";

const AttachmentTab = ({ editFileList, setEditFileList, handleRemove }) => {
  const isImage = (file) => {
    return (
      file.type?.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif)$/i.test(file.name)
    );
  };

  const getFileIcon = (name) => {
    if (name.endsWith(".pdf")) return "📕";
    if (name.endsWith(".csv")) return "📄";
    if (name.endsWith(".xlsx")) return "📊";
    return "📁";
  };

  return (
    <div className="space-y-6">
      {/* ================= UPLOAD AREA ================= */}
      <div className="border-2 border-dashed rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100 transition">
        <Upload
          multiple
          fileList={editFileList}
          onChange={({ fileList }) => setEditFileList(fileList)}
          onRemove={handleRemove}
          beforeUpload={() => false}
          showUploadList={false}
        >
          <div className="cursor-pointer flex flex-col items-center gap-2">
            <div className="text-4xl">📤</div>
            <p className="text-sm font-medium text-gray-700">
              Drag & drop files or click to upload
            </p>
            <p className="text-xs text-gray-400">
              Images, PDF, CSV, Excel supported
            </p>
          </div>
        </Upload>
      </div>

      {/* ================= FILE GRID ================= */}
      {editFileList.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {editFileList.map((file) => (
              <div
                key={file.uid}
                className="group border rounded-xl bg-white shadow-sm hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* PREVIEW AREA */}
                <div className="h-28 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {isImage(file) ? (
                    <img
                      src={file.url || URL.createObjectURL(file.originFileObj)}
                      alt={file.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="text-3xl">{getFileIcon(file.name)}</div>
                  )}
                </div>

                {/* FILE NAME */}
                <div className="p-1 text-xs text-gray-700 leading-tight line-clamp-2 break-words">
                  {/* {file.name} */}
                </div>

                {/* ACTIONS */}
                <div className="flex justify-between px-2 pb-2 opacity-0 group-hover:opacity-100 transition">
                  {file.url && (
                    <button
                      onClick={() => window.open(file.url)}
                      className="text-blue-500 text-xs hover:underline cursor-pointer"
                    >
                      Download
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleRemove(file); // your existing logic (removedFiles tracking)

                      // ✅ THIS IS MISSING
                      setEditFileList((prev) =>
                        prev.filter((f) => f.uid !== file.uid),
                      );
                    }}
                    className="text-red-500 text-xs hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {editFileList.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-6">
          No attachments uploaded yet
        </div>
      )}
    </div>
  );
};
// const AttachmentTab = ({
//   editFileList,
//   setEditFileList,
//   handleRemove,
//   // loadAttachments,
// }) => {
//   return (
//     <div className="space-y-4">
//       {/* Upload */}
//       <Upload
//         listType="picture-card"
//         multiple
//         fileList={editFileList}
//         onChange={({ fileList }) => setEditFileList(fileList)}
//         onRemove={handleRemove}
//         beforeUpload={() => false}
//       >
//         <div>+ Upload</div>
//       </Upload>
//     </div>
//   );
// };
const TaskTable = ({
  allTasks,
  tasksLoading,
  users,
  departments,
  currentUser,
  holidays,
  onRefreshTasks,
  onViewDescription,
  searchTerm: propSearchTerm,
  setSearchTerm: propSetSearchTerm,
  workingWeeks,
  canRead,
  canUpdate,
  canDelete,
}) => {
  const dispatch = useDispatch();

  // Filter and Search States
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const searchTerm =
    typeof propSearchTerm !== "undefined" ? propSearchTerm : localSearchTerm;
  const setSearchTerm =
    typeof propSetSearchTerm !== "undefined"
      ? propSetSearchTerm
      : setLocalSearchTerm;
  const [selectedFilterUser, setSelectedFilterUser] = useState("all");
  const [selectedFilterStatus, setSelectedFilterStatus] = useState("all");

  const [activeTabForExport, setActiveTabForExport] = useState("one-time");
  // Pagination States
  const [oneTimeCurrentPage, setOneTimeCurrentPage] = useState(1);
  const [oneTimeItemsPerPage, setOneTimeItemsPerPage] = useState(10);
  const [recurringCurrentPage, setRecurringCurrentPage] = useState(1);
  const [recurringItemsPerPage, setRecurringItemsPerPage] = useState(10);

  // --- EDIT & DELETE STATES ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [selectedTaskForChecklist, setSelectedTaskForChecklist] =
    useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  // --- REASSIGN STATES ---
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignTask, setReassignTask] = useState(null);
  const [reassignSelectedUser, setReassignSelectedUser] = useState("");
  const [reassignDeptFilter, setReassignDeptFilter] = useState(null);
  // Delete parent task states
  const [deleteRemark, setDeleteRemark] = useState("");
  const [childTasksCount, setChildTasksCount] = useState(0);
  const [isParentWithChildren, setIsParentWithChildren] = useState(false);

  // Edit Form specific states
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editStartDate, setEditStartDate] = useState(null);
  const [editDueDate, setEditDueDate] = useState(null);
  const [editChecklist, setEditChecklist] = useState([]);
  const [taskEndDateOffset, setTaskEndDateOffset] = useState(""); // New state for task end date offset
  const [taskEndTime, setTaskEndTime] = useState(null);

  const [editChecklistItem, setEditChecklistItem] = useState("");
  const [editRecurrenceFrequency, setEditRecurrenceFrequency] =
    useState("daily");
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState();
  const [editWeeklyRecurrenceDays, setEditWeeklyRecurrenceDays] = useState([]);
  // Import Dialog States
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importTaskType, setImportTaskType] = useState(null); // 'delegation', 'recurring', 'dependent'
  const [uploadFile, setUploadFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [errorFileUrl, setErrorFileUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Attachment states (for import process)
  const [attachmentFiles, setAttachmentFiles] = useState([]); // Currently unused, check original for usage
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadedAttachmentNames, setUploadedAttachmentNames] = useState([]);
  const [uploadedAttachmentBackendNames, setUploadedAttachmentBackendNames] =
    useState([]);
  const attachmentFileInputRef = useRef(null);
  const attachmentFolderInputRef = useRef(null);

  //**All Task Attachments */
  const [activeTab, setActiveTab] = useState("basic");
  const [editFileList, setEditFileList] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);

  // 🟢 HELPER: Get Department Custom Working Schedule for Assigned User
  const getDeptWorkingSchedule = (assignedUserId) => {
    if (assignedUserId) {
      const userObj = users.find(
        (u) => String(u._id) === String(assignedUserId),
      );
      const userDeptId = Array.isArray(userObj?.department)
        ? userObj.department[0]?._id || userObj.department[0]
        : userObj?.department?._id || userObj?.department;

      if (userDeptId) {
        const deptObj = departments.find(
          (d) => String(d._id) === String(userDeptId),
        );
        if (deptObj && deptObj.workingWeekDays) {
          return deptObj.workingWeekDays;
        }
      }
    }
    return workingWeeks;
  };

  // 🟢 HELPER: Check if a date is a holiday for Assigned User's Department
  const isHolidayForDept = (dateString, assignedUserId) => {
    const userObj = users.find((u) => String(u._id) === String(assignedUserId));
    const userDeptId = Array.isArray(userObj?.department)
      ? userObj.department[0]?._id || userObj.department[0]
      : userObj?.department?._id || userObj?.department;

    return holidays.some((h) => {
      const isDateMatch = dayjs(h.date).format("YYYY-MM-DD") === dateString;
      if (!isDateMatch) return false;

      if (h.isGlobal) return true;

      if (userDeptId && Array.isArray(h.applicableDepartments)) {
        return h.applicableDepartments.some(
          (d) => String(d._id || d) === String(userDeptId),
        );
      }
      return false;
    });
  };

  const loadAttachments = async () => {
    try {
      if (
        (Array.isArray(editingTask?.attachmentFile) &&
          editingTask.attachmentFile.length > 0) ||
        editingTask?.attachmentFile !== null
      ) {
        const files = editingTask.attachmentFile.map((file, index) => ({
          uid: index.toString(),
          name: file.split("/").pop(),
          status: "done",
          url: `${import.meta.env.VITE_API_BASE_URL}/tasks/download?filePath=${encodeURIComponent(file)}`,
          filePath: file, // 🔥 IMPORTANT (keep original path)
        }));

        setEditFileList(files);
      } else {
        setEditFileList([]);
      }
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    if (activeTab === "attachments") {
      loadAttachments();
    }
  }, [activeTab]);

  const handleRemove = (file) => {
    // store removed file paths
    if (file.filePath) {
      setRemovedFiles((prev) => [...prev, file.filePath]);
    }

    return true; // allow removal from UI
  };
  // Memoized filtered tasks
  const filteredTasks = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    return allTasks.filter((task) => {
      // Search by TaskId, title or description
      const taskId = (task.TaskId || "").toString().toLowerCase();
      const title = (task.title || "").toLowerCase();
      const description = (task.description || "").toLowerCase();

      const matchesSearch =
        !term ||
        taskId.includes(term) ||
        title.includes(term) ||
        description.includes(term);

      const matchesUser =
        selectedFilterUser === "all" ||
        (task.assignedTo &&
          (task.assignedTo._id === selectedFilterUser ||
            task.assignedTo === selectedFilterUser));

      const matchesStatus =
        selectedFilterStatus === "all" ||
        (task.status &&
          task.status.toLowerCase() === selectedFilterStatus.toLowerCase());

      return matchesSearch && matchesUser && matchesStatus;
    });
  }, [allTasks, searchTerm, selectedFilterUser, selectedFilterStatus]);

  // Derived States
  const oneTimeTasksList = filteredTasks.filter(
    (t) =>
      t.taskType === "DelegationTask" ||
      (!t.recurrenceFrequency && t.taskType !== "RecurringTask"),
  );
  const recurringTasksList = filteredTasks.filter(
    (t) => t.taskType === "RecurringTask" || t.recurrenceFrequency,
  );

  // --- Edit Checklist Handlers ---
  const addEditChecklistItem = () => {
    if (!editChecklistItem.trim()) return;
    setEditChecklist([
      ...editChecklist,
      { text: editChecklistItem, isCompleted: false },
    ]);
    setEditChecklistItem("");
  };

  const removeEditChecklistItem = (index) => {
    const newList = [...editChecklist];
    newList.splice(index, 1);
    setEditChecklist(newList);
  };

  const dateChangeHandler = (e, setter) => {
    const dateString = e.target.value;
    if (!dateString) {
      setter(undefined);
      return;
    }
    const [year, month, day] = dateString.split("-").map(Number);
    const newDate = new Date(year, month - 1, day);

    if (newDate.getDay() === 0) {
      // Sunday
      toast.error("Sundays are not allowed. Please select another date.");
      e.target.value = "";
      setter(undefined);
      return;
    }

    const holiday = holidays.find((h) => h.date.startsWith(dateString));
    if (holiday) {
      toast.error(
        `Selected date is a holiday: ${holiday.name}. Please select another date.`,
      );
      e.target.value = "";
      setter(undefined);
      return;
    }
    setter(newDate);
  };

  // Helper for status badges
  const getStatusBadge = (status) => {
    const s = status ? status.toLowerCase() : "pending";
    switch (s) {
      case "completed":
        return (
          <Badge
            variant="outline"
            className="text-green-600 border-green-200 bg-green-50 text-sm"
          >
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-200 bg-yellow-50 text-sm"
          >
            Pending
          </Badge>
        );
      case "delayed":
        return (
          <Badge
            variant="outline"
            className="text-red-600 border-red-200 bg-red-50 text-sm"
          >
            Delayed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-sm capitalize">
            {s}
          </Badge>
        );
    }
  };

  const handleEditClick = async (task) => {
    const res = await api.get(`/tasks/${task._id || task.id}`);
    const data = res.data.data;

    setEditingTask(data);
    setEditTitle(data.title);
    setEditDescription(data.description || "");

    setEditAssignedTo(data.assignedTo?._id || data.assignedTo || "");

    setEditStartDate(data.startDate ? new Date(data.startDate) : null);
    setEditDueDate(data.dueDate ? new Date(data.dueDate) : null);

    setEditChecklist(data.checklist || []);

    setTaskEndDateOffset(data.taskEndDays);
    setTaskEndTime(data.taskEndTime);

    if (data.taskType === "RecurringTask") {
      setEditRecurrenceFrequency(data.frequency?.toLowerCase() || "daily");
      setEditRecurrenceEndDate(data.endDate ? new Date(data.endDate) : null);

      if (data.frequency?.toLowerCase() === "weekly") {
        let weekDaysAsStrings = [];

        if (data.weekDays) {
          let parsedDays = [];

          if (typeof data.weekDays === "string") {
            try {
              parsedDays = JSON.parse(data.weekDays);
            } catch {
              parsedDays = data.weekDays.split(",").map((d) => d.trim());
            }
          } else if (Array.isArray(data.weekDays)) {
            parsedDays = data.weekDays;
          }

          if (parsedDays.length > 0 && typeof parsedDays[0] === "object") {
            weekDaysAsStrings = parsedDays
              .map((d) => (d.day || d.label || d.value || "").toLowerCase())
              .filter(Boolean);
          } else {
            weekDaysAsStrings = parsedDays.map((d) => String(d).toLowerCase());
          }
        }

        setEditWeeklyRecurrenceDays(weekDaysAsStrings);
      } else {
        setEditWeeklyRecurrenceDays([]);
      }
    } else {
      // Delegation/Normal task
      setEditRecurrenceFrequency("daily");
      setEditRecurrenceEndDate(data.dueDate ? new Date(data.dueDate) : null);
      setEditWeeklyRecurrenceDays([]);
    }

    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return toast.error("Title is required");
    if (!editDescription.trim()) return toast.error("Description is required");
    // Temporary loading state for this specific action
    // const localSetLoading = (val) => console.log("Edit loading state:", val); // Placeholder
    // localSetLoading(true);
    try {
      // If there's an attachment, use FormData (Multer will parse it).
      // Otherwise send a JSON body to avoid multipart parsing edge-cases.
      const hasNewFiles = editFileList.some((file) => file.originFileObj);
      let res;
      if (hasNewFiles || editFileList.length > 0) {
        const formData = new FormData();
        formData.append("title", editTitle);
        formData.append("description", editDescription);
        if (editAssignedTo) formData.append("assignedTo", editAssignedTo);

        if (editStartDate) {
          formData.append(
            "startDate",
            dayjs(editStartDate).format("YYYY-MM-DD"),
          );
        }
        if (editingTask.taskType === "RecurringTask" || editingTask.frequency) {
          formData.append("isRecurrent", "true");
          formData.append(
            "frequency",
            frequencyMap[editRecurrenceFrequency] || editRecurrenceFrequency,
          );
          if (editRecurrenceEndDate) {
            formData.append(
              "endDate",
              format(editRecurrenceEndDate, "yyyy-MM-dd"),
            );
          }
          if (editRecurrenceFrequency === "weekly") {
            formData.append(
              "weekDays",
              JSON.stringify(editWeeklyRecurrenceDays),
            );
          }
        } else {
          formData.append("isRecurrent", "false");
          if (editDueDate)
            formData.append("dueDate", format(editDueDate, "yyyy-MM-dd"));
        }
        // ================= ATTACHMENT FIX =================

        // ✅ Existing files (kept)
        const existingFiles = editFileList
          .filter((file) => !file.originFileObj)
          .map((file) => file.filePath);

        formData.append("existingFiles", JSON.stringify(existingFiles));

        // ✅ Removed files
        formData.append("removedFiles", JSON.stringify(removedFiles));

        // ✅ New files
        editFileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append("attachmentFile", file.originFileObj);
          }
        });

        // =================================================
        if (editChecklist.length > 0)
          formData.append("checklist", JSON.stringify(editChecklist));
        // formData.append("attachmentFile", editAttachment);

        res = await api.put(
          `/tasks/${editingTask._id || editingTask.id}`,
          formData,
        );
      } else {
        // JSON payload path (no file) — axios will set Content-Type: application/json
        const payload = {
          title: editTitle,
          description: editDescription,
        };
        if (editAssignedTo) payload.assignedTo = editAssignedTo;
        if (taskEndDateOffset) payload.taskEndDays = taskEndDateOffset;
        if (taskEndTime) payload.taskEndTime = taskEndTime;
        if (editStartDate) {
          payload.startDate = dayjs(editStartDate).format("YYYY-MM-DD");
        }
        if (editingTask.taskType === "RecurringTask" || editingTask.frequency) {
          payload.isRecurrent = true;
          payload.frequency =
            frequencyMap[editRecurrenceFrequency] || editRecurrenceFrequency;
          if (editRecurrenceEndDate)
            payload.endDate = new Date(editRecurrenceEndDate).toISOString(); // Always include weekDays when weekly (may be empty array)
          if (
            editRecurrenceFrequency === "weekly" ||
            (payload.frequency && payload.frequency.toLowerCase() === "weekly")
          ) {
            payload.weekDays = editWeeklyRecurrenceDays;
          }
        } else {
          payload.isRecurrent = false;
          if (editDueDate) payload.dueDate = format(editDueDate, "yyyy-MM-dd");
        }

        if (editChecklist.length > 0) payload.checklist = editChecklist;

        res = await api.put(
          `/tasks/${editingTask._id || editingTask.id}`,
          payload,
        );
      }

      if (res.data?.success) {
        toast.success("Task updated successfully");
        setIsEditOpen(false);
        setActiveTab("basic"); // Reset to basic tab after edit
        setEditFileList([]);
        onRefreshTasks(); // Refresh tasks in parent
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task");
    } finally {
      // localSetLoading(false);
    }
  };
  //**Global commit */
  const handleDeleteClick = (task) => {
    // Check if this task is a parent with dependent children
    const parentTaskId = task._id || task.id;
    const dependentChildren = allTasks.filter((t) => {
      if (!t.parentTask) return false;
      const parentId =
        typeof t.parentTask === "object" && t.parentTask !== null
          ? t.parentTask._id
          : t.parentTask;
      return parentId === parentTaskId;
    });

    setTaskToDelete(task);
    setDeleteRemark("");
    setChildTasksCount(dependentChildren.length);
    setIsParentWithChildren(dependentChildren.length > 0);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    try {
      if (isParentWithChildren) {
        // Use /force endpoint for parent task with children
        // Remark is optional, so we send it only if provided
        const res = await api.delete(
          `/tasks/${taskToDelete._id || taskToDelete.id}/force`,
          {
            data: { remark: deleteRemark || "" },
          },
        );

        if (res.data?.success) {
          toast.success(
            res.data.message ||
              `Task and ${res.data.deletedCount - 1} dependent task(s) deleted successfully`,
          );
          if (res.data.deletedCount) {
            toast(`Deleted ${res.data.deletedCount} task(s).`, {
              type: "info",
            });
          }
          setIsDeleteOpen(false);
          onRefreshTasks();
        }
      } else {
        // Regular delete for non-parent tasks
        const res = await api.delete(
          `/tasks/${taskToDelete._id || taskToDelete.id}`,
        );
        if (res.data?.success) {
          toast.success("Task deleted successfully");
          setIsDeleteOpen(false);
          onRefreshTasks();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete task");
    }
  };

  const handleToggleComplete = async (task) => {
    const newStatus = task.status === "Completed" ? false : true;
    try {
      const res = await api.patch(`/tasks/${task._id || task.id}/completion`, {
        completeStatus: newStatus,
      });
      if (res.data?.success) {
        const msg = newStatus
          ? "Task marked as Completed"
          : "Task marked as Incomplete";
        toast.success(msg);
        onRefreshTasks();
      }
    } catch (err) {
      toast.error(err.response.data.message || "Failed to update status");
    }
  };

  const handleChecklistClick = (task) => {
    setSelectedTaskForChecklist(task);
    setChecklistItems(
      task.checklist ? JSON.parse(JSON.stringify(task.checklist)) : [],
    );
    setIsChecklistDialogOpen(true);
  };

  // --- REASSIGN HANDLERS ---
  const openReassignDialog = (task) => {
    setReassignTask(task);
    setReassignSelectedUser(task.assignedTo?._id || task.assignedTo || "");
    setReassignDeptFilter(task.departmentOfAssignToUser?._id || null);
    setIsReassignOpen(true);
  };

  const handleReassignSubmit = async () => {
    if (!reassignTask) return;
    if (!reassignSelectedUser)
      return toast.error("Please select a user to reassign to");

    // Temporary loading state for this specific action
    const localSetLoading = (val) =>
      console.log("Reassign loading state:", val); // Placeholder
    localSetLoading(true);
    try {
      const payload = { assignedTo: reassignSelectedUser };
      if (reassignDeptFilter)
        payload.departmentOfAssignToUser = reassignDeptFilter;

      const res = await api.put(
        `/tasks/${reassignTask._id || reassignTask.id}`,
        payload,
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Task reassigned successfully");
        setIsReassignOpen(false);
        setReassignTask(null);
        onRefreshTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reassign task");
    } finally {
      localSetLoading(false);
    }
  };

  const handleChecklistChange = (index) => {
    const newChecklistItems = [...checklistItems];
    newChecklistItems[index].isCompleted =
      !newChecklistItems[index].isCompleted;
    setChecklistItems(newChecklistItems);
  };

  const handleCompleteTaskFromChecklist = async () => {
    if (!selectedTaskForChecklist) return;

    try {
      const res = await api.put(`/tasks/${selectedTaskForChecklist._id}`, {
        checklist: checklistItems,
      });
      if (!res.data.success) {
        toast.error("Failed to save checklist progress.");
        return;
      }
    } catch (err) {
      toast.error("Error saving checklist progress.");
      return;
    }

    await handleToggleComplete(selectedTaskForChecklist);
    setIsChecklistDialogOpen(false);
  };
  const debouncedSearch = useDebounce(searchTerm);
  const handleExport = async () => {
    try {
      const response = await api.post("/tasks/export", {
        tabType: activeTabForExport,
        assignedTo: selectedFilterUser,
        status: selectedFilterStatus,
        search: debouncedSearch,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "tasks.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Tasks exported successfully.");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export tasks.");
    }
  };

  const openImportDialog = (type) => {
    setImportTaskType(type);
    setUploadFile(null);
    setImportError(null);
    setErrorFileUrl(null);
    setUploadedAttachmentBackendNames([]);
    setUploadedAttachmentNames([]);
    setIsImportDialogOpen(true);
  };

  const templates = {
    delegation: {
      name: "Delegation Task",
      subtitle: "Independent",
      columns: [
        { name: "Task Title", type: "Text", required: true },
        { name: "Task Description", type: "Text", required: true },
        { name: "Assign To(Email)", type: "Text", required: true },
        { name: "Assign To(Name)", type: "Text", required: false },
        { name: "Assign To UserDepartment", type: "Text", required: true },
        { name: "Check List", type: "Optional", required: false },
        { name: "Start Date", type: "DD-MM-YYYY", required: true },
        { name: "Task End Days", type: "Number", required: true },
        // { name: "Attachment File", type: "File", required: false },
      ],
      demoData: [
        "Sample Delegation Task",
        "Description...",
        "user@example.com",
        "John",
        "Engineering",
        '"item1,item2"',
        "01-08-2024",
        1,
        // "file.pdf",
      ],
    },
    recurring: {
      name: "Recurring Task",
      subtitle: "Scheduled",
      columns: [
        { name: "Task Title", type: "Text", required: true },
        { name: "Task Description", type: "Text", required: true },
        { name: "Assign To(Email)", type: "Text", required: true },
        { name: "Assign To(Name)", type: "Text", required: false },
        { name: "Assign To UserDepartment", type: "Text", required: true },
        { name: "Check List", type: "Optional", required: false },
        { name: "Start Date", type: "DD-MM-YYYY", required: true },
        {
          name: "Frequency",
          type: "Text (Daily, Weekly, etc.)",
          required: true,
          options: ["Daily", "Weekly", "etc"],
        },
        {
          name: "Week Days",
          type: "Text (Sunday, Monday, etc.)",
          required: true,
          options: ["Sunday", "Monday", "etc"],
        },
        { name: "End Date", type: "DD-MM-YYYY", required: true },
        // { name: "Attachment File", type: "File", required: false },
      ],
      demoData: [
        "Recurring Task",
        "Desc...",
        "user@example.com",
        "John",
        "Eng",
        '"itemA,itemB"',
        "01-08-2024",
        "Weekly",
        '"Monday,Wednesday,Friday"',
        "31-12-2024",
        // "file.docx",
      ],
    },
    dependent: {
      name: "Dependent Task",
      subtitle: "Linked",
      columns: [
        { name: "Task ID", type: "Parent Task", required: true },
        { name: "Task Title", type: "Text", required: true },
        { name: "Task Description", type: "Text", required: true },
        { name: "Assign To(Email)", type: "Text", required: true },
        { name: "Assign To(Name)", type: "Text", required: false },
        { name: "Assign To UserDepartment", type: "Text", required: true },
        { name: "Check List", type: "Optional", required: false },
        { name: "Task End Days", type: "Number", required: false },
        {
          name: "Start Time Setting",
          type: "Planned to Planned / Actual to Planned",
          required: true,
        },
        {
          name: "Frequency",
          type: "T+X days / T+X hours",
          required: true,
          value: "T+X days",
        },
        { name: "X Value", type: "Number", required: true },
        // { name: "Attachment File", type: "File", required: false },
      ],
      demoData: [
        "25120001",
        "Dependent Task",
        "Desc...",
        "user@example.com",
        "John",
        "Eng",
        '"item1,item2"',
        1,
        "Planned to Planned",
        "T+X days",
        "2",
        // "",
      ],
    },
  };

  const downloadTemplate = () => {
    const template = templates[importTaskType];
    const headers = template.columns.map((col) => col.name);
    const demoRow = template.demoData;
    const csvContent = [headers.join(","), demoRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, "_")}_Template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 2 * 1024 * 1024) {
        toast.error("File size cannot exceed 2MB.");
        return;
      }
      setUploadFile(selectedFile);
      setImportError(null);
      setErrorFileUrl(null);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = null;
    fileInputRef.current.click();
  };

  const handleAttachmentFileChange = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles.length > 0) {
      const filesArray = Array.from(selectedFiles);
      for (const file of filesArray) {
        if (file.size > 2 * 1024 * 1024) {
          toast.error(
            `File "${file.name}" is too large. Each file cannot exceed 2MB.`,
          );
          return;
        }
      }
      setAttachmentFiles(filesArray);
      handleAttachmentUpload(Array.from(selectedFiles));
    }
  };

  const handleAttachmentFilesClick = () => {
    if (attachmentFileInputRef.current)
      attachmentFileInputRef.current.value = null;
    attachmentFileInputRef.current.click();
  };

  const handleAttachmentFolderClick = () => {
    if (attachmentFolderInputRef.current)
      attachmentFolderInputRef.current.value = null;
    attachmentFolderInputRef.current.click();
  };

  const handleAttachmentUpload = async (filesToUpload) => {
    if (filesToUpload.length === 0) {
      toast.error("Please select attachment files first!");
      return;
    }
    setIsUploadingAttachment(true);
    setUploadedAttachmentNames(filesToUpload.map((f) => f.name));
    const formData = new FormData();
    filesToUpload.forEach((file) => {
      formData.append("attachments", file);
    });
    try {
      const response = await api.post("/tasks/upload-attachment", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        setUploadedAttachmentBackendNames(response.data.data.filenames);
        toast.success(
          `${response.data.data.filenames.length} attachments uploaded successfully.`,
        );
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Attachment upload error:", error);
      toast.error(
        `Error uploading attachments: ${error.response?.data?.message || error.message}`,
      );
      setUploadedAttachmentNames([]);
      setUploadedAttachmentBackendNames([]);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const proceedWithUpload = async () => {
    if (!uploadFile) {
      toast.error("Please upload a file first!");
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setErrorFileUrl(null);

    const formData = new FormData();

    formData.append("file", uploadFile);

    if (uploadedAttachmentBackendNames.length > 0) {
      formData.append(
        "attachmentFilenames",
        JSON.stringify(uploadedAttachmentBackendNames),
      );
    }

    try {
      const response = await api.post("/tasks/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = response.data;

      // ✅ success toast
      toast.success(data.message);

      // ✅ partial import handling
      if (data.summary?.errors > 0 || data.summary?.skipped > 0) {
        setImportError(
          `Import completed with ${data.summary.errors} error(s) and ${data.summary.skipped} skipped row(s).`,
        );

        // ✅ download link
        if (data.errorFile) {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

          const fullUrl = `${apiBaseUrl}/tasks/download?filePath=${encodeURIComponent(
            data.errorFile,
          )}`;

          setErrorFileUrl(fullUrl);
        }
      } else {
        // ✅ fully successful
        setImportError(null);
        setErrorFileUrl(null);
      }

      // setIsImportDialogOpen(false);

      onRefreshTasks();
    } catch (error) {
      console.error("Import error:", error);

      if (error.response) {
        const data = error.response.data;

        setImportError(data.message || "Failed to import tasks.");

        // ✅ even on error return downloadable file
        if (data.errorFile) {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

          const fullUrl = `${apiBaseUrl}/tasks/download?filePath=${encodeURIComponent(
            data.errorFile,
          )}`;

          setErrorFileUrl(fullUrl);
        }
      } else {
        setImportError("Network error or cannot connect to the server.");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (!uploadFile) {
      toast.error("Please upload a file first!");
      return;
    }

    Papa.parse(uploadFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (rows.length === 0) {
          proceedWithUpload();
          return;
        }

        const errors = [];
        const firstRow = rows[0] || {};
        const getHeader = (name) =>
          Object.keys(firstRow).find(
            (k) => k.toLowerCase().trim() === name.toLowerCase().trim(),
          );

        const parseDate = (dateStr) => {
          if (!dateStr || typeof dateStr !== "string") return null;
          const parts = dateStr.split("-");
          if (parts.length !== 3) return null;
          const [day, month, year] = parts.map((p) => parseInt(p, 10));
          if (
            isNaN(day) ||
            isNaN(month) ||
            isNaN(year) ||
            day < 1 ||
            day > 31 ||
            month < 1 ||
            month > 12 ||
            year < 1900
          )
            return null;
          return new Date(year, month - 1, day);
        };

        const validateRowDates = (
          row,
          index,
          startDateHeader,
          endDateHeader,
          dateTypeName,
        ) => {
          const startDate = parseDate(row[startDateHeader]);
          const endDate = parseDate(row[endDateHeader]);
          if (startDate && endDate && endDate < startDate) {
            errors.push(
              `Row ${index + 2}: ${dateTypeName} (${row[endDateHeader]}) cannot be before Start Date (${row[startDateHeader]}).`,
            );
          }
        };

        if (importTaskType === "recurring") {
          const frequencyHeader = getHeader("frequency");
          const weekDaysHeader = getHeader("week days");
          const startDateHeader = getHeader("start date");
          const endDateHeader = getHeader("end date");

          if (
            !frequencyHeader ||
            !weekDaysHeader ||
            !startDateHeader ||
            !endDateHeader
          ) {
            errors.push(
              "Recurring tasks CSV must contain 'Frequency', 'Week Days', 'Start Date', and 'End Date' columns.",
            );
          } else {
            rows.forEach((row, index) => {
              if (
                row[frequencyHeader] &&
                row[frequencyHeader].toLowerCase().trim() === "weekly" &&
                !row[weekDaysHeader]
              ) {
                errors.push(
                  `Row ${index + 2}: 'Week Days' is required when Frequency is 'Weekly'.`,
                );
              }
              validateRowDates(
                row,
                index,
                startDateHeader,
                endDateHeader,
                "End Date",
              );
            });
          }
        } else if (importTaskType === "delegation") {
          const startDateHeader = getHeader("start date");

          if (!startDateHeader) {
            errors.push(
              "Delegation tasks CSV must contain a 'Start Date' column.",
            );
          } else {
            rows.forEach((row, index) => {
              validateRowDates(row, index, startDateHeader, null, "Start Date");
            });
          }
        }

        if (errors.length > 0) {
          setImportError("Validation failed:\n" + errors.join("\n"));
          setErrorFileUrl(null);
          toast.error("The imported file has validation errors.", {
            description: "Please check the details in the dialog.",
            duration: 5000,
          });
        } else {
          proceedWithUpload();
        }
      },
      error: (err) => {
        toast.error(`CSV parsing failed: ${err.message}`);
        setImportError(`CSV parsing failed: ${err.message}`);
      },
    });
  };

  const handleDownloadAttachment = (attachmentFile) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const serverBaseUrl = apiBaseUrl.replace("/api/v1", "");
    const attachmentUrl = `${serverBaseUrl}/download/${attachmentFile}`;
    const link = document.createElement("a");
    link.href = attachmentUrl;
    link.setAttribute("download", attachmentFile);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination Logic
  const indexOfLastOneTimeTask = oneTimeCurrentPage * oneTimeItemsPerPage;
  const indexOfFirstOneTimeTask = indexOfLastOneTimeTask - oneTimeItemsPerPage;
  const currentOneTimeTasks = oneTimeTasksList.slice(
    indexOfFirstOneTimeTask,
    indexOfLastOneTimeTask,
  );
  const indexOfLastRecurringTask = recurringCurrentPage * recurringItemsPerPage;
  const indexOfFirstRecurringTask =
    indexOfLastRecurringTask - recurringItemsPerPage;
  const currentRecurringTasks = recurringTasksList.slice(
    indexOfFirstRecurringTask,
    indexOfLastRecurringTask,
  );
  //**Fetch users */
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
  /* =========================
   COLUMN CONFIGS
========================= */

  const defaultColumns = [
    { key: "sr", label: "Sr.", visible: true },
    { key: "taskId", label: "Task ID", visible: true },
    { key: "title", label: "Title", visible: true },
    { key: "description", label: "Description", visible: true },
    { key: "assignedBy", label: "Assigned By", visible: true },
    { key: "assignedTo", label: "Assigned To", visible: true },
    { key: "department", label: "Department", visible: true },
    { key: "recurringId", label: "Recurring ID", visible: false },
    { key: "startDate", label: "Start Date", visible: true },
    { key: "dueDate", label: "Due Date", visible: true },
    { key: "delay", label: "Time Left", visible: true },
    { key: "status", label: "Status", visible: true },
    { key: "action", label: "Action", visible: true },
  ];

  const recurringDefaultColumns = [
    { key: "sr", label: "Sr.", visible: true },
    { key: "taskId", label: "Task ID", visible: true },
    { key: "title", label: "Title", visible: true },
    { key: "description", label: "Description", visible: true },
    { key: "frequency", label: "Frequency", visible: true },
    { key: "weekDays", label: "Week Days", visible: true },
    { key: "startDate", label: "Start Date", visible: true },
    { key: "endDate", label: "End Date", visible: true },
    { key: "assignedBy", label: "Assigned By", visible: true },
    { key: "assignedTo", label: "Assigned To", visible: true },
    { key: "department", label: "Department", visible: true },
    { key: "status", label: "Status", visible: true },
    { key: "action", label: "Action", visible: true },
  ];

  /* =========================
   STATES
========================= */

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("taskTableColumns");

    return saved ? JSON.parse(saved) : defaultColumns;
  });

  const [recurringColumns, setRecurringColumns] = useState(() => {
    const saved = localStorage.getItem("recurringTaskColumns");

    return saved ? JSON.parse(saved) : recurringDefaultColumns;
  });
  const activeColumns = useMemo(() => {
    return columns.map((col) => {
      if (col.key === "action") {
        return { ...col, visible: col.visible && (canUpdate || canDelete) };
      }
      return col;
    });
  }, [columns, canUpdate, canDelete]);

  const activeRecurringColumns = useMemo(() => {
    return recurringColumns.map((col) => {
      if (col.key === "action") {
        return { ...col, visible: col.visible && (canUpdate || canDelete) };
      }
      return col;
    });
  }, [recurringColumns, canUpdate, canDelete]);
  /* =========================
   LOCAL STORAGE
========================= */

  useEffect(() => {
    localStorage.setItem("taskTableColumns", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem(
      "recurringTaskColumns",
      JSON.stringify(recurringColumns),
    );
  }, [recurringColumns]);

  /* =========================
   COMMON COLUMN MENU
========================= */

  const renderColumnMenu = ({ title, columnsData, setColumnsData }) => (
    <div className="w-100 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50 px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-gray-900">
              {title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Choose which fields should be visible in your table.
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100">
            <SettingOutlined className="text-gray-600 text-sm" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <AntdBTN
          size="small"
          className="rounded-lg border-gray-200 font-medium"
          onClick={() => {
            const updated = columnsData.map((col) => ({
              ...col,
              visible: true,
            }));

            setColumnsData(updated);
          }}
        >
          Select All
        </AntdBTN>

        <AntdBTN
          size="small"
          className="rounded-lg border-gray-200 font-medium"
          onClick={() => {
            const updated = columnsData.map((col) => ({
              ...col,
              visible: false,
            }));

            setColumnsData(updated);
          }}
        >
          Clear
        </AntdBTN>

        <AntdBTN
          size="small"
          type="primary"
          className="rounded-lg shadow-sm"
          onClick={() => {
            const updated = columnsData.map((col) => ({
              ...col,
              visible: ["sr", "title", "status", "action"].includes(col.key),
            }));

            setColumnsData(updated);
          }}
        >
          Minimal
        </AntdBTN>
      </div>

      {/* Column List */}
      <div className="max-h-[360px] overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          {columnsData.map((column, index) => (
            <div
              key={column.key}
              onClick={() => {
                const updated = [...columnsData];

                updated[index].visible = !updated[index].visible;

                setColumnsData(updated);
              }}
              className={`
              group relative flex cursor-pointer items-center justify-between
              rounded-2xl border px-4 py-3 transition-all duration-200
              ${
                column.visible
                  ? "border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
              }
            `}
            >
              {/* Left */}
              <div className="flex items-center gap-3">
                <div
                  className={`
                  flex h-10 w-10 items-center justify-center rounded-xl
                  ${
                    column.visible
                      ? "bg-white shadow-sm border border-blue-100"
                      : "bg-gray-100"
                  }
                `}
                >
                  <AntdCheckBox
                    checked={column.visible}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => {
                      const updated = [...columnsData];

                      updated[index].visible = !updated[index].visible;

                      setColumnsData(updated);
                    }}
                  />
                </div>

                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">
                    {column.label}
                  </span>

                  {/* <span className="text-[11px] uppercase tracking-wide text-gray-400">
                    {column.key}
                  </span> */}
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center">
                {column.visible ? (
                  <div className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                    Visible
                  </div>
                ) : (
                  <div className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Hidden
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
        <span className="text-xs text-gray-500">
          {columnsData.filter((c) => c.visible).length} columns selected
        </span>

        <div className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-semibold text-green-700">
          Auto Saved
        </div>
      </div>
    </div>
  );
  const [selectedOneTimeTaskIds, setSelectedOneTimeTaskIds] = useState([]);
  const [selectedRecurringTaskIds, setSelectedRecurringTaskIds] = useState([]);
  //**ONE TIME TASK MULTIPLE DELETION */
  const toggleOneTaskSelection = (taskId) => {
    setSelectedOneTimeTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };
  const handleSelectAllOneTimeTasks = () => {
    const currentIds = currentOneTimeTasks.map((t) => t._id);

    const isAllSelected = currentIds.every((id) =>
      selectedOneTimeTaskIds.includes(id),
    );

    if (isAllSelected) {
      // deselect all
      setSelectedOneTimeTaskIds([]);
    } else {
      // select all
      setSelectedOneTimeTaskIds(currentIds);
    }
  };
  const handleDeleteMultipleTasks = async () => {
    if (selectedOneTimeTaskIds.length === 0) {
      toast.error("Please select tasks");
      return;
    }

    Modal.confirm({
      title: "Delete Selected Tasks",
      content: `Are you sure you want to delete ${selectedOneTimeTaskIds.length} selected task(s)?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",

      onOk: async () => {
        try {
          for (const taskId of selectedOneTimeTaskIds) {
            const task = oneTimeTasksList.find(
              (t) => String(t._id) === String(taskId),
            );

            if (!task) continue;

            // ✅ find dependent child tasks
            const dependentChildren = allTasks.filter((t) => {
              if (!t.parentTask) return false;

              const parentId =
                typeof t.parentTask === "object" && t.parentTask !== null
                  ? t.parentTask._id
                  : t.parentTask;

              return String(parentId) === String(task._id);
            });

            const isParentWithChildren = dependentChildren.length > 0;

            // ✅ parent delete
            if (isParentWithChildren) {
              await api.delete(`/tasks/${task._id}/force`, {
                data: {
                  remark: "",
                },
              });
            }

            // ✅ normal delete
            else {
              await api.delete(`/tasks/${task._id}`);
            }
          }

          toast.success("Selected tasks deleted successfully");

          setSelectedOneTimeTaskIds([]);

          onRefreshTasks();
        } catch (error) {
          console.log(error);

          toast.error(
            error.response?.data?.message || "Failed to delete tasks",
          );
        }
      },
    });
  };

  //**RECURRING TASK MULTIPLE DELETION */
  const toggleRecurringTaskSelection = (taskId) => {
    setSelectedRecurringTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };
  const handleSelectAllRecurringTasks = () => {
    const currentIds = currentRecurringTasks.map((t) => t._id);

    const isAllSelected = currentIds.every((id) =>
      selectedRecurringTaskIds.includes(id),
    );

    if (isAllSelected) {
      // deselect all
      setSelectedRecurringTaskIds([]);
    } else {
      // select all
      setSelectedRecurringTaskIds(currentIds);
    }
  };
  const handleDeleteMultipleRecurringTasks = async () => {
    if (selectedRecurringTaskIds.length === 0) {
      toast.error("Please select tasks");
      return;
    }
    Modal.confirm({
      title: "Delete Selected Tasks",
      content: `Are you sure you want to delete ${selectedRecurringTaskIds.length} selected task(s)?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",

      onOk: async () => {
        try {
          for (const taskId of selectedRecurringTaskIds) {
            const task = recurringTasksList.find(
              (t) => String(t._id) === String(taskId),
            );

            if (!task) continue;

            // ✅ find dependent child tasks
            const dependentChildren = allTasks.filter((t) => {
              if (!t.parentTask) return false;

              const parentId =
                typeof t.parentTask === "object" && t.parentTask !== null
                  ? t.parentTask._id
                  : t.parentTask;

              return String(parentId) === String(task._id);
            });

            const isParentWithChildren = dependentChildren.length > 0;

            // ✅ parent delete
            if (isParentWithChildren) {
              await api.delete(`/tasks/${task._id}/force`, {
                data: {
                  remark: "",
                },
              });
            }

            // ✅ normal delete
            else {
              await api.delete(`/tasks/${task._id}`);
            }
          }

          toast.success("Selected tasks deleted successfully");

          setSelectedRecurringTaskIds([]);

          onRefreshTasks();
        } catch (error) {
          console.log(error);

          toast.error(
            error.response?.data?.message || "Failed to delete tasks",
          );
        }
      },
    });
  };

  return (
    <Card className="m-4 shadow-xl bg-white/80 border-0 group">
      <CardHeader className="border-b border-gray-200/50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <CheckCircle className="w-5 h-5 text-purple-600" />
          </div>
          <CardTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Task Dashboard
          </CardTitle>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefreshTasks}
              className="text-gray-500"
            >
              Refresh List
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs
          defaultValue="one-time"
          onValueChange={(val) => setActiveTabForExport(val)}
        >
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <TabsList className="bg-gray-100/50">
              <TabsTrigger value="one-time">One-time Tasks</TabsTrigger>
              <TabsTrigger value="recurrence">Recurring Tasks</TabsTrigger>
            </TabsList>
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export Tasks
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <UploadCloud className="mr-2 h-4 w-4" /> Import Tasks
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => openImportDialog("delegation")}
                  >
                    Delegation Task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openImportDialog("recurring")}
                  >
                    Recurring Task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openImportDialog("dependent")}
                  >
                    Dependent Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <AntdInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or description..."
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                allowClear
                size="large"
                style={{
                  borderRadius: 12,
                }}
              />
              {/* <Search className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by title or description..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              /> */}
            </div>
            {/* User Filter */}
            <Select
              value={selectedFilterUser}
              onValueChange={setSelectedFilterUser}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by User" items={users} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <Users className="w-4 h-4 mr-2 opacity-50" />
                  All Users
                </SelectItem>
                {users.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Status Filter */}
            <Select
              value={selectedFilterStatus}
              onValueChange={setSelectedFilterStatus}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <ListTodo className="w-4 h-4 mr-2 opacity-50" />
                  All Status
                </SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
            {/* One Time */}
            {activeTabForExport === "one-time" && (
              <Dropdown
                popupRender={() =>
                  renderColumnMenu({
                    title: "One Time Columns",
                    columnsData: columns,
                    setColumnsData: setColumns,
                  })
                }
                trigger={["click"]}
                placement="bottomRight"
              >
                <AntdBTN
                  className="h-10 rounded-xl border-gray-200 shadow-sm"
                  icon={<SettingOutlined />}
                  size="large"
                />
              </Dropdown>
            )}
            {/* Recurring */}
            {activeTabForExport === "recurrence" && (
              <Dropdown
                popupRender={() =>
                  renderColumnMenu({
                    title: "Recurring Columns",
                    columnsData: recurringColumns,
                    setColumnsData: setRecurringColumns,
                  })
                }
                trigger={["click"]}
                placement="bottomRight"
              >
                <AntdBTN
                  className="h-10 rounded-xl border-gray-200 shadow-sm"
                  icon={<SettingOutlined />}
                  size="large"
                />
              </Dropdown>
            )}
            {canDelete && (
              <div className="flex items-center justify-between mb-4">
                {activeTabForExport == "one-time" ? (
                  <Button
                    variant="destructive"
                    disabled={selectedOneTimeTaskIds.length === 0}
                    onClick={handleDeleteMultipleTasks}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    disabled={selectedRecurringTaskIds.length === 0}
                    onClick={handleDeleteMultipleRecurringTasks}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* --- ONE TIME TASKS TAB --- */}
          <TabsContent value="one-time">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canDelete && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            currentOneTimeTasks.length > 0 &&
                            currentOneTimeTasks.every((t) =>
                              selectedOneTimeTaskIds.includes(t._id),
                            )
                          }
                          onChange={handleSelectAllOneTimeTasks}
                        />
                      </TableHead>
                    )}
                    {activeColumns
                      .filter((col) => col.visible)
                      .map((col) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!tasksLoading &&
                    currentOneTimeTasks.length > 0 &&
                    currentOneTimeTasks.map((task, i) => {
                      const assignedByUser = allUsers.find(
                        (u) => String(u._id) === String(task.assignedBy?._id),
                      );

                      const assignedToUser = allUsers.find(
                        (u) => String(u._id) === String(task.assignedTo?._id),
                      );
                      return (
                        <TableRow
                          key={task._id || i}
                          className="hover:bg-slate-50"
                        >
                          {canDelete && (
                            <TableCell>
                              <Checkbox
                                checked={selectedOneTimeTaskIds.includes(
                                  task._id,
                                )}
                                onChange={() =>
                                  toggleOneTaskSelection(task._id)
                                }
                              />
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "sr")?.visible && (
                            <TableCell>
                              {indexOfFirstOneTimeTask + i + 1}
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "taskId")?.visible && (
                            <TableCell className="font-medium whitespace-nowrap">
                              {task.TaskId || "-"}
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "title")?.visible && (
                            <TableCell
                              className="font-medium whitespace-nowrap truncate max-w-[200px]"
                              title={task.title}
                            >
                              {task.title}
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "description")
                            ?.visible && (
                            <TableCell>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() =>
                                  onViewDescription(task.description)
                                }
                              >
                                View
                              </Button>
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "assignedBy")
                            ?.visible && (
                            <TableCell>
                              <div className="flex flex-row gap-1 w-50">
                                <span className="text-sm font-medium text-gray-900">
                                  {task.assignedBy?.name || "-"}
                                </span>
                                {assignedByUser?.name && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium
      ${
        assignedByUser.role?.name === "admin"
          ? "bg-red-100 text-red-700"
          : assignedByUser.role?.name === "owner"
            ? "bg-purple-100 text-purple-700"
            : assignedByUser.role?.name === "sr._manager"
              ? "bg-blue-100 text-blue-700"
              : assignedByUser.role?.name === "manager"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
      }
    `}
                                  >
                                    {assignedByUser.role?.name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "assignedTo")
                            ?.visible && (
                            <TableCell>
                              <div className="flex flex-row gap-1 w-50">
                                <span className="text-sm font-medium text-gray-900">
                                  {task.assignedTo?.name || "-"}
                                </span>

                                {assignedToUser?.name && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium
      ${
        assignedToUser.role?.name === "admin"
          ? "bg-red-100 text-red-700"
          : assignedToUser.role?.name === "owner"
            ? "bg-purple-100 text-purple-700"
            : assignedToUser.role?.name === "sr._manager"
              ? "bg-blue-100 text-blue-700"
              : assignedToUser.role?.name === "manager"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
      }
    `}
                                  >
                                    {assignedToUser.role?.name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {/* <TableCell className="whitespace-nowrap">
                            {task.assignedTo?.name ||
                              task.assignedTo?.email ||
                              "Unassigned"}
                          </TableCell> */}
                          {columns.find((c) => c.key === "department")
                            ?.visible && (
                            <TableCell className="whitespace-nowrap">
                              {task.departmentOfAssignToUser?.name || "-"}
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "recurringId")
                            ?.visible && (
                            <TableCell className="text-center">
                              {task.recurringRefId || "-"}
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "startDate")
                            ?.visible && (
                            <TableCell className="whitespace-nowrap">
                              {task.startDate
                                ? format(
                                    new Date(task.startDate),
                                    "dd MMM yyyy, hh:mm a",
                                  )
                                : "-"}
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "dueDate")
                            ?.visible && (
                            <TableCell className="whitespace-nowrap">
                              {task.dueDate
                                ? format(
                                    new Date(task.dueDate),
                                    "dd MMM yyyy, hh:mm a",
                                  )
                                : "-"}
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "delay")?.visible && (
                            <TableCell className="whitespace-nowrap">
                              {(() => {
                                // 🟢 1. Return fallback "-" for finished/closed statuses
                                if (
                                  ["Completed", "Stopped", "Not Done"].includes(
                                    task.status,
                                  )
                                ) {
                                  return (
                                    <span className="text-gray-400 text-xs font-medium">
                                      —
                                    </span>
                                  );
                                }

                                const dueStatus = getDueStatus(
                                  task.dueDate || task.plannedDueDate,
                                );

                                if (!dueStatus) {
                                  return (
                                    <span className="text-gray-400 text-xs font-medium">
                                      —
                                    </span>
                                  );
                                }

                                const isOverdue = dueStatus.type === "overdue";
                                const isToday = dueStatus.type === "today";

                                return (
                                  <div
                                    className={`relative inline-flex items-center overflow-hidden rounded-lg border bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                                      isOverdue
                                        ? "border-l-4 border-l-red-500 bg-red-50/20"
                                        : isToday
                                          ? "border-l-4 border-l-amber-500 bg-amber-50/20"
                                          : "border-l-4 border-l-emerald-500"
                                    }`}
                                  >
                                    {/* Animated Status Dot */}
                                    <div className="mr-3 relative flex h-3 w-3 items-center justify-center">
                                      <span
                                        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                          isOverdue
                                            ? "bg-red-500 animate-ping"
                                            : isToday
                                              ? "bg-amber-500 animate-ping"
                                              : "bg-emerald-500 animate-ping"
                                        }`}
                                      />
                                      <span
                                        className={`relative inline-flex h-3 w-3 rounded-full ${
                                          isOverdue
                                            ? "bg-red-500"
                                            : isToday
                                              ? "bg-amber-500"
                                              : "bg-emerald-500"
                                        }`}
                                      />
                                    </div>

                                    {/* Content */}
                                    <div>
                                      <p
                                        className={`text-xs font-semibold ${
                                          isOverdue
                                            ? "text-red-700"
                                            : isToday
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

                                    {/* Shine Effect */}
                                    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
                                      <span className="absolute -left-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-all duration-700 hover:left-full" />
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                          )}
                          {/* <TableCell className="text-center">
                          {Array.isArray(task.attachmentFile) &&
                          task.attachmentFile.length > 0 ? (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() =>
                                handleDownloadAttachment(task.attachmentFile)
                              }
                            >
                              Download
                            </Button>
                          ) : (
                            "No"
                          )}
                        </TableCell> */}
                          {columns.find((c) => c.key === "status")?.visible && (
                            <TableCell className="text-center">
                              {getStatusBadge(task.status)}
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "action")?.visible &&
                            (canUpdate || canDelete) && (
                              <TableCell className="flex items-center gap-1">
                                <TooltipProvider>
                                  {canUpdate && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                          onClick={() => handleEditClick(task)}
                                          disabled={
                                            task.status == "Completed" ||
                                            task?.recurringRefId
                                          }
                                        >
                                          <FilePenLine className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit Task</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  {canUpdate && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-gray-600 hover:bg-gray-50"
                                          onClick={() =>
                                            handleChecklistClick(task)
                                          }
                                          disabled={
                                            task.status == "Completed" ||
                                            !task.checklist ||
                                            task.checklist.length === 0
                                          }
                                        >
                                          <ClipboardList className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View Checklist</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  {canUpdate && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-green-600 hover:bg-green-50"
                                          onClick={() =>
                                            handleToggleComplete(task)
                                          }
                                          disabled={
                                            task.status == "Completed" ||
                                            task.status == "Upcoming" ||
                                            (task.checklist &&
                                              task.checklist.length > 0)
                                          }
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Mark as Complete</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  {canUpdate &&
                                    currentUser &&
                                    (currentUser.role?.name === "Admin" ||
                                      currentUser.role === "Admin" ||
                                      currentUser._id ===
                                        (task.createdBy?._id ||
                                          task.createdBy)) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={
                                              assignedByUser?._id ===
                                                assignedToUser?._id ||
                                              task.status === "Completed"
                                            }
                                            className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                                            onClick={() =>
                                              openReassignDialog(task)
                                            }
                                          >
                                            <Users className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Re-assign User</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}

                                  {canDelete && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          disabled={
                                            currentUser &&
                                            currentUser.role &&
                                            !["Owner", "Admin"].includes(
                                              currentUser.role.name,
                                            )
                                          }
                                          size="icon"
                                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                                          onClick={() =>
                                            handleDeleteClick(task)
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete Task</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </TooltipProvider>
                              </TableCell>
                            )}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              {tasksLoading ? (
                <div className="flex h-24 items-center justify-center w-full text-gray-500">
                  Loading tasks...
                </div>
              ) : (
                currentOneTimeTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center w-full text-gray-500">
                    No tasks found.
                  </div>
                )
              )}
            </div>
            <Pagination
              totalItems={oneTimeTasksList.length}
              itemsPerPage={oneTimeItemsPerPage}
              setItemsPerPage={setOneTimeItemsPerPage}
              currentPage={oneTimeCurrentPage}
              onPageChange={setOneTimeCurrentPage}
              isLoading={tasksLoading}
            />
          </TabsContent>

          <TabsContent value="recurrence">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canDelete && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            currentRecurringTasks.length > 0 &&
                            currentRecurringTasks.every((t) =>
                              selectedRecurringTaskIds.includes(t._id),
                            )
                          }
                          onChange={handleSelectAllRecurringTasks}
                        />
                      </TableHead>
                    )}
                    {activeRecurringColumns
                      .filter((col) => col.visible)
                      .map((col) => (
                        <TableHead className="w-100" key={col.key}>
                          {col.label}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!tasksLoading &&
                    currentRecurringTasks.length > 0 &&
                    currentRecurringTasks.map((task, i) => {
                      const assignedByUser = allUsers.find(
                        (u) => String(u._id) === String(task.assignedBy?._id),
                      );

                      const assignedToUser = allUsers.find(
                        (u) => String(u._id) === String(task.assignedTo?._id),
                      );
                      return (
                        <TableRow
                          key={task._id || i}
                          className="hover:bg-slate-50"
                        >
                          {canDelete && (
                            <TableCell>
                              <Checkbox
                                checked={selectedRecurringTaskIds.includes(
                                  task._id,
                                )}
                                onChange={() =>
                                  toggleRecurringTaskSelection(task._id)
                                }
                              />
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "sr")
                            ?.visible && (
                            <TableCell>
                              {indexOfFirstRecurringTask + i + 1}
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "taskId")
                            ?.visible && (
                            <TableCell className="font-medium whitespace-nowrap">
                              {task.TaskId || "-"}
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "title")
                            ?.visible && (
                            <TableCell
                              className="font-medium whitespace-nowrap truncate max-w-[200px]"
                              title={task.title}
                            >
                              {task.title}
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "description")
                            ?.visible && (
                            <TableCell>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() =>
                                  onViewDescription(task.description)
                                }
                              >
                                View
                              </Button>
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "frequency")
                            ?.visible && (
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 whitespace-nowrap"
                              >
                                {task.frequency || "Custom"}
                              </Badge>
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "weekDays")
                            ?.visible && (
                            <TableCell>
                              {(() => {
                                const frequency = task.frequency?.toLowerCase();

                                let days;

                                if (frequency === "weekly") {
                                  days = task.weekDays;
                                } else if (frequency === "bi-weekly") {
                                  days = task.weekStartDay;
                                } else {
                                  return "-";
                                }
                                if (typeof days === "string") {
                                  try {
                                    days = JSON.parse(days);
                                  } catch (e) {
                                    return days;
                                  }
                                }
                                if (Array.isArray(days) && days.length > 0) {
                                  if (
                                    typeof days[0] === "object" &&
                                    days[0] !== null
                                  ) {
                                    return days
                                      .map((d) => d.label || d.value || d.day)
                                      .join(", ");
                                  }
                                  return days.join(", ");
                                }
                                return "-";
                              })()}
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "startDate")
                            ?.visible && (
                            <TableCell className="whitespace-nowrap">
                              {task.startDate
                                ? format(
                                    new Date(task.startDate),
                                    "dd MMM yyyy, hh:mm a",
                                  )
                                : "-"}
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "endDate")
                            ?.visible && (
                            <TableCell className="whitespace-nowrap">
                              {task.endDate
                                ? format(
                                    new Date(task.endDate),
                                    "dd MMM yyyy, hh:mm a",
                                  )
                                : "-"}
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "assignedBy")
                            ?.visible && (
                            <TableCell className="w-100">
                              <div className="flex flex-row gap-1 w-50">
                                <span className="text-sm font-medium text-gray-900">
                                  {task.assignedBy?.name || "-"}
                                </span>
                                {assignedByUser?.name && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium
      ${
        assignedByUser.role?.name === "admin"
          ? "bg-red-100 text-red-700"
          : assignedByUser.role?.name === "owner"
            ? "bg-purple-100 text-purple-700"
            : assignedByUser.role?.name === "sr._manager"
              ? "bg-blue-100 text-blue-700"
              : assignedByUser.role?.name === "manager"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
      }
    `}
                                  >
                                    {assignedByUser.role?.name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}

                          {recurringColumns.find((c) => c.key === "assignedTo")
                            ?.visible && (
                            <TableCell className="w-100">
                              <div className="flex flex-row gap-1 w-50">
                                <span className="text-sm font-medium text-gray-900">
                                  {task.assignedTo?.name || "-"}
                                </span>

                                {assignedToUser?.name && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium
      ${
        assignedToUser.role?.name === "admin"
          ? "bg-red-100 text-red-700"
          : assignedToUser.role?.name === "owner"
            ? "bg-purple-100 text-purple-700"
            : assignedToUser.role?.name === "sr._manager"
              ? "bg-blue-100 text-blue-700"
              : assignedToUser.role?.name === "manager"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
      }
    `}
                                  >
                                    {assignedToUser.role?.name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {/* <TableCell className="whitespace-nowrap">
                            {task.assignedTo?.name || "Unassigned"}
                          </TableCell> */}
                          {recurringColumns.find((c) => c.key === "department")
                            ?.visible && (
                            <TableCell className="whitespace-nowrap">
                              {task.departmentOfAssignToUser?.name || "-"}
                            </TableCell>
                          )}
                          {/* <TableCell className="text-center">
                          {task.attachmentFile ? (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() =>
                                handleDownloadAttachment(task.attachmentFile)
                              }
                            >
                              Download
                            </Button>
                          ) : (
                            "No"
                          )}
                        </TableCell> */}
                          {recurringColumns.find((c) => c.key === "status")
                            ?.visible && (
                            <TableCell className="text-center">
                              {getStatusBadge(task.status)}
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "action")
                            ?.visible &&
                            (canUpdate || canDelete) && (
                              <TableCell className="flex items-center gap-1">
                                <TooltipProvider>
                                  {canUpdate && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                          onClick={() => handleEditClick(task)}
                                        >
                                          <FilePenLine className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit Task</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  {canUpdate && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-gray-600 hover:bg-gray-50"
                                          onClick={() =>
                                            handleChecklistClick(task)
                                          }
                                          disabled={
                                            task.status == "Completed" ||
                                            !task.checklist ||
                                            task.checklist.length === 0
                                          }
                                        >
                                          <ClipboardList className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View Checklist</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  {canUpdate && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-green-600 hover:bg-green-50"
                                          onClick={() =>
                                            handleToggleComplete(task)
                                          }
                                          disabled={
                                            task.status == "Completed" ||
                                            task.status == "Upcoming" ||
                                            (task.checklist &&
                                              task.checklist.length > 0)
                                          }
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Mark as Complete</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  {canUpdate &&
                                    currentUser &&
                                    (currentUser.role?.name === "Admin" ||
                                      currentUser.role === "Admin" ||
                                      currentUser._id ===
                                        (task.createdBy?._id ||
                                          task.createdBy)) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={
                                              assignedByUser?._id ===
                                                assignedToUser?._id ||
                                              task.status === "Completed"
                                            }
                                            className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                                            onClick={() =>
                                              openReassignDialog(task)
                                            }
                                          >
                                            <Users className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Re-assign User</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}

                                  {canDelete && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          disabled={
                                            currentUser &&
                                            currentUser.role &&
                                            !["Owner", "Admin"].includes(
                                              currentUser.role.name,
                                            )
                                          }
                                          size="icon"
                                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                                          onClick={() =>
                                            handleDeleteClick(task)
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete Task</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </TooltipProvider>
                              </TableCell>
                            )}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              {tasksLoading ? (
                <div className="flex h-24 items-center justify-center w-full text-gray-500">
                  Loading tasks...
                </div>
              ) : (
                currentRecurringTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center w-full text-gray-500">
                    No recurring tasks found.
                  </div>
                )
              )}
            </div>
            <Pagination
              totalItems={recurringTasksList.length}
              itemsPerPage={recurringItemsPerPage}
              setItemsPerPage={setRecurringItemsPerPage}
              currentPage={recurringCurrentPage}
              onPageChange={setRecurringCurrentPage}
              isLoading={tasksLoading}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      {/* --- EDIT DIALOG --- */}

      <Dialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        className="sm:max-w-4xl px-8"
      >
        <DialogContent>
          <DialogHeader className="space-y-2">
            <DialogTitle>Edit Task</DialogTitle>

            <DialogDescription>
              Update the task details below.
            </DialogDescription>

            {editingTask?.recurringRefId && (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Repeat className="h-5 w-5 text-blue-600" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Generated from Recurring Task
                    </p>
                    <p className="text-xs text-slate-500">
                      This task is linked to a recurring schedule.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-md border bg-white px-3 py-1.5">
                  <Hash className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    {editingTask.recurringRefId}
                  </span>
                </div>
              </div>
            )}
          </DialogHeader>

          <AntdTabs activeKey={activeTab} onChange={setActiveTab}>
            <AntdTabs.TabPane tab="Task Info" key="basic">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Task Title</Label>
                    <Input
                      id="edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select
                      value={editAssignedTo}
                      onValueChange={setEditAssignedTo}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select User" items={users} />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 px-2">
                  <Label htmlFor="edit-desc">Description</Label>
                  <Textarea
                    id="edit-desc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {editingTask?.taskType === "RecurringTask" ||
                editingTask?.recurrenceFrequency ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <DatePicker
                        format="DD MMM YYYY"
                        value={editStartDate ? dayjs(editStartDate) : null}
                        onChange={(date) => {
                          if (!date) return;

                          const selected = dayjs(date);
                          const selectedDateStr = selected.format("YYYY-MM-DD");

                          const isHolidayHit = isHolidayForDept(
                            selectedDateStr,
                            editAssignedTo,
                          );
                          if (isHolidayHit) {
                            toast.error(
                              `Selected date is a holiday for the assigned user's department. Please select another date.`,
                            );
                            setEditStartDate(null);
                            return;
                          }

                          const dayName = selected.format("dddd").toLowerCase();
                          const activeSchedule =
                            getDeptWorkingSchedule(editAssignedTo);

                          if (!activeSchedule?.[dayName]) {
                            toast.error(
                              `Selected day (${dayName}) is not a working day for the assigned department. Please choose a valid day.`,
                            );
                            setEditStartDate(null);
                            return;
                          }

                          setEditStartDate(selectedDateStr);
                        }}
                        disabledDate={(current) => {
                          const today = dayjs().startOf("day");
                          return current && current < today;
                        }}
                        style={{ width: "100%", height: "40px" }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select
                        value={editRecurrenceFrequency}
                        onValueChange={(value) => {
                          setEditRecurrenceFrequency(value);
                          if (value !== "weekly") {
                            setEditWeeklyRecurrenceDays([]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="half-yearly">
                            Half Yearly
                          </SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <DatePicker
                        format="DD MMM YYYY hh:mm A"
                        showTime={{
                          format: "hh:mm A",
                          use12Hours: true,
                        }}
                        value={
                          editRecurrenceEndDate
                            ? dayjs(editRecurrenceEndDate)
                            : null
                        }
                        disabledDate={(current) => {
                          if (!current || !editStartDate) return false;
                          return current.isBefore(dayjs(editStartDate), "day");
                        }}
                        onChange={(date) =>
                          setEditRecurrenceEndDate(
                            date ? date.toISOString() : null,
                          )
                        }
                        style={{ width: "100%", height: "40px" }}
                      />
                    </div>

                    {editRecurrenceFrequency === "weekly" && (
                      <div className="md:col-span-3 space-y-2">
                        <Label>Select Days of the Week</Label>
                        <div className="flex flex-wrap gap-4 pt-2">
                          {[
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ].map((day) => (
                            <div key={day} className="flex items-center gap-2">
                              <Checkbox
                                id={`edit-day-${day}`}
                                checked={editWeeklyRecurrenceDays.includes(
                                  day.toLowerCase(),
                                )}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const dayLowerCase = day.toLowerCase();
                                  setEditWeeklyRecurrenceDays((prev) =>
                                    checked
                                      ? [...prev, dayLowerCase]
                                      : prev.filter((d) => d !== dayLowerCase),
                                  );
                                }}
                              />
                              <Label
                                htmlFor={`edit-day-${day}`}
                                className="font-normal cursor-pointer"
                              >
                                {day}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <DatePicker
                        format="DD MMM YYYY"
                        value={editStartDate ? dayjs(editStartDate) : null}
                        onChange={(date) => {
                          if (!date) return;

                          const selected = dayjs(date);
                          const selectedDateStr = selected.format("YYYY-MM-DD");

                          const isHolidayHit = isHolidayForDept(
                            selectedDateStr,
                            editAssignedTo,
                          );
                          if (isHolidayHit) {
                            toast.error(
                              `Selected date is a holiday for the assigned user's department. Please select another date.`,
                            );
                            setEditStartDate(null);
                            return;
                          }

                          const dayName = selected.format("dddd").toLowerCase();
                          const activeSchedule =
                            getDeptWorkingSchedule(editAssignedTo);

                          if (!activeSchedule?.[dayName]) {
                            toast.error(
                              `Selected day (${dayName}) is not a working day for the assigned department. Please choose a valid day.`,
                            );
                            setEditStartDate(null);
                            return;
                          }

                          setEditStartDate(selectedDateStr);
                        }}
                        disabledDate={(current) => {
                          const today = dayjs().startOf("day");
                          return current && current < today;
                        }}
                        style={{ width: "100%", height: "40px" }}
                      />
                    </div>

                    {editingTask && editingTask.recurringRefId == null ? (
                      <>
                        <div className="space-y-2">
                          <Label>How many days Task Ended</Label>
                          <Input
                            type="number"
                            value={taskEndDateOffset}
                            onChange={(e) =>
                              setTaskEndDateOffset(e.target.value)
                            }
                            placeholder="E.g., 1 for same day, 2 for next day"
                            min="1"
                          />
                        </div>

                        {/* 🟢 TIME PICKER FIX: SIRF TIME STRING (HH:mm) SET HOGA, DATE MOVE NAHI HOGI */}
                        <div className="space-y-2">
                          <Label>Task End Time</Label>
                          <TimePicker
                            className="w-full h-10"
                            format="hh:mm A"
                            use12Hours
                            value={
                              taskEndTime
                                ? dayjs(taskEndTime, ["HH:mm", "hh:mm A"])
                                : null
                            }
                            onChange={(time) => {
                              // Strict HH:mm String formatting to prevent date modification
                              setTaskEndTime(
                                time ? time.format("HH:mm") : null,
                              );
                            }}
                            placeholder="Select end time"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <DatePicker
                          format="DD MMM YYYY hh:mm A"
                          showTime={{
                            format: "hh:mm A",
                            use12Hours: true,
                          }}
                          value={
                            editRecurrenceEndDate
                              ? dayjs(editRecurrenceEndDate)
                              : null
                          }
                          onChange={(date) =>
                            setEditRecurrenceEndDate(
                              date ? date.toISOString() : null,
                            )
                          }
                          disabledDate={(current) => {
                            if (!current || !editStartDate) return false;
                            return current.isBefore(
                              dayjs(editStartDate),
                              "day",
                            );
                          }}
                          style={{ width: "100%", height: "40px" }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Edit Checklist */}
                <div className="border rounded p-3 mx-2 bg-slate-50">
                  <Label className="mb-2 block">Checklist</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={editChecklistItem}
                      onChange={(e) => setEditChecklistItem(e.target.value)}
                      placeholder="New item..."
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addEditChecklistItem())
                      }
                    />
                    <Button
                      type="button"
                      onClick={addEditChecklistItem}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {editChecklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-white p-2 rounded border"
                      >
                        <span className="text-sm">{item.text}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={() => removeEditChecklistItem(idx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AntdTabs.TabPane>
            <AntdTabs.TabPane tab="Attachments" key="attachments">
              <AttachmentTab
                editFileList={editFileList}
                setEditFileList={setEditFileList}
                handleRemove={handleRemove}
                loadAttachments={loadAttachments}
              />
            </AntdTabs.TabPane>
          </AntdTabs>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setActiveTab("basic");
                setEditFileList([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- REASSIGN DIALOG --- */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reassign Task</DialogTitle>
            <DialogDescription>
              Choose a user to reassign this task to. Optionally filter by
              department.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Departments</Label>
              <div className="space-y-1 max-h-56 overflow-y-auto p-2 border rounded bg-white">
                <div
                  className={cn(
                    "flex items-center gap-2 p-1 rounded cursor-pointer",
                    reassignDeptFilter === null ? "bg-slate-100" : "",
                  )}
                  onClick={() => setReassignDeptFilter(null)}
                >
                  <div className="text-sm text-slate-600">All Departments</div>
                </div>
                {departments.map((d) => (
                  <div
                    key={d._id}
                    className={cn(
                      "flex items-center gap-2 p-1 rounded cursor-pointer",
                      reassignDeptFilter === d._id ? "bg-slate-100" : "",
                    )}
                    onClick={() =>
                      setReassignDeptFilter(
                        reassignDeptFilter === d._id ? null : d._id,
                      )
                    }
                  >
                    <div className="text-sm">{d.name}</div>
                    <div className="ml-auto text-xs text-gray-400">
                      {
                        users.filter(
                          (u) =>
                            u.department?._id === d._id ||
                            (Array.isArray(u.department) &&
                              u.department.some((x) => x && x._id === d._id)),
                        ).length
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign To (User)</Label>
              <div className="space-y-1 max-h-56 overflow-y-auto p-2 border rounded bg-white">
                {users
                  .filter(
                    (u) =>
                      !reassignDeptFilter ||
                      u.department?._id === reassignDeptFilter ||
                      (Array.isArray(u.department) &&
                        u.department.some(
                          (d) => d?._id === reassignDeptFilter,
                        )),
                  )
                  .map((u) => (
                    <div
                      key={u._id}
                      className={cn(
                        "flex items-center gap-2 p-1 rounded cursor-pointer",
                        reassignSelectedUser === u._id ? "bg-indigo-50" : "",
                      )}
                      onClick={() => setReassignSelectedUser(u._id)}
                    >
                      <input
                        type="radio"
                        name="reassign-user"
                        checked={reassignSelectedUser === u._id}
                        readOnly
                        className="accent-indigo-600"
                      />
                      <div className="text-sm">{u.name || u.email}</div>
                    </div>
                  ))}

                {users.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No users available.
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReassignSubmit}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isParentWithChildren ? "Delete Parent Task" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription>
              {isParentWithChildren ? (
                <div className="space-y-2 mt-2">
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-900 text-sm">
                    <p className="font-semibold mb-1">
                      ⚠️ This task is Parent task of ({childTasksCount}) task(s)
                    </p>
                    <p>
                      Deleting this parent task will also delete all{" "}
                      {childTasksCount} dependent task(s). This action cannot be
                      undone.
                    </p>
                  </div>
                </div>
              ) : (
                "Are you sure you want to delete this task? This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>

          {isParentWithChildren && (
            <div className="space-y-2 py-2">
              <Label htmlFor="delete-remark">Remark (Optional)</Label>
              <Textarea
                id="delete-remark"
                placeholder="Enter a remark or reason for deleting this task and its dependents..."
                value={deleteRemark}
                onChange={(e) => setDeleteRemark(e.target.value)}
                className="min-h-24 resize-none"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className={
                isParentWithChildren ? "bg-red-600 hover:bg-red-700" : ""
              }
            >
              {isParentWithChildren ? "Delete Parent & Dependents" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CHECKLIST VIEW DIALOG --- */}
      <Dialog
        open={isChecklistDialogOpen}
        onOpenChange={setIsChecklistDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Task Checklist</DialogTitle>
            <DialogDescription>
              Complete all items to finish the task.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {(checklistItems || []).map((item, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-50"
              >
                <Checkbox
                  id={`checklist-${index}`}
                  checked={item.isCompleted}
                  onChange={() => handleChecklistChange(index)}
                />
                <label
                  htmlFor={`checklist-${index}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                >
                  {item.text}
                </label>
              </div>
            ))}
            {(!checklistItems || checklistItems.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">
                This task has no checklist items.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChecklistDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteTaskFromChecklist}
              disabled={!checklistItems || checklistItems.length === 0}
            >
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- IMPORT DIALOG --- */}
      <Dialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        className="sm:max-w-6xl"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Import {importTaskType ? templates[importTaskType].name : ""}s
            </DialogTitle>
            <DialogDescription>
              Follow the steps below to bulk import tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column: Instructions */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-gray-500" />
                Required Columns Structure
              </h4>
              <div className="grid grid-cols-2 gap-4 p-3 bg-white border border-gray-200 rounded-lg">
                <div>
                  <h5 className="font-semibold mb-2 text-sm text-gray-800">
                    Required Fields
                  </h5>
                  {importTaskType &&
                    templates[importTaskType].columns
                      .filter((c) => c.required)
                      .map((col, index) => (
                        <div
                          key={index}
                          className="flex items-center mb-1 gap-0 px-3 py-1.5 rounded-md text-xs font-semibold border bg-red-50 text-red-700 border-red-200"
                        >
                          <span>{col.name}</span>({col.type})
                        </div>
                      ))}
                </div>
                <div>
                  <h5 className="font-semibold mb-2 text-sm text-gray-800">
                    Optional Fields
                  </h5>
                  {importTaskType &&
                    templates[importTaskType].columns
                      .filter((c) => !c.required)
                      .map((col, index) => (
                        <div
                          key={index}
                          className="flex items-center mb-1 gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border bg-gray-100 text-gray-600 border-gray-200"
                        >
                          <span>{col.name}</span>({col.type})
                        </div>
                      ))}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="w-full mt-2"
              >
                <Download className="mr-2 h-3 w-3" />
                Download {importTaskType
                  ? templates[importTaskType].name
                  : ""}{" "}
                CSV Template
              </Button>
            </div>

            {/* Right Column: Upload */}
            <div className="space-y-4">
              {/* Attachment Upload */}
              <div className="space-y-2">
                <Label className="font-semibold">
                  Upload Attachments (Optional)
                </Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    ref={attachmentFileInputRef}
                    onChange={handleAttachmentFileChange}
                    className="hidden"
                    multiple
                  />
                  <input
                    type="file"
                    ref={attachmentFolderInputRef}
                    onChange={handleAttachmentFileChange}
                    className="hidden"
                    webkitdirectory="true"
                  />
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      onClick={handleAttachmentFilesClick}
                      disabled={isUploadingAttachment}
                      variant="outline"
                    >
                      <FileText className="mr-2 h-4 w-4" /> Select Files
                    </Button>
                    <Button
                      onClick={handleAttachmentFolderClick}
                      disabled={isUploadingAttachment}
                      variant="outline"
                    >
                      <Folder className="mr-2 h-4 w-4" /> Select Folder
                    </Button>
                  </div>
                  {isUploadingAttachment && (
                    <p className="text-sm text-gray-500 mt-2">
                      Uploading attachments...
                    </p>
                  )}
                  {uploadedAttachmentBackendNames.length > 0 &&
                    !isUploadingAttachment && (
                      <p className="text-sm text-green-600 mt-2">
                        {uploadedAttachmentBackendNames.length} files attached
                        successfully.
                      </p>
                    )}
                </div>
              </div>
              {/* Main File Upload */}
              <div className="space-y-2">
                <Label className="font-semibold">Upload Data File</Label>
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                  >
                    <UploadCloud className="w-14 h-14 text-gray-400 mb-2" />
                    <span className="text-sm font-semibold text-blue-600">
                      Click to upload
                    </span>
                    <span className="text-xs text-gray-500">
                      or drag and drop
                    </span>
                  </label>
                  {uploadFile && (
                    <div className="mt-4 text-center text-sm text-green-600 font-medium">
                      <p>Selected: {uploadFile.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Error Display */}
            {importError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-3">
                <div className="flex items-start gap-3">
                  <div className="text-red-600 text-lg">⚠️</div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">
                      Import Validation Summary
                    </p>

                    <p className="text-sm text-red-700 mt-1">{importError}</p>

                    {errorFileUrl && (
                      <a
                        href={errorFileUrl}
                        download
                        className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-red-800 hover:text-red-900 underline"
                      >
                        Download Detailed Error Report
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!uploadFile || isImporting}
              >
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TaskTable;
