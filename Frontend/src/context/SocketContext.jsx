import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSelector } from "react-redux";
import { initSocket } from "../lib/socket.js";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const currentUser = useSelector((state) => state.users.currentUser);
  const tasks = useSelector((state) => state.myTasks.tasks || []);
  const connectRef = useRef(false);

  // Extract task IDs for auto-join
  const taskIds = tasks.map((task) => task._id || task.id);

  const addEvent = useCallback((eventName, data) => {
    const eventData = {
      id: Date.now(),
      name: eventName,
      data: typeof data === "string" ? data.slice(0, 100) + "..." : data,
      timestamp: new Date().toLocaleTimeString(),
    };
    setEvents((prev) => [eventData, ...prev.slice(0, 50)]);
  }, []);

  // Socket connection lifecycle - NO LOOP
  useEffect(() => {
    if (!currentUser?._id || connectRef.current) return;

    connectRef.current = true;

    try {
      const sock = initSocket();
      setSocket(sock);
      // ✅ REMOVE OLD LISTENERS FIRST
      sock.off();
      const handleConnect = () => {
        setIsConnected(true);
        addEvent("connect", { id: sock.id });

        // Auto-join rooms ONCE
        if (currentUser._id) {
          sock.emit("join", currentUser._id);
          sock.emit("join-tasks", currentUser._id);
        }
      };

      const handleDisconnect = () => {
        setIsConnected(false);
        addEvent("disconnect", {});
      };

      sock.on("connect", handleConnect);
      sock.on("disconnect", handleDisconnect);

      // Events (match tester/backend)
      sock.on("new-task-assigned", (data) =>
        addEvent("new-task-assigned", data),
      );
      sock.on("new-query", (data) => {
        addEvent("new-query", data);
        setUnreadCount((prev) => prev + 1);
      });
      sock.on("query-reply", (data) => addEvent("query-reply", data));
      sock.on("chat-message", (data) => addEvent("chat-message", data));
      sock.on("new-message", (data) => addEvent("new-message", data));
      sock.on("notification", (data) => {
        addEvent("notification", data);
        setUnreadCount((prev) => prev + 1);
      });
      sock.on("message-seen", (data) => addEvent("message-seen", data));
      sock.on("notification-read", (data) =>
        addEvent("notification-read", data),
      );
      sock.on("notification-all-read", (data) => {
        addEvent("notification-all-read", data);
        setUnreadCount(0);
      });

      // Connect
      if (!sock.connected) {
        sock.connect();
      }

      return () => {
        connectRef.current = false;
        sock.off("connect", handleConnect);
        sock.off("disconnect", handleDisconnect);
        // Don't disconnect - keep alive
      };
    } catch (error) {
      console.error("Socket setup failed:", error);
      connectRef.current = false;
    }
  }, [currentUser?._id]); // Single dep → NO RE-RUN

  const value = {
    socket,
    isConnected,
    events,
    unreadCount,
    setUnreadCount,
    clearEvents: () => setEvents([]),
    addEvent,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
