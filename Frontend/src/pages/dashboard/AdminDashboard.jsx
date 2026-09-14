import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  UserCheck,
  Star,
  ChevronRight,
  ClipboardList,
  TriangleAlert,
  CircleArrowUp,
  CalendarCheck2,
  Settings,
  Users2,
  Zap,
  Rocket,
  Target,
  Crown,
  Medal,
  Bell,
  Award,
  Calendar,
  RefreshCcw,
} from "lucide-react";
import Cookies from "js-cookie";

import StatCard from "../../components/dashboard/StatCard";
import PerformanceCard from "../../components/dashboard/PerformanceCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import TopFmsCard from "../../components/dashboard/TopFmsCard";
import TimeFilterButtons from "../../components/dashboard/TimeFilterButtons ";
import StatCard2t from "../../components/dashboard/StatCard2t";
import { ChartPieDonutText } from "../../components/dashboard/ChartPieDonutText";
import TaskTable from "../../components/TaskTable";
import {
  fetchTasks,
  fetchTasksWithStats,
} from "../../redux/slices/task/taskSlice";
import { fetchUsers } from "../../redux/slices/user/userSlice";
import { fetchDepartments } from "../../redux/slices/department/departmentSlice";
import { fetchHolidays } from "../../redux/slices/holiday/holidaySlice";
import { fetchMyTasks } from "../../redux/slices/myTask/myTaskSlice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import dayjs from "dayjs";
import axios from "axios";
import api from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../lib/utilFunctions";

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tasks, loading: tasksLoading } = useSelector((state) => state.tasks);
  const { users } = useSelector((state) => state.users);
  const { departments } = useSelector((state) => state.departments);
  const { holidays } = useSelector((state) => state.holidays);
  const { tasks: myTasks } = useSelector((state) => state.myTasks);
  const { currentUser } = useSelector((state) => state.users);
  const isAdmin =
    currentUser?.role?.name === "Admin" || currentUser?.role?.name === "Owner";
  const redirectPath = isAdmin ? "/my-day/view" : "/my-day/mytasks";
  // const displayTasks = isAdmin ? tasks : myTasks;
  const [userCount, setUserCount] = useState(0);
  const [fmsCounts, setFmsCounts] = useState({
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    onhold: 0,
    stopped: 0,
    total: 0,
  });
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [fullDescription, setFullDescription] = useState("");
  const [allTaskForDashboard, setAllTaskForDashboard] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const fetchTasksForDashboard = async (filterType) => {
    try {
      const res = await dispatch(
        fetchTasksWithStats({
          filterType,
          userId: currentUser?._id,
          role: currentUser?.role?.name,
        }),
      ).unwrap();
      setAllTaskForDashboard(res);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchTasksForDashboard(filterType);
  }, [filterType, currentUser]);

  const dynamicStats = useMemo(() => {
    const counts = allTaskForDashboard?.counts || {};
    const tasks = allTaskForDashboard?.data || [];
    const totalTasks = allTaskForDashboard?.total || 0;
    const completedTasks = counts.Completed || 0;
    const pendingTasks = counts.Pending || 0;
    const overdueTasks = counts.Overdue || 0;
    const todaysTasks = tasks.filter((t) => {
      const today = new Date();
      const taskDate = new Date(t.startDate);
      return (
        taskDate.getDate() === today.getDate() &&
        taskDate.getMonth() === today.getMonth() &&
        taskDate.getFullYear() === today.getFullYear()
      );
    }).length;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      todaysTasks,
      overdueTasks,
    };
  }, [allTaskForDashboard, users]);

  const topFmsItems = [
    { name: "Social Media FMS", performance: 98.2 },
    { name: "Email Marketing FMS", performance: 95.7 },
    { name: "Content Creation FMS", performance: 94.3 },
    { name: "SEO Optimization FMS", performance: 92.1 },
    { name: "Analytics FMS", performance: 90.5 },
  ].map((item) => ({
    name: item.name,
    percentage: item.performance,
  }));

  const upcomingTasks = useMemo(() => {
    if (!allTaskForDashboard?.data) return [];

    const now = dayjs();
    const next3Days = dayjs().add(3, "day");

    return allTaskForDashboard.data.filter((task) => {
      if (!task.dueDate) return false;

      const due = dayjs(task.dueDate);

      return (
        due.isAfter(now) && // future only
        due.isBefore(next3Days) && // within 3 days
        task.status !== "Completed" // ignore completed
      );
    });
  }, [allTaskForDashboard]);
  const sortedUpcoming = useMemo(() => {
    return [...upcomingTasks].sort(
      (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
    );
  }, [upcomingTasks]);
  const [topPerformers, setTopPerformers] = useState([]);
  const handleGetReport = async () => {
    try {
      const payload = {
        period: "yearly",
      };

      const response = await api.post(`/mis/report`, payload);
      // const users = response.data?.data || [];
      setTopPerformers(response.data.topPerformers);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    handleGetReport();
    fetchActiveUserCount();
    fetchInstanceCount();
  }, []);
  const fetchActiveUserCount = async () => {
    const response = await api.get(`/setup/users/user-count`);
    setUserCount(response.data.totalUser);
  };
  const fetchInstanceCount = async () => {
    const response = await api.get(`/fms/instances-count`);
    const data = response.data.data;
    setFmsCounts({
      upcoming: data.upcoming,
      ongoing: data.ongoing,
      completed: data.completed,
      onhold: data.onhold,
      stopped: data.stopped,
      total: data.total,
    });
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
  const isSuper = role === "Super";
  const isAdminRole = role === "Admin";
  const isModuleEnabled = (moduleKey) => {
    // ✅ Super user can access all modules
    if (isSuper) return true;

    return modules.some((m) => m.moduleKey === moduleKey && m.isEnabled);
  };
  const fmsOn = isModuleEnabled("FMS_ENGINE");
  const zone2Items = [
    fmsOn ? "fms-perf" : null,
    "delegated-perf",
    fmsOn ? "ongoing-fms" : null,
    "active-users",
  ].filter(Boolean);

  // ── Zone 3: leaderboard items (Top FMS conditional) ─────────────────────
  const zone3Items = [
    "top-performers",
    fmsOn ? "top-fms" : null,
    "top-managers",
  ].filter(Boolean);

  const overduePercentage =
    dynamicStats.totalTasks > 0
      ? (dynamicStats.overdueTasks / dynamicStats.totalTasks) * 100
      : 0;
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-2 text-gray-500">
          <span className="text-md">Dashboard</span>
          <ChevronRight className="w-5 h-5" />
          <span className="text-gray-900 font-medium text-md">Dashboard</span>
        </div>
        <TimeFilterButtons
          filterType={filterType}
          setFilterType={setFilterType}
        />
      </div>

      {/* Alert row */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
        {/* <div className="rounded-lg p-4 bg-amber-50 border border-amber-200">
          <div className="flex gap-3 items-center">
            <div className="p-2 bg-amber-100 rounded-md">
              <Zap className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-md text-gray-600 font-medium">
                Active Escalations
              </p>
              <p className="text-xl font-bold text-amber-600">N/A</p>
            </div>
          </div>
          <div className="mt-1 w-full bg-amber-200 rounded-full h-1">
            <div className="bg-amber-500 h-1 rounded-full w-0" />
          </div>
        </div> */}

        <div
          className="rounded-lg p-4 bg-red-50 border border-red-200 cursor-pointer"
          onClick={() =>
            navigate(redirectPath, {
              state: {
                source: "overdue",
              },
            })
          }
        >
          <div className="flex gap-3 items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <TriangleAlert className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-md text-gray-600 font-medium">
                Total Overdue Tasks
              </p>
              <p className="text-xl font-bold text-red-600">
                {dynamicStats.overdueTasks}
              </p>
            </div>
          </div>
          <div className="mt-1 w-full bg-red-200 rounded-full h-1">
            <div
              className="bg-red-500 h-1 rounded-full"
              style={{ width: `${Math.min(overduePercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats row — always 4 cols on large screens */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${
          fmsOn && isAdminRole ? "lg:grid-cols-5" : "lg:grid-cols-4"
        } gap-4`}
      >
        {" "}
        <StatCard
          title="Total Tasks"
          value={dynamicStats.totalTasks}
          icon={ClipboardList}
          color="blue"
          path={redirectPath}
          source="total"
        />
        <StatCard
          title="Completed Tasks"
          value={dynamicStats.completedTasks}
          icon={CheckCircle}
          color="green"
          path={redirectPath}
          source="completed"
        />
        <StatCard
          title="Pending Tasks"
          value={dynamicStats.pendingTasks}
          icon={Clock}
          color="yellow"
          path={redirectPath}
          source="pending"
        />
        <StatCard
          title="Today's Tasks"
          value={dynamicStats.todaysTasks}
          icon={CalendarCheck2}
          color="purple"
          path={redirectPath}
        />
        {fmsOn && isAdminRole && (
          <StatCard
            title="Ongoing FMS"
            value={fmsCounts.ongoing}
            icon={Settings}
            color="yellow"
            path={"/fms-engine/upcoming"}
            source="ongoing"
          />
        )}
      </div>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${zone2Items.length}, minmax(0, 1fr))`,
        }}
      ></div>

      <div
        className="grid gap-4 mb-4"
        style={{
          gridTemplateColumns: `repeat(${zone3Items.length}, minmax(0, 1fr))`,
        }}
      ></div>

      <div
        className="grid gap-4 mb-6"
        style={{ gridTemplateColumns: "1fr 2fr" }}
      >
        {/* Performance donut chart */}
        <div className="group hover:scale-[1.02] transition-all duration-500">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl p-4 transition-all duration-500 h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-md font-semibold text-gray-800">
                Your Performance
              </h2>
            </div>
            <ChartPieDonutText record={allTaskForDashboard} />
          </div>
        </div>

        {/* Upcoming deadlines — always 2-col inner grid */}
        <Card className="h-[550px] border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden">
          <div className="flex h-full flex-col p-5">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-100 to-red-50 shadow-sm">
                  <Calendar className="h-5 w-5 text-red-600" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-800">
                    Upcoming Deadlines
                  </h2>

                  <p className="text-xs text-gray-500">
                    Tasks approaching due date
                  </p>
                </div>
              </div>

              <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                {sortedUpcoming.length}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {sortedUpcoming.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>

                  <p className="text-sm font-medium text-gray-600">
                    No upcoming deadlines
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Everything looks on track
                  </p>
                </div>
              ) : (
                sortedUpcoming.map((task) => {
                  const daysLeft = dayjs(task.dueDate).diff(dayjs(), "day");

                  return (
                    <div
                      key={task._id}
                      className="group rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-white p-3 transition-all duration-300 hover:border-red-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {task.title}
                            </p>

                            <span className="rounded-full bg-white px-2 py-[2px] text-[10px] font-medium text-gray-500 border">
                              {task.departmentOfAssignToUser?.name}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                            <span>{task.assignedTo?.name}</span>

                            <span>•</span>

                            <span>{task.TaskId}</span>
                          </div>
                        </div>

                        {/* Right */}
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-gray-600">
                            {formatDate(task.dueDate)}
                          </p>

                          <p
                            className={`mt-1 text-xs font-bold ${
                              daysLeft <= 0
                                ? "text-red-600"
                                : daysLeft <= 2
                                  ? "text-orange-500"
                                  : "text-green-600"
                            }`}
                          >
                            {daysLeft <= 0 ? "Today" : `${daysLeft}d left`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Description dialog — unchanged ─────────────────────────────── */}
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
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
