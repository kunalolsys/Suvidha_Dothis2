import React from "react";
import { Bell } from "lucide-react";
import { useSocket } from "../context/SocketContext";

const NotificationBadge = ({ onClick }) => {
  const { unreadCount, isConnected } = useSocket();

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="p-2 rounded-lg hover:bg-gray-100 transition relative"
      >
        <Bell
          className={`w-5 h-5 ${
            isConnected ? "text-blue-600" : "text-gray-400"
          }`}
        />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-semibold shadow">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default NotificationBadge;
