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
  //   Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  RadioGroup,
  RadioGroupItem,
  Table,
  TableBody,
  TableHeader,
  TableCell,
  TableRow,
  TableHead,
} from "../../components/ui/index.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import { Select as AntdSelect, DatePicker, Tag } from "antd";
import dayjs from "dayjs";
import { cn, frequencyMap } from "../../components/utils.js";
import AttachmentUpload from "../../components/attachmentsUpload.jsx";
import api from "../../lib/api.js";
import { useDispatch, useSelector } from "react-redux";
import { getUserForDrop } from "../../redux/slices/user/userSlice.js";
import { fetchRoles } from "../../redux/slices/role/roleSlice.js";
import { toast } from "sonner";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { Checkbox } from "../../components/ui/checkbox.jsx";
import ViewLink from "../myDay/attachmentViewer.jsx";
import { ExportOutlined } from "@ant-design/icons";
import { getSubmodulePermissions } from "../../utils/permissionUtils.js";

const PendingBucketRequest = () => {
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
    "pending_buckets",
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

  const [requests, setRequests] = useState([]);
  const getPendingRequests = async () => {
    try {
      const res = await api.get("/task-buckets-req/responses");

      const formatted = (res.data?.data || []).map((item) => ({
        ...item,
        selected: false,

        startDate: item.startDate || null,

        taskEndDays: item.taskEndDays || "",
        // attachmentFile: [],
        fileList: [],
        attachmentFile: item.attachmentFile || [],

        // fileList:
        //   item.attachmentFile?.map((url, index) => ({
        //     uid: index,
        //     name: url.split("/").pop(),
        //     status: "done",
        //     url,
        //   })) || [],
      }));

      setRequests(formatted);
    } catch (err) {
      console.log(err);
    }
  };

  const updateRequest = (index, field, value) => {
    setRequests((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };
  useEffect(() => {
    getPendingRequests();
  }, []);
  const selectableRequests = requests.filter(
    (item) => item.status !== "Converted",
  );

  const allSelected =
    selectableRequests.length > 0 &&
    selectableRequests.every((item) => item.selected);
  const toggleSelectAll = (checked) => {
    setRequests((prev) =>
      prev.map((item) =>
        item.status === "Converted"
          ? item
          : {
              ...item,
              selected: !!checked,
            },
      ),
    );
  };
  const toggleRow = (index, checked) => {
    setRequests((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        if (item.status === "Converted") {
          return item;
        }

        return {
          ...item,
          selected: !!checked,
        };
      }),
    );
  };
  const handleCreateTask = async () => {
    try {
      const selectedRequests = requests.filter((r) => r.selected);
      if (selectedRequests.length === 0) {
        toast.error("Please select at least one request");
        return;
      }

      setLoading(true);

      for (const row of selectedRequests) {
        console.log(row);
        if (!row.title?.trim()) {
          toast.error(`Title required for ${row.location}`);
          return;
        }

        if (!row.description?.trim()) {
          toast.error(`Description required for ${row.title}`);
          return;
        }
        if (!row.startDate) {
          toast.error(`Start Date required for ${row.title}`);
          return;
        }
        if (!row.taskEndDays) {
          toast.error(`Task End Days required for ${row.title}`);
          return;
        }

        const formData = new FormData();

        formData.append("title", row.title);

        formData.append("description", row.description);
        formData.append("assignmentMode", assignmentMode);

        if (assignmentMode === "Role") {
          formData.append("targetRole", selectedRole);
        }

        if (assignmentMode === "Users") {
          formData.append("targetUsers", JSON.stringify(selectedMembers));
        }

        if (row.startDate) {
          formData.append("startDate", dayjs(row.startDate).toISOString());
        }

        if (!isRecurrent) {
          formData.append("taskEndDays", row.taskEndDays);
        }

        if (checklist.length > 0) {
          formData.append("checklist", JSON.stringify(checklist));
        }

        if (row.attachmentFile.length > 0) {
          row.attachmentFile.forEach((file) => {
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

        const bucketRes = await api.post("/task-buckets", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        await api.put(`/task-buckets-req/${row._id}/convert`, {
          taskBucketId: bucketRes.data.data._id,
          startDate: row.startDate,
          taskEndDays: row.taskEndDays,
          attachmentFile: bucketRes.data.data.attachmentFile,
        });
        // optional: mark request converted
        // await api.put(`/task-buckets-req/${row._id}/convert`);
      }

      toast.success(
        `${selectedRequests.length} task bucket(s) created successfully`,
      );

      getPendingRequests();
    } catch (err) {
      console.log(err);
      toast.error(err?.response?.data?.message || "Failed to create buckets");
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
  const handleExportBuckets = async () => {
    try {
      const response = await api.get("/task-buckets/bucket/export-pending", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "task-buckets.xlsx");

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Bucket exported successfully");
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.message || "Failed to export buckets.");
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
                  {/* <Button
                    variant="outline"
                    onClick={() => setIsBucketBulkUploadOpen(true)}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" /> Bulk Upload
                  </Button> */}
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
                <CardTitle className="flex items-center gap-2 justify-between">
                  <div className="flex items-center">
                    <Flag className="w-5 h-5 text-indigo-600" />
                    Pending Task Bucket Requests
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExportBuckets}
                    className="h-10 rounded-xl bg-white me-1 gap-1"
                  >
                    <ExportOutlined size={15} />
                    Export
                  </Button>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Task End Days</TableHead>
                      <TableHead>Attachment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(requests) &&
                      requests.length > 0 &&
                      requests?.map((row, index) => (
                        <TableRow key={row._id}>
                          <TableCell>
                            <Checkbox
                              disabled={row.status === "Converted"}
                              checked={!!row.selected}
                              onCheckedChange={(checked) =>
                                toggleRow(index, checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              disabled={row.status === "Converted"}
                              value={row.title}
                              onChange={(e) =>
                                updateRequest(index, "title", e.target.value)
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <Input
                              disabled={row.status === "Converted"}
                              value={row.description}
                              onChange={(e) =>
                                updateRequest(
                                  index,
                                  "description",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <Input
                              disabled={row.status === "Converted"}
                              value={row.location}
                              onChange={(e) =>
                                updateRequest(index, "location", e.target.value)
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <DatePicker
                              disabled={row.status === "Converted"}
                              className="w-full"
                              format="DD MMM YYYY"
                              value={
                                row.startDate ? dayjs(row.startDate) : null
                              }
                              onChange={(date) =>
                                updateRequest(index, "startDate", date)
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <Input
                              disabled={row.status === "Converted"}
                              type="text"
                              inputMode="numeric"
                              min={0}
                              value={row.taskEndDays}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");

                                if (value === "" || Number(value) >= 1) {
                                  updateRequest(index, "taskEndDays", value);
                                }
                              }}
                              placeholder="Enter days"
                            />
                            {/* <Input
                            disabled={row.status === "Converted"}
                            type="number"
                            value={row.taskEndDays}
                            onChange={(e) =>
                              updateRequest(
                                index,
                                "taskEndDays",
                                e.target.value,
                              )
                            }
                          /> */}
                          </TableCell>

                          <TableCell>
                            {row.status === "Converted" ? (
                              Array.isArray(row?.attachmentFile) &&
                              row.attachmentFile.length > 0 ? (
                                <ViewLink file={row.attachmentFile} />
                              ) : (
                                "NA"
                              )
                            ) : (
                              <AttachmentUpload
                                // disabled={row.status === "Converted"}
                                fileList={row.fileList || []}
                                setFileList={(files) =>
                                  updateRequest(index, "fileList", files)
                                }
                                setFiles={(files) =>
                                  updateRequest(index, "attachmentFile", files)
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Tag
                              color={
                                row.status === "Converted"
                                  ? "success"
                                  : row.status === "Rejected"
                                    ? "error"
                                    : "warning"
                              }
                            >
                              {row.status}
                            </Tag>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {Array.isArray(requests) && requests.length == 0 && (
                  <div className="w-full flex flex-col items-center justify-center text-sm text-slate-400 mt-2">
                    No record found
                  </div>
                )}
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
                      disabled={loading || !requests.some((r) => r.selected)}
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

export default PendingBucketRequest;
