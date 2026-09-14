export const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date)) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", {
    month: "short",
  });
  const year = date.getFullYear();

  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${day} ${month} ${year}, ${time}`;
};

export const formatLabel = (text = "") => {
  if (!text || typeof text !== "string") return "";

  // 🔥 0. Normalize known words (important fix)
  const normalizeMap = {
    onhold: "On Hold",
    inprocess: "In Process",
    stopped: "Stopped",
    upcoming: "Upcoming",
    ongoing: "Ongoing",
    completed: "Completed",
  };

  const lower = text.toLowerCase().replace(/[\s_\-.]/g, "");
  if (normalizeMap[lower]) return normalizeMap[lower];

  return (
    text
      // 1. Convert camelCase → camel Case
      .replace(/([a-z])([A-Z])/g, "$1 $2")

      // 2. Replace separators (_ - .)
      .replace(/[_\-.]+/g, " ")

      // 3. Remove extra spaces
      .replace(/\s+/g, " ")
      .trim()

      // 4. Capitalize words properly
      .split(" ")
      .map((word) => {
        if (word.toUpperCase() === word) return word; // keep API, ID

        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ")
  );
};
export const getDueStatus = (dueDate) => {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();

  // 🔴 1. OVERDUE (Due time has passed)
  if (diffMs < 0) {
    const overdueMs = Math.abs(diffMs);

    const totalMinutes = Math.floor(overdueMs / (1000 * 60));
    const totalHours = Math.floor(overdueMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    let lateText = "";

    if (days > 0) {
      lateText =
        hours > 0
          ? `${days} day(s), ${hours} hr(s) late`
          : `${days} day(s) late`;
    } else if (totalHours > 0) {
      lateText = `${totalHours} hr(s) late`;
    } else if (totalMinutes > 0) {
      lateText = `${totalMinutes} min(s) late`;
    } else {
      lateText = "Just now overdue";
    }

    return {
      type: "overdue",
      label: "Overdue",
      text: lateText,
    };
  }

  // 🟡 2. DUE TODAY (Time remaining within today's date)
  if (due.toDateString() === now.toDateString()) {
    const totalMinutesLeft = Math.ceil(diffMs / (1000 * 60));
    const hoursLeft = Math.floor(totalMinutesLeft / 60);
    const minsLeft = totalMinutesLeft % 60;

    let dueTodayText = "";
    if (hoursLeft > 0) {
      dueTodayText =
        minsLeft > 0
          ? `${hoursLeft} hr(s), ${minsLeft} min(s) left`
          : `${hoursLeft} hr(s) left`;
    } else {
      dueTodayText = `${totalMinutesLeft} min(s) left`;
    }

    return {
      type: "today",
      label: "Due Today",
      text: dueTodayText,
    };
  }

  // 🟢 3. REMAINING / UPCOMING (Future dates)
  const totalHoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
  const daysLeft = Math.floor(totalHoursLeft / 24);
  const remainingHours = totalHoursLeft % 24;

  let remainingText = "";
  if (daysLeft > 0) {
    remainingText =
      remainingHours > 0
        ? `${daysLeft} day(s), ${remainingHours} hr(s) left`
        : `${daysLeft} day(s) left`;
  } else {
    remainingText = `${totalHoursLeft} hr(s) left`;
  }

  return {
    type: "upcoming",
    label: "Remaining",
    text: remainingText,
  };
};
