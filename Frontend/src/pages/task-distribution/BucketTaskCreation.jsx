import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  UserPlus,
  Users,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Flag,
  CalendarDays,
  Clock3,
  Link2,
  Plus,
  Trash2,
  Paperclip,
  ClipboardList,
  Repeat,
  GitBranch,
  Send,
  UploadCloud,
  ListChecks,
  AlertTriangle,
  CheckCircle,
  FileText,
  AlertCircle,
  Download,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  RadioGroup,
  RadioGroupItem,
} from "../../components/ui/index.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import { Select as AntdSelect, DatePicker } from "antd";
import dayjs from "dayjs";
import { cn, frequencyMap } from "../../components/utils.js";
import AttachmentUpload from "../../components/attachmentsUpload.jsx";
import api from "../../lib/api.js";
import { useDispatch, useSelector } from "react-redux";
import { getUserForDrop } from "../../redux/slices/user/userSlice.js";
import { fetchRoles } from "../../redux/slices/role/roleSlice.js";
import { toast } from "sonner";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { getSubmodulePermissions } from "../../utils/permissionUtils.js";

const BucketCreation = () => {
  const { bucketId } = useParams();

  const isEditMode = !!bucketId;
  const dispatch = useDispatch();
  const { dropdownUsers: users } = useSelector((state) => state.users);

  const { roles } = useSelector((state) => state.roles);
  useEffect(() => {
    dispatch(fetchRoles());
    dispatch(getUserForDrop());
    fetchMaster();
  }, [dispatch]);
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "task_buckets",
    isSuper,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState(null);
  const [taskEndDays, setTaskEndDays] = useState("");

  const [checklist, setChecklist] = useState([]);
  const [checklistItem, setChecklistItem] = useState("");

  const [isDependent, setIsDependent] = useState(false);

  const [parentTask, setParentTask] = useState("");

  const [startTimeSetting, setStartTimeSetting] =
    useState("planned-to-planned");

  const [frequencyType, setFrequencyType] = useState("days");

  const [xValue, setXValue] = useState("");

  const [isRecurrent, setIsRecurrent] = useState(false);

  const [recurrenceFrequency, setRecurrenceFrequency] = useState("daily");

  const [recurrenceEndDate, setRecurrenceEndDate] = useState(null);

  const [weeklyRecurrenceDays, setWeeklyRecurrenceDays] = useState([]);

  const [attachmentFile, setAttachmentFile] = useState([]);
  const [attachmentFileList, setAttachmentFileList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [masterId, setMasterId] = useState(null);

  const [assignmentMode, setAssignmentMode] = useState("Role");

  const [selectedRole, setSelectedRole] = useState(null);

  const [selectedMemberRole, setSelectedMemberRole] = useState(null);

  const [selectedMembers, setSelectedMembers] = useState([]);
  const [masterUsers, setMasterUsers] = useState([]);
  const [isBucketBulkUploadOpen, setIsBucketBulkUploadOpen] = useState(false);

  const [bucketUploadFile, setBucketUploadFile] = useState(null);

  const [bucketImportResult, setBucketImportResult] = useState(null);
  const fetchMaster = async () => {
    try {
      const res = await api.get("/task-audience-masters");

      const master = res?.data?.data;

      if (!master) return;

      setMasterId(master._id);
      setAssignmentMode(master.assignmentMode);

      if (master.assignmentMode === "Role") {
        setSelectedRole(
          typeof master.targetRole === "object"
            ? master.targetRole?._id
            : master.targetRole,
        );

        setSelectedMemberRole(null);

        setSelectedMembers([]);
      } else {
        // role from backend
        setSelectedMemberRole(
          typeof master.memberRole === "object"
            ? master.memberRole?._id
            : master.memberRole,
        );

        // selected users
        setSelectedMembers(
          master.targetUsers?.map((u) => (typeof u === "object" ? u._id : u)) ||
            [],
        );
        setMasterUsers(
          master.targetUsers?.map((u) => (typeof u === "object" ? u._id : u)) ||
            [],
        );
        setSelectedRole(null);
      }
    } catch (err) {
      console.log(err);
    }
  };
  useEffect(() => {
    if (!isEditMode) return;

    // wait until master assignment mode loaded
    if (!assignmentMode) return;

    fetchBucketById();
  }, [isEditMode, assignmentMode]);
  const filteredMembers = useMemo(() => {
    if (!selectedMemberRole) return [];

    return users.filter((u) => {
      const roleMatch =
        u.role?._id === selectedMemberRole || u.role === selectedMemberRole;

      const allowedUser = masterUsers.includes(u._id);

      return roleMatch && allowedUser;
    });
  }, [selectedMemberRole, users, masterUsers]);
  const fetchBucketById = async () => {
    try {
      const res = await api.get(`/task-buckets/${bucketId}`);
      const data = res.data.data;

      setTitle(data.title);
      setDescription(data.description);
      setStartDate(data.startDate);
      setTaskEndDays(data.taskEndDays);

      // ✅ only set assignment values
      // if current master mode matches bucket mode
      if (assignmentMode !== data.assignmentMode) {
        return;
      }

      // =====================================
      // ROLE MODE
      // =====================================
      if (data.assignmentMode === "Role") {
        setSelectedRole(
          typeof data.targetRole === "object"
            ? data.targetRole?._id
            : data.targetRole,
        );
      }

      // =====================================
      // USERS MODE
      // =====================================
      if (data.assignmentMode === "Users") {
        const memberIds =
          data.assignedTargetUsers?.map((u) =>
            typeof u === "object" ? u._id : u,
          ) || [];

        setSelectedMembers(memberIds);

        const roleIds = [
          ...new Set(
            users
              .filter((u) => memberIds.includes(u._id))
              .map((u) => u.role?._id || u.role)
              .filter(Boolean),
          ),
        ];

        // setSelectedMemberRole(roleIds);
      }
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    // auto select if only one user available
    if (filteredMembers.length === 1) {
      setSelectedMembers([filteredMembers[0]._id]);
    }

    // clear selection if multiple users available
    if (!isEditMode && filteredMembers.length > 1) {
      setSelectedMembers([]);
    }
  }, [filteredMembers]);
  const audiencePreview = useMemo(() => {
    if (assignmentMode === "Role") {
      return roles.find((r) => r._id === selectedRole);
    }

    return users.filter((u) => selectedMembers.includes(u._id));
  }, [assignmentMode, selectedRole, selectedMembers, roles, users]);

  const addChecklistItem = () => {
    if (!checklistItem.trim()) return;

    setChecklist([
      ...checklist,
      {
        text: checklistItem,
        isCompleted: false,
      },
    ]);

    setChecklistItem("");
  };

  const removeChecklistItem = (index) => {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  const assignedUsers = useMemo(() => {
    if (assignmentMode === "Role") {
      return users.filter(
        (u) => u.role?._id === selectedRole || u.role === selectedRole,
      );
    }

    return users.filter((u) => selectedMembers.includes(u._id));
  }, [assignmentMode, selectedRole, selectedMembers, users]);

  const handleCreateTask = async () => {
    try {
      if (!title.trim()) {
        toast.error("Task title required");
        return;
      }

      if (!description.trim()) {
        toast.error("Description required");
        return;
      }

      if (assignmentMode === "Role" && !selectedRole) {
        toast.error("Please select role");
        return;
      }

      if (assignmentMode === "Users" && selectedMembers.length === 0) {
        toast.error("Please select members");
        return;
      }

      if (!startDate) {
        toast.error("Start date required");
        return;
      }
      // if (isRecurrent) {
      //   if (!recurrenceFrequency) {
      //     alert("Recurrence frequency required");
      //     return;
      //   }

      //   // if (!recurrenceEndDate) {
      //   //   alert("Recurrence end date required");
      //   //   return;
      //   // }

      //   if (
      //     recurrenceFrequency === "weekly" &&
      //     weeklyRecurrenceDays.length === 0
      //   ) {
      //     alert("Please select weekly days");
      //     return;
      //   }
      // } else {
      if (!taskEndDays) {
        toast.error("Task End Days required");
        return;
      }
      // }

      setLoading(true);

      const formData = new FormData();

      formData.append("title", title);

      formData.append("description", description);
      formData.append("assignmentMode", assignmentMode);

      if (assignmentMode === "Role") {
        formData.append("targetRole", selectedRole);
      }

      if (assignmentMode === "Users") {
        formData.append("targetUsers", JSON.stringify(selectedMembers));
      }

      if (startDate) {
        formData.append("startDate", dayjs(startDate).toISOString());
      }

      if (!isRecurrent) {
        formData.append("taskEndDays", taskEndDays);
      }

      if (checklist.length > 0) {
        formData.append("checklist", JSON.stringify(checklist));
      }

      if (attachmentFile.length > 0) {
        attachmentFile.forEach((file) => {
          formData.append("attachmentFile", file);
        });
      }

      formData.append("isDependent", isDependent);

      if (isDependent) {
        formData.append("taskDependent", parentTask);

        formData.append("startTimeSetting", startTimeSetting);

        formData.append(
          "isDependentFrequency",
          frequencyType === "days" ? "T+X in days" : "T-X in hours",
        );

        formData.append("xValue", xValue);
      }

      formData.append("isRecurrent", isRecurrent);

      if (isRecurrent) {
        formData.append(
          "frequency",
          frequencyMap?.[recurrenceFrequency] || recurrenceFrequency,
        );

        if (
          recurrenceFrequency === "weekly" &&
          weeklyRecurrenceDays.length > 0
        ) {
          formData.append("weekDays", JSON.stringify(weeklyRecurrenceDays));
        }

        if (recurrenceEndDate) {
          formData.append("endDate", dayjs(recurrenceEndDate).toISOString());
        }
      }

      const res = !isEditMode
        ? await api.post("/task-buckets", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
        : await api.put(`/task-buckets/${bucketId}`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

      toast.success(
        `Task bucket ${isEditMode ? "update" : "created"} successfully`,
      );
      if (!isEditMode) {
        setTitle("");

        setDescription("");
        setStartDate(null);

        setTaskEndDays("");

        setChecklist([]);

        setChecklistItem("");

        setParentTask("");

        setXValue("");

        setIsDependent(false);

        setIsRecurrent(false);

        setRecurrenceEndDate(null);

        setWeeklyRecurrenceDays([]);

        setAttachmentFile([]);

        setAttachmentFileList([]);
      }
    } catch (err) {
      console.log(err);

      toast.error(err?.response?.data?.message || "Failed to create bucket");
    } finally {
      setLoading(false);
    }
  };
  //**Import */
  const handleBucketModalChange = (isOpen) => {
    setIsBucketBulkUploadOpen(isOpen);

    if (!isOpen) {
      setBucketUploadFile(null);
      setBucketImportResult(null);
      setLoading(false);
    }
  };
  const handleBucketFileChange = (e) => {
    setBucketUploadFile(e.target.files?.[0] || null);
  };

  const handleBucketImport = async () => {
    if (!bucketUploadFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("file", bucketUploadFile);

      const { data } = await api.post("/task-buckets/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setBucketImportResult(data);

      toast.success(data.message || "Buckets imported successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to import buckets");
    } finally {
      setLoading(false);
    }
  };
  const handleDownloadBucketTemplate = async () => {
    try {
      const response = await api.get(
        "/task-buckets/downloadTemp?type=delegation",
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "bucket_delegation_template.xlsx";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download template");
    }
  };
  const handleDownloadBucketErrorFile = async () => {
    try {
      if (!bucketImportResult?.errorFile) {
        return;
      }

      const response = await api.get(
        `/uploads/${bucketImportResult.errorFile}`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data]);

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = bucketImportResult.errorFile;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download error report");
    }
  };
  return (
    <div className="min-h-screen bg-[#f4f7fb] p-6">
      <div className="mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-8 shadow-2xl">
          <div className="absolute right-[-50px] top-[-50px] opacity-10">
            <Sparkles className="w-80 h-80 text-white" />
          </div>

          <div className="relative z-10 flex items-start gap-5">
            <div className="bg-white/20 backdrop-blur-xl p-4 rounded-3xl border border-white/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                {isEditMode ? "Edit Task Bucket" : "Create Task Bucket"}
              </h1>

              <p className="text-blue-100 mt-2 text-base max-w-3xl leading-relaxed">
                {isEditMode
                  ? "Update bucket details, assignment settings, schedules, dependencies, and execution configuration."
                  : "Create structured task buckets with assignment rules, schedules, dependencies, attachments, and execution workflows."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <Card className="rounded-[30px] border-0 shadow-xl">
              <CardHeader className="border-b bg-slate-50 rounded-t-[30px]">
                <CardTitle className="flex items-center gap-2 justify-between">
                  <div className="items-center flex gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Assignment Configuration
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsBucketBulkUploadOpen(true)}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" /> Bulk Upload
                  </Button>
                </CardTitle>{" "}
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {assignmentMode === "Role" ? (
                  <div className="space-y-2">
                    <Label>Select Role</Label>

                    <AntdSelect
                      size="large"
                      placeholder="Choose role"
                      value={selectedRole || undefined}
                      disabled
                      onChange={setSelectedRole}
                      style={{ width: "100%" }}
                      options={roles
                        .filter(
                          (r) =>
                            !["admin", "owner", "member"].includes(
                              r.name?.toLowerCase(),
                            ),
                        )
                        .map((r) => ({
                          value: r._id,
                          label: r.name,
                        }))}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* ROLE */}
                    <div className="space-y-2">
                      <Label>Select Role</Label>

                      <AntdSelect
                        size="large"
                        placeholder="Choose role"
                        value={selectedMemberRole || undefined}
                        disabled
                        onChange={(value) => {
                          setSelectedMemberRole(value);
                          setSelectedMembers([]);
                        }}
                        style={{ width: "100%" }}
                        options={roles
                          .filter(
                            (r) =>
                              !["admin", "owner", "member"].includes(
                                r.name?.toLowerCase(),
                              ),
                          )
                          .map((r) => ({
                            value: r._id,
                            label: r.name,
                          }))}
                      />
                    </div>

                    {/* MEMBERS */}
                    <div className="space-y-2">
                      <Label>Select Members</Label>
                      <span className="text-red-600">*</span>

                      <AntdSelect
                        mode="multiple"
                        size="large"
                        placeholder="Select members"
                        disabled={
                          !selectedMemberRole || filteredMembers.length === 1
                        }
                        value={selectedMembers}
                        onChange={setSelectedMembers}
                        style={{ width: "100%" }}
                        options={filteredMembers.map((u) => ({
                          value: u._id,
                          label: u.name,
                        }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[30px] border-0 shadow-xl">
              <CardHeader className="border-b bg-slate-50 rounded-t-[30px]">
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-indigo-600" />
                  Task Details
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-6 mt-3">
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <span className="text-red-600">*</span>

                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title..."
                    className="h-12 rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <span className="text-red-600">*</span>

                  <Textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write task description..."
                    className="rounded-2xl resize-none"
                  />
                </div>

                {!isDependent && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <span className="text-red-600">*</span>

                      <DatePicker
                        size="large"
                        className="w-full h-12 rounded-2xl"
                        value={startDate ? dayjs(startDate) : null}
                        onChange={(date) => setStartDate(date)}
                        disabledDate={(current) => {
                          const today = dayjs().startOf("day");
                          return current && current < today;
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Task End Days</Label>
                      <span className="text-red-600">*</span>

                      <Input
                        type="text"
                        inputMode="numeric"
                        min={0}
                        value={taskEndDays}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");

                          if (value === "" || Number(value) >= 1) {
                            setTaskEndDays(value);
                          }
                        }}
                        placeholder="Enter days"
                        className="h-12 rounded-2xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Attachments</Label>

                      <AttachmentUpload
                        setFiles={setAttachmentFile}
                        fileList={attachmentFileList}
                        setFileList={setAttachmentFileList}
                      />
                    </div>
                  </div>
                )}
                {/* <div className="flex items-center gap-3 mt-2">
                  <Checkbox
                    checked={isRecurrent}
                    onChange={(e) => setIsRecurrent(e.target.checked)}
                  />

                  <Label>Enable recurring task</Label>
                </div>

                {isRecurrent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label>Frequency</Label>

                      <Select
                        value={recurrenceFrequency}
                        onValueChange={setRecurrenceFrequency}
                      >
                        <SelectTrigger className="h-12 rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>

                          <SelectItem value="weekly">Weekly</SelectItem>

                          <SelectItem value="monthly">Monthly</SelectItem>

                          <SelectItem value="quarterly">Quarterly</SelectItem>

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

                    <div className="space-y-2">
                      <Label>Recurrence End Date</Label>

                      <DatePicker
                        size="large"
                        className="w-full h-12 rounded-2xl"
                        value={
                          recurrenceEndDate ? dayjs(recurrenceEndDate) : null
                        }
                        onChange={(date) => setRecurrenceEndDate(date)}
                      />
                    </div>

                    {recurrenceFrequency === "weekly" && (
                      <div className="md:col-span-2">
                        <Label>Weekly Days</Label>

                        <div className="flex flex-wrap gap-3 mt-3">
                          {[
                            "monday",
                            "tuesday",
                            "wednesday",
                            "thursday",
                            "friday",
                            "saturday",
                            "sunday",
                          ].map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (weeklyRecurrenceDays.includes(day)) {
                                  setWeeklyRecurrenceDays((prev) =>
                                    prev.filter((d) => d !== day),
                                  );
                                } else {
                                  setWeeklyRecurrenceDays((prev) => [
                                    ...prev,
                                    day,
                                  ]);
                                }
                              }}
                              className={cn(
                                "px-4 py-2 rounded-2xl border text-sm font-medium transition-all",
                                weeklyRecurrenceDays.includes(day)
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white border-slate-200",
                              )}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )} */}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[30px] border-0 shadow-xl sticky top-5 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />

              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Assignee Preview
                </CardTitle>
              </CardHeader>

              <CardContent className="mt-2">
                {/* ============================================== */}
                {/* ROLE MODE */}
                {/* ============================================== */}

                {assignmentMode === "Role" ? (
                  selectedRole ? (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-blue-600" />
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Selected Role
                          </p>

                          <h3 className="font-semibold text-slate-800">
                            {roles.find((r) => r._id === selectedRole)?.name}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 border">
                        <span className="text-sm text-slate-500">
                          Total Users
                        </span>

                        <span className="font-semibold text-blue-600">
                          {assignedUsers.length}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-slate-400">
                      No role selected
                    </div>
                  )
                ) : (
                  <>
                    {selectedMembers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-8 text-center text-slate-400">
                        No members selected
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-700">
                            Selected Members
                          </h3>

                          <Badge className="rounded-xl">
                            {selectedMembers.length}
                          </Badge>
                        </div>

                        <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
                          {audiencePreview.map((u) => (
                            <div
                              key={u._id}
                              className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-2xl bg-indigo-100 flex items-center justify-center font-semibold text-indigo-600">
                                  {u?.name?.charAt(0)}
                                </div>

                                <div>
                                  <p className="font-medium text-slate-800">
                                    {u.name}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    {u?.role?.name}
                                  </p>
                                </div>
                              </div>

                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="mt-8 space-y-3 border-t pt-6">
                  <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Assignment</span>

                      <span className="font-semibold">
                        {assignmentMode === "Role"
                          ? "Role Based"
                          : "Specific Users"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Total Users</span>

                      <span className="font-semibold">
                        {assignedUsers.length}
                      </span>
                    </div>

                    {/* <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Recurring</span>

                      <Badge
                        className={
                          isRecurrent
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-700"
                        }
                      >
                        {isRecurrent ? "Enabled" : "No"}
                      </Badge>
                    </div> */}

                    {/* <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Dependency</span>

                      <Badge
                        className={
                          isDependent
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-200 text-slate-700"
                        }
                      >
                        {isDependent ? "Enabled" : "No"}
                      </Badge>
                    </div> */}
                  </div>

                  {/* ============================================== */}
                  {/* BUTTON */}
                  {/* ============================================== */}

                  {canCreate && (
                    <Button
                      onClick={handleCreateTask}
                      disabled={loading}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base shadow-lg"
                    >
                      <Send className="w-5 h-5 mr-2" />

                      {loading
                        ? isEditMode
                          ? "Updating Bucket..."
                          : "Creating Bucket..."
                        : isEditMode
                          ? "Update Task Bucket"
                          : "Create Task Bucket"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Dialog
        open={isBucketBulkUploadOpen}
        onOpenChange={handleBucketModalChange}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-blue-600" />
              Bulk Import Buckets
            </DialogTitle>
          </DialogHeader>

          {!bucketImportResult ? (
            <div className="grid grid-cols-1 gap-6 py-4">
              {/* Instructions */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-gray-500" />
                  Required Columns
                </h4>

                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Title</code>
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Description
                    </code>
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Assignment Mode
                    </code>{" "}
                    (Role / Users)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Start Date</code>
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Task End Days
                    </code>
                  </li>
                </ul>

                <div className="rounded-md border bg-blue-50 p-3 text-xs text-blue-700 space-y-1">
                  <p>
                    • Assignment Mode must be <b>Role</b> or <b>Users</b>
                  </p>

                  <p>
                    • If Assignment Mode is <b>Role</b>, then <b>Target Role</b>{" "}
                    is required
                  </p>

                  <p>
                    • If Assignment Mode is <b>Users</b>, then{" "}
                    <b>Target User</b> is required
                  </p>

                  <p>• Target Role must match an existing role in the system</p>

                  <p>
                    • Target Users can be comma-separated names or email
                    addresses
                  </p>

                  <p>
                    • Date format: <b>DD-MM-YYYY</b>
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={handleDownloadBucketTemplate}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download Bucket Template
                </Button>
              </div>

              {/* Upload Area */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <label
                  htmlFor="bucket-file-upload"
                  className="flex flex-col items-center justify-center w-full cursor-pointer"
                >
                  <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />

                  <span className="text-sm font-semibold text-blue-600">
                    Click to upload
                  </span>

                  <p className="text-xs text-gray-500 mt-2">
                    CSV / XLSX files supported
                  </p>

                  <Input
                    id="bucket-file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleBucketFileChange}
                  />
                </label>

                {bucketUploadFile && (
                  <div className="mt-3 text-sm text-green-600 font-medium">
                    Selected: {bucketUploadFile.name}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <h3 className="text-lg font-semibold mb-6">Import Complete</h3>

              <div className="flex justify-center gap-10">
                <div className="text-green-600">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {bucketImportResult.summary?.imported || 0}
                  </p>
                  <p>Buckets Imported</p>
                </div>

                <div className="text-yellow-600">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {bucketImportResult.summary?.skipped || 0}
                  </p>
                  <p>Skipped</p>
                </div>

                <div className="text-red-600">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {bucketImportResult.summary?.errors || 0}
                  </p>
                  <p>Errors</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {bucketImportResult ? (
              <>
                {(bucketImportResult.summary?.errors > 0 ||
                  bucketImportResult.summary?.skipped > 0) && (
                  <Button
                    variant="destructive"
                    onClick={handleDownloadBucketErrorFile}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                )}

                <Button onClick={() => setIsBucketBulkUploadOpen(false)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsBucketBulkUploadOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleBucketImport}
                  disabled={!bucketUploadFile || loading}
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  )}

                  {loading ? "Importing..." : "Import Buckets"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BucketCreation;
