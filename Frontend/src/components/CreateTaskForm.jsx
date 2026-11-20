import React, { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  Zap,
  Search,
  Plus,
  Trash2,
  ListTodo,
  ClipboardList,
  Calendar as CalendarIcon,
  Users,
  GitBranch,
  Repeat,
  Paperclip,
  FileText,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import api from "../lib/api";

import { frequencyMap } from "./utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Textarea,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/index.jsx";
import dayjs from "dayjs";
import { DatePicker, Select as AntdSelect, TimePicker } from "antd";
import AttachmentUpload from "./attachmentsUpload.jsx";
import Cookies from "js-cookie";

const CreateTaskForm = ({
  users,
  departments,
  holidays,
  onTaskCreated,
  allTasks,
  workingWeeks,
}) => {
  const dispatch = useDispatch();
  const role = Cookies.get("role");

  // Form States
  const [date, setDate] = useState();
  const [startDate, setStartDate] = useState();
  const [taskEndDateOffset, setTaskEndDateOffset] = useState("1");
  const [isDependent, setIsDependent] = useState(false);
  const [parentTask, setParentTask] = useState("");
  const [parentTaskSearch, setParentTaskSearch] = useState("");
  const [startTimeSetting, setStartTimeSetting] =
    useState("planned-to-planned");
  const [frequencyType, setFrequencyType] = useState("days");
  const [xValue, setXValue] = useState("");
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("daily");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState();
  const [weeklyRecurrenceDays, setWeeklyRecurrenceDays] = useState([]);
  const [weeklyTwiceRecurrenceDay, setWeeklyTwiceRecurrenceDay] = useState("");
  const [repeatAfter, setRepeatAfter] = useState("2");

  // Monthly Schedule States ("date" = default as-is, "week" = Occurrence + Day)
  const [monthlyScheduleType, setMonthlyScheduleType] = useState("date");
  const [monthlyOccurrence, setMonthlyOccurrence] = useState("first");
  const [monthlyWeekDay, setMonthlyWeekDay] = useState("monday");

  const [taskEndTime, setTaskEndTime] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [checklistItem, setChecklistItem] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentFile, setAttachmentFile] = useState([]);
  const [attachmentFileList, setAttachmentFileList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Dynamic Rows: Contains selected users and their row-specific start date
  const [assignmentRows, setAssignmentRows] = useState([
    {
      users: [],
      startDate: null,
    },
  ]);

  // True when Monthly + Week-wise schedule is active (disables Start Date, End Date & End Time fields)
  const isMonthlyWeekWise =
    !isDependent &&
    isRecurrent &&
    recurrenceFrequency === "monthly" &&
    monthlyScheduleType === "week";

  const filteredParentTasks = useMemo(() => {
    if (!parentTaskSearch) return allTasks;
    const lowercasedSearch = parentTaskSearch.toLowerCase();
    return allTasks.filter(
      (task) =>
        task &&
        ((task.title && task.title.toLowerCase().includes(lowercasedSearch)) ||
          (task.TaskId &&
            String(task.TaskId).toLowerCase().includes(lowercasedSearch))),
    );
  }, [allTasks, parentTaskSearch]);

  // --- Checklist Handlers ---
  const addChecklistItem = () => {
    if (!checklistItem.trim()) return;
    setChecklist([...checklist, { text: checklistItem, isCompleted: false }]);
    toast.success("Checklist item added.");
    setChecklistItem("");
  };

  const removeChecklistItem = (index) => {
    const newList = [...checklist];
    newList.splice(index, 1);
    setChecklist(newList);
  };

  // HELPER: Get Department Working Schedule (Custom or Fallback Global)
  const getDeptWorkingSchedule = (deptId) => {
    if (deptId) {
      const deptObj = departments.find((d) => String(d._id) === String(deptId));
      if (deptObj && deptObj.workingWeekDays) {
        return deptObj.workingWeekDays;
      }
    }
    return workingWeeks;
  };

  // HELPER: Check Holiday for Specific Department
  const isHolidayForDept = (dateString, deptId) => {
    return holidays.some((h) => {
      const isDateMatch = dayjs(h.date).format("YYYY-MM-DD") === dateString;
      if (!isDateMatch) return false;

      if (h.isGlobal) return true;

      if (deptId && Array.isArray(h.applicableDepartments)) {
        return h.applicableDepartments.some(
          (d) => String(d._id || d) === String(deptId),
        );
      }
      return false;
    });
  };

  const selectedUsers = assignmentRows.flatMap((r) => r.users || []);

  const addAssignmentRow = () => {
    const availableUsers = users.filter((u) => !selectedUsers.includes(u._id));

    if (availableUsers.length === 0) {
      toast.error("No more users available to assign");
      return;
    }

    setAssignmentRows((prev) => [...prev, { users: [], startDate: null }]);
  };

  const removeAssignmentRow = (index) => {
    if (assignmentRows.length === 1) return;
    setAssignmentRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateUsers = (index, newUsers) => {
    setAssignmentRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              users: [...new Set(newUsers)],
            }
          : row,
      ),
    );
  };

  const updateRowStartDate = (index, dateVal) => {
    setAssignmentRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, startDate: dateVal } : row,
      ),
    );
  };

  // --- Handle Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const hasUsers = assignmentRows.some((row) => row.users.length > 0);
    if (!hasUsers) {
      toast.error("Please select at least one user");
      return;
    }

    const isMultiDept = assignmentRows.length > 1;

    // Validate rows
    for (const [idx, row] of assignmentRows.entries()) {
      if (row.users.length === 0) {
        toast.error(`Please select users for Row ${idx + 1}`);
        return;
      }

      if (!isDependent && !isMonthlyWeekWise && isMultiDept && !row.startDate) {
        toast.error(`Please select Start Date for Row ${idx + 1}`);
        return;
      }
    }

    if (!isDependent && !isMonthlyWeekWise && !isMultiDept && !startDate) {
      toast.error("Start Date is required.");
      return;
    }

    if (!isDependent && !isRecurrent && !taskEndDateOffset) {
      toast.error("Task end day is required");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (isDependent && !parentTask) {
      toast.error("Please select a parent task");
      return;
    }

    if (isDependent && xValue.trim() === "") {
      toast.error("X Value is required for dependent tasks.");
      return;
    }

    if (isMonthlyWeekWise && (!monthlyOccurrence || !monthlyWeekDay)) {
      toast.error(
        "Please select Occurrence and Day for Monthly week-wise schedule.",
      );
      return;
    }

    setLoading(true);

    try {
      for (const row of assignmentRows) {
        if (row.users.length === 0) continue;

        // Group users by their linked Department ID automatically
        const usersByDept = {};
        row.users.forEach((userId) => {
          const uObj = users.find((u) => u._id === userId);
          const deptId = uObj?.department?._id || uObj?.department || "no_dept";
          if (!usersByDept[deptId]) usersByDept[deptId] = [];
          usersByDept[deptId].push(userId);
        });

        // Create task payload per department group as expected by backend
        for (const [deptId, deptUsers] of Object.entries(usersByDept)) {
          const formData = new FormData();

          formData.append("assignedTo", JSON.stringify(deptUsers));
          if (deptId !== "no_dept") {
            formData.append("departmentOfAssignToUser", deptId);
          }
          formData.append("title", title.trim());
          formData.append("description", description.trim());

          if (!isMonthlyWeekWise) {
            const effectiveStartDate = isMultiDept ? row.startDate : startDate;

            if (effectiveStartDate) {
              formData.append("startDate", effectiveStartDate);
            } else {
              const todayStr = new Date().toLocaleDateString("en-CA");
              formData.append("startDate", todayStr);
            }
          }

          if (!isRecurrent && taskEndDateOffset) {
            formData.append("taskEndDays", taskEndDateOffset);
          }
          if (!isRecurrent && taskEndTime) {
            formData.append("taskEndTime", taskEndTime);
          }

          if (checklist.length > 0) {
            formData.append("checklist", JSON.stringify(checklist));
          }

          if (attachmentFile && attachmentFile.length > 0) {
            attachmentFile.forEach((file) => {
              formData.append("attachmentFile", file);
            });
          }

          formData.append("isRecurrent", String(isRecurrent));

          if (isRecurrent) {
            if (recurrenceFrequency) {
              formData.append(
                "frequency",
                frequencyMap[recurrenceFrequency] || recurrenceFrequency,
              );
            }

            if (
              recurrenceFrequency === "weekly" &&
              weeklyRecurrenceDays.length > 0
            ) {
              formData.append("weekDays", JSON.stringify(weeklyRecurrenceDays));
            }
            if (recurrenceFrequency === "bi-weekly") {
              formData.append("weekStartDay", weeklyTwiceRecurrenceDay);
              formData.append("repeatAfter", repeatAfter);
            }
            if (recurrenceFrequency === "monthly") {
              formData.append("monthlyScheduleType", monthlyScheduleType);
              if (monthlyScheduleType === "week") {
                formData.append("monthlyOccurrence", monthlyOccurrence);
                formData.append("monthlyWeekDay", monthlyWeekDay);
              }
            }
            if (!isMonthlyWeekWise && recurrenceEndDate) {
              formData.append("recurrenceEndDate", recurrenceEndDate);
            }
          }

          formData.append("isDependent", String(isDependent));

          if (isDependent) {
            if (parentTask) formData.append("parentTask", parentTask);
            if (startTimeSetting)
              formData.append("startTimeSetting", startTimeSetting);
            if (frequencyType) {
              formData.append(
                "isDependentFrequency",
                frequencyType === "days" ? "T+X in days" : "T-X in hours",
              );
            }
            if (xValue !== "") formData.append("xValue", xValue);

            if (startTimeSetting === "actual-to-planned") {
              formData.delete("startDate");
            }
          }

          await api.post("/tasks", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        }
      }

      // RESET FORM
      setTitle("");
      setAssignmentRows([{ users: [], startDate: null }]);
      setDescription("");
      setDate(null);
      setStartDate(null);
      setChecklist([]);
      setAttachmentFile([]);
      setAttachmentFileList([]);
      setIsRecurrent(false);
      setIsDependent(false);
      setParentTask("");
      setStartTimeSetting("planned-to-planned");
      setXValue("");
      setRecurrenceEndDate(null);
      setWeeklyRecurrenceDays([]);
      setWeeklyTwiceRecurrenceDay("");
      setMonthlyScheduleType("date");
      setMonthlyOccurrence("first");
      setMonthlyWeekDay("monday");
      setTaskEndDateOffset("1");
      setTaskEndTime(null);

      onTaskCreated();
      toast.success("Tasks assigned successfully!");
    } catch (err) {
      console.error("Submission Error:", err);
      const msg =
        err.response?.data?.message || err.message || "Failed to create task";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isMultiDepartment = assignmentRows.length > 1;
  const showRowStartDate = isMultiDepartment && !isDependent;

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

  return (
    <Card className="m-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300">
      {/* Light & Clean Header Bar */}
      <CardHeader className="border-b border-slate-200/80 bg-gradient-to-r from-white via-blue-50/60 to-indigo-50/50 px-6 py-4 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/80 border border-blue-200/70 text-blue-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight text-slate-900">
                Delegate a New Task
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign one-time, dependent, or recurring tasks across your team
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRecurrent && !isDependent && (
              <Badge className="hidden sm:inline-flex bg-blue-100/80 text-blue-700 border border-blue-200 hover:bg-blue-100/80">
                Recurring • {capitalize(recurrenceFrequency)}
              </Badge>
            )}
            {isDependent && (
              <Badge className="hidden sm:inline-flex bg-amber-100/80 text-amber-800 border border-amber-200 hover:bg-amber-100/80">
                Dependent Task
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
              className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"
            >
              {isFormCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isFormCollapsed && (
        <CardContent className="p-6 bg-slate-50/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* BALANCED 2-COLUMN WORKSPACE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* LEFT COLUMN (6 Cols): Core Details, Assignees, Checklist */}
              <div className="lg:col-span-6 flex flex-col gap-5">
                {/* SECTION 1: Task Overview */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      1. Task Information
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="task-title"
                      className="text-xs font-semibold text-slate-600"
                    >
                      Task Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="task-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Monthly Inventory Reconciliation"
                      className="h-10 border-slate-200 bg-slate-50/40 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="task-description"
                      className="text-xs font-semibold text-slate-600"
                    >
                      Task Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="task-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide clear instructions, expected outcome, or reference notes..."
                      rows={3}
                      className="border-slate-200 bg-slate-50/40 focus:bg-white transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* SECTION 2: Assignees */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        2. Assignees
                      </h3>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-indigo-50 text-indigo-700 border-indigo-100"
                    >
                      {selectedUsers.length} Selected
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {assignmentRows.map((row, index) => {
                      const availableUsers = users.filter((u) => {
                        return (
                          !selectedUsers.includes(u._id) ||
                          row.users.includes(u._id)
                        );
                      });

                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5 transition-all hover:border-slate-300"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">
                              Group #{index + 1}
                            </span>
                            {assignmentRows.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => removeAssignmentRow(index)}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Remove
                              </Button>
                            )}
                          </div>

                          <div
                            className={`grid grid-cols-1 ${
                              showRowStartDate ? "sm:grid-cols-12" : ""
                            } gap-3 items-end`}
                          >
                            <div
                              className={
                                showRowStartDate
                                  ? "sm:col-span-7 space-y-1.5"
                                  : "space-y-1.5"
                              }
                            >
                              <Label className="text-xs text-slate-600">
                                Select Team Members{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <AntdSelect
                                mode="multiple"
                                showSearch
                                placeholder={`Choose users (${availableUsers.length} available)`}
                                value={row.users}
                                onChange={(values) => updateUsers(index, values)}
                                style={{ width: "100%", minHeight: 40 }}
                                optionFilterProp="label"
                                options={availableUsers.map((u) => ({
                                  value: u._id,
                                  label: `${u.name || u.email}`,
                                }))}
                              />
                            </div>

                            {/* DYNAMIC PER-ROW START DATE (Disabled when Monthly Week-Wise is active) */}
                            {showRowStartDate && (
                              <div className="sm:col-span-5 space-y-1.5">
                                <Label
                                  className={`text-xs font-semibold flex items-center gap-1 ${
                                    isMonthlyWeekWise
                                      ? "text-slate-400"
                                      : "text-blue-700"
                                  }`}
                                >
                                  <CalendarIcon
                                    className={`w-3.5 h-3.5 ${
                                      isMonthlyWeekWise
                                        ? "text-slate-400"
                                        : "text-blue-600"
                                    }`}
                                  />
                                  Start Date{" "}
                                  {!isMonthlyWeekWise && (
                                    <span className="text-red-500">*</span>
                                  )}
                                </Label>
                                <DatePicker
                                  disabled={isMonthlyWeekWise}
                                  className="w-full h-10"
                                  format="DD MMM YYYY"
                                  value={
                                    row.startDate ? dayjs(row.startDate) : null
                                  }
                                  onChange={(date) => {
                                    if (!date) {
                                      updateRowStartDate(index, null);
                                      return;
                                    }

                                    const selected = dayjs(date);
                                    const selectedDateStr =
                                      selected.format("YYYY-MM-DD");

                                    updateRowStartDate(index, selectedDateStr);
                                  }}
                                  disabledDate={(current) => {
                                    const today = dayjs().startOf("day");
                                    return current && current < today;
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {role !== "Member" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addAssignmentRow}
                      className="w-full h-9 border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Another Assignee Group
                    </Button>
                  )}
                </div>

                {/* SECTION 3: Checklist */}
                <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <ListTodo className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        3. Action Checklist{" "}
                        <span className="text-xs font-normal text-slate-400">
                          (Optional)
                        </span>
                      </h3>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-700"
                    >
                      {checklist.length}{" "}
                      {checklist.length === 1 ? "step" : "steps"}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={checklistItem}
                      onChange={(e) => setChecklistItem(e.target.value)}
                      placeholder="Type a checklist step and press Enter..."
                      className="h-10 bg-slate-50/40 focus:bg-white"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addChecklistItem())
                      }
                    />
                    <Button
                      type="button"
                      onClick={addChecklistItem}
                      variant="secondary"
                      className="h-10 px-4 border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>

                  {checklist.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 bg-slate-50/40">
                      <ClipboardList className="w-4 h-4 opacity-60" />
                      <span className="text-xs">
                        No checklist items added yet
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {checklist.map((item, index) => (
                        <div
                          key={index}
                          className="group flex items-center justify-between bg-slate-50/70 px-3.5 py-2.5 rounded-lg border border-slate-200/80 hover:border-blue-200 hover:bg-white transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                              {index + 1}
                            </span>
                            <span className="text-sm text-slate-700">
                              {item.text}
                            </span>
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeChecklistItem(index)}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-70 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN (6 Cols): Task Mode, Schedule, Recurrence & Attachments */}
              <div className="lg:col-span-6 flex flex-col gap-5">
                {/* SECTION 4: Task Mode (Dependency vs Standard/Recurring) */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      4. Task Dependency & Mode
                    </h3>
                  </div>

                  {/* Segmented Toggle for Dependency */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">
                      Is this task dependent on another Task?
                    </Label>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDependent(false);
                          setParentTask("");
                          setStartTimeSetting(null);
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                          !isDependent
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        No (Independent)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDependent(true);
                          setIsRecurrent(false);
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                          isDependent
                            ? "bg-white text-amber-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Yes (Dependent)
                      </button>
                    </div>
                  </div>

                  {/* DEPENDENT TASK CONFIG */}
                  {isDependent && (
                    <div className="space-y-3.5 pt-2 border-t border-slate-100 animate-in fade-in">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">
                          Parent Task <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={parentTask}
                          onValueChange={(value) => {
                            setParentTask(value);
                            setParentTaskSearch("");
                          }}
                        >
                          <SelectTrigger className="bg-slate-50/50 w-full h-10 text-left justify-between font-normal">
                            {(() => {
                              const selectedTask =
                                parentTask &&
                                allTasks.find(
                                  (t) => (t._id || t.id) === parentTask,
                                );
                              if (selectedTask) {
                                return (
                                  <span className="truncate block">
                                    <span className="font-semibold">
                                      {selectedTask.TaskId}
                                    </span>
                                    <span className="text-gray-600">
                                      {" "}
                                      - {selectedTask.title}
                                    </span>
                                  </span>
                                );
                              }
                              return (
                                <span className="text-gray-500">
                                  Select parent task...
                                </span>
                              );
                            })()}
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2 sticky top-0 bg-white z-10">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Search by ID or title..."
                                  value={parentTaskSearch}
                                  onChange={(e) =>
                                    setParentTaskSearch(e.target.value)
                                  }
                                  className="pl-9 bg-gray-50"
                                />
                              </div>
                            </div>
                            <div>
                              {filteredParentTasks.length > 0 ? (
                                filteredParentTasks
                                  .filter((item) => item.status !== "Completed")
                                  .map((t) => (
                                    <SelectItem
                                      key={t._id || t.id}
                                      value={t._id || t.id}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-sm">
                                          {t.TaskId} - {t.title}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          Due:{" "}
                                          {t.dueDate
                                            ? format(
                                                new Date(t.dueDate),
                                                "dd-MM-yyyy",
                                              )
                                            : "N/A"}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))
                              ) : (
                                <div className="p-4 text-sm text-center text-gray-500">
                                  No tasks found.
                                </div>
                              )}
                            </div>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-700">
                          Start Time Setting{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={startTimeSetting || ""}
                          onValueChange={setStartTimeSetting}
                        >
                          <SelectTrigger className="bg-slate-50/50 h-10">
                            <SelectValue placeholder="Select logic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned-to-planned">
                              Planned to Planned
                            </SelectItem>
                            <SelectItem value="actual-to-planned">
                              Actual to Planned
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-700">
                            Lag Type <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={frequencyType}
                            onValueChange={setFrequencyType}
                          >
                            <SelectTrigger className="bg-slate-50/50 h-10">
                              <SelectValue placeholder="Select Lag Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">T+X Days</SelectItem>
                              <SelectItem value="hours">T+X Hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-slate-700">
                            X Value <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={xValue}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              if (value === "" || Number(value) > 0) {
                                setXValue(value);
                              }
                            }}
                            placeholder="e.g. 2"
                            className="bg-slate-50/50 h-10"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RECURRING TOGGLE (Only when Independent) */}
                  {!isDependent && (
                    <div className="pt-1">
                      <label
                        htmlFor="recurrence-check"
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isRecurrent
                            ? "border-blue-300 bg-blue-50/50"
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              isRecurrent
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-slate-200 text-slate-500"
                            }`}
                          >
                            <Repeat className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                              Set as Recurring Task
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Auto-generate task on a repeating schedule
                            </p>
                          </div>
                        </div>
                        <Checkbox
                          id="recurrence-check"
                          checked={isRecurrent}
                          onChange={(e) => {
                            setIsRecurrent(e.target.checked);
                            if (e.target.checked) setDate(null);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* SECTION 5: Schedule & Recurrence Rules */}
                {!isDependent && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                        <CalendarIcon className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        5. Schedule & Timeline
                      </h3>
                    </div>

                    {/* Standard Start Date & End Offset/Time (Disabled when Monthly Week-Wise is active) */}
                    <div className="space-y-3.5">
                      {!isMultiDepartment && (
                        <div className="space-y-1.5">
                          <Label
                            className={`text-xs font-medium ${
                              isMonthlyWeekWise
                                ? "text-slate-400"
                                : "text-slate-700"
                            }`}
                          >
                            Start Date{" "}
                            {!isMonthlyWeekWise && (
                              <span className="text-red-500">*</span>
                            )}
                          </Label>
                          <DatePicker
                            disabled={isMonthlyWeekWise}
                            className="w-full h-10"
                            format="DD MMM YYYY"
                            value={startDate ? dayjs(startDate) : null}
                            onChange={(date) => {
                              if (!date) {
                                setStartDate(null);
                                return;
                              }
                              const selected = dayjs(date);
                              setStartDate(selected.format("YYYY-MM-DD"));
                            }}
                            disabledDate={(current) => {
                              const today = dayjs().startOf("day");
                              return current && current < today;
                            }}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label
                            className={`text-xs font-medium ${
                              isRecurrent || isMonthlyWeekWise
                                ? "text-slate-400"
                                : "text-slate-700"
                            }`}
                          >
                            End After (Days){" "}
                            {!isRecurrent && !isMonthlyWeekWise && (
                              <span className="text-red-500">*</span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            disabled={isRecurrent || isMonthlyWeekWise}
                            value={taskEndDateOffset}
                            onChange={(e) =>
                              setTaskEndDateOffset(e.target.value)
                            }
                            placeholder="e.g. 1"
                            className="h-10"
                            min="1"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            className={`text-xs font-medium ${
                              isRecurrent || isMonthlyWeekWise
                                ? "text-slate-400"
                                : "text-slate-700"
                            }`}
                          >
                            Task End Time
                          </Label>
                          <TimePicker
                            className="w-full h-10"
                            disabled={isRecurrent || isMonthlyWeekWise}
                            format="hh:mm A"
                            use12Hours
                            value={
                              taskEndTime ? dayjs(taskEndTime, "HH:mm") : null
                            }
                            onChange={(time) =>
                              setTaskEndTime(
                                time ? time.format("HH:mm") : null,
                              )
                            }
                            placeholder="Select time"
                          />
                        </div>
                      </div>
                    </div>

                    {/* RECURRENCE CONFIGURATION */}
                    {isRecurrent && (
                      <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-700">
                              Frequency <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={recurrenceFrequency}
                              onValueChange={(value) => {
                                setRecurrenceFrequency(value);
                                if (value !== "weekly")
                                  setWeeklyRecurrenceDays([]);
                                if (value !== "bi-weekly")
                                  setWeeklyTwiceRecurrenceDay("");
                                if (value !== "monthly") {
                                  setMonthlyScheduleType("date");
                                  setMonthlyOccurrence("first");
                                  setMonthlyWeekDay("monday");
                                }
                              }}
                            >
                              <SelectTrigger className="bg-slate-50/50 h-10">
                                <SelectValue placeholder="Select Frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="bi-weekly">
                                  Bi-weekly
                                </SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">
                                  Quarterly
                                </SelectItem>
                                <SelectItem value="fortnightly">
                                  Fortnightly
                                </SelectItem>
                                <SelectItem value="half-yearly">
                                  Half Yearly
                                </SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Recurrence End Date (Disabled when Monthly Week-Wise is active) */}
                          <div className="space-y-1.5">
                            <Label
                              className={`text-xs font-medium ${
                                isMonthlyWeekWise
                                  ? "text-slate-400"
                                  : "text-slate-700"
                              }`}
                            >
                              Recurrence End Date
                            </Label>
                            <DatePicker
                              disabled={isMonthlyWeekWise}
                              className="w-full h-10"
                              format="DD MMM YYYY hh:mm A"
                              showTime={{
                                format: "hh:mm A",
                                use12Hours: true,
                              }}
                              value={
                                recurrenceEndDate
                                  ? dayjs(recurrenceEndDate)
                                  : null
                              }
                              disabledDate={(current) => {
                                if (!current) return false;
                                const now = dayjs();
                                if (startDate) {
                                  return current.isBefore(
                                    dayjs(startDate),
                                    "day",
                                  );
                                }
                                return current.isBefore(now, "day");
                              }}
                              onChange={(date) => {
                                if (!date) {
                                  setRecurrenceEndDate(undefined);
                                  return;
                                }

                                if (
                                  startDate &&
                                  date.isBefore(dayjs(startDate))
                                ) {
                                  toast.error(
                                    "End Date cannot be before Start Date",
                                  );
                                  setRecurrenceEndDate(undefined);
                                  return;
                                }

                                setRecurrenceEndDate(date.toISOString());
                              }}
                            />
                          </div>
                        </div>

                        {/* MONTHLY SCHEDULE SELECTOR (Segmented Pill + Week-wise Dropdowns) */}
                        {recurrenceFrequency === "monthly" && (
                          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-slate-700">
                                Monthly Schedule Mode
                              </Label>
                              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-white border border-slate-200/80">
                                <button
                                  type="button"
                                  onClick={() => setMonthlyScheduleType("date")}
                                  className={`py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all ${
                                    monthlyScheduleType === "date"
                                      ? "bg-blue-600 text-white shadow-2xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  Date wise schedule
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMonthlyScheduleType("week");
                                    setStartDate(null);
                                    setRecurrenceEndDate(undefined);
                                    setTaskEndTime(null);
                                    setAssignmentRows((prev) =>
                                      prev.map((r) => ({
                                        ...r,
                                        startDate: null,
                                      })),
                                    );
                                  }}
                                  className={`py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all ${
                                    monthlyScheduleType === "week"
                                      ? "bg-blue-600 text-white shadow-2xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  Week wise schedule
                                </button>
                              </div>
                            </div>

                            {monthlyScheduleType === "week" && (
                              <div className="space-y-3 pt-1">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-700">
                                      Occurrence{" "}
                                      <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                      value={monthlyOccurrence}
                                      onValueChange={setMonthlyOccurrence}
                                    >
                                      <SelectTrigger className="bg-white h-10">
                                        <SelectValue placeholder="Occurrence" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="first">
                                          First
                                        </SelectItem>
                                        <SelectItem value="second">
                                          Second
                                        </SelectItem>
                                        <SelectItem value="third">
                                          Third
                                        </SelectItem>
                                        <SelectItem value="fourth">
                                          Fourth
                                        </SelectItem>
                                        <SelectItem value="last">
                                          Last
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-700">
                                      Day{" "}
                                      <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                      value={monthlyWeekDay}
                                      onValueChange={setMonthlyWeekDay}
                                    >
                                      <SelectTrigger className="bg-white h-10">
                                        <SelectValue placeholder="Day" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="sunday">
                                          Sunday
                                        </SelectItem>
                                        <SelectItem value="monday">
                                          Monday
                                        </SelectItem>
                                        <SelectItem value="tuesday">
                                          Tuesday
                                        </SelectItem>
                                        <SelectItem value="wednesday">
                                          Wednesday
                                        </SelectItem>
                                        <SelectItem value="thursday">
                                          Thursday
                                        </SelectItem>
                                        <SelectItem value="friday">
                                          Friday
                                        </SelectItem>
                                        <SelectItem value="saturday">
                                          Saturday
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 rounded-lg bg-white/90 border border-blue-200/70 px-3 py-2 text-xs text-blue-800">
                                  <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                  <span>
                                    Repeats on the{" "}
                                    <strong>
                                      {capitalize(monthlyOccurrence)}{" "}
                                      {capitalize(monthlyWeekDay)}
                                    </strong>{" "}
                                    of every month
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* WEEKLY PILL SELECTOR */}
                        {recurrenceFrequency === "weekly" && (
                          <div className="space-y-2 pt-1">
                            <Label className="text-xs font-medium text-slate-700">
                              Select Days of the Week
                            </Label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                "Sunday",
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                              ].map((day) => {
                                const dayLowerCase = day.toLowerCase();
                                const isSelected =
                                  weeklyRecurrenceDays.includes(dayLowerCase);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() =>
                                      setWeeklyRecurrenceDays((prev) =>
                                        isSelected
                                          ? prev.filter(
                                              (d) => d !== dayLowerCase,
                                            )
                                          : [...prev, dayLowerCase],
                                      )
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                      isSelected
                                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    {day.slice(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* BI-WEEKLY SELECTOR */}
                        {recurrenceFrequency === "bi-weekly" && (
                          <div className="space-y-3 pt-1">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-700">
                                Start Day of the Week
                              </Label>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  "Sunday",
                                  "Monday",
                                  "Tuesday",
                                  "Wednesday",
                                  "Thursday",
                                  "Friday",
                                  "Saturday",
                                ].map((day) => {
                                  const dayLowerCase = day.toLowerCase();
                                  const isSelected =
                                    weeklyTwiceRecurrenceDay === dayLowerCase;
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() =>
                                        setWeeklyTwiceRecurrenceDay(
                                          dayLowerCase,
                                        )
                                      }
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                        isSelected
                                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {day.slice(0, 3)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-slate-700">
                                Repeat After (Days){" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={repeatAfter}
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /\D/g,
                                    "",
                                  );
                                  if (value === "") {
                                    setRepeatAfter("");
                                    return;
                                  }
                                  const num = Number(value);
                                  if (num < 1 || num > 6) {
                                    toast.error(
                                      "Repeat After must be between 1 and 6 days.",
                                    );
                                    return;
                                  }
                                  setRepeatAfter(value);
                                }}
                                placeholder="1 - 6"
                                className="bg-slate-50/50 h-10"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 6: Attachments */}
                <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {isDependent ? "5." : "6."} Attachments{" "}
                      <span className="text-xs font-normal text-slate-400">
                        (Optional)
                      </span>
                    </h3>
                  </div>

                  <AttachmentUpload
                    setFiles={setAttachmentFile}
                    fileList={attachmentFileList}
                    setFileList={setAttachmentFileList}
                  />
                </div>
              </div>
            </div>

            {/* FOOTER ACTION BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-2xs">
              <p className="text-xs text-slate-500">
                Fields marked with <span className="text-red-500">*</span> are
                required before assigning.
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full sm:w-auto min-w-[170px] h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition-all"
              >
                {loading ? "Assigning Task..." : "Assign Task"}
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
};

export default CreateTaskForm;