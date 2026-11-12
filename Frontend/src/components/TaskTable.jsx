import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Search,
  ListTodo,
  Users,
  Download,
  UploadCloud,
  FileText,
  FilePenLine,
  Folder,
  Trash2,
  ClipboardList,
  CheckCircle,
  Plus,
  Repeat,
  Hash,
  CheckSquare,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import api from "../lib/api";
import {
  Button as AntButton,
  Modal,
  TimePicker,
  Tabs as AntdTabs,
  Input as AntdInput,
  Select as AntdSelect,
  Dropdown,
  Button as AntdBTN,
  Checkbox as AntdCheckBox,
  DatePicker,
  Upload,
} from "antd";
import { SearchOutlined, SettingOutlined } from "@ant-design/icons";
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
import { getDueStatus } from "../lib/utilFunctions.js";
import dayjs from "dayjs";
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

      {editFileList.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {editFileList.map((file) => (
              <div
                key={file.uid}
                className="group border rounded-xl bg-white shadow-sm hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
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
                      handleRemove(file);
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

      {editFileList.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-6">
          No attachments uploaded yet
        </div>
      )}
    </div>
  );
};

const TaskTable = ({
  allTasks = [],
  totalTasks = 0,
  currentPageProp = 1,
  perPageProp = 10,
  tasksLoading,
  users = [],
  departments = [],
  currentUser,
  holidays = [],
  onRefreshTasks,
  onViewDescription,
  workingWeeks,
  canRead,
  canUpdate,
  canDelete,
}) => {
  // Filter and Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilterUser, setSelectedFilterUser] = useState("all");
  const [selectedFilterStatus, setSelectedFilterStatus] = useState("all");
  const [selectedFilterFreq, setSelectedFilterFreq] = useState("all");

  const [activeTabForExport, setActiveTabForExport] = useState("one-time");

  // Backend Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const debouncedSearch = useDebounce(searchTerm, 400);

  // Trigger Backend Fetch whenever Filters / Pagination change[cite: 1]
  useEffect(() => {
    onRefreshTasks({
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearch,
      userId: selectedFilterUser,
      status: selectedFilterStatus,
      frequency: selectedFilterFreq,
      type:
        activeTabForExport === "one-time" ? "DelegationTask" : "RecurringTask",
    });
  }, [
    debouncedSearch,
    selectedFilterUser,
    selectedFilterStatus,
    selectedFilterFreq,
    currentPage,
    itemsPerPage,
    activeTabForExport,
  ]);

  // Multiple selection states
  const [selectedOneTimeTaskIds, setSelectedOneTimeTaskIds] = useState([]);
  const [selectedRecurringTaskIds, setSelectedRecurringTaskIds] = useState([]);

  // Edit & Delete States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [selectedTaskForChecklist, setSelectedTaskForChecklist] =
    useState(null);
  const [checklistItems, setChecklistItems] = useState([]);

  // Reassign States
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignTask, setReassignTask] = useState(null);
  const [reassignSelectedUser, setReassignSelectedUser] = useState("");
  const [reassignDeptFilter, setReassignDeptFilter] = useState(null);

  // Delete Parent Task States
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
  const [taskEndDateOffset, setTaskEndDateOffset] = useState("");
  const [taskEndTime, setTaskEndTime] = useState(null);
  const [editChecklistItem, setEditChecklistItem] = useState("");
  const [editRecurrenceFrequency, setEditRecurrenceFrequency] =
    useState("daily");
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState();
  const [editWeeklyRecurrenceDays, setEditWeeklyRecurrenceDays] = useState([]);

  // Import Dialog States
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importTaskType, setImportTaskType] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [errorFileUrl, setErrorFileUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Attachment states
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadedAttachmentNames, setUploadedAttachmentNames] = useState([]);
  const [uploadedAttachmentBackendNames, setUploadedAttachmentBackendNames] =
    useState([]);
  const attachmentFileInputRef = useRef(null);
  const attachmentFolderInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("basic");
  const [editFileList, setEditFileList] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);

  // Helpers
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
        const files = (editingTask.attachmentFile || []).map((file, index) => ({
          uid: index.toString(),
          name: file.split("/").pop(),
          status: "done",
          url: `${import.meta.env.VITE_API_BASE_URL}/tasks/download?filePath=${encodeURIComponent(file)}`,
          filePath: file,
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
    if (file.filePath) {
      setRemovedFiles((prev) => [...prev, file.filePath]);
    }
    return true;
  };

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
      setEditRecurrenceFrequency("daily");
      setEditRecurrenceEndDate(data.dueDate ? new Date(data.dueDate) : null);
      setEditWeeklyRecurrenceDays([]);
    }

    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return toast.error("Title is required");
    if (!editDescription.trim()) return toast.error("Description is required");

    try {
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
          if (editDueDate) {
            formData.append("dueDate", format(editDueDate, "yyyy-MM-dd"));
          }
        }

        const existingFiles = editFileList
          .filter((file) => !file.originFileObj)
          .map((file) => file.filePath);

        formData.append("existingFiles", JSON.stringify(existingFiles));
        formData.append("removedFiles", JSON.stringify(removedFiles));

        editFileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append("attachmentFile", file.originFileObj);
          }
        });

        if (editChecklist.length > 0) {
          formData.append("checklist", JSON.stringify(editChecklist));
        }

        res = await api.put(
          `/tasks/${editingTask._id || editingTask.id}`,
          formData,
        );
      } else {
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
            payload.endDate = new Date(editRecurrenceEndDate).toISOString();
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
        setActiveTab("basic");
        setEditFileList([]);
        onRefreshTasks({ page: currentPage, limit: itemsPerPage });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task");
    }
  };

  const handleDeleteClick = (task) => {
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
          setIsDeleteOpen(false);
          onRefreshTasks({ page: currentPage, limit: itemsPerPage });
        }
      } else {
        const res = await api.delete(
          `/tasks/${taskToDelete._id || taskToDelete.id}`,
        );
        if (res.data?.success) {
          toast.success("Task deleted successfully");
          setIsDeleteOpen(false);
          onRefreshTasks({ page: currentPage, limit: itemsPerPage });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete task");
    }
  };

  const handleToggleComplete = async (task) => {
    const newStatus = task.status !== "Completed";
    try {
      const res = await api.patch(`/tasks/${task._id || task.id}/completion`, {
        completeStatus: newStatus,
      });
      if (res.data?.success) {
        toast.success(
          newStatus ? "Task marked as Completed" : "Task marked as Incomplete",
        );
        onRefreshTasks({ page: currentPage, limit: itemsPerPage });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleChecklistClick = (task) => {
    setSelectedTaskForChecklist(task);
    setChecklistItems(
      task.checklist ? JSON.parse(JSON.stringify(task.checklist)) : [],
    );
    setIsChecklistDialogOpen(true);
  };

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
        onRefreshTasks({ page: currentPage, limit: itemsPerPage });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reassign task");
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
      columns: [
        { name: "Task Title", type: "Text", required: true },
        { name: "Task Description", type: "Text", required: true },
        { name: "Assign To(Email)", type: "Text", required: true },
        { name: "Assign To(Name)", type: "Text", required: false },
        { name: "Assign To UserDepartment", type: "Text", required: true },
        { name: "Check List", type: "Optional", required: false },
        { name: "Start Date", type: "DD-MM-YYYY", required: true },
        { name: "Task End Days", type: "Number", required: true },
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
      ],
    },
    recurring: {
      name: "Recurring Task",
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
        },
        {
          name: "Week Days",
          type: "Text (Sunday, Monday, etc.)",
          required: true,
        },
        { name: "End Date", type: "DD-MM-YYYY", required: true },
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
      ],
    },
    dependent: {
      name: "Dependent Task",
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
        { name: "Frequency", type: "T+X days / T+X hours", required: true },
        { name: "X Value", type: "Number", required: true },
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
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data;
      toast.success(data.message);

      if (data.summary?.errors > 0 || data.summary?.skipped > 0) {
        setImportError(
          `Import completed with ${data.summary.errors} error(s) and ${data.summary.skipped} skipped row(s).`,
        );
        if (data.errorFile) {
          setErrorFileUrl(
            `${import.meta.env.VITE_API_BASE_URL}/tasks/download?filePath=${encodeURIComponent(data.errorFile)}`,
          );
        }
      } else {
        setImportError(null);
        setErrorFileUrl(null);
      }
      onRefreshTasks({ page: currentPage, limit: itemsPerPage });
    } catch (error) {
      setImportError(
        error.response?.data?.message || "Failed to import tasks.",
      );
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
      complete: () => {
        proceedWithUpload();
      },
      error: (err) => {
        toast.error(`CSV parsing failed: ${err.message}`);
        setImportError(`CSV parsing failed: ${err.message}`);
      },
    });
  };

  const [allUsers, setAllUsers] = useState([]);
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await api.get("/setup/users/allUsers");
        setAllUsers(response.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    if (currentUser?._id) {
      fetchAllUsers();
    }
  }, [currentUser]);

  // Column Configurations
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

  useEffect(() => {
    localStorage.setItem("taskTableColumns", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem(
      "recurringTaskColumns",
      JSON.stringify(recurringColumns),
    );
  }, [recurringColumns]);

  const renderColumnMenu = ({ title, columnsData, setColumnsData }) => (
    <div className="w-100 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
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

      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <AntdBTN
          size="small"
          className="rounded-lg border-gray-200 font-medium"
          onClick={() =>
            setColumnsData(
              columnsData.map((col) => ({ ...col, visible: true })),
            )
          }
        >
          Select All
        </AntdBTN>
        <AntdBTN
          size="small"
          className="rounded-lg border-gray-200 font-medium"
          onClick={() =>
            setColumnsData(
              columnsData.map((col) => ({ ...col, visible: false })),
            )
          }
        >
          Clear
        </AntdBTN>
        <AntdBTN
          size="small"
          type="primary"
          className="rounded-lg shadow-sm"
          onClick={() =>
            setColumnsData(
              columnsData.map((col) => ({
                ...col,
                visible: ["sr", "title", "status", "action"].includes(col.key),
              })),
            )
          }
        >
          Minimal
        </AntdBTN>
      </div>

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
              className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-200 ${
                column.visible
                  ? "border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    column.visible
                      ? "bg-white shadow-sm border border-blue-100"
                      : "bg-gray-100"
                  }`}
                >
                  <AntdCheckBox checked={column.visible} />
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  {column.label}
                </span>
              </div>
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
    </div>
  );

  // Bulk Deletions
  const toggleOneTaskSelection = (taskId) => {
    setSelectedOneTimeTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const handleSelectAllOneTimeTasks = () => {
    const currentIds = allTasks.map((t) => t._id);
    const isAllSelected = currentIds.every((id) =>
      selectedOneTimeTaskIds.includes(id),
    );
    if (isAllSelected) {
      setSelectedOneTimeTaskIds([]);
    } else {
      setSelectedOneTimeTaskIds(currentIds);
    }
  };

  const handleDeleteMultipleTasks = async () => {
    if (selectedOneTimeTaskIds.length === 0)
      return toast.error("Please select tasks");

    Modal.confirm({
      title: "Delete Selected Tasks",
      content: `Are you sure you want to delete ${selectedOneTimeTaskIds.length} selected task(s)?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          for (const taskId of selectedOneTimeTaskIds) {
            await api.delete(`/tasks/${taskId}`);
          }
          toast.success("Selected tasks deleted successfully");
          setSelectedOneTimeTaskIds([]);
          onRefreshTasks({ page: currentPage, limit: itemsPerPage });
        } catch (error) {
          toast.error(
            error.response?.data?.message || "Failed to delete tasks",
          );
        }
      },
    });
  };

  const toggleRecurringTaskSelection = (taskId) => {
    setSelectedRecurringTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const handleSelectAllRecurringTasks = () => {
    const currentIds = allTasks.map((t) => t._id);
    const isAllSelected = currentIds.every((id) =>
      selectedRecurringTaskIds.includes(id),
    );
    if (isAllSelected) {
      setSelectedRecurringTaskIds([]);
    } else {
      setSelectedRecurringTaskIds(currentIds);
    }
  };

  const handleDeleteMultipleRecurringTasks = async () => {
    if (selectedRecurringTaskIds.length === 0)
      return toast.error("Please select tasks");

    Modal.confirm({
      title: "Delete Selected Tasks",
      content: `Are you sure you want to delete ${selectedRecurringTaskIds.length} selected task(s)?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          for (const taskId of selectedRecurringTaskIds) {
            await api.delete(`/tasks/${taskId}`);
          }
          toast.success("Selected tasks deleted successfully");
          setSelectedRecurringTaskIds([]);
          onRefreshTasks({ page: currentPage, limit: itemsPerPage });
        } catch (error) {
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
              onClick={() =>
                onRefreshTasks({ page: currentPage, limit: itemsPerPage })
              }
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
          onValueChange={(val) => {
            setActiveTabForExport(val);
            setCurrentPage(1);
          }}
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

          {/* Filters Bar */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <AntdInput
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by title or description..."
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                allowClear
                size="large"
                style={{ borderRadius: 12 }}
              />
            </div>
            {/* User Filter */}
            <AntdSelect
              showSearch
              value={selectedFilterUser}
              onChange={(val) => {
                setSelectedFilterUser(val);
                setCurrentPage(1);
              }}
              placeholder="Filter by User"
              style={{ width: 180, height: "40px" }}
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.searchLabel ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={[
                {
                  value: "all",
                  label: (
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Users size={14} style={{ opacity: 0.5 }} />
                      All Users
                    </span>
                  ),
                  searchLabel: "All Users",
                },
                ...users.map((user) => ({
                  value: user._id,
                  label: user.name,
                  searchLabel: user.name,
                })),
              ]}
            />
            {/* Status Filter */}
            <Select
              value={selectedFilterStatus}
              onValueChange={(val) => {
                setSelectedFilterStatus(val);
                setCurrentPage(1);
              }}
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
            {activeTabForExport != "one-time" && (
              <Select
                value={selectedFilterFreq}
                onValueChange={(val) => {
                  setSelectedFilterFreq(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <ListTodo className="w-4 h-4 mr-2 opacity-50" />
                    All Frequencies
                  </SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Half Yearly">Half Yearly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* Column Visibility Menus */}
            {activeTabForExport === "one-time" ? (
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
            ) : (
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
              <div className="flex items-center justify-between">
                {activeTabForExport === "one-time" ? (
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

          {/* ONE TIME TASKS TAB */}
          <TabsContent value="one-time">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canDelete && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            allTasks.length > 0 &&
                            allTasks.every((t) =>
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
                    allTasks.length > 0 &&
                    allTasks.map((task, i) => {
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
                              {(currentPage - 1) * itemsPerPage + i + 1}
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
                              <span className="text-sm font-medium text-gray-900">
                                {task.assignedBy?.name || "-"}
                              </span>
                            </TableCell>
                          )}
                          {columns.find((c) => c.key === "assignedTo")
                            ?.visible && (
                            <TableCell>
                              <span className="text-sm font-medium text-gray-900">
                                {task.assignedTo?.name || "-"}
                              </span>
                            </TableCell>
                          )}
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
                                if (!dueStatus)
                                  return (
                                    <span className="text-gray-400 text-xs font-medium">
                                      —
                                    </span>
                                  );

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
                                  </div>
                                );
                              })()}
                            </TableCell>
                          )}
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
                                            task.status === "Completed" ||
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
                                            task.status === "Completed" ||
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
                                            task.status === "Completed" ||
                                            task.status === "Upcoming" ||
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
                                            currentUser?.role &&
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
                allTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center w-full text-gray-500">
                    No tasks found.
                  </div>
                )
              )}
            </div>

            {/* Backend Pagination */}
            <Pagination
              totalItems={totalTasks}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={(newLimit) => {
                setItemsPerPage(newLimit);
                setCurrentPage(1);
              }}
              currentPage={currentPage}
              onPageChange={(newPage) => setCurrentPage(newPage)}
              isLoading={tasksLoading}
            />
          </TabsContent>

          {/* RECURRING TASKS TAB */}
          <TabsContent value="recurrence">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canDelete && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            allTasks.length > 0 &&
                            allTasks.every((t) =>
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
                    allTasks.length > 0 &&
                    allTasks.map((task, i) => {
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
                              {(currentPage - 1) * itemsPerPage + i + 1}
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
                                let days =
                                  frequency === "weekly"
                                    ? task.weekDays
                                    : task.weekStartDay;
                                if (!days) return "-";
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
                              <span className="text-sm font-medium text-gray-900">
                                {task.assignedBy?.name || "-"}
                              </span>
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "assignedTo")
                            ?.visible && (
                            <TableCell className="w-100">
                              <span className="text-sm font-medium text-gray-900">
                                {task.assignedTo?.name || "-"}
                              </span>
                            </TableCell>
                          )}
                          {recurringColumns.find((c) => c.key === "department")
                            ?.visible && (
                            <TableCell className="w-100 whitespace-nowrap">
                              {task.departmentOfAssignToUser?.name || "-"}
                            </TableCell>
                          )}
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
                                            task.status === "Completed" ||
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
                                            task.status === "Completed" ||
                                            task.status === "Upcoming" ||
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
                                            currentUser?.role &&
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
                allTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center w-full text-gray-500">
                    No recurring tasks found.
                  </div>
                )
              )}
            </div>

            {/* Backend Pagination */}
            <Pagination
              totalItems={totalTasks}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={(newLimit) => {
                setItemsPerPage(newLimit);
                setCurrentPage(1);
              }}
              currentPage={currentPage}
              onPageChange={(newPage) => setCurrentPage(newPage)}
              isLoading={tasksLoading}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* EDIT DIALOG */}
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
                              "Selected date is a holiday for the assigned user's department.",
                            );
                            setEditStartDate(null);
                            return;
                          }
                          const dayName = selected.format("dddd").toLowerCase();
                          const activeSchedule =
                            getDeptWorkingSchedule(editAssignedTo);
                          if (!activeSchedule?.[dayName]) {
                            toast.error(
                              `Selected day (${dayName}) is not a working day.`,
                            );
                            setEditStartDate(null);
                            return;
                          }
                          setEditStartDate(selectedDateStr);
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
                        showTime={{ format: "hh:mm A", use12Hours: true }}
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
                            toast.error("Selected date is a holiday.");
                            setEditStartDate(null);
                            return;
                          }
                          const dayName = selected.format("dddd").toLowerCase();
                          const activeSchedule =
                            getDeptWorkingSchedule(editAssignedTo);
                          if (!activeSchedule?.[dayName]) {
                            toast.error(
                              `Selected day (${dayName}) is not a working day.`,
                            );
                            setEditStartDate(null);
                            return;
                          }
                          setEditStartDate(selectedDateStr);
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
                            min="1"
                          />
                        </div>
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
                            onChange={(time) =>
                              setTaskEndTime(time ? time.format("HH:mm") : null)
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <DatePicker
                          format="DD MMM YYYY hh:mm A"
                          showTime={{ format: "hh:mm A", use12Hours: true }}
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

      {/* REASSIGN DIALOG */}
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

      {/* DELETE CONFIRMATION DIALOG */}
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
                      {childTasksCount} dependent task(s).
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
                placeholder="Enter a remark..."
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

      {/* CHECKLIST VIEW DIALOG */}
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
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  {item.text}
                </label>
              </div>
            ))}
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

      {/* IMPORT DIALOG */}
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

            <div className="space-y-4">
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
