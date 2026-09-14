import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import api from "../lib/api";
import { fetchTasks } from "../redux/slices/task/taskSlice";

// Imports for new UI components and utilities
import { cn, frequencyMap } from "../components/utils"; // Keep frequencyMap here for now, might be needed in TaskTable
import {
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
  SelectContext,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  RadioGroup,
  RadioGroupContext,
  RadioGroupItem,
  Tabs,
  TabsContext,
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
  DropdownMenuContext,
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
} from "../components/ui/index.jsx";

// Import the new sub-components
import CreateTaskForm from "../components/CreateTaskForm";
import TaskTable from "../components/TaskTable";
import { fetchUsers } from "../redux/slices/user/userSlice.js";
import { getSubmodulePermissions } from "../utils/permissionUtils.js";

const TaskPage = () => {
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "delegation_task",
    isSuper,
  );
  // Global States (shared or needed by wrapper)
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [fullDescription, setFullDescription] = useState("");
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [workingWeeks, setWorkingWeeks] = useState(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Redux Integration
  const dispatch = useDispatch();
  const {
    tasks,
    status,
    error: reduxError,
  } = useSelector((state) => state.tasks);
  const { currentUser } = useSelector((state) => state.users);

  const allTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);
  const tasksLoading = status === "loading";

  // --- 1. Fetch Users & Departments & Holidays ---
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [userRes, deptRes, holidayRes, workingWeekRes] =
          await Promise.all([
            api.get("/setup/users/filter-allUsers"),
            api.get("/setup/departments/allDepartments"),
            api.get("/setup/holiday/allHolidays"),
            api.get("/setup/working-week"),
          ]);

        if (mounted) {
          const usersData = userRes?.data?.data || [];
          const departmentsData = deptRes?.data?.data || [];
          const holidaysData = holidayRes?.data?.data || [];
          const workingWeekData =
            workingWeekRes?.data?.data?.workingWeek?.workingDays || null;
          setWorkingWeeks(workingWeekData);
          setUsers(usersData);
          setDepartments(departmentsData);
          setHolidays(holidaysData);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);
  // --- 2. Fetch Tasks via Redux ---
  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchUsers());
  }, [dispatch]);

  // --- Debounce Search Term ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const handleRefreshTasks = () => {
    toast.promise(dispatch(fetchTasks()), {
      loading: "Refreshing tasks...",
      success: "Tasks updated!",
      error: "Failed to refresh tasks.",
    });
  };

  const handleViewDescription = (description) => {
    setFullDescription(description || "No description provided.");
    setIsDescriptionDialogOpen(true);
  };

  // --- Client-side Search and Filtering ---
  const filteredTasks = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return allTasks; // Return all tasks if search is empty
    }

    const searchTermLower = debouncedSearchTerm.toLowerCase().trim();

    return allTasks.filter((task) => {
      // Search in Task ID (e.g., "25120100")
      const taskIdMatch = (task.TaskId || "")
        .toLowerCase()
        .includes(searchTermLower);

      // Search in Task Title
      const titleMatch = (task.title || "")
        .toLowerCase()
        .includes(searchTermLower);

      // Return true if either field matches
      return taskIdMatch || titleMatch;
    });
  }, [allTasks, debouncedSearchTerm]);

  // Callback for CreateTaskForm to refresh tasks
  const onTaskCreated = () => {
    dispatch(fetchTasks());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 font-sans">
      <div className="fixed top-0 left-0 w-72 h-72 bg-blue-200/10 rounded-full blur-3xl animate-pulse -z-10"></div>

      {/* Create Task Form */}
      {canCreate && (
        <CreateTaskForm
          users={users}
          departments={departments}
          holidays={holidays}
          onTaskCreated={onTaskCreated}
          allTasks={allTasks} // For parent task selection
          workingWeeks={workingWeeks}
        />
      )}

      {/* Task List and Actions */}
      <TaskTable
        allTasks={filteredTasks}
        tasksLoading={tasksLoading}
        users={users}
        departments={departments}
        currentUser={currentUser}
        holidays={holidays}
        onRefreshTasks={handleRefreshTasks}
        onViewDescription={handleViewDescription}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        workingWeeks={workingWeeks}
        canRead={canRead}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      {/* --- DESCRIPTION VIEW DIALOG (kept here as it's a generic view for TaskTable) --- */}
      <Dialog
        open={isDescriptionDialogOpen}
        onOpenChange={setIsDescriptionDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Full Task Description</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {fullDescription}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDescriptionDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskPage;
