import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Cookies from "js-cookie";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Shield,
  Zap,
  Users2,
  TimerIcon,
  Settings2Icon,
  CalendarArrowDown,
  ClipboardCheck,
  Eye,
  NotepadText,
  ListRestart,
  CalendarDays,
  Building2Icon,
  Briefcase,
  Send,
  GitBranch,
  Clock,
  ChartColumnDecreasing,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentUser } from "../redux/slices/user/userSlice";
import { logoutUser } from "../lib/authAPI";
import api from "../lib/api";
import { fetchCompany } from "../redux/slices/company/companySlice";
import { fetchMyPermissions } from "../redux/slices/permissions/permissionSlice";
import { FormatPainterOutlined, UserSwitchOutlined } from "@ant-design/icons";

const Sidebar = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [modules, setModules] = useState([]);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { company } = useSelector((state) => state.company);

  // 1. 🔥 REDUX STORE PERMISSIONS ARRAY
  const {
    permissions = [],
    isSuper: isSuperFromStore = false,
    status: permStatus = "idle",
  } = useSelector((state) => state.permissions || {});

  // Auth User Cookies (Session Info Only)
  const roleCookie = useMemo(() => Cookies.get("role") || "", []);
  const normalizedRole = useMemo(() => roleCookie.trim().toLowerCase(), [roleCookie]);
  const isSuper = useMemo(
    () => isSuperFromStore || normalizedRole.includes("super"),
    [isSuperFromStore, normalizedRole]
  );

  const user = useMemo(
    () => ({
      name: Cookies.get("name") || "",
      role: { name: roleCookie },
      email: Cookies.get("email") || "",
    }),
    [roleCookie]
  );

  // 2. RE-HYDRATION ON REFRESH
  useEffect(() => {
    if (permStatus === "idle") {
      dispatch(fetchMyPermissions());
    }
  }, [permStatus, dispatch]);

  // ----------------------------------------------------
  // 🔥 STRICT ARRAY PERMISSION CHECKER FUNCTION
  // ----------------------------------------------------
  const hasPermission = useCallback(
    (submoduleKey, action = "read") => {
      // Super User bypasses granular checks
      if (isSuper) return true;

      // Module setting is strictly for Super User
      if (submoduleKey === "module_setting") {
        return isSuper;
      }

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return false;
      }

      // Match item from Redux Array Payload
      const item = permissions.find((p) => p.submoduleKey === submoduleKey);
      if (!item || !item.actions) return false;

      // Return requested action or fallback to read / view
      if (action === "read" || action === "view") {
        return Boolean(item.actions.read);
      }
      return Boolean(item.actions[action]);
    },
    [isSuper, permissions]
  );

  // Sync Current User & Company Data
  useEffect(() => {
    const userId = Cookies.get("userId");
    if (userId) {
      dispatch(
        setCurrentUser({
          _id: userId,
          name: Cookies.get("name") || "",
          email: Cookies.get("email") || "",
          role: { name: Cookies.get("role") || "" },
          department: Cookies.get("departmentName"),
        })
      );
    }
    dispatch(fetchCompany());
  }, [dispatch]);

  // Fetch Enabled System Modules List
  useEffect(() => {
    let isMounted = true;
    const fetchModules = async () => {
      try {
        const res = await api.get("/setup/modules/list");
        const data = res.data?.data ?? res.data;
        if (isMounted) {
          setModules(Array.isArray(data) ? data : data?.modules ?? []);
        }
      } catch (e) {
        console.error("Failed to load modules list:", e);
      }
    };
    fetchModules();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update Dynamic Favicon
  useEffect(() => {
    if (!company?.favicon) return;
    const link =
      document.querySelector("link[rel~='icon']") ||
      document.createElement("link");
    link.type = "image/png";
    link.rel = "icon";
    link.href = company.favicon.startsWith("http")
      ? company.favicon
      : `${import.meta.env.VITE_API_BASE_URL}${company.favicon}`;
    document.head.appendChild(link);
  }, [company?.favicon]);

  // Module Enabler Check
  const isModuleEnabled = useCallback(
    (moduleKey) => {
      if (isSuper) return true;
      return modules.some((m) => m.moduleKey === moduleKey && m.isEnabled);
    },
    [isSuper, modules]
  );

  const isBothDisable = useMemo(
    () => !isModuleEnabled("DO_THIS2") && !isModuleEnabled("FMS_ENGINE"),
    [isModuleEnabled]
  );

  // Dropdown Toggle
  const toggleDropdown = useCallback(
    (menu) => {
      if (isCollapsed) {
        setIsCollapsed(false);
        setOpenDropdowns({
          myDay: false,
          fmsEngine: false,
          reports: false,
          setup: false,
          delegate: false,
          [menu]: true,
        });
        return;
      }

      setOpenDropdowns((prev) => ({
        myDay: false,
        fmsEngine: false,
        reports: false,
        setup: false,
        delegate: false,
        [menu]: !prev[menu],
      }));
    },
    [isCollapsed]
  );

  // Logout Handler
  const handleLogout = async () => {
    await logoutUser();
    Object.keys(Cookies.get()).forEach((cookieName) => {
      Cookies.remove(cookieName);
    });
    toast.success("Logged out successfully!");
    navigate("/");
  };

  // Active Link Helpers
  const isActiveLink = useCallback(
    (path) => location.pathname === path,
    [location.pathname]
  );

  const isDashboardDropdownActive = useMemo(
    () => location.pathname === "/dashboard",
    [location.pathname]
  );
  const isMyBucketActive = useMemo(
    () => location.pathname === "/bucket/my-bucket",
    [location.pathname]
  );
  const isMyDayDropdownActive = useMemo(
    () => location.pathname.startsWith("/my-day"),
    [location.pathname]
  );
  const isFmsEngineDropdownActive = useMemo(
    () => location.pathname.startsWith("/fms-engine"),
    [location.pathname]
  );
  const isReportsDropdownActive = useMemo(
    () => location.pathname.startsWith("/reports"),
    [location.pathname]
  );
  const isDelegationDropdownActive = useMemo(
    () => location.pathname.startsWith("/delegate"),
    [location.pathname]
  );
  const isSetupDropdownActive = useMemo(
    () => location.pathname.startsWith("/setup"),
    [location.pathname]
  );

  const sidebarWidth = isCollapsed ? "w-20" : "w-64";

  // Role View Label Resolution
  const managerViewLabel = useMemo(() => {
    if (!user?.role?.name) return "";
    const name = user.role.name.trim().toLowerCase();

    if (name.includes("super")) return "Super Admin";
    if (name.includes("sr._manager")) return "Sr. Manager View";
    if (name.includes("manager")) return "Manager View";
    if (name.includes("owner")) return "Owner View";
    if (name.includes("admin")) return "Admin View";
    if (name.includes("pc")) return "PC View";
    return "";
  }, [user]);

  // Dynamic "My Day" Submenu Links
  const myDayLinks = useMemo(() => {
    const baseLinks = [];

    if (hasPermission("delegated_recurring", "read")) {
      baseLinks.push({
        path: "/my-day/mytasks",
        label: "Delegated & Recurring",
        icon: ClipboardCheck,
      });
    }

    if (hasPermission("fms_tasks", "read")) {
      baseLinks.push({
        path: "/my-day/my-fms-tasks",
        label: "FMS Tasks",
        icon: ClipboardCheck,
      });
    }

    if (hasPermission("role_view", "read") && managerViewLabel) {
      baseLinks.push({
        path:
          managerViewLabel === "PC View" ? "/my-day/pc-view" : "/my-day/view",
        label: managerViewLabel,
        icon: Eye,
      });
    }

    return baseLinks;
  }, [managerViewLabel, hasPermission]);

  // FMS Engine Submenu Links
  const fmsEngineLinks = useMemo(() => {
    const items = [];
    if (hasPermission("fms_templates", "read")) {
      items.push({
        path: "/fms-engine/templates",
        label: "FMS Templates",
        icon: Shield,
      });
    }
    if (hasPermission("launch_fms", "read")) {
      items.push({
        path: "/fms-engine/launch",
        label: "Launch FMS",
        icon: User,
      });
    }
    if (hasPermission("upcoming_ongoing_fms", "read")) {
      items.push({
        path: "/fms-engine/upcoming",
        label: "Upcoming & Ongoing FMSs",
        icon: ListRestart,
      });
    }
    if (hasPermission("form_builder", "read")) {
      items.push({
        path: "/form-builder",
        label: "Form Builder",
        icon: FormatPainterOutlined,
      });
    }
    if (hasPermission("responses", "read")) {
      items.push({
        path: "/form-submissions",
        label: "Responses",
        icon: ClipboardCheck,
      });
    }
    return items;
  }, [hasPermission]);

  // Delegation Buckets Submenu Links
  const delegationBucketLinks = useMemo(() => {
    const items = [];
    if (hasPermission("task_buckets", "read")) {
      items.push({
        path: "/delegate/task-buckets",
        label: "Task Buckets",
        icon: Briefcase,
      });
    }
    if (hasPermission("pending_buckets", "read")) {
      items.push({
        path: "/delegate/pending-buckets",
        label: "Pending Buckets Request",
        icon: Clock,
      });
    }
    if (hasPermission("bucket_view", "read")) {
      items.push({
        path: "/delegate/bucket-view",
        label: "Buckets",
        icon: Send,
      });
    }
    if (hasPermission("manage_assignee", "read")) {
      items.push({
        path: "/delegate/audience-master",
        label: "Manage Assignee",
        icon: Users,
      });
    }
    return items;
  }, [hasPermission]);

  // Setup Submenu Links
  const setupLinks = useMemo(() => {
    const items = [];
    if (hasPermission("roles_permissions", "read")) {
      items.push({
        path: "/setup/roles-permissions",
        label: "Roles & Permissions",
        icon: Shield,
      });
    }
    if (hasPermission("departments_calendar", "read")) {
      items.push({
        path: "/setup/departments-calendar",
        label: "Departments & Calendar",
        icon: CalendarDays,
      });
    }
    if (hasPermission("work_shifts", "read")) {
      items.push({
        path: "/setup/work-shifts",
        label: "Work Shifts",
        icon: TimerIcon,
      });
    }
    if (hasPermission("users", "read")) {
      items.push({ path: "/setup/users", label: "Users", icon: Users2 });
    }
    if (hasPermission("company_setup", "read") && isModuleEnabled("COMPANY_SETUP")) {
      items.push({
        path: "/company-setup",
        label: "Company Setup",
        icon: Building2Icon,
      });
    }
    return items;
  }, [hasPermission, isModuleEnabled]);

  // Reports Submenu Links
  const reportsLinks = useMemo(() => {
    const items = [];
    if (hasPermission("mis_reports", "read") && isModuleEnabled("DO_THIS2")) {
      items.push({
        path: "/reports/mis",
        label: "MIS Reports",
        icon: NotepadText,
      });
    }
    if (hasPermission("fms_reports", "read") && isModuleEnabled("FMS_ENGINE")) {
      items.push({
        path: "/reports/fms",
        label: "FMS Reports",
        icon: NotepadText,
      });
    }
    return items;
  }, [hasPermission, isModuleEnabled]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
      {/* Sidebar Container */}
      <div
        className={`
          relative bg-gradient-to-b from-white to-gray-50/80 
          border-r border-gray-200/60 backdrop-blur-sm
          transition-all duration-300 ease-in-out flex flex-col
          shadow-xl shadow-blue-500/5 h-screen max-h-screen 
          ${sidebarWidth}
        `}
      >
        {/* Header */}
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          } p-4 border-b border-gray-200/40 sticky top-0 bg-white z-10`}
        >
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div
                  className={`rounded-lg overflow-hidden flex items-center justify-center ${
                    company?.logo
                      ? "w-14 h-14 bg-white"
                      : "w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600"
                  }`}
                >
                  {company?.logo ? (
                    <img
                      src={
                        company.logo.startsWith("http")
                          ? company.logo
                          : `${import.meta.env.VITE_API_BASE_URL}${company.logo}`
                      }
                      alt={company.softwareName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Zap className="w-4 h-4 text-white" fill="white" />
                  )}
                </div>

                {!company?.logo && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-sm opacity-30 -z-10"></div>
                )}
              </div>
              <div>
                <span className="font-bold text-gray-800 text-lg bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {company?.softwareName || "Dothis2_2.0"}
                </span>

                {company?.tagline && (
                  <p className="text-xs text-gray-500 font-medium">
                    {company.tagline}
                  </p>
                )}

                <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-1"></div>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-white/80 hover:bg-white border border-gray-200/60 cursor-pointer
                       shadow-sm hover:shadow-md transition-all duration-200 
                       hover:scale-105 backdrop-blur-sm"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* 1. Dashboard */}
          {hasPermission("dashboard", "read") && !isBothDisable && (
            <div>
              <div className="relative">
                <Link
                  to="/dashboard"
                  className={`
                    relative flex items-center w-full ${
                      isCollapsed ? "justify-center" : ""
                    } 
                    rounded-xl px-3 py-2.5 transition-all duration-300 group
                    backdrop-blur-sm border
                    ${
                      isDashboardDropdownActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                        : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                    }
                  `}
                >
                  <div
                    className={`relative ${
                      isDashboardDropdownActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-blue-500"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {isDashboardDropdownActive && (
                      <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <span className="ml-2 font-medium flex-1 text-left text-sm">
                      Dashboard
                    </span>
                  )}
                </Link>
              </div>
            </div>
          )}

          {/* 2. My Day */}
          {myDayLinks.length > 0 && (
            <div>
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("myDay")}
                  className={`
                    relative flex items-center w-full ${
                      isCollapsed ? "justify-center" : ""
                    } 
                    rounded-xl px-3 py-2.5 transition-all duration-300 group
                    backdrop-blur-sm border cursor-pointer
                    ${
                      isMyDayDropdownActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                        : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                    }
                  `}
                >
                  <div
                    className={`relative ${
                      isMyDayDropdownActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-blue-500"
                    }`}
                  >
                    <CalendarArrowDown className="w-4 h-4" />
                  </div>

                  {!isCollapsed && (
                    <span className="ml-2 font-medium flex-1 text-left text-sm">
                      My Day
                    </span>
                  )}

                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-300 ${
                        openDropdowns.myDay ? "rotate-180" : ""
                      } ${
                        isMyDayDropdownActive
                          ? "text-white/80"
                          : "text-gray-400"
                      }`}
                    />
                  )}
                </button>
                {openDropdowns.myDay && !isCollapsed && (
                  <div className="ml-3 mt-1.5 space-y-1 pl-4 border-l-2 border-gray-200/40">
                    {myDayLinks.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center rounded-lg px-2 py-2 text-sm transition-all duration-200 group ${
                            isActiveLink(item.path)
                              ? "text-blue-600 bg-blue-50/80 border border-blue-200/60"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
                          }
                        `}
                      >
                        <item.icon
                          className={`w-3 h-3 mr-2 ${
                            isActiveLink(item.path)
                              ? "text-blue-500"
                              : "text-gray-400 group-hover:text-gray-600"
                          }`}
                        />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Delegation Task */}
          {hasPermission("delegation_task", "read") && isModuleEnabled("DO_THIS2") && (
            <Link
              to="/delegation-tasks"
              className={`
                  relative flex items-center ${
                    isCollapsed ? "justify-center" : ""
                  } 
                  rounded-xl px-3 py-2.5 transition-all duration-300 group
                  backdrop-blur-sm border
                  ${
                    isActiveLink("/delegation-tasks")
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                      : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                  }
                `}
            >
              <div
                className={`relative ${
                  isActiveLink("/delegation-tasks")
                    ? "text-white"
                    : "text-gray-400 group-hover:text-blue-500"
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                {isActiveLink("/delegation-tasks") && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white"></div>
                )}
              </div>

              {!isCollapsed && (
                <span className="ml-2 font-medium text-sm">
                  Delegation Task
                </span>
              )}
            </Link>
          )}

          {/* 4. Task Reassignment */}
          {hasPermission("task_reassigning", "read") && isModuleEnabled("DO_THIS2") && (
            <Link
              to="/reassign"
              className={`
                  relative flex items-center ${
                    isCollapsed ? "justify-center" : ""
                  } 
                  rounded-xl px-3 py-2.5 transition-all duration-300 group
                  backdrop-blur-sm border
                  ${
                    isActiveLink("/reassign")
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                      : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                  }
                `}
            >
              <div
                className={`relative ${
                  isActiveLink("/reassign")
                    ? "text-white"
                    : "text-gray-400 group-hover:text-blue-500"
                }`}
              >
                <UserSwitchOutlined className="w-4 h-4" />
                {isActiveLink("/reassign") && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white"></div>
                )}
              </div>

              {!isCollapsed && (
                <span className="ml-2 font-medium text-sm">
                  Task Reassignment
                </span>
              )}
            </Link>
          )}

          {/* 5. FMS Engine */}
          {fmsEngineLinks.length > 0 && isModuleEnabled("FMS_ENGINE") && (
            <div>
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("fmsEngine")}
                  className={`
                    relative flex items-center w-full ${
                      isCollapsed ? "justify-center" : ""
                    } 
                    rounded-xl px-3 py-2.5 transition-all duration-300 group
                    backdrop-blur-sm border cursor-pointer
                    ${
                      isFmsEngineDropdownActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                        : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                    }
                  `}
                >
                  <div
                    className={`relative ${
                      isFmsEngineDropdownActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-blue-500"
                    }`}
                  >
                    <Settings2Icon className="w-4 h-4" />
                  </div>

                  {!isCollapsed && (
                    <span className="ml-2 font-medium flex-1 text-left text-sm">
                      FMS Engine
                    </span>
                  )}

                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-300 ${
                        openDropdowns.fmsEngine ? "rotate-180" : ""
                      } ${
                        isFmsEngineDropdownActive
                          ? "text-white/80"
                          : "text-gray-400"
                      }`}
                    />
                  )}
                </button>
                {openDropdowns.fmsEngine && !isCollapsed && (
                  <div className="ml-3 mt-1.5 space-y-1 pl-4 border-l-2 border-gray-200/40">
                    {fmsEngineLinks.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center rounded-lg px-2 py-2 text-sm transition-all duration-200 group ${
                            isActiveLink(item.path)
                              ? "text-blue-600 bg-blue-50/80 border border-blue-200/60"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
                          }
                        `}
                      >
                        <item.icon
                          className={`w-3 h-3 mr-2 ${
                            isActiveLink(item.path)
                              ? "text-blue-500"
                              : "text-gray-400 group-hover:text-gray-600"
                          }`}
                        />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. Reports */}
          {reportsLinks.length > 0 && !isBothDisable && (
            <div>
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("reports")}
                  className={`
                    relative flex items-center w-full ${
                      isCollapsed ? "justify-center" : ""
                    } 
                    rounded-xl px-3 py-2.5 transition-all duration-300 group
                    backdrop-blur-sm border cursor-pointer
                    ${
                      isReportsDropdownActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                        : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                    }
                  `}
                >
                  <div
                    className={`relative ${
                      isReportsDropdownActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-blue-500"
                    }`}
                  >
                    <ChartColumnDecreasing className="w-4 h-4" />
                  </div>

                  {!isCollapsed && (
                    <span className="ml-2 font-medium flex-1 text-left text-sm">
                      Reports
                    </span>
                  )}

                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-300 ${
                        openDropdowns.reports ? "rotate-180" : ""
                      } ${
                        isReportsDropdownActive
                          ? "text-white/80"
                          : "text-gray-400"
                      }`}
                    />
                  )}
                </button>
                {openDropdowns.reports && !isCollapsed && (
                  <div className="ml-3 mt-1.5 space-y-1 pl-4 border-l-2 border-gray-200/40">
                    {reportsLinks.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center rounded-lg px-2 py-2 text-sm transition-all duration-200 group ${
                            isActiveLink(item.path)
                              ? "text-blue-600 bg-blue-50/80 border border-blue-200/60"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
                          }
                        `}
                      >
                        <item.icon
                          className={`w-3 h-3 mr-2 ${
                            isActiveLink(item.path)
                              ? "text-blue-500"
                              : "text-gray-400 group-hover:text-gray-600"
                          }`}
                        />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. My Bucket */}
          {hasPermission("my_bucket", "read") && isModuleEnabled("DO_THIS2") && (
            <div>
              <div className="relative">
                <Link
                  to="/bucket/my-bucket"
                  className={`
                    relative flex items-center w-full ${
                      isCollapsed ? "justify-center" : ""
                    } 
                    rounded-xl px-3 py-2.5 transition-all duration-300 group
                    backdrop-blur-sm border
                    ${
                      isMyBucketActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                        : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                    }
                  `}
                >
                  <div
                    className={`relative ${
                      isMyBucketActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-blue-500"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {isMyBucketActive && (
                      <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <span className="ml-2 font-medium flex-1 text-left text-sm">
                      My Bucket
                    </span>
                  )}
                </Link>
              </div>
            </div>
          )}

          {/* 8. Delegation Buckets */}
          {delegationBucketLinks.length > 0 && isModuleEnabled("DO_THIS2") && (
            <div>
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("delegate")}
                  className={`
                    relative flex items-center w-full ${
                      isCollapsed ? "justify-center" : ""
                    } 
                    rounded-xl px-3 py-2.5 transition-all duration-300 group
                    backdrop-blur-sm border cursor-pointer
                    ${
                      isDelegationDropdownActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                        : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                    }
                  `}
                >
                  <div
                    className={`relative ${
                      isDelegationDropdownActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-blue-500"
                    }`}
                  >
                    <GitBranch className="w-4 h-4" />
                  </div>

                  {!isCollapsed && (
                    <span className="ml-2 font-medium flex-1 text-left text-sm">
                      Delegation Buckets
                    </span>
                  )}

                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-300 ${
                        openDropdowns.delegate ? "rotate-180" : ""
                      } ${
                        isDelegationDropdownActive
                          ? "text-white/80"
                          : "text-gray-400"
                      }`}
                    />
                  )}
                </button>

                {openDropdowns.delegate && !isCollapsed && (
                  <div className="ml-3 mt-1.5 space-y-1 pl-4 border-l-2 border-gray-200/40">
                    {delegationBucketLinks.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center rounded-lg px-2 py-2 text-sm transition-all duration-200 group
                          ${
                            isActiveLink(item.path)
                              ? "text-blue-600 bg-blue-50/80 border border-blue-200/60"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
                          }
                        `}
                      >
                        <item.icon
                          className={`w-3 h-3 mr-2 ${
                            isActiveLink(item.path)
                              ? "text-blue-500"
                              : "text-gray-400 group-hover:text-gray-600"
                          }`}
                        />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. Setup Section */}
          {setupLinks.length > 0 && !isBothDisable && (
            <div>
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("setup")}
                  className={`
                    relative flex items-center w-full ${
                      isCollapsed ? "justify-center" : ""
                    } 
                    rounded-xl px-3 py-2.5 transition-all duration-300 group
                    backdrop-blur-sm border cursor-pointer
                    ${
                      isSetupDropdownActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                        : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                    }
                  `}
                >
                  <div
                    className={`relative ${
                      isSetupDropdownActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-blue-500"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                  </div>

                  {!isCollapsed && (
                    <span className="ml-2 font-medium flex-1 text-left text-sm">
                      Setup
                    </span>
                  )}

                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-300 ${
                        openDropdowns.setup ? "rotate-180" : ""
                      } ${
                        isSetupDropdownActive
                          ? "text-white/80"
                          : "text-gray-400"
                      }`}
                    />
                  )}
                </button>

                {openDropdowns.setup && !isCollapsed && (
                  <div className="ml-3 mt-1.5 space-y-1 pl-4 border-l-2 border-gray-200/40">
                    {setupLinks.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center rounded-lg px-2 py-2 text-sm transition-all duration-200 group
                          ${
                            isActiveLink(item.path)
                              ? "text-blue-600 bg-blue-50/80 border border-blue-200/60"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
                          }
                        `}
                      >
                        <item.icon
                          className={`w-3 h-3 mr-2 ${
                            isActiveLink(item.path)
                              ? "text-blue-500"
                              : "text-gray-400 group-hover:text-gray-600"
                          }`}
                        />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. Module Setting (Strictly Super User Only) */}
          {isSuper && hasPermission("module_setting", "read") && (
            <Link
              to="/super/modules"
              className={`
                relative flex items-center ${
                  isCollapsed ? "justify-center" : ""
                } 
                rounded-xl px-3 py-2.5 transition-all duration-300 group
                backdrop-blur-sm border
                ${
                  isActiveLink("/super/modules")
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400"
                    : "bg-white/80 text-gray-600 hover:bg-white border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg"
                }
              `}
            >
              <div
                className={`relative ${
                  isActiveLink("/super/modules")
                    ? "text-white"
                    : "text-gray-400 group-hover:text-blue-500"
                }`}
              >
                <Settings className="w-4 h-4" />
                {isActiveLink("/super/modules") && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white"></div>
                )}
              </div>

              {!isCollapsed && (
                <span className="ml-2 font-medium text-sm">Module Setting</span>
              )}
            </Link>
          )}
        </nav>

        {/* Bottom Menu */}
        <div className="p-3 border-t border-gray-200/40 space-y-1 bg-white/50 backdrop-blur-sm">
          <button
            onClick={handleLogout}
            className="
              flex items-center w-full rounded-xl px-3 py-2.5 transition-all duration-300 group
              bg-white/80 text-gray-600 hover:bg-red-50/80 hover:text-red-700
              border border-gray-200/60 hover:border-red-200/80 hover:shadow-lg
              backdrop-blur-sm cursor-pointer
            "
          >
            <div className="relative">
              <LogOut className="w-3 h-3 text-gray-400 group-hover:text-red-500 transition-colors" />
            </div>
            {!isCollapsed && (
              <span className="ml-2 font-medium text-sm">Logout</span>
            )}
          </button>
        </div>

        {/* Floating Accent */}
        <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-blue-500 to-purple-500"></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/80">
        {children}
      </main>
    </div>
  );
};

export default React.memo(Sidebar);