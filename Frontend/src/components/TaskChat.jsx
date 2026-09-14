import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  Badge,
  Avatar,
  Progress,
  Button,
  Spin,
  Empty,
  Collapse,
  Tag,
  Input,
  Popover,
} from "antd";
import {
  Send,
  Clock,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  User,
  Phone,
  Video,
  Paperclip,
  Smile,
  AlertTriangle,
  Reply,
  RotateCcw,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useSelector } from "react-redux";
import { useSocket } from "../context/SocketContext";
import api from "../lib/api";
import { toast } from "sonner";
import dayjs from "dayjs";
import ViewLink from "../pages/myDay/attachmentViewer";
import { formatLabel } from "../lib/utilFunctions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
const { Panel } = Collapse;
const { TextArea } = Input;

const TaskChat = ({ task, open, onClose, setRefreshTaskAfterReopen }) => {
  const currentUser = useSelector((state) => state.users.currentUser);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);

  const onEmojiClick = (emojiData) => {
    setReplyText((prev) => prev + emojiData.emoji);
  };
  const [hoveredId, setHoveredId] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const seenDebounceRef = useRef(0);
  const itsMe = task ? currentUser._id == task?.assignedTo?._id : false;
  const markMessageSeen = useCallback(async (messageIds) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    try {
      for (const messageId of messageIds) {
        await api.post("/thread/seen", { messageId });
      }
    } catch (e) {
      console.error("Mark seen failed:", e);
    }
    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (messageIds.includes(m.id) ? { ...m, seen: true } : m)),
    );
  }, []);

  const { socket, addEvent, isConnected } = useSocket();

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 100;

    // Auto mark seen debounced
    const now = Date.now();
    if (now - seenDebounceRef.current > 1500) {
      seenDebounceRef.current = now;
      const unseenIds = messages
        .filter((m) => !m.seen && m.type === "message")
        .slice(-20)
        .map((m) => m.id);
      if (unseenIds.length > 0) {
        markMessageSeen(unseenIds);
      }
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open && task?.conversationId) {
      loadTaskChat();
    }
  }, [open, task]);
  const [localTask, setLocalTask] = useState(null);
  useEffect(() => {
    if (open && task?._id) {
      initTaskWithConversation();
    }
  }, [open, task?._id]);
  const initTaskWithConversation = async () => {
    try {
      let freshTask;

      // 🔥 Always fetch latest task first
      try {
        const res = await api.get(`/tasks/${task._id}`);
        freshTask = res.data.data;
      } catch (err) {
        if (err.response?.status === 404) {
          const fmsRes = await api.get(`/fms/fmsInstanceTask/${task._id}`);
          freshTask = fmsRes.data.data;
        }
      }

      // ✅ store in state (this is what your UI uses)
      setLocalTask(freshTask);

      // 🔥 NOW safe to load chat
      loadTaskChat(freshTask);
    } catch (err) {
      console.error("Init task failed", err);
    }
  };
  const loadTaskChat = async () => {
    setLoading(true);
    try {
      let freshTask = task;

      if (!task?.conversationId) {
        try {
          const res = await api.get(`/tasks/${task._id}`);
          freshTask = res.data.data;
        } catch (err) {
          if (err.response?.status === 404) {
            const fmsRes = await api.get(`/fms/fmsInstanceTask/${task._id}`);
            freshTask = fmsRes.data.data;
          }
        }
      }

      // 🔥 STEP 2: STILL no conversation → stop early
      if (!freshTask?.conversationId) {
        setMessages([]);
        return;
      }

      const [queriesRes, messagesRes] = await Promise.all([
        api.get(`/queries/task/${freshTask._id || localTask._id}`),
        api.get(
          `/thread/${freshTask.conversationId || localTask.conversationId}/messages`,
        ),
      ]);

      const queries = queriesRes?.data?.data || [];
      const msgs = messagesRes?.data?.data?.messages || [];

      const combined = [
        // ✅ Queries
        ...queries.map((q) => ({
          id: q._id,
          type: "query",
          text: q.message || "",
          user: q.raisedBy || {},
          timestamp: q.createdAt,
          parentMessage: q.parentMessage,
          status: q.status,
          assignedToMe: String(q.assignedTo?._id) === String(currentUser?._id),
        })),

        // ✅ Messages
        ...msgs.map((m) => ({
          id: m._id,
          type: "message",
          text: m.text || "",
          user: m.sender || {},
          timestamp: m.createdAt,
          parentMessage: m.queryId
            ? m.queryId
              ? {
                  text: m.queryId.message,
                  sender: m.queryId.raisedBy || {},
                }
              : null
            : m.parentMessage,
          seen: (m.seenBy || []).some(
            (s) => String(s.user?._id || s.user) === String(currentUser?._id),
          ),
        })),
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setMessages(combined);
    } catch {
      toast.error("Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!replyText.trim()) return;
    const tempId = `temp_${Date.now()}`;
    const isMe = replyingTo?.user?._id == currentUser?._id;
    const payload = {
      conversationId: task.conversationId,
      text: replyText.trim(),
      taskId: task._id,
      // queryId: replyingTo.id,
    };

    if (replyingTo) {
      payload.parentMessage = replyingTo.id;
      if (replyingTo?.type === "query") {
        payload.queryId = replyingTo.id;
      }
    }
    const optimistic = {
      id: tempId,
      type: "message",
      text: replyText,
      user: { _id: currentUser._id, name: currentUser.name },
      timestamp: new Date(),
      seen: true,
      parentMessage: replyingTo?.id || null,
      // parentPreview: replyingTo,
    };

    // setMessages((prev) => [...prev, optimistic]);
    setReplyText("");
    setSending(true);
    setReplyingTo(null);
    try {
      if (replyingTo && replyingTo.type == "query" && !isMe) {
        await api.post("/queries/reply", payload);
      } else {
        await api.post("/thread/message", payload);
      }
      // toast.success(replyingTo ? "Replied!" : "Sent!");
      addEvent("chat-message", task._id);
      // await loadTaskChat();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Send failed");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => dayjs(timestamp).format("HH:mm");

  const getStatusColor = (status) => {
    const colors = {
      Pending: "orange",
      Open: "yellow",
      Responded: "blue",
      Resolved: "green",
    };
    return colors[status] || "gray";
  };
  const getStatusStyle = (status, isMe) => {
    const styles = {
      Pending: isMe
        ? "bg-white/20 text-white"
        : "bg-orange-100 text-orange-700",
      Open: isMe ? "bg-white/20 text-white" : "bg-yellow-100 text-yellow-700",
      Responded: isMe ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700",
      Resolved: isMe ? "bg-white/20 text-white" : "bg-green-100 text-green-700",
    };

    return styles[status] || "bg-gray-100 text-gray-600";
  };
  const handleReconnect = () => {
    if (!socket) return;

    socket.disconnect();
    socket.connect();
  };
  useEffect(() => {
    // Always mark recent unseen on load/update (1.5s debounce in scroll handles rate)
    const unseenIds = messages
      .filter((m) => !m.seen && m.type === "message")
      .slice(-20)
      .map((m) => m.id);
    if (unseenIds.length > 0) {
      markMessageSeen(unseenIds);
    }

    if (isAtBottomRef.current && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  //**for getting live chats */
  useEffect(() => {
    if (socket && task?.conversationId) {
      socket.emit("join-conversation", task.conversationId);
    }
  }, [socket, task?.conversationId]);
  // 🔥 LIVE MESSAGES
  useEffect(() => {
    if (!socket || !open || !task?.conversationId) return;

    socket.on("chat-message", loadTaskChat);
    socket.on("new-query", loadTaskChat);
    socket.on("query-reply", loadTaskChat);

    return () => {
      socket.off("chat-message", loadTaskChat);
      socket.off("new-query", loadTaskChat);
      socket.off("query-reply", loadTaskChat);
    };
  }, [socket, task?.conversationId, currentUser?._id]);
  useEffect(() => {
    if (!socket || !open) return;

    socket.on("chat-message", (msg) => {
      // 🔥 If first message, reload OR append
      loadTaskChat();
    });

    return () => {
      socket.off("chat-message");
    };
  }, [socket, open]);

  const safeTask = {
    ...task,
    title: task?.title || task?.description || "Untitled Task",
    TaskId: task?.TaskId || task?.taskId,
    dueDate: task?.dueDate || task?.plannedDueDate,
  };
  //** close emoji section  */
  const emojiRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenTask, setReopenTask] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenLoading, setReopenLoading] = useState(false);

  const handleReopenTask = async () => {
    if (!reopenReason.trim()) {
      toast.error("Please enter reopen reason");
      return;
    }
    try {
      setReopenLoading(true);

      await api.patch(`/tasks/${reopenTask._id}/reopen`, {
        reason: reopenReason,
      });

      toast.success("Task reopened successfully");

      setReopenModalOpen(false);
      setReopenTask(null);
      setReopenReason("");
      onClose();
      setRefreshTaskAfterReopen(true);
      // ✅ REFRESH API HERE
      // fetchTasks();
    } catch (error) {
      console.log(error);

      toast.error(error?.response?.data?.message || "Failed to reopen task");
    } finally {
      setReopenLoading(false);
    }
  };
  if (!task) return;
  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 flex ${open ? "" : "hidden"}`}
      onClick={onClose}
    >
      <div
        className="w-full mt-5 max-w-6xl mx-auto h-[90vh] flex bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT: Task Details */}
        <div className="w-1/3 border-r p-6 bg-gradient-to-b from-slate-900 to-slate-800 text-white max-h-full overflow-y-auto">
          <div className="sticky top-0 pb-6">
            <div className="flex items-center gap-3 mb-6">
              {/* <Avatar
                size={48}
                className="bg-gradient-to-br from-indigo-100 to-purple-100 text-gray-800 font-semibold shadow-sm"
              >
                {task?.assignedBy?.name?.[0]?.toUpperCase()}
              </Avatar> */}

              <div>
                <h2 className="font-bold text-xl flex items-center gap-2">
                  {safeTask?.title}
                </h2>

                <div className="flex items-center gap-2 mt-1">
                  {/* Task ID */}
                  <span className="px-2 py-[2px] text-[11px] rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    Task #{safeTask?.TaskId}
                  </span>

                  {/* Status */}
                  <span
                    className={`px-2 py-[2px] text-[11px] rounded-full border font-medium ${
                      safeTask?.status === "Completed"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : safeTask?.status === "Delayed" ||
                            safeTask?.status === "Overdue"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : safeTask?.status === "Upcoming"
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {safeTask?.status}
                  </span>
                  {safeTask?.status === "Completed" && !itsMe && (
                    <button
                      disabled={safeTask?.isReopen}
                      onClick={() => {
                        setReopenTask(task);
                        setReopenModalOpen(true);
                      }}
                      className={`
        flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px]
        transition-all duration-200 font-semibold shadow-sm cursor-pointer
        ${
          safeTask?.isReopen
            ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
        }
      `}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />

                      {safeTask?.isReopen ? "Reopened" : "Reopen Task"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Task Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                  Assignee
                </div>
                <div className="flex items-center gap-2">
                  <Avatar size={28} style={{ background: "#64748b" }}>
                    {safeTask?.assignedTo?.name?.[0]}
                  </Avatar>
                  <span className="font-semibold text-slate-200">
                    {safeTask?.assignedTo?.name}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                  Assigned By
                </div>
                <div className="flex items-center gap-2">
                  <Avatar size={28} style={{ background: "#64748b" }}>
                    {safeTask?.assignedBy?.name?.[0]}
                  </Avatar>
                  <span className="font-semibold text-slate-200">
                    {safeTask?.assignedBy?.name}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">
                  Due Date
                </div>
                <Tag
                  color={
                    dayjs(safeTask?.dueDate).isBefore(dayjs())
                      ? "red-inverse"
                      : "green-inverse"
                  }
                >
                  {dayjs(safeTask?.dueDate).format("MMM DD")}
                </Tag>
              </div>{" "}
              {safeTask?.isReopen && (
                <div>
                  {/* <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">
                    Task Status
                  </div> */}

                  {safeTask?.isReopen && (
                    <Popover
                      trigger="click"
                      placement="bottomLeft"
                      content={
                        <div className="w-[300px]">
                          {/* HEADER */}
                          <div className="flex items-start gap-3 pb-3 border-b">
                            <div
                              className="
                w-10 h-10 rounded-full
                bg-gradient-to-br from-yellow-100 to-orange-100
                flex items-center justify-center
                shadow-sm
              "
                            >
                              <RotateCcw className="w-5 h-5 text-yellow-700" />
                            </div>

                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800 text-sm">
                                Task Reopened
                              </h3>

                              <p className="text-xs text-gray-500 mt-1">
                                {safeTask?.reopenedAt
                                  ? dayjs(safeTask?.reopenedAt).format(
                                      "DD MMM YYYY • hh:mm A",
                                    )
                                  : "-"}
                              </p>
                            </div>
                          </div>

                          {/* REASON */}
                          <div className="mt-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                              Reopen Reason
                            </p>

                            <div
                              className="
                bg-gradient-to-br from-gray-50 to-gray-100
                border border-gray-200
                rounded-xl
                p-3
                text-sm
                text-gray-700
                leading-relaxed
                whitespace-pre-wrap
                break-words
              "
                            >
                              {safeTask?.reopenedReason || "No reason provided"}
                            </div>
                          </div>

                          {/* FOOTER */}
                          {safeTask?.reopenedBy?.name && (
                            <div className="mt-4 flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                              <span>Reopened By</span>

                              <span className="font-medium text-gray-700">
                                {safeTask?.reopenedBy?.name}
                              </span>
                            </div>
                          )}
                        </div>
                      }
                    >
                      <div
                        className="
          inline-flex items-center gap-2
          px-3 py-2
          rounded-xl
          cursor-pointer
          border border-yellow-200
          bg-gradient-to-r from-yellow-50 to-orange-50
          hover:shadow-md
          transition-all duration-200
        "
                      >
                        <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center">
                          <RotateCcw className="w-4 h-4 text-yellow-700" />
                        </div>

                        <div className="flex flex-col leading-tight">
                          <span className="text-sm font-semibold text-yellow-800">
                            Reopened
                          </span>

                          <span className="text-[11px] text-yellow-700">
                            Click to view details
                          </span>
                        </div>
                      </div>
                    </Popover>
                  )}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
                Checklist (
                {safeTask?.checklist?.filter((item) => item.isCompleted)
                  .length || 0}
                /{safeTask?.checklist?.length || 0})
              </div>
              {safeTask?.checklist?.length != 0 && (
                <div className="max-h-50 overflow-y-auto space-y-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                  {safeTask?.checklist?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${item.isCompleted ? "bg-emerald-400" : "bg-slate-500"}`}
                      ></span>
                      <span
                        className={`flex-1 ${item.isCompleted ? "line-through text-slate-400" : "text-slate-200"}`}
                      >
                        {item.text}
                      </span>
                    </div>
                  )) || (
                    <span className="text-slate-500 text-sm">
                      No checklist items
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="mb-6">
              {safeTask?.createdForm?.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
                    Form Details
                  </div>

                  <div className="space-y-2 p-3 bg-slate-700/40 rounded-lg border border-slate-600">
                    {safeTask.createdForm.map((field) => {
                      const value = safeTask?.formData?.[field.fieldName];

                      return (
                        <div
                          key={field._id}
                          className="flex flex-col text-sm border-b border-slate-600 pb-2 last:border-none"
                        >
                          {/* Field Label */}
                          <span className="text-slate-400 text-xs">
                            {formatLabel(field.fieldName)}
                          </span>

                          {/* Field Value */}
                          <span className="text-slate-200 font-medium">
                            {value || (
                              <span className="text-slate-500 italic">
                                Not filled
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Quick Actions */}
            {safeTask?.attachmentFile?.length > 0 && (
              <div className="space-y-2 mb-8">
                <ViewLink
                  file={safeTask?.attachmentFile}
                  text={"Attachments"}
                />
              </div>
            )}

            {/* Description - no accordion */}
            <div className="mb-6">
              <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
                Description
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-700/30 p-3 rounded-lg border border-slate-600">
                {safeTask?.description || "No description"}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Chat */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar.Group
                  maxCount={3}
                  maxStyle={{ color: "#f56a00", backgroundColor: "#fde3cf" }}
                >
                  {onlineUsers.map((u) => (
                    <Avatar key={u._id}>{u.name[0]}</Avatar>
                  ))}
                  <Avatar>
                    {itsMe
                      ? safeTask.assignedBy?.name
                          ?.trim()
                          ?.charAt(0)
                          ?.toUpperCase() || "?"
                      : safeTask.assignedTo?.name
                          ?.trim()
                          ?.charAt(0)
                          ?.toUpperCase() || "?"}
                  </Avatar>
                </Avatar.Group>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  {(itsMe
                    ? safeTask.assignedBy?.name
                    : safeTask.assignedTo?.name) || "Task Conversation"}
                  {/* <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"
                    }`}
                  /> */}
                </div>

                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {isConnected ? "Online" : "Disconnected"} · {messages.length}{" "}
                  messages
                  {/* 🔁 Reconnect button */}
                  {!isConnected && (
                    <button
                      onClick={handleReconnect}
                      className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-full 
               bg-gradient-to-r from-red-500 to-rose-500 
               text-white text-[11px] font-medium 
               shadow-md hover:shadow-lg 
               hover:scale-[1.02] transition-all duration-200"
                    >
                      {/* animated dot */}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                      Reconnect
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* <div className="flex gap-2">
              <Button size="small" icon={<Phone size={16} />}>
                Call
              </Button>
              <Button size="small" icon={<Video size={16} />}>
                Video
              </Button>
            </div> */}
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 relative"
            onScroll={handleScroll}
          >
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Spin size="large" />
              </div>
            ) : messages.length === 0 ? (
              <Empty description="No messages yet" />
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`flex relative ${
                    msg.user._id === currentUser._id
                      ? "justify-end"
                      : "justify-start gap-3"
                  }`}
                >
                  <div
                    className={`max-w-3xl p-4 rounded-2xl shadow-sm relative cursor-pointer hover:shadow-md transition-shadow ${
                      msg.user._id === currentUser._id
                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-sm"
                        : "bg-white border rounded-bl-sm"
                    }`}
                    onMouseDown={(e) => {
                      if (e.detail === 2) {
                        // Double-click or long-press
                        setReplyingTo(msg);
                      }
                    }}
                  >
                    {hoveredId === msg.id && (
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className={`absolute top-1 cursor-pointer ${
                          msg.user._id === currentUser._id
                            ? "-left-9"
                            : "-right-9"
                        }
                        w-8 h-8 flex items-center justify-center
                        rounded-full shadow-md transition-all duration-200
                        ${
                          msg.user._id === currentUser._id
                            ? "bg-white text-gray-600 hover:bg-gray-100"
                            : "bg-emerald-500 text-white hover:bg-emerald-600"
                        }`}
                      >
                        <Reply size={16} />
                      </button>
                    )}
                    {msg.parentMessage && (
                      <div className="mb-2 p-2 rounded text-xs opacity-80 border-l-4 border-yellow-400">
                        <div className="font-semibold">
                          {msg.parentMessage.sender.name}
                        </div>
                        <div>{msg.parentMessage.text}</div>
                      </div>
                    )}
                    {msg.type === "query" ? (
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                            msg.assignedToMe
                              ? "bg-orange-500 ring-orange-200"
                              : "bg-yellow-500"
                          }`}
                        >
                          Q
                        </div>
                        <div className="flex-1">
                          <div className="font-bold mb-1 text-sm">
                            {msg.assignedToMe ? "YOUR QUERY" : "Query"}
                          </div>
                          <p className="mb-2 leading-relaxed">{msg.text}</p>
                          {msg.user?._id !== currentUser?._id && (
                            <span className="text-[11px] text-gray-500 font-medium tracking-wide">
                              — {msg.user?.name || "Unknown"}
                            </span>
                          )}
                          {/* <div
                            className={`inline-block px-2 py-[2px] text-[10px] rounded-full mt-1 ${getStatusStyle(msg.status, msg.user._id === currentUser._id)}`}
                          >
                            {msg.status}
                          </div> */}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1">
                          {/* Message */}
                          <p className="leading-relaxed text-sm">{msg.text}</p>

                          {/* Sender name (only for others) */}
                          {msg.user?._id !== currentUser?._id && (
                            <span className="text-[11px] text-gray-500 font-medium tracking-wide">
                              — {msg.user?.name || "Unknown"}
                            </span>
                          )}

                          {/* Footer (time + seen) */}
                          <div className="flex items-center justify-end gap-1 text-[11px] text-black-400 mt-1">
                            <span>{formatTime(msg.timestamp)}</span>
                            {msg.seen && (
                              <CheckCircle2 size={12} className="opacity-80" />
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="border-t p-4 bg-white shadow-lg">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                {replyingTo && (
                  <div className="p-3 bg-gray-50 border rounded-lg mb-2 text-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      Replying to{" "}
                      <span className="font-semibold">
                        {replyingTo.user.name}
                      </span>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="font-medium">{replyingTo.text}</p>
                  </div>
                )}
                <TextArea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    replyingTo ? "Reply..." : "Message task conversation..."
                  }
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={sending || !isConnected}
                />
              </div>
              <Button
                type="primary"
                size="large"
                icon={<Send size={20} />}
                onClick={sendMessage}
                loading={sending}
                disabled={!replyText.trim()}
                className="w-14 h-14 flex items-center justify-center shadow-lg"
              />
              <div ref={emojiRef} className="relative">
                <Button
                  icon={<Smile size={20} />}
                  size="large"
                  onClick={() => setShowEmoji((prev) => !prev)}
                />

                {showEmoji && (
                  <div className="absolute bottom-16 right-0 z-50">
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs mt-2 opacity-75">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`}
              />
              {isConnected ? "Connected" : "Reconnecting"}
            </div>
          </div>
        </div>
      </div>
      {/* Reopen task */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {" "}
          <DialogHeader>
            <DialogTitle>Reopen Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reopen Reason</label>

            <textarea
              rows={4}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Enter reopen reason..."
              className="
                w-full border rounded-lg p-3 outline-none
                focus:ring-2 focus:ring-yellow-500
              "
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReopenModalOpen(false)}
              disabled={reopenLoading}
            >
              Cancel
            </Button>

            <Button
              onClick={handleReopenTask}
              disabled={reopenLoading}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {reopenLoading ? "Reopening..." : "Reopen Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskChat;
