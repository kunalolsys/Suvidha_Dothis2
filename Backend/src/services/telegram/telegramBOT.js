import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import User from "../../models/User.js";
import { sendWelcomeMessage } from "./templates/greetingTemplate.js";
import Task from "../../models/Task.js";
import moment from "moment";
import FmsInstanceTask from "../../models/FmsInstanceTask.js";

dotenv.config();

// ── Guard: Token validation ──────────────────────────────────────────────────
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing from environment");

// ── Initialize Bot with single polling configuration ─────────────────────────
const bot = new TelegramBot(token, {
  polling: {
    autoStart: true,
    params: {
      timeout: 10,
    },
  },
});

// Drop pending updates and clear webhooks on startup
bot.deleteWebHook({ drop_pending_updates: true })
  .then(() => {
    console.log("✅ Telegram Webhook cleared & Single Polling Session Started");
  })
  .catch((err) => {
    console.error("[Telegram] Webhook clear warning:", err.message);
  });

function getStatusBadge(status) {
  const s = status?.toLowerCase();
  if (s === "completed") return "🟢 <b>Completed</b>";
  if (s === "pending") return "🟡 <b>Pending</b>";
  if (s === "delayed") return "🔴 <b>Delayed</b>";
  if (s === "overdue") return "🔴 <b>Overdue</b>";
  return `⚪ <b>${status}</b>`;
}

const ALLOWED_STATUSES = new Set(["pending", "delayed", "overdue", "upcoming"]);

// ── Show 'typing...' status while database operations are running ────────────
const showTyping = async (chatId) => {
  try {
    await bot.sendChatAction(chatId, "typing");
  } catch (err) {
    // Ignore chat action failures silently
  }
};

// ── Safe reply helper ────────────────────────────────────────────────────────
const reply = async (chatId, text, options = {}) => {
  try {
    return await bot.sendMessage(chatId, text, { parse_mode: "HTML", ...options });
  } catch (err) {
    console.error(`[Telegram] Failed to send message to chatId ${chatId}:`, err.message);
  }
};

// ── Escape regex special characters ──────────────────────────────────────────
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ── Android & iOS Reliable User Lookup ───────────────────────────────────────
const findUser = async (fromObj, chatId) => {
  const username = fromObj?.username;
  const telegramUserId = fromObj?.id ? String(fromObj.id) : null;
  const strChatId = chatId ? String(chatId) : null;

  const cleanUsername = username ? username.replace(/^@/, "").trim() : null;
  const orConditions = [];

  // 1. Match verified ChatId or Telegram User ID (Android devices identify through this reliably)
  if (telegramUserId) {
    orConditions.push({ telegramChatId: telegramUserId });
  }
  if (strChatId && strChatId !== telegramUserId) {
    orConditions.push({ telegramChatId: strChatId });
  }

  // 2. Case-insensitive Username lookup (both with and without '@')
  if (cleanUsername) {
    const escaped = escapeRegex(cleanUsername);
    orConditions.push({
      telegramUserName: { $regex: new RegExp(`^@?${escaped}$`, "i") },
    });
  }

  if (orConditions.length === 0) {
    return { user: null, reason: "no_username" };
  }

  // Wait for MongoDB resolution completely before returning
  const user = await User.findOne({
    $or: orConditions,
    isDeleted: false,
  });

  if (!user) {
    if (!cleanUsername) return { user: null, reason: "no_username" };
    return { user: null, reason: "not_registered" };
  }

  if (!user.telegramNotificationsEnabled) {
    return {
      user: null,
      reason: "notifications_disabled",
      registeredUser: user,
    };
  }

  return { user, reason: null };
};

// ── Atomic Chat ID Synchronizer ──────────────────────────────────────────────
const syncChatId = async (user, chatId) => {
  if (!user || !chatId) return;
  const id = String(chatId);
  if (user.telegramChatId !== id || !user.telegramNotificationsEnabled) {
    user.telegramChatId = id;
    user.telegramNotificationsEnabled = true;
    await user.save();
  }
};

// ── Standard Responses ───────────────────────────────────────────────────────
const sendNotRegistered = async (chatId, username) =>
  await reply(
    chatId,
    `❌ <b>Account not found</b>\n\n` +
      `Your Telegram account <code>@${username || "unknown"}</code> is not linked in our system.\n\n` +
      `Please contact your administrator to register and link your Telegram username.`
  );

const sendNoUsername = async (chatId) =>
  await reply(
    chatId,
    `⚠️ <b>Username not set</b>\n\n` +
      `Please set a username in Telegram settings (Settings → Edit Profile → Username) ` +
      `and inform your administrator to link it to your account.`
  );

// ════════════════════════════════════════════════════════════════════════════
// COMMAND: /start
// ════════════════════════════════════════════════════════════════════════════
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // DB fetch shuru hone tak user ko typing show karein
    await showTyping(chatId);

    // DB request fulfill hone tak code yahan wait karega
    const { user, reason, registeredUser } = await findUser(msg.from, chatId);

    if (reason === "no_username") return await sendNoUsername(chatId);
    if (reason === "not_registered") return await sendNotRegistered(chatId, msg.from?.username);

    if (reason === "notifications_disabled") {
      registeredUser.telegramNotificationsEnabled = true;
      await syncChatId(registeredUser, chatId);
      return await reply(
        chatId,
        `✅ <b>Welcome back, ${registeredUser.name}!</b>\n\n` +
          `Your Telegram notifications have been re-enabled.`
      );
    }

    await syncChatId(user, chatId);
    return await sendWelcomeMessage(chatId, user);
  } catch (err) {
    console.error("[/start] Error:", err);
    return await reply(chatId, "⚠️ An error occurred. Please try again in a moment.");
  }
});

// ════════════════════════════════════════════════════════════════════════════
// COMMAND: /status
// ════════════════════════════════════════════════════════════════════════════
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await showTyping(chatId);

    const { user, reason } = await findUser(msg.from, chatId);

    if (reason === "no_username") return await sendNoUsername(chatId);
    if (reason === "not_registered") return await sendNotRegistered(chatId, msg.from?.username);

    if (reason === "notifications_disabled") {
      return await reply(
        chatId,
        `🔕 <b>Notifications paused</b>\n\n` +
          `Your account is registered but Telegram notifications are currently disabled.\n` +
          `Send /start to re-enable them.`
      );
    }

    await syncChatId(user, chatId);

    return await reply(
      chatId,
      `✅ <b>Account linked</b>\n\n` +
        `<b>Name:</b> ${user.name}\n` +
        `<b>Email:</b> ${user.email}\n` +
        `<b>Notifications:</b> Enabled`
    );
  } catch (err) {
    console.error("[/status] Error:", err);
    return await reply(chatId, "⚠️ An error occurred. Please try again in a moment.");
  }
});

// ════════════════════════════════════════════════════════════════════════════
// COMMAND: /unlink
// ════════════════════════════════════════════════════════════════════════════
bot.onText(/\/unlink/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await showTyping(chatId);

    const { user, reason, registeredUser } = await findUser(msg.from, chatId);

    if (reason === "no_username") return await sendNoUsername(chatId);
    if (reason === "not_registered") return await sendNotRegistered(chatId, msg.from?.username);

    const targetUser = user || registeredUser;

    if (!targetUser.telegramNotificationsEnabled && !targetUser.telegramChatId) {
      return await reply(chatId, "ℹ️ Your Telegram notifications are already disabled.");
    }

    targetUser.telegramChatId = null;
    targetUser.telegramNotificationsEnabled = false;
    await targetUser.save();

    return await reply(
      chatId,
      `✅ <b>Disconnected</b>\n\n` +
        `Your Telegram account has been unlinked from <b>${targetUser.email}</b>.\n` +
        `You will no longer receive notifications here.\n\n` +
        `Send /start at any time to reconnect.`
    );
  } catch (err) {
    console.error("[/unlink] Error:", err);
    return await reply(chatId, "⚠️ An error occurred. Please try again later.");
  }
});

// ════════════════════════════════════════════════════════════════════════════
// COMMAND: /help
// ════════════════════════════════════════════════════════════════════════════
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    return await reply(
      chatId,
      `📋 <b>Available Commands</b>\n\n` +
        `/start — Link your account and enable notifications\n` +
        `/status — Check your connection status\n` +
        `/tasks — View your assigned tasks\n` +
        `/unlink — Disconnect your Telegram account\n` +
        `/help — Show this message`
    );
  } catch (err) {
    console.error("[/help] Error:", err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// COMMAND: /tasks
// ════════════════════════════════════════════════════════════════════════════
bot.onText(/\/tasks$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await showTyping(chatId);

    const { user, reason } = await findUser(msg.from, chatId);

    if (reason === "no_username") return await sendNoUsername(chatId);
    if (reason === "not_registered") return await sendNotRegistered(chatId, msg.from?.username);

    if (reason === "notifications_disabled") {
      return await reply(
        chatId,
        "🔕 Your Telegram account is disconnected. Send /start to reconnect."
      );
    }

    await syncChatId(user, chatId);

    return await bot.sendMessage(
      chatId,
      `<b>Select Task Status</b>\nChoose an option below:`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Pending", callback_data: "tasks_pending" },
              { text: "Delayed", callback_data: "tasks_delayed" },
            ],
            [
              { text: "Overdue", callback_data: "tasks_overdue" },
              { text: "Upcoming", callback_data: "tasks_upcoming" },
            ],
          ],
        },
      }
    );
  } catch (err) {
    console.error("[/tasks] Error:", err);
    return await reply(chatId, "⚠️ Failed to load tasks menu.");
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CALLBACK QUERY (Interactive Task Buttons)
// ════════════════════════════════════════════════════════════════════════════
bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat?.id || query.from?.id;
  const data = query.data;

  if (!data?.startsWith("tasks_")) return;

  try {
    await bot.answerCallbackQuery(query.id, { text: "Fetching tasks..." });
  } catch (e) {
    // Suppress timeout errors
  }

  // Heavy DB query run hone tak typing status set karein
  await showTyping(chatId);

  try {
    const inputStatus = data.replace("tasks_", "").toLowerCase();

    if (!ALLOWED_STATUSES.has(inputStatus)) {
      return await reply(chatId, "❌ Invalid status selected.");
    }

    const { user } = await findUser(query.from, chatId);

    if (!user) {
      return await reply(chatId, "❌ User not linked. Please send /start first.");
    }

    const status = inputStatus.replace(/\b\w/g, (c) => c.toUpperCase());

    // Database lookup complete hone ka wait karein
    const [tasks, fmsTasks] = await Promise.all([
      Task.find({
        assignedTo: user._id,
        status,
        isDeleted: { $ne: true },
      })
        .select("title TaskId dueDate status")
        .lean(),
      FmsInstanceTask.find({
        assignedTo: user._id,
        status,
        isDeleted: { $ne: true },
      })
        .select("description taskId plannedDueDate status")
        .lean(),
    ]);

    const formattedTasks = [
      ...tasks.map((t) => ({
        title: t.title,
        id: t.TaskId || t._id,
        dueDate: t.dueDate,
        status: t.status,
        type: "Delegation",
      })),
      ...fmsTasks.map((t) => ({
        title: t.description || "FMS Task",
        id: t.taskId || t._id,
        dueDate: t.plannedDueDate,
        status: t.status,
        type: "FMS",
      })),
    ];

    if (!formattedTasks.length) {
      return await reply(chatId, `No <b>${inputStatus}</b> tasks found.`);
    }

    const message = formattedTasks
      .slice(0, 15) // Telegram 4096 character limit safety
      .map((t, i) => {
        return (
          `${i + 1}. <b>${t.title}</b>\n` +
          `━━━━━━━━━━━━━━\n` +
          `🆔 <code>${t.id}</code>\n` +
          `📌 <b>Type:</b> ${t.type}\n` +
          `📅 <b>Due:</b> ${t.dueDate ? moment(t.dueDate).format("DD MMM YYYY, hh:mm A") : "N/A"}`
        );
      })
      .join("\n\n");

    return await reply(
      chatId,
      `<b>${inputStatus.toUpperCase()} TASKS (${formattedTasks.length})</b>\n\n${message}`
    );
  } catch (err) {
    console.error("[callback_query] Error:", err);
    return await reply(chatId, "⚠️ Failed to fetch tasks from database.");
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GENERAL MESSAGE LISTENER (Strictly ignores commands to stop dual responses)
// ════════════════════════════════════════════════════════════════════════════
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || "";

  // Commands ko skip karein taaki onText aur onMessage clash na karein
  if (!text || text.startsWith("/")) return;
  if (Array.isArray(msg.entities) && msg.entities.some((e) => e.type === "bot_command")) {
    return;
  }

  try {
    await showTyping(chatId);

    const { user, reason } = await findUser(msg.from, chatId);

    if (reason === "no_username") return await sendNoUsername(chatId);
    if (reason === "not_registered") return await sendNotRegistered(chatId, msg.from?.username);

    if (reason === "notifications_disabled") {
      return await reply(
        chatId,
        `🔕 Your notifications are paused. Send /start to re-enable them.`
      );
    }

    if (!user) return;

    await syncChatId(user, chatId);
    return await sendWelcomeMessage(chatId, user);
  } catch (err) {
    console.error("[message handler] Error:", err);
    return await reply(chatId, "⚠️ An error occurred. Please try again in a moment.");
  }
});

// ── Polling & Process Guards ────────────────────────────────────────────────
bot.on("polling_error", (err) => {
  if (err.code === "ETELEGRAM" && err.message.includes("409")) {
    console.warn("[Telegram] Polling conflict (409) — another process is currently running.");
    return;
  }
  console.error("[Telegram] Polling error:", err.message);
});

bot.on("error", (err) => {
  console.error("[Telegram] Bot error:", err.message);
});

export default bot;