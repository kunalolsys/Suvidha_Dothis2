import React, { createContext, useContext, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import TaskChat from "../components/TaskChat";
import api from "../lib/api";

const TaskChatContext = createContext();

export const TaskChatProvider = ({ children }) => {
  const [taskChatOpen, setTaskChatOpen] = useState(false);
  const [taskChatTask, setTaskChatTask] = useState(null);
  const dispatch = useDispatch();

  const openTaskChat = useCallback(
    async (taskOrId) => {
      try {
        let task = taskOrId;

        // If taskId string/object, fetch full task
        if (typeof taskOrId === "string" || (taskOrId && taskOrId.taskId)) {
          const taskId = taskOrId._id || taskOrId.taskId || taskOrId;
          try {
            const taskResponse = await api.get(`/tasks/${taskId}`);
            task = taskResponse.data.data;
          } catch (err) {
            if (err.response?.status === 404) {
              try {
                const fmsResponse = await api.get(
                  `/fms/fmsInstanceTask/${taskId}`,
                );
                task = fmsResponse.data.data;
              } catch (fmsErr) {
                console.error("FMS also failed", fmsErr);
              }
            } else {
              console.error("Task API error", err);
            }
          }
        }
        // Ensure conversation exists
        if (!task.conversationId) {
          const convRes = await api.post("/thread/conversation", {
            taskId: task._id,
            title: `Task #${task.TaskId || task._id}`,
          });
          task.conversationId = convRes.data.conversationId;
        }

        setTaskChatTask(task);
        setTaskChatOpen(true);
        // toast.success(`Opened chat for Task #${task.TaskId || task._id}`);
      } catch (error) {
        toast.error("Failed to open task chat");
        console.error("TaskChat open error:", error);
      }
    },
    [dispatch],
  );

  const closeTaskChat = useCallback(() => {
    setTaskChatOpen(false);
    setTaskChatTask(null);
  }, []);

  return (
    <TaskChatContext.Provider
      value={{
        taskChatOpen,
        taskChatTask,
        openTaskChat,
        closeTaskChat,
      }}
    >
      {children}
      {taskChatOpen && taskChatTask && (
        <TaskChat
          task={taskChatTask}
          open={taskChatOpen}
          onClose={closeTaskChat}
        />
      )}
    </TaskChatContext.Provider>
  );
};

export const useTaskChat = () => {
  const context = useContext(TaskChatContext);
  if (!context) {
    throw new Error("useTaskChat must be used within TaskChatProvider");
  }
  return context;
};
