import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyTasks,
  fetchTaskCounts,
  getFilterTasks,
  getRoleBasedTasks,
} from "../../redux/slices/myTask/myTaskSlice.js";
import api from "../../lib/api.js";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  History,
  Search,
  Download,
  RefreshCcw,
  AlertCircle,
  Clock,
  CheckCircle2,
  ClipboardList,
  Clock1,
  Clock2Icon,
  MessageCircle,
  MessageSquarePlus,
  RotateCcw,
  Layers,
  Zap,
} from "lucide-react";
import * as XLSX from "xlsx";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table.jsx";
import { Badge } from "../../components/ui/badge.jsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip.jsx";
import { Progress } from "../../components/ui/progress.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog.jsx";
import { Checkbox } from "../../components/ui/checkbox.jsx";
import { useDebounce } from "../../lib/debounce.js";
import ViewLink from "./attachmentViewer.jsx";
import {
  formatDate,
  formatLabel,
  getDueStatus,
} from "../../lib/utilFunctions.js";
import { fetchTasksWithStats } from "../../redux/slices/task/taskSlice.js";
import { Label } from "../../components/ui/index.jsx";
import dayjs from "dayjs";
import TaskChat from "../../components/TaskChat.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { Popover } from "antd";

// --- Helper Components ---

// Priority Badge
const PriorityBadge = ({ priority }) => {
  const config = {
    high: { label: "High", class: "bg-red-100 text-red-800 border-red-200" },
    medium: {
      label: "Medium",
      class: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    low: {
      label: "Low",
      class: "bg-green-100 text-green-800 border-green-200",
    },
  };

  const { label, class: className } =
    config[priority?.toLowerCase()] || config.medium;

  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  );
};

// Status Badges with icons
const getStatusBadge = (status) => {
  switch (status) {
    case "Overdue":
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {status}
        </Badge>
      );
    case "Due Today":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-yellow-600 border-yellow-300 bg-yellow-50"
        >
          <Clock className="h-3 w-3" />
          {status}
        </Badge>
      );
    case "Completed":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-green-600 border-green-300 bg-green-50"
        >
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Enhanced Today's Task Actions
const TodayTaskActions = ({
  activeTab,
  task,
  onChecklist,
  onFillForm,
  setSelectedQueryTask,
  setQueryDrawerOpen,
  unreadCount,
  setUnreadMap,
  setReopenTask,
  setReopenModalOpen,
}) => {
  const checkList =
    task.checklist && Array.isArray(task.checklist) ? task.checklist : [];
  const form =
    task.createdForm && Array.isArray(task.createdForm) ? task.createdForm : [];
  const isCompleteActiveTab = activeTab == "completed";
  const alreadyReopened = task?.isReopen;
  const fmsType = task.taskType == "FmsInstanceTask";
  return (
    <TooltipProvider>
      <div className="flex gap-1">
        {!isCompleteActiveTab && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-600 hover:bg-gray-50 cursor-pointer"
                onClick={() => onChecklist(task)}
                disabled={checkList && checkList.length === 0}
              >
                <ClipboardList className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Checklist</p>
            </TooltipContent>
          </Tooltip>
        )}
        {!isCompleteActiveTab && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={form && form.length === 0}
                className="h-8 w-8 text-blue-600 hover:bg-blue-50 cursor-pointer"
                onClick={() => onFillForm(task)}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fill Form</p>
            </TooltipContent>
          </Tooltip>
        )}
        {!isCompleteActiveTab && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full cursor-pointer text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
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
        )}{" "}
        {isCompleteActiveTab && !fmsType && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={alreadyReopened}
                onClick={() => {
                  setReopenTask(task);
                  setReopenModalOpen(true);
                }}
                className={`h-8 w-8 cursor-pointer ${
                  alreadyReopened
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-yellow-600 hover:bg-yellow-50"
                }`}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              <p>{alreadyReopened ? "Task already reopened" : "Reopen Task"}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

// Task Progress Component
const TaskProgress = ({ completed, total }) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <Progress value={percentage} className="w-24" />
      <span className="text-sm text-gray-600">
        {completed}/{total}
      </span>
    </div>
  );
};

// Stats Cards Component
const StatsCards = ({ allTaskCounts, selectedStat, onStatClick }) => {
  if (!allTaskCounts) return;
  const getCardClass = (type, color) => `
    cursor-pointer transition-all duration-200 transform hover:scale-105
    ${selectedStat === type ? `ring-2 ring-${color}-500 shadow-lg` : ""}
  `;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card
        className={`${getCardClass("total", "blue")} bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200`}
        onClick={() => onStatClick("total")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Total Assigned
              </p>
              <p className="text-2xl font-bold text-blue-700">
                {allTaskCounts?.total || 0}
              </p>
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
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">Pending</p>
              <p className="text-2xl font-bold text-yellow-800">
                {allTaskCounts?.counts?.Pending || 0}
              </p>
            </div>

            <div className="p-2 bg-yellow-200 rounded-lg">
              <Clock2Icon className="h-6 w-6 text-yellow-700" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card
        className={`${getCardClass("overdue", "red")} bg-gradient-to-br from-red-50 to-red-100 border-red-200`}
        onClick={() => onStatClick("overdue")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Overdue</p>
              <p className="text-2xl font-bold text-red-700">
                {allTaskCounts?.counts?.Overdue || 0}
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
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-700">
                {allTaskCounts?.counts?.Completed || 0}
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

const FilterBar = ({
  searchTerm,
  setSearchTerm,
  selectedFilterStatus,
  setSelectedFilterStatus,
  showExport = false,
  onExport,
  isExporting,
  doers,
  managers,
  srManagers,
  selectedDoer,
  setSelectedDoer,
  selectedManager,
  setSelectedManager,
  selectedSrManager,
  setSelectedSrManager,
  currentUser,
}) => {
  const handleFilterChange = (setter, value) => {
    setter(value);
  };

  const userRole = currentUser?.role?.name;
  const isAdminOrOwner = userRole === "Admin" || userRole === "Owner";
  const isSrManager = userRole === "Sr. Manager";

  return (
    <div className="flex flex-col md:flex-row gap-3 p-4 bg-gray-50 rounded-lg border">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by Task ID or Title..."
          className="pl-10 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 flex-[2]">
        {/* All Sr. Managers Filter */}
        <Select
          value={selectedSrManager}
          onValueChange={(val) =>
            handleFilterChange(setSelectedSrManager, val)
          }
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="All Sr. Managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-semibold text-purple-700">
              All Sr. Managers
            </SelectItem>
            {srManagers.map((srManager) => (
              <SelectItem key={srManager._id} value={srManager._id}>
                {srManager.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* All Managers Filter */}
        <Select
          value={selectedManager}
          onValueChange={(val) => handleFilterChange(setSelectedManager, val)}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="All Managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-semibold text-green-700">
              All Managers
            </SelectItem>
            {managers.map((manager) => (
              <SelectItem key={manager._id} value={manager._id}>
                {manager.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* All Doers Filter */}
        <Select
          value={selectedDoer}
          onValueChange={(val) => handleFilterChange(setSelectedDoer, val)}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="All Doers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-semibold text-blue-700">
              All Doers
            </SelectItem>
            {doers.map((doer) => (
              <SelectItem key={doer._id} value={doer._id}>
                {doer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedFilterStatus}
          onValueChange={setSelectedFilterStatus}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
            <SelectItem value="Due Today">Due Today</SelectItem>
            <SelectItem value="Reopened">Re-opened</SelectItem>
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

// --- Main Component ---
const PCView = () => {
  const dispatch = useDispatch();
  const {
    tasks: fetchedTasks,
    taskCounts,
    status,
    totalTasks,
  } = useSelector((state) => state.myTasks);
  const { currentUser } = useSelector((state) => state.users);
  const { socket } = useSocket();

  const location = useLocation();
  const source = location.state?.source;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilterStatus, setSelectedFilterStatus] = useState("all");
  const [selectedDoer, setSelectedDoer] = useState("all");
  const [selectedManager, setSelectedManager] = useState("all");
  const [selectedSrManager, setSelectedSrManager] = useState("all");
  const [selectedAssignor, setSelectedAssignor] = useState("all");
  const [activeTab, setActiveTab] = useState("today");
  
  // ⚡ SUB-TAB ENGINE FILTER ("all" | "dothis" | "fms")
  const [engineViewTab, setEngineViewTab] = useState("all");

  const [selectedStatFilter, setSelectedStatFilter] = useState(null);
  useEffect(() => {
    if (!source) return;
    setSelectedStatFilter(source);
  }, [source]);

  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localItemsPerPage, setLocalItemsPerPage] = useState(10);
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [fullDescription, setFullDescription] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [doers, setDoers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [srManagers, setSrManagers] = useState([]);

  // Dialog states for new actions
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [selectedTaskForChecklist, setSelectedTaskForChecklist] =
    useState(null);
  const [checklistItems, setChecklistItems] = useState([]);

  const [isFillFormDialogOpen, setIsFillFormDialogOpen] = useState(false);
  const [selectedTaskForForm, setSelectedTaskForForm] = useState(null);
  const [queryDrawerOpen, setQueryDrawerOpen] = useState(false);
  const [selectedQueryTask, setSelectedQueryTask] = useState(null);
  const [unreadMap, setUnreadMap] = useState({});

  // Reopened task state
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenTask, setReopenTask] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenLoading, setReopenLoading] = useState(false);
  const [refreshTaskAfterReopen, setRefreshTaskAfterReopen] = useState(false);

  const handleReopenTask = async () => {
    if (!reopenReason.trim()) {
      toast.error("Please enter reopen reason");
      return;
    }
    try {
      setReopenLoading(true);

      await api.patch(`/tasks/${reopenTask._id}/reopen`, {
        reason: reopenReason,
      });

      toast.success("Task reopened successfully");

      setReopenModalOpen(false);
      setReopenTask(null);
      setReopenReason("");

      // RESET FILTERS
      setActiveTab("today");
      setSelectedStatFilter("total");
      setSelectedFilterStatus("all");

      // RESET PAGINATION + SEARCH
      setLocalCurrentPage(1);
      setSearchTerm("");

      // TRIGGER REFRESH
      setRefreshTaskAfterReopen((prev) => !prev);

      fetchTasksForDashboard();
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Failed to reopen task");
    } finally {
      setReopenLoading(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    if (selectedQueryTask?.conversationId) {
      socket.emit("join-conversation", selectedQueryTask.conversationId);
    }

    return () => {
      if (selectedQueryTask?.conversationId) {
        socket.emit("leave-conversation", selectedQueryTask.conversationId);
      }
    };
  }, [socket, selectedQueryTask?.conversationId]);

  useEffect(() => {
    if (!socket) return;

    const handleUnread = ({ conversationId, count }) => {
      setUnreadMap((prev) => ({
        ...prev,
        [conversationId]: count,
      }));
    };

    socket.on("unread-count", handleUnread);

    return () => {
      socket.off("unread-count", handleUnread);
    };
  }, [socket]);

  const viewHeading = "PC view";

  // --- Initial Data Load (Task Counts) ---
  useEffect(() => {
    if (currentUser?._id) {
      setSelectedAssignor(currentUser._id);
    }
  }, [currentUser, dispatch]);

  // Fetch counts for stats
  const [allTaskCounts, setAllTaskCounts] = useState(null);

  const fetchTasksForDashboard = async () => {
    try {
      const res = await dispatch(
        fetchTasksWithStats({
          userId: currentUser?._id,
          role: currentUser?.role?.name,
        }),
      ).unwrap();
      setAllTaskCounts(res);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchTasksForDashboard();
  }, [currentUser, reopenLoading, refreshTaskAfterReopen]);

  // --- Fetch Users for Filters ---
  const [allUsers, setAllUsers] = useState([]);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/setup/users/allUsers");
        const users = response.data?.data || [];
        setAllUsers(users);

        const doers = users.filter((u) => u.role?.name === "member");
        const managers = users.filter((u) => u.role?.name === "manager");
        const srManagers = users.filter((u) => u.role?.name === "sr._manager");

        setDoers(doers);
        setManagers(managers);
        setSrManagers(srManagers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast.error("Could not load users.");
      }
    };

    if (currentUser?._id) {
      fetchUsers();
    }
  }, [currentUser]);

  // --- HANDLER: Stats Card Click ---
  const handleStatClick = (statType) => {
    if (statType === "dueToday" || statType === "overdue") {
      setSelectedStatFilter(statType);
      const statusMap = { dueToday: "Due Today", overdue: "Overdue" };
      setSelectedFilterStatus(statusMap[statType]);
    } else if (statType === "completed") {
      setSelectedStatFilter(statType);
      setSelectedFilterStatus("Completed");
    } else if (statType === "pending") {
      setSelectedStatFilter(statType);
      setSelectedFilterStatus("Pending");
    } else {
      setSelectedStatFilter(statType);
      setSelectedFilterStatus("all");
    }
    setLocalCurrentPage(1);
    setSearchTerm("");

    if (statType === "completed") setActiveTab("completed");
    else if (
      statType === "overdue" ||
      statType === "dueToday" ||
      statType == "total"
    )
      setActiveTab("today");
  };

  const debouncedSearch = useDebounce(searchTerm);

  const getDepartmentIds = (department) => {
    try {
      const parsed =
        typeof department === "string" ? JSON.parse(department) : department;

      if (!Array.isArray(parsed)) return [];

      return parsed.map((dep) => (typeof dep === "object" ? dep._id : dep));
    } catch (e) {
      return [];
    }
  };
  const departmentId = getDepartmentIds(currentUser?.department);

  // ⚡ SERVER-SIDE FETCH TRIGGER PASSING taskTypeFilter
  useEffect(() => {
    if (currentUser?._id) {
      dispatch(
        getRoleBasedTasks({
          userId: currentUser._id,
          role: currentUser.role?.name,
          departmentId: departmentId,
          page: localCurrentPage,
          limit: localItemsPerPage,
          selectedDoer,
          selectedManager,
          selectedSrManager,
          search: debouncedSearch,
          taskTypeFilter: engineViewTab, // 👈 PASSES SUB-TAB TO BACKEND
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
            status:
              selectedFilterStatus === "all" ? null : selectedFilterStatus,
          },
        }),
      );
    }
  }, [
    currentUser,
    dispatch,
    activeTab,
    engineViewTab, // Refetch when sub-tab changes
    selectedStatFilter,
    selectedFilterStatus,
    selectedDoer,
    selectedManager,
    selectedSrManager,
    localCurrentPage,
    localItemsPerPage,
    debouncedSearch,
    reopenLoading,
    refreshTaskAfterReopen,
  ]);

  // ⚡ DYNAMIC HEADERS FOR FMS SUBMISSION DATA (isTableColumn === true)
  const dynamicFmsHeaders = useMemo(() => {
    const headersMap = new Map();

    if (!Array.isArray(fetchedTasks)) return [];

    fetchedTasks.forEach((task) => {
      if (task.taskType === "FmsInstanceTask" && task.submissionData) {
        Object.values(task.submissionData).forEach((field) => {
          if (field && field.isTableColumn === true && field.label) {
            headersMap.set(field.label, field.label);
          }
        });
      }
    });

    return Array.from(headersMap.values());
  }, [fetchedTasks]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <RefreshCcw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // --- Handlers ---
  const handleTabChange = (value) => {
    setActiveTab(value);
    setSelectedStatFilter(null);
    setSelectedFilterStatus("all");
    setLocalCurrentPage(1);
    setSearchTerm("");
    setSelectedDoer("all");
    setSelectedManager("all");
    setSelectedSrManager("all");
  };

  const handleChecklistClick = (task) => {
    setSelectedTaskForChecklist(task);
    setChecklistItems(task.checklist || []);
    setIsChecklistDialogOpen(true);
  };

  const handleFillFormClick = (task) => {
    setSelectedTaskForForm(task);
    setIsFillFormDialogOpen(true);
  };

  const handleViewDescription = (desc) => {
    setFullDescription(desc);
    setIsDescriptionDialogOpen(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dataToExport = fetchedTasks.map((task, index) => ({
        "Sr. No.": (localCurrentPage - 1) * localItemsPerPage + index + 1,
        "Task ID": task.TaskId || "-",
        "Task Title": task.title || "-",
        "Assigned To": task.assignedTo?.name || "-",
        Description: task.description || "-",
        Type: task.taskType || "-",
        Attachment: task.attachmentFile ? "Yes" : "No",
        "Start Date": task.startDate
          ? new Date(task.startDate).toLocaleDateString()
          : "-",
        "Due Date": task.dueDate
          ? new Date(task.dueDate).toLocaleDateString()
          : "-",
        Status: task.status || "-",
      }));

      if (dataToExport.length === 0) {
        toast.warning("No data to export");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ManagerTasks");
      const timestamp = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `ManagerTasks_${timestamp}.xlsx`);
      toast.success("Export completed successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  // --- Dynamic Table Headers ---
  const CommonTableHeaders = () => (
    <TableHeader>
      <TableRow>
        <TableHead>Sr. No.</TableHead>
        <TableHead>Task Id</TableHead>
        <TableHead>Task Title</TableHead>
        <TableHead>Description</TableHead>

        {/* ⚡ RENDER DYNAMIC HEADERS FOR FMS SUBMISSION DATA (ONLY IN FMS SUB-TAB) */}
        {engineViewTab === "fms" &&
          dynamicFmsHeaders.map((headerLabel) => (
            <TableHead key={headerLabel} className="font-semibold text-blue-700 whitespace-nowrap">
              {headerLabel}
            </TableHead>
          ))}

        <TableHead>Assigned By</TableHead>
        <TableHead>Assigned To</TableHead>
        <TableHead>Type</TableHead>
        <TableHead>Attachment</TableHead>
        <TableHead>Start Date & Time</TableHead>
        <TableHead>Due Date & Time</TableHead>
        <TableHead>Time left</TableHead>
        <TableHead>Status</TableHead>
        {/* <TableHead>Actions</TableHead> */}
      </TableRow>
    </TableHeader>
  );

  // --- Common Row Render Logic ---
  const renderCommonRow = (task, index) => {
    const assignedByUser =
      Array.isArray(allUsers) && allUsers.length > 0
        ? allUsers.find((u) => u._id === task.assignedBy?._id)
        : null;
    const assignedToUser =
      Array.isArray(allUsers) && allUsers.length > 0
        ? allUsers.find((u) => u._id === task.assignedTo?._id)
        : null;

    return (
      <TableRow
        key={task._id}
        className={`
          ${task.isOverdue ? "bg-red-50" : ""}
          ${task.isReopen ? "bg-yellow-50 border-l-4 border-yellow-500" : ""}
        `}
      >
        <TableCell>
          {(localCurrentPage - 1) * localItemsPerPage + index + 1}
        </TableCell>
        <TableCell>{task.TaskId || "-"}</TableCell>
        <TableCell className="font-medium">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{task.title}</span>

              {task.isReopen && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                  <RotateCcw className="h-3 w-3" />
                  Reopened
                </span>
              )}
            </div>

            {task.reopenedReason && (
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
                            {task.reopenedAt
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

                      {task.reopenedBy?.name && (
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

            {task.isReopen && task.reopenedAt && (
              <span className="text-[11px] text-gray-500">
                Reopened on {formatDate(task.reopenedAt)}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Button
            variant="link"
            className="p-0 h-auto text-blue-600"
            onClick={() => handleViewDescription(task.description)}
            disabled={!task.description}
          >
            View
          </Button>
        </TableCell>

        {/* ⚡ RENDER DYNAMIC CELLS FOR FMS SUBMISSION DATA */}
        {engineViewTab === "fms" &&
          dynamicFmsHeaders.map((headerLabel) => {
            const matchedField = task.submissionData
              ? Object.values(task.submissionData).find(
                  (f) => f && f.isTableColumn === true && f.label === headerLabel
                )
              : null;

            const rawVal = matchedField?.value;
            let displayVal = rawVal ?? "-";

            if (matchedField?.fieldType === "date" && rawVal) {
              displayVal = dayjs(rawVal).format("DD MMM YYYY");
            }

            return (
              <TableCell key={headerLabel} className="font-medium text-gray-700 whitespace-nowrap">
                {String(displayVal)}
              </TableCell>
            );
          })}

        <TableCell>
          <div className="flex flex-row gap-1">
            <span className="text-sm font-medium text-gray-900">
              {task.assignedBy?.name || "-"}
            </span>
            {assignedByUser?.name && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium ${
                  assignedByUser.role?.name === "admin"
                    ? "bg-red-100 text-red-700"
                    : assignedByUser.role?.name === "owner"
                      ? "bg-purple-100 text-purple-700"
                      : assignedByUser.role?.name === "sr._manager"
                        ? "bg-blue-100 text-blue-700"
                        : assignedByUser.role?.name === "manager"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                }`}
              >
                {assignedByUser.role?.name}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-row gap-1">
            <span className="text-sm font-medium text-gray-900">
              {task.assignedTo?.name || "-"}
            </span>

            {assignedToUser?.name && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full w-fit font-medium ${
                  assignedToUser.role?.name === "admin"
                    ? "bg-red-100 text-red-700"
                    : assignedToUser.role?.name === "owner"
                      ? "bg-purple-100 text-purple-700"
                      : assignedToUser.role?.name === "sr._manager"
                        ? "bg-blue-100 text-blue-700"
                        : assignedToUser.role?.name === "manager"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                }`}
              >
                {assignedToUser.role?.name}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              task.taskType === "FmsInstanceTask"
                ? "bg-blue-100 text-blue-700"
                : task.taskType === "RecurringTask"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {task.taskType === "FmsInstanceTask"
              ? "FMS"
              : task.taskType === "RecurringTask"
                ? "Recurring"
                : "Delegation"}
          </span>
        </TableCell>
        <TableCell>
          {Array.isArray(task?.attachmentFile) &&
          task.attachmentFile.length > 0 ? (
            <ViewLink file={task.attachmentFile} />
          ) : (
            "NA"
          )}
        </TableCell>
        <TableCell>
          {task.startDate ? formatDate(task.startDate) : "-"}
        </TableCell>
        <TableCell>{task.dueDate ? formatDate(task.dueDate) : "-"}</TableCell>
        <TableCell className="whitespace-nowrap">
          {(() => {
            const dueStatus = getDueStatus(task.dueDate);

            if (!dueStatus) return "-";
            if (task.status === "Completed") return;

            return (
              <div
                className={`relative inline-flex items-center overflow-hidden rounded-lg border bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
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
                      className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        dueStatus.type === "overdue"
                          ? "bg-red-500 animate-ping"
                          : dueStatus.type === "today"
                            ? "bg-amber-500 animate-ping"
                            : "bg-emerald-500 animate-ping"
                      }`}
                    />
                  )}

                  <span
                    className={`relative inline-flex h-3 w-3 rounded-full ${
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
                    className={`text-xs font-semibold ${
                      dueStatus.type === "overdue"
                        ? "text-red-700"
                        : dueStatus.type === "today"
                          ? "text-amber-700"
                          : "text-emerald-700"
                    }`}
                  >
                    {dueStatus.type === "overdue"
                      ? "Overdue"
                      : dueStatus.type === "today"
                        ? "Due Today"
                        : "Remaining"}
                  </p>

                  <p className="text-[11px] text-muted-foreground">
                    {dueStatus.text}
                  </p>
                </div>
              </div>
            );
          })()}
        </TableCell>
        <TableCell>{getStatusBadge(task.status)}</TableCell>
      </TableRow>
    );
  };

  const renderTableContent = () => (
    <div className="space-y-4">
      {/* ⚡ SUB-TAB ENGINE FILTER BUTTONS */}
      <div className="flex items-center gap-2 border-b pb-3 pt-1">
        <Button
          variant={engineViewTab === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setEngineViewTab("all");
            setLocalCurrentPage(1);
          }}
          className="rounded-full text-xs font-medium cursor-pointer"
        >
          All Tasks
        </Button>
        <Button
          variant={engineViewTab === "dothis" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setEngineViewTab("dothis");
            setLocalCurrentPage(1);
          }}
          className="rounded-full text-xs font-medium cursor-pointer flex items-center gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" />
          Delegation & Recurring
        </Button>
        <Button
          variant={engineViewTab === "fms" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setEngineViewTab("fms");
            setLocalCurrentPage(1);
          }}
          className="rounded-full text-xs font-medium cursor-pointer flex items-center gap-1.5"
        >
          <Zap className="h-3.5 w-3.5" />
          FMS Engine Tasks
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <CommonTableHeaders />
          <TableBody>
            {fetchedTasks.length > 0 ? (
              fetchedTasks.map((task, index) =>
                renderCommonRow(task, index),
              )
            ) : (
              <TableRow>
                <TableCell
                  colSpan={12 + (engineViewTab === "fms" ? dynamicFmsHeaders.length : 0)}
                  className="text-center py-8 text-gray-500"
                >
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 py-4">
      <div className="shadow-xl border-0 overflow-hidden rounded-xl bg-white">
        <div className="p-4 py-4">
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 border-y border-white/30 rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <div className="text-2xl font-bold">{viewHeading}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <StatsCards
            allTaskCounts={allTaskCounts}
            selectedStat={selectedStatFilter}
            onStatClick={handleStatClick}
          />

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4 p-1 bg-gray-100 rounded-lg">
              <TabsTrigger value="today">Today's Task</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming Tasks</TabsTrigger>
              <TabsTrigger value="completed">Completed Tasks</TabsTrigger>
              <TabsTrigger value="escalated">Escalated</TabsTrigger>
            </TabsList>

            <FilterBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedFilterStatus={selectedFilterStatus}
              setSelectedFilterStatus={setSelectedFilterStatus}
              showExport={true}
              onExport={handleExport}
              isExporting={isExporting}
              doers={doers}
              selectedDoer={selectedDoer}
              setSelectedDoer={setSelectedDoer}
              managers={managers}
              selectedManager={selectedManager}
              setSelectedManager={setSelectedManager}
              srManagers={srManagers}
              selectedSrManager={selectedSrManager}
              setSelectedSrManager={setSelectedSrManager}
              selectedAssignor={selectedAssignor}
              setSelectedAssignor={setSelectedAssignor}
              currentUser={currentUser}
            />

            {status === "loading" && (
              <div className="text-center py-10">
                <RefreshCcw className="animate-spin h-6 w-6 text-blue-500 mx-auto" />
              </div>
            )}
            {status !== "loading" && (
              <>
                <TabsContent value="today" className="">
                  {renderTableContent()}
                </TabsContent>

                <TabsContent value="upcoming" className="">
                  {renderTableContent()}
                </TabsContent>

                <TabsContent value="completed" className="">
                  {renderTableContent()}
                </TabsContent>

                <TabsContent value="escalated" className="">
                  {renderTableContent()}
                </TabsContent>

                <Pagination
                  totalItems={totalTasks || 0}
                  itemsPerPage={localItemsPerPage}
                  setItemsPerPage={setLocalItemsPerPage}
                  currentPage={localCurrentPage}
                  onPageChange={setLocalCurrentPage}
                  isLoading={status === "loading"}
                />
              </>
            )}
          </Tabs>
        </div>
      </div>

      {/* --- DIALOGS --- */}
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
            {checklistItems?.length > 0 ? (
              <ul className="space-y-2">
                {checklistItems.map((item, index) => {
                  const isObject = typeof item === "object";

                  const text = isObject
                    ? item.text || item.title || "Untitled"
                    : item;

                  const isCompleted = isObject
                    ? (item.isCompleted ?? item.completed ?? false)
                    : false;

                  return (
                    <li
                      key={item?._id || index}
                      className="flex items-center p-2 bg-gray-50 rounded-md border"
                    >
                      <Checkbox
                        id={`chk-${index}`}
                        checked={isCompleted}
                        disabled
                        className="mr-3"
                      />

                      <label
                        className={`text-sm ${
                          isCompleted
                            ? "line-through text-gray-500"
                            : "text-gray-800"
                        }`}
                      >
                        {text}
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                No checklist items for this task.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsChecklistDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFillFormDialogOpen}
        onOpenChange={setIsFillFormDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Form for: {selectedTaskForForm?.title}</DialogTitle>
            <DialogDescription>
              Details for the assigned user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Name"
                value={selectedTaskForForm?.assignedTo?.name || "N/A"}
                readOnly
              />
              <Input
                label="Email"
                value={selectedTaskForForm?.assignedTo?.email || "N/A"}
                readOnly
              />
            </div>

            {selectedTaskForForm?.createdForm?.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-sm text-gray-600">
                  Submitted Details
                </h3>

                {selectedTaskForForm.createdForm.map((field) => {
                  const value =
                    selectedTaskForForm?.formData?.[field.fieldName];

                  return (
                    <div key={field._id} className="space-y-1">
                      <Label className="text-xs text-gray-500">
                        {formatLabel(field.fieldName)}
                      </Label>

                      {(field.fieldType === "text" ||
                        field.fieldType === "number") && (
                        <Input value={value || "-"} readOnly />
                      )}

                      {field.fieldType === "textarea" && (
                        <textarea
                          className="w-full border rounded-md p-2 text-sm bg-gray-50"
                          value={value || "-"}
                          readOnly
                        />
                      )}

                      {field.fieldType === "date" && (
                        <Input
                          value={
                            value ? dayjs(value).format("DD MMM YYYY") : "-"
                          }
                          readOnly
                        />
                      )}

                      {field.fieldType === "dropdown" && (
                        <Input
                          value={
                            field.options?.find((o) => o.value === value)
                              ?.label ||
                            value ||
                            "-"
                          }
                          readOnly
                        />
                      )}

                      {field.fieldType === "checkbox" && (
                        <div className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!value} readOnly />
                          <span>{value ? "Yes" : "No"}</span>
                        </div>
                      )}

                      {field.fieldType === "file" &&
                        (value ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline text-sm"
                          >
                            View File
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            No file uploaded
                          </span>
                        ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsFillFormDialogOpen(false)}>
              Close
            </Button>
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

      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reopen Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reopen Reason</label>

            <textarea
              rows={4}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Enter reopen reason..."
              className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReopenModalOpen(false)}
              disabled={reopenLoading}
            >
              Cancel
            </Button>

            <Button
              onClick={handleReopenTask}
              disabled={reopenLoading}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {reopenLoading ? "Reopening..." : "Reopen Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

export default PCView;