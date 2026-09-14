import React, { useEffect, useState } from "react";
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Menu,
  Maximize,
  Minimize,
  Clock3,
} from "lucide-react";
import Cookies from "js-cookie";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../context/SocketContext";
import NotificationBadge from "./NotificationBadge";
import NotificationModal from "./NotificationModal";
import { logoutUser } from "../lib/authAPI";
import { getProfile } from "../redux/slices/profile/profileSlice";
import { fetchModules } from "../redux/slices/moduleSetting/moduleSlice";

const Navbar = () => {
  const dispatch = useDispatch();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, loading, saving } = useSelector((state) => state.profile);
  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchModules());
  }, []);
  const userName = user?.name || Cookies.get("name") || "User";

  const userEmail = user?.email || Cookies.get("email") || "user@example.com";
  const userInitial = userName.charAt(0).toUpperCase();
  const role = Cookies.get("role") || "";
  const handleLogout = async () => {
    // Clear all relevant cookies
    await logoutUser();
    Object.keys(Cookies.get()).forEach((cookieName) => {
      Cookies.remove(cookieName);
    });
    toast.success("Logged out successfully!");
  };
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);
  const roleColors = {
    Owner: "bg-red-100 text-red-700",
    Admin: "bg-blue-100 text-blue-700",
    "Sr. Manager": "bg-purple-100 text-purple-700",
    Manager: "bg-green-100 text-green-700",
    Member: "bg-gray-100 text-gray-700",
  };
  const formatTime12Hour = (time) => {
    if (!time) return "";

    const [hours, minutes] = time.split(":");

    return new Date(0, 0, 0, hours, minutes).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  const isWithinShift = (startTime, endTime) => {
    const now = new Date();

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const start = new Date();
    start.setHours(startH, startM, 0, 0);

    const end = new Date();
    end.setHours(endH, endM, 0, 0);

    return now >= start && now <= end;
  };

  const shiftActive = user?.assignShift
    ? isWithinShift(user.assignShift.startTime, user.assignShift.endTime)
    : false;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between">
        {/* Left Side - Dashboard Title */}
        <div className="flex items-center space-x-4">
          <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          {/* Role Badge */}
          {role && (
            <span
              className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold shadow-sm ${
                roleColors[role] || "bg-gray-100 text-gray-700"
              }`}
            >
              👤 {role || "No Role"}
            </span>
          )}
          {user && (
            <div className="flex items-center gap-2">
              <span
                className={`relative flex h-3 w-3 ${
                  shiftActive ? "text-green-500" : "text-red-500"
                }`}
              >
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    shiftActive ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    shiftActive ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              </span>

              <span className="font-medium">{user.assignShift.name}</span>

              <span className="text-gray-500">
                {formatTime12Hour(user.assignShift.startTime)} -{" "}
                {formatTime12Hour(user.assignShift.endTime)}
              </span>
            </div>
          )}
        </div>

        {/* Right Side - Welcome Message and Profile */}
        <div className="flex items-center space-x-4">
          {/* Welcome Message and Profile */}
          <div className="flex items-center gap-2 ">
            {/* Notification Badge */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-md hover:bg-gray-200 transition  cursor-pointer"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>{" "}
            <NotificationBadge onClick={() => setShowNotifications(true)} />
            <div className="hidden sm:block text-right">
              <p className={`text-md font-medium px-4 py-1  `}>
                Welcome, {userName}!
              </p>
            </div>
            {/* Profile Dropdown */}
            <div className="relative cursor-pointer">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                  {user?.profilePhoto ? (
                    <img
                      src={
                        user.profilePhoto.startsWith("http")
                          ? user.profilePhoto
                          : `${import.meta.env.VITE_API_BASE_URL}${user.profilePhoto}`
                      }
                      alt={user?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {userInitial}
                      </span>
                    </div>
                  )}
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-gray-600 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 cursor-pointer">
                  <div className="p-4 border-b border-gray-200">
                    <p className="font-medium text-gray-900 truncate">
                      {userName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {userEmail}
                    </p>
                  </div>

                  <div className="p-2">
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                  </div>

                  <div className="p-2 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {/* <div className="mt-4 md:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div> */}

      {/* Overlay for dropdowns */}
      <NotificationModal
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {(isProfileOpen || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsProfileOpen(false);
            setShowNotifications(false);
          }}
        ></div>
      )}
    </div>
  );
};

export default Navbar;
