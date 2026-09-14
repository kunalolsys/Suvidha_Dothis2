import React from "react";
import { formatDistanceToNow } from "date-fns";
import NotificationDetailModal from "./NotificationDetailModal";

const NotificationList = ({
  notifications,
  onNotificationClick,
  detailModalOpen,
  setDetailModalOpen,
  selectedNotification,
  setSelectedNotification,
}) => {
  return (
    <div>
      {notifications.map((notification, index) => (
        <NotificationItem
          key={notification._id || index}
          notification={notification}
          onClick={() => onNotificationClick(notification)}
        />
      ))}

      <NotificationDetailModal
        notification={selectedNotification}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setTimeout(() => setSelectedNotification(null), 200);
        }}
      />
    </div>
  );
};

const Avatar = ({ src, name, size = 40 }) => {
  const [failed, setFailed] = React.useState(false);
  const initials = name
    ?.trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2) // 👈 only first 2 words
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#e8e5fd",
        color: "#6c5ce7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
};

const FileAttachment = ({ file }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#f8f8f8",
      border: "0.5px solid #e8e8e8",
      borderRadius: 10,
      padding: "9px 13px",
      marginTop: 10,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 7,
          background: "#e74c3c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>
          PDF
        </span>
      </div>
      <div>
        <p
          style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: "#111" }}
        >
          {file.name}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>
          {file.size}
        </p>
      </div>
    </div>
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#999"
      strokeWidth="1.8"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  </div>
);

const NotificationItem = ({ notification, onClick }) => {
  const timeAgo = notification.createdAt
    ? formatDistanceToNow(new Date(notification.createdAt), {
        addSuffix: false,
      }) + " ago"
    : "";

  const isInvite =
    notification.type === "INVITE" ||
    notification.description?.toLowerCase().includes("invited you");

  return (
    <div
      onClick={!isInvite ? onClick : undefined}
      style={{
        padding: "12px 20px",
        cursor: isInvite ? "default" : "pointer",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!isInvite) e.currentTarget.style.background = "#f9f9f9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Avatar with unread dot */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            src={notification.fromUser?.avatar} // optional if you add later
            name={notification.fromUser?.name || "User"}
          />
          {!notification.isRead && (
            <span
              style={{
                position: "absolute",
                left: -6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#7c6ef0",
              }}
            />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: "#1a1a1a",
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: notification.title }} />

            {notification.description && (
              <span style={{ color: "#555" }}>
                {" "}
                {notification.description?.length > 100
                  ? notification.description.slice(0, 100) + "..."
                  : notification.description}
              </span>
            )}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
            {timeAgo}
            {notification.meta && <span> · {notification.meta}</span>}
          </p>

          {/* Invite action buttons */}
          {isInvite && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  notification.onDecline?.();
                }}
                style={{
                  padding: "6px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "1px solid #d0d0d0",
                  background: "transparent",
                  color: "#333",
                  cursor: "pointer",
                }}
              >
                Decline
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  notification.onAccept?.();
                }}
                style={{
                  padding: "6px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  background: "#7c6ef0",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Accept
              </button>
            </div>
          )}

          {/* File attachment */}
          {notification.attachment && (
            <FileAttachment file={notification.attachment} />
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationList;
