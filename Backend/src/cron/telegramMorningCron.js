import cron from "node-cron";
import moment from "moment";
import User from "../models/User.js";
import { DelegationTask } from "../models/Task.js"; // Aapka Task model jisme discriminator hai
import bot from "../services/telegram/telegramBOT.js";

// ── Telegram message length safety split ─────────────────────────────────────
const splitMessage = (text, maxLength = 4000) => {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxLength) {
      chunks.push(remainingText);
      break;
    }

    let splitIndex = remainingText.lastIndexOf("\n\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remainingText.lastIndexOf("\n", maxLength);
    }
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    chunks.push(remainingText.substring(0, splitIndex).trim());
    remainingText = remainingText.substring(splitIndex).trim();
  }

  return chunks;
};

// ── Safe chunk sender with rate-limit delay ──────────────────────────────────
const sendChunkedTelegramMessage = async (chatId, text) => {
  const parts = splitMessage(text);
  for (const part of parts) {
    try {
      await bot.sendMessage(chatId, part, { parse_mode: "HTML" });
      // Telegram 429 Too Many Requests se bachne ke liye chhota delay
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      console.error(
        `[Telegram Cron] Error sending message chunk to ${chatId}:`,
        err.message,
      );
    }
  }
};

// ── Main Daily Notification Runner ───────────────────────────────────────────
export const sendMorningTaskNotification = async () => {
  console.log(
    "⏰ [Cron] Starting 8:00 AM Daily Telegram Task Notifications...",
  );

  try {
    // 1. Fetch all active users with linked Telegram
    const users = await User.find({
      isDeleted: false,
      isActive: true,
      telegramChatId: { $ne: null, $exists: true },
      telegramNotificationsEnabled: true,
    }).lean();

    if (!users || users.length === 0) {
      console.log("ℹ️ [Cron] No active users with Telegram Chat IDs found.");
      return;
    }

    const now = new Date();

    // 2. Loop through all eligible users
    for (const user of users) {
      try {
        const userId = user._id;
        const chatId = String(user.telegramChatId).trim();

        if (!chatId) continue;

        // ═══════════════════════════════════════════════════════
        // A. FETCH PENDING DELEGATION TASKS
        // ═══════════════════════════════════════════════════════
        const pendingTasks = await DelegationTask.find({
          assignedTo: userId,
          isDeleted: { $ne: true },
          status: { $regex: /^pending$/i },
        })
          .sort({ dueDate: 1 })
          .lean();

        // ═══════════════════════════════════════════════════════
        // B. FETCH OVERDUE DELEGATION TASKS
        // ═══════════════════════════════════════════════════════
        const overdueTasks = await DelegationTask.find({
          assignedTo: userId,
          isDeleted: { $ne: true },
          $or: [
            { status: { $regex: /^overdue$/i } },
            {
              dueDate: { $lt: now },
              status: {
                $nin: [
                  "Completed",
                  "completed",
                  "Stopped",
                  "stopped",
                  "Not Done",
                ],
              },
            },
          ],
        })
          .sort({ dueDate: 1 })
          .lean();

        // 🟢 ZERO TASKS GUARD: Agar dono me se kuch bhi nahi hai, to message nahi jayega
        if (pendingTasks.length === 0 && overdueTasks.length === 0) {
          continue;
        }

        // ── 1. SEND PENDING TASKS NOTIFICATION (IF ANY) ──────
        if (pendingTasks.length > 0) {
          let pendingText = `📋 <b>Hello ${user.name}, your pending tasks:</b>\n\n`;

          pendingTasks.forEach((task) => {
            const taskId = task.TaskId || task._id;
            const shortTitle = (task.title || "").substring(0, 20);
            const shortDesc = (task.description || "").substring(0, 50);
            const targetDate = task.dueDate
              ? moment(task.dueDate).format("DD-MM-YYYY, hh:mm A")
              : "N/A";

            pendingText +=
              `🆔 <code>${taskId}</code>\n` +
              `<b>Title:</b> ${shortTitle}\n` +
              `<b>Title Desc.</b> ${shortDesc}\n` +
              `<i>(Target Date ${targetDate})</i>\n\n`;
          });

          await sendChunkedTelegramMessage(chatId, pendingText);
        }

        // ── 2. SEND OVERDUE TASKS NOTIFICATION (IF ANY) ──────
        if (overdueTasks.length > 0) {
          let overdueText = `🚨 <b>Hello ${user.name}, your overdue tasks:</b>\n\n`;

          overdueTasks.forEach((task) => {
            const taskId = task.TaskId || task._id;
            const shortTitle = (task.title || "").substring(0, 20);
            const shortDesc = (task.description || "").substring(0, 50);
            const targetDate = task.dueDate
              ? moment(task.dueDate).format("DD-MM-YYYY, hh:mm A")
              : "N/A";

            overdueText +=
              `🆔 <code>${taskId}</code>\n` +
              `<b>Title:</b> ${shortTitle}\n` +
              `<b>Title Desc.</b> ${shortDesc}\n` +
              `<i>(Target Date ${targetDate})</i>\n\n`;
          });

          await sendChunkedTelegramMessage(chatId, overdueText);
        }
      } catch (userErr) {
        // Agar kisi ek user ko message send karne me issue ho, to agle user ko skip na kare
        console.error(
          `[Telegram Cron] Skipping user ${user.name} (${user._id}) due to error:`,
          userErr.message,
        );
        continue;
      }
    }

    console.log("✅ [Cron] Daily 8:00 AM task notification process finished.");
  } catch (err) {
    console.error("[Telegram Cron] Global Execution Error:", err);
  }
};

// ── Schedule Cron for 8:00 AM Daily ──────────────────────────────────────────
export const initTelegramCronJobs = () => {
  // '0 8 * * *' = Har din subah exact 08:00 baje
  cron.schedule(
    "0 8 * * *",
    async () => {
      await sendMorningTaskNotification();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata", // IST standard timezone
    },
  );

  console.log("📅 [Cron] Daily 8:00 AM Telegram Notification Job Initialized.");
};
