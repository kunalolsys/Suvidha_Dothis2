import React from "react";
import { Dialog, DialogContent } from "./ui";
import {
  Clock,
  CheckCircle2,
  MessageSquare,
  Search,
  FileText,
  AtSign,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { formatDistanceToNow } from "date-fns";
import {
  fetchNotifications,
  markNotificationRead,
} from "../redux/slices/notification/notificationSlice";
import { useTaskChat } from "../context/TaskChatContext";

const TYPE_CONFIG = {
  MESSAGE: { icon: MessageSquare, accent: "#3b82f6" },
  QUERY: { icon: Search, accent: "#f59e0b" },
  QUERY_RAISED: { icon: Search, accent: "#f59e0b" },
  QUERY_REPLIED: { icon: MessageSquare, accent: "#3b82f6" },
  TASK_UPDATE: { icon: FileText, accent: "#10b981" },
  MENTION: { icon: AtSign, accent: "#8b5cf6" },
};

const NotificationDetailModal = ({ notification, open, onClose }) => {
  const dispatch = useDispatch();
  const { openTaskChat } = useTaskChat();

  const handleMarkRead = async () => {
    if (!notification.isRead) {
      await dispatch(markNotificationRead(notification._id));
      await dispatch(fetchNotifications());
    }
    await openTaskChat(notification?.conversationId?.taskId, "notification");
    onClose();
  };
  if (!notification) return null;

  const config = TYPE_CONFIG[notification.type] || {
    icon: FileText,
    accent: "#9ca3af",
  };
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{ width: 340, maxWidth: "90vw", borderRadius: 14 }}
      >
        {/* Accent bar */}
        <div style={{ height: 4, background: config.accent, width: "100%" }} />

        <div style={{ padding: "16px 18px 18px" }}>
          {/* Title row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                color: "#111",
                lineHeight: 1.4,
              }}
            >
              {notification.title}
            </h3>
            <span
              style={{
                fontSize: 11,
                color: "#888",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Clock size={12} />
              {formatDistanceToNow(new Date(notification.createdAt))}
            </span>
          </div>

          {/* Icon + description */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              padding: "20px 0 16px",
            }}
          >
            {/* <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <Icon size={20} color="#555" />
            </div> */}
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: "#444",
                lineHeight: 1.55,
                maxWidth: 260,
              }}
            >
              {notification.description}
            </p>
          </div>

          {/* Related user */}
          {notification.fromUser && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 14,
                fontSize: 12,
                color: "#666",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "#e8e5fd",
                  color: "#6c5ce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {(() => {
                  const name = notification.fromUser.name || "";
                  const parts = name.trim().split(" ").filter(Boolean);

                  if (parts.length === 1) {
                    return parts[0].slice(0, 2).toUpperCase();
                  }

                  return parts
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase();
                })()}
              </div>

              {/* Name + email */}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 500, color: "#333" }}>
                  {notification.fromUser.name}
                </div>
                <div style={{ fontSize: 11, color: "#999" }}>
                  {notification.fromUser.email}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: "1px solid #e0e0e0",
                background: "transparent",
                color: "#555",
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <button
              onClick={handleMarkRead}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                background: "#3b82f6",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <MessageSquare size={13} />
              {notification.isRead ? "Reply" : "Reply & Mark read"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDetailModal;
