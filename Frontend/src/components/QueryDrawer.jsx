import React, { useState, useEffect, useRef, useCallback } from "react";
import { Drawer, Button, Avatar, Badge, Spin, Empty } from "antd";
import { Send, MessageCircle, UserCheck, AlertCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { useSocket } from "../context/SocketContext";
import api from "../lib/api";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Textarea } from "./ui";

const QueryDrawer = ({ task, open, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef(null);

  const currentUser = useSelector((state) => state.users.currentUser);
  const { socket, addEvent, isConnected } = useSocket();

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversation
  useEffect(() => {
    if (open && task?._id && task.conversationId) {
      loadConversation();
    }
  }, [open, task]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const [queriesRes, messagesRes] = await Promise.all([
        api.get(`/queries/task/${task._id}`),
        api.get(`/thread/conversation/${task.conversationId}`),
      ]);

      const queries = queriesRes.data.data || [];
      const msgs = messagesRes.data.data || [];

      const combined = [
        ...queries.map((q) => ({
          id: `q_${q._id}`,
          type: "query",
          text: q.message,
          user: q.raisedBy,
          timestamp: q.createdAt,
          status: q.status,
          assignedToMe: q.assignedTo._id === currentUser._id,
          isPending: ["Pending", "Open"].includes(q.status),
        })),
        ...msgs.map((m) => ({
          id: m._id,
          type: "message",
          text: m.text,
          user: m.sender,
          timestamp: m.createdAt,
          seen: m.seenBy?.some((s) => s.user.toString() === currentUser._id),
        })),
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setMessages(combined);
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!replyText.trim()) return;

    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      type: "message",
      text: replyText,
      user: { _id: currentUser._id, name: currentUser.name },
      timestamp: new Date(),
      seen: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    const textToSend = replyText;
    setReplyText("");
    setSending(true);

    try {
      await api.post("/thread/message", {
        conversationId: task.conversationId,
        text: textToSend,
      });

      toast.success("Message sent!");
      addEvent("message-sent", task._id);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => dayjs(timestamp).format("HH:mm");

  const myPendingQueries = messages.filter(
    (m) => m.type === "query" && m.assignedToMe && m.isPending,
  );

  return (
    <Drawer
      title={`💬 ${task ? task.title : ""}`}
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
    >
      <div className="h-[70vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3 mb-3">
            <Avatar size={40}>
              {task ? task.assignedBy?.name[0]?.toUpperCase() : ""}
            </Avatar>
            <div>
              <div className="font-semibold">
                {task ? task.assignedBy?.name : ""}
              </div>
              <div className="text-xs text-gray-500">
                Task #{task ? task.TaskId : ""}
              </div>
            </div>
            <Badge count={messages.filter((m) => m.type === "query").length} />
          </div>

          {myPendingQueries.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
              <div className="font-medium text-orange-800 text-sm">
                {myPendingQueries.length} pending queries
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <Spin className="flex justify-center py-12" />
          ) : !messages.length ? (
            <Empty description="No messages" />
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.user._id === currentUser._id
                    ? "justify-end"
                    : "justify-start flex gap-2"
                }
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${msg.user._id === currentUser._id ? "bg-blue-500 text-white" : "bg-gray-100"}`}
                >
                  {msg.type === "query" ? (
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          msg.assignedToMe ? "bg-orange-500" : "bg-yellow-500"
                        }`}
                      >
                        Q
                      </div>
                      <div className="flex-1">
                        <div
                          className={`font-medium mb-1 ${msg.assignedToMe ? "text-orange-900" : ""}`}
                        >
                          {msg.assignedToMe ? "YOUR QUERY" : "Query"}
                        </div>
                        <p className="text-sm">{msg.text}</p>
                        <Badge
                          size="small"
                          color={msg.status === "Resolved" ? "green" : "yellow"}
                        >
                          {msg.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{msg.text}</p>
                      <div className="text-xs opacity-75 mt-1 flex items-center gap-1 justify-end">
                        {formatTime(msg.timestamp)}
                        {msg.seen && <span>✓✓</span>}
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
        <div className="p-3 border-t bg-white">
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              autoSize={{ minRows: 1, maxRows: 3 }}
              onPressEnter={(e) =>
                e.shiftKey || (e.preventDefault(), sendMessage())
              }
              disabled={sending || !isConnected}
            />
            <Button
              type="primary"
              icon={<Send size={16} />}
              onClick={sendMessage}
              loading={sending}
              disabled={!replyText.trim()}
            />
          </div>
          {!isConnected && (
            <div className="text-xs text-orange-600 mt-1">Reconnecting...</div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default QueryDrawer;
