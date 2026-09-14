import React, { useState, useEffect } from "react";
import { Button, Dialog, DialogContent } from "./ui";
import { useDispatch, useSelector } from "react-redux";
import NotificationList from "./NotificationList";
import { Settings, X } from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
} from "../redux/slices/notification/notificationSlice";
import { markAllNotificationsRead } from "../lib/socket";
import { useSocket } from "../context/SocketContext";

const TABS = ["View all", "Unread"];

const NotificationModal = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState("View all");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const dispatch = useDispatch();
  const notificationState = useSelector((state) => state.notifications);
  const { setUnreadCount, socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleNotification = () => {
      dispatch(fetchNotifications());
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, dispatch]);
  useEffect(() => {
    if (open) dispatch(fetchNotifications());
  }, [open, dispatch]);

  const handleNotificationClick = (notification) => {
    if (selectedNotification?._id === notification._id) return;
    setSelectedNotification(notification);
    setDetailModalOpen(true);
    // if (!notification.isRead) dispatch(markNotificationRead(notification._id));
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      dispatch(fetchNotifications());
    } catch (error) {
      console.error("Mark all read failed:", error);
    }
  };

  const unreadCount = notificationState.unreadCount || 0;

  const filteredNotifications = (() => {
    const all = notificationState.notifications || [];
    if (activeTab === "Mentions")
      return all.filter((n) => n.type === "MENTION");
    if (activeTab === "Unread") return all.filter((n) => !n.isRead);
    return all;
  })();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{
          width: 1000,
          maxHeight: "80vh",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            // style={{ padding: "12px 16px" }}
          >
            <span className="text-base font-medium text-gray-900">
              Notifications
            </span>

            <div className="flex items-center gap-3 text-gray-400">
              {/* <Settings
                size={17}
                className="cursor-pointer hover:text-gray-600"
              /> */}
              <X
                size={17}
                className="cursor-pointer hover:text-gray-600"
                onClick={onClose}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between pb-2 pt-1">
            <div className="flex gap-1.5">
              {TABS.map((tab) => {
                const label =
                  tab === "Unread" && unreadCount > 0
                    ? `Unread (${unreadCount})`
                    : tab;

                const active = activeTab === tab;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition ${
                      active
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition whitespace-nowrap"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notificationState.status === "loading" ? (
            <div className="flex items-center justify-center py-14 text-gray-400 text-sm gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Loading...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-14 text-gray-400 text-sm">
              No notifications
            </div>
          ) : (
            <NotificationList
              notifications={filteredNotifications}
              onNotificationClick={handleNotificationClick}
              detailModalOpen={detailModalOpen}
              setDetailModalOpen={setDetailModalOpen}
              selectedNotification={selectedNotification}
              setSelectedNotification={setSelectedNotification}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;
