import { io } from "socket.io-client";
import api from "./api.js"; // Reuse axios config (baseURL, cookies)

// Socket base URL (match backend server)
const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ||
  "https://backend.tms.himaira.com";

let socket = null;

/**
 * Initialize socket connection
 */
export const initSocket = () => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true, // Send auth cookies
    autoConnect: false, // Manual connect
    transports: ["polling"],
    upgrade: true,
  });

  return socket;
};

/**
 * Connect with user/task rooms
 */
export const connectSocket = async (userId, taskIds = []) => {
  const sock = initSocket();

  if (!sock.connected) {
    await sock.connect();
  }

  // Personal room
  sock.emit("join", userId);

  // Task rooms
  sock.emit("join-tasks", userId);

  // Conversation/task rooms (if known)
  taskIds.forEach((taskId) => {
    sock.emit("join-task", taskId);
  });

  return sock;
};

/**
 * Disconnect
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Join specific conversation
 */
export const joinConversation = (convId) => {
  if (socket) {
    socket.emit("join-conversation", convId);
  }
};

/**
 * Send message/reply
 */
export const sendMessage = async (conversationId, text, queryId = null) => {
  return api.post("/thread/message", {
    conversationId,
    text,
    queryId,
  });
};

// === QUICK ACTIONS (match backend APIs) ===
export const raiseQuery = async (taskId, message, assignedTo) => {
  return api.post("/queries/raise", { taskId, message, assignedTo });
};

export const replyToQuery = async (queryId, conversationId, text) => {
  return api.post("/queries/reply", {
    queryId,
    conversationId,
    text,
  });
};

export const markMessageSeen = async (messageId) => {
  return api.post("/thread/seen", { messageId });
};

export const markAllNotificationsRead = async () => {
  return api.post("/thread/notifications/read-all");
};

export const getUnreadCount = async () => {
  const res = await api.get("/thread/notifications/unread-count");
  return res.data.unreadCount;
};

// Socket instance getter
export const getSocket = () => socket;
