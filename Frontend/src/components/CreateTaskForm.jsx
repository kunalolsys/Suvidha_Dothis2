import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  Zap,
  Search,
  Clock,
  Plus,
  Trash2,
  ListTodo,
  ClipboardList,
  Calendar as CalendarIcon,
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
  RadioGroup,
  RadioGroupItem,
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
  const [startDate, setStartDate] = useState(); // Global Start Date (Used when 1 Department is selected)
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

  const [taskEndTime, setTaskEndTime] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [checklistItem, setChecklistItem] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentFile, setAttachmentFile] = useState([]);
  const [attachmentFileList, setAttachmentFileList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // 🟢 Dynamic Rows: Each row carries its own Department, Users, and specific StartDate
  const [assignmentRows, setAssignmentRows] = useState([
    {
      departmentId: "",
      users: [],
      startDate: null,
    },
  ]);

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

  // 🟢 HELPER: Get Department Working Schedule (Custom or Fallback Global)
  const getDeptWorkingSchedule = (deptId) => {
    if (deptId) {
      const deptObj = departments.find((d) => String(d._id) === String(deptId));
      if (deptObj && deptObj.workingWeekDays) {
        return deptObj.workingWeekDays;
      }
    }
    return workingWeeks;
  };

  // 🟢 HELPER: Check Holiday for Specific Department
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
    const selectedUsers = assignmentRows.flatMap((r) => r.users || []);
    const availableUsers = users.filter((u) => !selectedUsers.includes(u._id));

    if (availableUsers.length === 0) {
      toast.error("No more users available to assign");
      return;
    }

    setAssignmentRows((prev) => [
      ...prev,
      { departmentId: "", users: [], startDate: null },
    ]);
  };

  const isDepartmentFullySelected = (deptId) => {
    const deptUsers = users.filter(
      (u) =>
        Array.isArray(u.department) &&
        u.department.some((d) => d?._id === deptId),
    );

    const selectedUsers = assignmentRows
      .filter((r) => r.departmentId === deptId)
      .flatMap((r) => r.users || []);

    return deptUsers.length > 0 && selectedUsers.length >= deptUsers.length;
  };

  const removeAssignmentRow = (index) => {
    if (assignmentRows.length === 1) return;
    setAssignmentRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDepartment = (index, departmentId) => {
    setAssignmentRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              departmentId,
              users: [],
              startDate: null,
            }
          : row,
      ),
    );
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
      if (!row.departmentId) {
        toast.error(`Please select department for Row ${idx + 1}`);
        return;
      }
      if (row.users.length === 0) {
        toast.error(`Please select users for Row ${idx + 1}`);
        return;
      }

      // Check per-department Start Date if multiple departments are added
      if (!isDependent && isMultiDept && !row.startDate) {
        const deptObj = departments.find((d) => d._id === row.departmentId);
        toast.error(
          `Please select Start Date for ${deptObj?.name || `Row ${idx + 1}`}`,
        );
        return;
      }
    }

    // Check single Start Date if only 1 department is selected
    if (!isDependent && !isMultiDept && !startDate) {
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

    setLoading(true);

    try {
      for (const row of assignmentRows) {
        if (!row.departmentId || row.users.length === 0) continue;

        const formData = new FormData();

        formData.append("assignedTo", JSON.stringify(row.users));
        formData.append("departmentOfAssignToUser", row.departmentId);
        formData.append("title", title.trim());
        formData.append("description", description.trim());

        // 🟢 Pick row-specific date for multi-dept, or single global date for single dept
        const effectiveStartDate = isMultiDept ? row.startDate : startDate;

        if (effectiveStartDate) {
          formData.append("startDate", effectiveStartDate);
        } else {
          const todayStr = new Date().toLocaleDateString("en-CA");
          formData.append("startDate", todayStr);
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
          if (recurrenceEndDate) {
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

      // RESET FORM
      setTitle("");
      setAssignmentRows([{ departmentId: "", users: [], startDate: null }]);
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

  return (
    <Card className="m-4 shadow-xl bg-white/80 backdrop-blur-sm border-0 hover:shadow-2xl transition-all duration-500 group">
      <CardHeader className="border-b border-gray-200/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-lg font-semibold text-gray-900 tracking-tight">
              Delegate a New Task
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsFormCollapsed(!isFormCollapsed)}
            className="h-8 w-8 text-gray-500 hover:bg-gray-100"
          >
            {isFormCollapsed ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      {!isFormCollapsed && (
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Task Title & Dynamic Assignee Rows */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">
                  Task Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title"
                  className="hover:shadow-md transition-all duration-200"
                />
              </div>

              {/* Dynamic Department/User Rows */}
              {assignmentRows.map((row, index) => {
                const filteredUsers = users.filter((u) => {
                  const inDepartment =
                    Array.isArray(u.department) &&
                    u.department.some((d) => d?._id === row.departmentId);

                  const alreadySelectedElsewhere =
                    selectedUsers.includes(u._id) && !row.users.includes(u._id);

                  return inDepartment && !alreadySelectedElsewhere;
                });

                const deptObj = departments.find(
                  (d) => d._id === row.departmentId,
                );

                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border rounded-xl p-4 bg-slate-50 relative"
                  >
                    {/* Department */}
                    <div
                      className={
                        isMultiDepartment && !isDependent
                          ? "md:col-span-3 space-y-2"
                          : "md:col-span-4 space-y-2"
                      }
                    >
                      <Label>
                        Department <span className="text-red-500">*</span>
                      </Label>
                      <AntdSelect
                        showSearch
                        placeholder="Select Department"
                        value={row.departmentId || undefined}
                        onChange={(value) => updateDepartment(index, value)}
                        style={{ width: "100%", minHeight: 38 }}
                        optionFilterProp="label"
                        options={departments.map((d) => ({
                          value: d._id,
                          label: d.name,
                          disabled: isDepartmentFullySelected(d._id),
                        }))}
                      />
                    </div>

                    {/* Users */}
                    <div
                      className={
                        isMultiDepartment && !isDependent
                          ? "md:col-span-4 space-y-2"
                          : "md:col-span-6 space-y-2"
                      }
                    >
                      <Label>
                        Users <span className="text-red-500">*</span>
                      </Label>
                      <AntdSelect
                        mode="multiple"
                        showSearch
                        placeholder={`Select Users (${filteredUsers.length})`}
                        value={row.users}
                        onChange={(values) => updateUsers(index, values)}
                        disabled={!row.departmentId}
                        style={{ width: "100%", minHeight: 38 }}
                        optionFilterProp="label"
                        options={filteredUsers.map((u) => ({
                          value: u._id,
                          label: `${u.name || u.email}`,
                        }))}
                      />
                    </div>

                    {/* 🟢 DYNAMIC PER-DEPARTMENT START DATE (Only visible when >1 departments are added) */}
                    {isMultiDepartment && !isDependent && (
                      <div className="md:col-span-3 space-y-2">
                        <Label className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                          Start Date ({deptObj?.name || "Dept"}){" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <DatePicker
                          disabled={!row.departmentId}
                          className="w-full h-10 hover:shadow-md transition-all duration-200"
                          format="DD MMM YYYY"
                          value={row.startDate ? dayjs(row.startDate) : null}
                          onChange={(date) => {
                            if (!date) {
                              updateRowStartDate(index, null);
                              return;
                            }

                            const selected = dayjs(date);
                            const selectedDateStr =
                              selected.format("YYYY-MM-DD");

                            // 1. Holiday Check
                            if (
                              isHolidayForDept(
                                selectedDateStr,
                                row.departmentId,
                              )
                            ) {
                              toast.error(
                                `Selected date is a holiday for ${deptObj?.name || "this department"}. Please select another date.`,
                              );
                              updateRowStartDate(index, null);
                              return;
                            }

                            // 2. Working Day Check
                            const dayName = selected
                              .format("dddd")
                              .toLowerCase();
                            const activeSchedule = getDeptWorkingSchedule(
                              row.departmentId,
                            );

                            if (!activeSchedule?.[dayName]) {
                              toast.error(
                                `Selected day (${dayName}) is not a working day for ${deptObj?.name}.`,
                              );
                              updateRowStartDate(index, null);
                              return;
                            }

                            updateRowStartDate(index, selectedDateStr);
                          }}
                          disabledDate={(current) => {
                            const today = dayjs().startOf("day");
                            return current && current < today;
                          }}
                        />
                      </div>
                    )}

                    {/* Delete Row Button */}
                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        variant="destructive"
                        className="w-full"
                        disabled={assignmentRows.length === 1}
                        onClick={() => removeAssignmentRow(index)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Add Row Button */}
              {role !== "Member" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAssignmentRow}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Department
                </Button>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-description">
                Task Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed description..."
                rows={3}
                className="hover:shadow-md transition-all duration-200 resize-none"
              />
            </div>

            {/* Checklist */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base font-semibold text-gray-700">
                  <ListTodo className="w-4 h-4 text-blue-500" /> Checklist
                  (Optional)
                </Label>
                <Badge
                  variant="secondary"
                  className="bg-white border shadow-sm"
                >
                  {checklist.length} {checklist.length === 1 ? "item" : "items"}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Input
                  value={checklistItem}
                  onChange={(e) => setChecklistItem(e.target.value)}
                  placeholder="Add a sub-task or checklist item..."
                  className="bg-white shadow-sm focus-visible:ring-blue-500"
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), addChecklistItem())
                  }
                />
                <Button
                  type="button"
                  onClick={addChecklistItem}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {checklist.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 bg-white/50">
                    <ClipboardList className="w-6 h-6 mb-2 opacity-50" />
                    <p className="text-sm">No items yet. Add one above!</p>
                  </div>
                )}

                {checklist.map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {item.text}
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependency Toggle */}
            <div className="space-y-2 pt-2">
              <Label>Is this task dependent on another Task?</Label>
              <RadioGroup
                value={isDependent ? "yes" : "no"}
                onValueChange={(val) => {
                  const isDep = val === "yes";
                  setIsDependent(isDep);
                  if (isDep) setIsRecurrent(false);
                  if (!isDep) {
                    setParentTask("");
                    setStartTimeSetting(null);
                  }
                }}
                className="flex flex-col gap-2 pt-1"
              >
                <div className="flex gap-3 pt-2">
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="yes" id="r-yes" />
                    <Label
                      htmlFor="r-yes"
                      className="cursor-pointer font-normal"
                    >
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="no" id="r-no" />
                    <Label
                      htmlFor="r-no"
                      className="cursor-pointer font-normal"
                    >
                      No
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Conditional Date / Dependency Fields */}
            {!isDependent ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 🟢 Standard Single Start Date Picker (Only visible when 1 Department is selected) */}
                {!isMultiDepartment && (
                  <div className="space-y-2">
                    <Label>
                      Start Date <span className="text-red-500">*</span>
                    </Label>
                    <DatePicker
                      className="w-full h-10 hover:shadow-md transition-all duration-200"
                      format="DD MMM YYYY"
                      value={startDate ? dayjs(startDate) : null}
                      onChange={(date) => {
                        if (!date) {
                          setStartDate(null);
                          return;
                        }

                        const selected = dayjs(date);
                        const selectedDate = selected.format("YYYY-MM-DD");
                        const primaryDeptId = assignmentRows[0]?.departmentId;

                        // Check Holiday
                        if (isHolidayForDept(selectedDate, primaryDeptId)) {
                          toast.error(
                            `Selected date is a holiday for your department. Please select another date.`,
                          );
                          setStartDate(null);
                          return;
                        }

                        // Check Working Day
                        const dayName = selected.format("dddd").toLowerCase();
                        const activeSchedule =
                          getDeptWorkingSchedule(primaryDeptId);

                        if (!activeSchedule?.[dayName]) {
                          toast.error(
                            `Selected day (${dayName}) is not a working day for the assigned department.`,
                          );
                          setStartDate(null);
                          return;
                        }

                        setStartDate(selectedDate);
                      }}
                      disabledDate={(current) => {
                        const today = dayjs().startOf("day");
                        return current && current < today;
                      }}
                    />
                  </div>
                )}

                {/* Task End Offset & Time */}
                <div
                  className={
                    isMultiDepartment
                      ? "md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4"
                      : "grid grid-cols-1 md:grid-cols-2 gap-4"
                  }
                >
                  <div className="space-y-2">
                    <Label className={isRecurrent ? "text-gray-400" : ""}>
                      Task End After (Days){" "}
                      {!isRecurrent && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      type="number"
                      disabled={isRecurrent}
                      value={taskEndDateOffset}
                      onChange={(e) => setTaskEndDateOffset(e.target.value)}
                      placeholder="e.g. 1"
                      className="hover:shadow-md transition-all duration-200"
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={isRecurrent ? "text-gray-400" : ""}>
                      Task End Time
                    </Label>
                    <TimePicker
                      className="w-full h-10"
                      disabled={isRecurrent}
                      format="hh:mm A"
                      use12Hours
                      value={taskEndTime ? dayjs(taskEndTime, "HH:mm") : null}
                      onChange={(time) =>
                        setTaskEndTime(time ? time.format("HH:mm") : null)
                      }
                      placeholder="Select end time"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Attachment (Optional)</Label>
                  <AttachmentUpload
                    setFiles={setAttachmentFile}
                    fileList={attachmentFileList}
                    setFileList={setAttachmentFileList}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="space-y-2">
                  <Label>
                    Task on which it is dependent (Parent Task){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={parentTask}
                    onValueChange={(value) => {
                      setParentTask(value);
                      setParentTaskSearch("");
                    }}
                  >
                    <SelectTrigger className="bg-white w-full text-left justify-between font-normal">
                      {(() => {
                        const selectedTask =
                          parentTask &&
                          allTasks.find((t) => (t._id || t.id) === parentTask);
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

                <div className="space-y-2">
                  <Label>
                    Start Time Setting <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={startTimeSetting || ""}
                    onValueChange={setStartTimeSetting}
                  >
                    <SelectTrigger className="bg-white">
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

                <div className="space-y-2">
                  <Label>
                    Frequency <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={frequencyType}
                    onValueChange={setFrequencyType}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select Lag Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">T+X Days</SelectItem>
                      <SelectItem value="hours">T+X Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
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
                    placeholder="Enter value"
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {/* Recurrence Toggle */}
            <div className="flex flex-col gap-4 mt-2 border-t pt-4">
              {!isDependent && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurrence-check"
                    checked={isRecurrent}
                    onChange={(e) => {
                      setIsRecurrent(e.target.checked);
                      if (e.target.checked) setDate(null);
                    }}
                  />
                  <Label
                    htmlFor="recurrence-check"
                    className="flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Clock className="w-4 h-4 text-blue-600" /> Set as Recurring
                    Task
                  </Label>
                </div>
              )}

              {isRecurrent && !isDependent && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label>
                      Frequency <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={recurrenceFrequency}
                      onValueChange={(value) => {
                        setRecurrenceFrequency(value);
                        if (value !== "weekly") setWeeklyRecurrenceDays([]);
                        if (value !== "bi-weekly")
                          setWeeklyTwiceRecurrenceDay("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="fortnightly">Fortnightly</SelectItem>
                        <SelectItem value="half-yearly">Half Yearly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <DatePicker
                      className="w-full h-10 hover:shadow-md transition-all duration-200"
                      format="DD MMM YYYY hh:mm A"
                      showTime={{
                        format: "hh:mm A",
                        use12Hours: true,
                      }}
                      value={
                        recurrenceEndDate ? dayjs(recurrenceEndDate) : null
                      }
                      disabledDate={(current) => {
                        if (!current) return false;
                        const now = dayjs();
                        if (startDate) {
                          return current.isBefore(dayjs(startDate), "day");
                        }
                        return current.isBefore(now, "day");
                      }}
                      onChange={(date) => {
                        if (!date) {
                          setRecurrenceEndDate(undefined);
                          return;
                        }

                        if (startDate && date.isBefore(dayjs(startDate))) {
                          toast.error("End Date cannot be before Start Date");
                          setRecurrenceEndDate(undefined);
                          return;
                        }

                        setRecurrenceEndDate(date.toISOString());
                      }}
                    />
                  </div>

                  {recurrenceFrequency === "weekly" && (
                    <div className="md:col-span-2 space-y-2">
                      <Label>Select Days of the Week</Label>
                      <div className="flex flex-wrap gap-4 pt-2">
                        {[
                          "Sunday",
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                        ].map((day) => (
                          <div key={day} className="flex items-center gap-2">
                            <Checkbox
                              id={`day-${day}`}
                              checked={weeklyRecurrenceDays.includes(
                                day.toLowerCase(),
                              )}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const dayLowerCase = day.toLowerCase();
                                setWeeklyRecurrenceDays((prev) =>
                                  checked
                                    ? [...prev, dayLowerCase]
                                    : prev.filter((d) => d !== dayLowerCase),
                                );
                              }}
                            />
                            <Label
                              htmlFor={`day-${day}`}
                              className="font-normal cursor-pointer"
                            >
                              {day}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recurrenceFrequency === "bi-weekly" && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Select Day of the Week</Label>
                        <RadioGroup
                          value={weeklyTwiceRecurrenceDay}
                          onValueChange={(value) => {
                            setWeeklyTwiceRecurrenceDay(value);
                          }}
                          className="flex flex-wrap gap-4 pt-2"
                        >
                          {[
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ].map((day) => (
                            <div key={day} className="flex items-center gap-2">
                              <RadioGroupItem
                                value={day.toLowerCase()}
                                id={`day-${day}`}
                              />
                              <Label
                                htmlFor={`day-${day}`}
                                className="font-normal cursor-pointer"
                              >
                                {day}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Repeat After (Days){" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={repeatAfter}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
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
                          placeholder="Enter value"
                          className="bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mt-4">
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg w-full md:w-auto px-8"
              >
                {loading ? "Assigning..." : "Assign Task"}
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
};

export default CreateTaskForm;
