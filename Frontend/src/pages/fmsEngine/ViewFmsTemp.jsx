import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Plus,
  Trash2,
  Search,
  Filter,
  ListCheck,
  FilePlus,
  Check,
  Pencil,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Checkbox } from "../../components/ui/checkbox";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";

// Modals
import ChecklistModal from "../../components/ChecklistModal";
import CustomFormModal from "../../components/CustomFormModal";
import { DatePicker, Divider, Popconfirm, Spin } from "antd";
import dayjs from "dayjs";
import { Badge } from "../../components/ui";
import api from "../../lib/api";
import { toast } from "sonner";
import { useDebounce } from "../../lib/debounce";

// Initial Task Data
const initialTask = {
  taskId: "",
  description: "",
  dept: "",
  doer: "",
  checklist: false,
  checklistItems: [],
  isDependent: "no",
  dependentOn: "",
  frequency: "None",
  linkedWithForm: "no", // 🟢 Linked with Form state
  value: "",
  startTime: "none",
  decisionStep: false,
  decisionYesAction: "",
  triggerFmsTemplate: "",
  formFields: [],
};

const mapTasksToUI = (apiTasks) => {
  return apiTasks.map((task) => ({
    _id: task._id,
    isFromAPI: true,
    taskId: task.taskId || "",
    description: task.description || "",

    dept: task.departmentOfAssignToUser?._id || "",
    doer: task.assignedTo?._id || "",

    checklist: task.checklist?.length > 0,
    checklistItems: task.checklist || [],

    isDependent: task.isDependent ? "yes" : "no",
    dependentOn: task.dependentOn || "",

    frequency: task.frequency || "None",
    linkedWithForm: task.linkedWithForm ? "yes" : "no", // 🟢 Map linkedWithForm from API
    value: task.xValue ?? "",

    startTime: task.startTimeSetting || "none",

    decisionStep: Boolean(task.decisionStep),
    decisionYesAction: task.decisionYesAction || "",
    triggerFmsTemplate:
      task.triggerFmsTemplate?._id || task.triggerFmsTemplate || "",

    formFields: task.createdForm || [],
  }));
};

// --- Main Component ---
const ViewFmsTemp = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [templateCreated, setTemplateCreated] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [templateFMSId, setTemplateFMSId] = useState("");
  const [tasks, setTasks] = useState([{ ...initialTask }]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Modal states
  const [checklistModal, setChecklistModal] = useState({
    open: false,
    taskIndex: -1,
  });
  const [formModal, setFormModal] = useState({ open: false, taskIndex: -1 });

  const [allUsers, setAllUsers] = useState([]);
  const [doers, setDoers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [srManagers, setSrManagers] = useState([]);
  const [filteredUser, setFilteredUser] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [fmsTemplatesList, setFmsTemplatesList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newRowIndex, setNewRowIndex] = useState(null);
  const [loadUpdate, setLoadUpdate] = useState(false);
  const [isAlreadyLaunched, setIsAlreadyLaunched] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/setup/users/allUsers");
        const users = response.data?.data || [];
        setAllUsers(users);
        const doers = users.filter((u) => u.role?.name === "member");
        const managers = users.filter((u) => u.role?.name === "manager");
        const srManagers = users.filter((u) => u.role?.name === "sr._manager");
        const filteredUsers = users.filter((u) =>
          ["member", "manager", "sr._manager"].includes(u.role?.name),
        );

        setFilteredUser(filteredUsers);
        setDoers(doers);
        setManagers(managers);
        setSrManagers(srManagers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast.error("Could not load users.");
      }
    };

    fetchUsers();
    fetchDepartments();
    fetchFmsTemplates();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/setup/departments/allDepartmentsForFMS");
      setDepartments(response.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchFmsTemplates = async () => {
    try {
      const response = await api.get("/fms/all-templates");
      const list = response.data?.data || response.data || [];

      const currentId = id || templateId;
      const filteredList = list.filter(
        (t) => String(t._id || t.id) !== String(currentId),
      );

      setFmsTemplatesList(filteredList);
    } catch (error) {
      console.error("Failed to fetch FMS templates:", error);
    }
  };

  const formik = useFormik({
    initialValues: {
      fms_id: "",
      templateName: "",
      description: "",
      fmsDuration: "Timeless",
      endDate: "",
      manager: "",
      srManager: "",
    },
    onSubmit: async (values) => {
      setLoading(true);
      try {
        if (!templateCreated) {
          if (!values.templateName?.trim()) {
            toast.error("Template name is required");
            return;
          }

          if (!values.manager) {
            toast.error("Manager is required");
            return;
          }
          const payload = {
            ...values,
          };

          const res = await api.post("/fms/templates", payload);
          const createdId = res.data?.data?._id || res.data?.data?.id;
          navigate(`/fms-engine/edit-template/${createdId}`);
          toast.success("Template created successfully!");
          return;
        }

        const newTasks = tasks.filter((task) => !task.isFromAPI);

        if (newTasks.length === 0) {
          toast.error("Please add at least one task");
          return;
        }

        const validationErrors = [];

        newTasks.forEach((task, index) => {
          const row = index + 1;

          if (!task.description?.trim()) {
            validationErrors.push(`Row ${row}: Description required`);
          }

          if (!task.dept) {
            validationErrors.push(`Row ${row}: Department required`);
          }

          if (!task.doer) {
            validationErrors.push(`Row ${row}: Assigned user required`);
          }

          if (index !== 0 && (!task.frequency || task.frequency === "None")) {
            validationErrors.push(`Row ${row}: Frequency required`);
          }

          if (task.isDependent === "yes" && !task.dependentOn) {
            validationErrors.push(`Row ${row}: Dependent task required`);
          }

          const isDecisionYes =
            task.decisionStep === true || task.decisionStep === "yes";

          if (isDecisionYes && !task.decisionYesAction) {
            validationErrors.push(`Row ${row}: Decision Yes Action required`);
          }

          if (
            isDecisionYes &&
            task.decisionYesAction === "trigger_fms" &&
            !task.triggerFmsTemplate
          ) {
            validationErrors.push(`Row ${row}: Trigger FMS Template required`);
          }
        });

        if (validationErrors.length > 0) {
          toast.error(
            <div>
              {[...new Set(validationErrors)].map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>,
          );
          return;
        }

        const payload = tasks
          .filter((task) => !task.isFromAPI)
          .map((task) => {
            const isDecisionStep =
              task.decisionStep === true || task.decisionStep === "yes";

            return {
              fmsTemplateId: templateId,
              taskId: task.taskId,
              description: task.description,
              departmentOfAssignToUser: task.dept,
              assignedTo: task.doer,
              frequency: task.frequency || "None",
              linkedWithForm: task.linkedWithForm === "yes",
              xValue: task.value,
              isDependent:
                task.isDependent === "yes" || task.isDependent === true,
              dependentOn: task.dependentOn,
              startTimeSetting:
                task.startTime == "none" ? undefined : task.startTime,
              decisionStep: isDecisionStep,
              decisionYesAction: isDecisionStep ? task.decisionYesAction : null,
              triggerFmsTemplate:
                isDecisionStep && task.decisionYesAction === "trigger_fms"
                  ? task.triggerFmsTemplate
                  : null,
              checklist: task.checklistItems,
              createdForm: task.formFields,
            };
          });

        const res = await api.post(
          `/fms/templates/${templateId}/tasks`,
          payload,
        );
        if (res.data?.errors?.length > 0) {
          const messages = res.data.errors.map((e) => e.error);
          const uniqueMessages = [...new Set(messages)];

          toast.error(
            <div>
              {uniqueMessages.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>,
          );
          return;
        }
        toast.success("Tasks saved successfully!");
        await fetchTasks();
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
  });

  const fetchTemplate = async () => {
    try {
      const res = await api.get(`/fms/templates-details/${id}`);
      const data = res.data.data;
      setTemplateId(data._id);
      setTemplateFMSId(data.fmsId);
      setTemplateCreated(true);

      formik.setValues({
        fms_id: data.fmsId,
        templateName: data.templateName,
        description: data.description,
        fmsDuration: data.fmsDuration,
        endDate: data.endDate,
        manager: data.manager?._id,
        srManager: data.srManager?._id,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load template");
    }
  };

  const fetchTasks = async (search, departmentId) => {
    setLoadingTasks(true);

    try {
      const res = await api.post(`/fms/templates/${id}/tasks-list`, {
        search,
        departmentId: departmentId == "all" ? undefined : departmentId,
      });
      const tasksData = res.data.data || [];
      const formattedTasks = mapTasksToUI(tasksData);

      setTasks(formattedTasks);
      formik.setFieldValue("tasks", tasksData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchTemplate();
  }, [id]);

  const debounceSearch = useDebounce(searchTerm);
  useEffect(() => {
    if (!id) return;
    fetchTasks(debounceSearch, deptFilter);
  }, [id, loadUpdate, debounceSearch, deptFilter]);

  useEffect(() => {
    if (!templateFMSId) return;

    setTasks((prev) =>
      prev.map((t, i) => {
        const generatedId = `${templateFMSId}_T${i + 1}`;
        if (t.taskId === generatedId) return t;
        return {
          ...t,
          taskId: generatedId,
        };
      }),
    );
  }, [templateFMSId, tasks.length]);

  const updateTemplate = async () => {
    setLoadUpdate(true);

    try {
      const values = { ...formik.values };
      if (values.fmsDuration === "Timeless") {
        values.endDate = null;
      }

      const cleanedTasks = (values.tasks || [])
        .map((task) => {
          if (!task) return null;
          if (typeof task === "string") return task;
          return task._id || task.id || null;
        })
        .filter(Boolean);

      const payload = {
        fms_id: values.fms_id,
        templateName: values.templateName,
        description: values.description,
        fmsDuration: values.fmsDuration,
        endDate: values.endDate,
        manager:
          typeof values.manager === "object"
            ? values.manager._id
            : values.manager,

        srManager:
          typeof values.srManager === "object"
            ? values.srManager._id
            : values.srManager,

        tasks: cleanedTasks,
      };

      await api.put(`/fms/templates/${templateId}`, payload);
      toast.success("Template updated successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setLoadUpdate(false);
    }
  };

  const addTask = () => {
    const newTask = { ...initialTask, isFromAPI: false };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);

    const newIndex = newTasks.length - 1;
    setEditingIndex(null);
    setNewRowIndex(newIndex);
  };

  const removeTask = (index) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
    formik.setFieldValue("tasks", newTasks);
  };

  const handleDeleteTask = async (index) => {
    const task = tasks[index];

    if (!task._id) {
      removeTask(index);
      return;
    }

    try {
      await api.delete(`/fms/templates/${templateId}/tasks/${task.taskId}`);
      removeTask(index);
      toast.success("Task deleted successfully");
    } catch (error) {
      console.log(error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete task",
      );
    }
  };

  const handleTaskChange = (index, field, value) => {
    const newTasks = [...tasks];

    if (index === 0) {
      if (field === "isDependent") return;
      newTasks[index].isDependent = "no";
      newTasks[index].dependentOn = "";
    }

    newTasks[index][field] = value;
    if (field === "dept") {
      newTasks[index].doer = "";
    }

    if (field === "linkedWithForm" && value === "no") {
      if (newTasks[index].frequency?.startsWith("Form Event")) {
        newTasks[index].frequency = "None";
      }
    }

    if (field === "decisionStep" && (value === false || value === "no")) {
      newTasks[index].decisionYesAction = "";
      newTasks[index].triggerFmsTemplate = "";
    }

    if (field === "decisionYesAction" && value !== "trigger_fms") {
      newTasks[index].triggerFmsTemplate = "";
    }

    setTasks(newTasks);
    formik.setFieldValue("tasks", newTasks);
  };

  const openChecklistModal = (index) => {
    setChecklistModal({ open: true, taskIndex: index });
  };

  const openFormModal = (index) => {
    setFormModal({ open: true, taskIndex: index });
  };

  const saveChecklistItems = (items) => {
    const index = checklistModal.taskIndex;
    const newTasks = [...tasks];
    newTasks[index].checklistItems = items;
    newTasks[index].checklist = items.length > 0;
    setTasks(newTasks);
    formik.setFieldValue("tasks", newTasks);
    setChecklistModal({ open: false, taskIndex: -1 });
  };

  const saveFormFields = (fields) => {
    const index = formModal.taskIndex;
    const newTasks = [...tasks];
    newTasks[index].formFields = fields;
    setTasks(newTasks);
    formik.setFieldValue("tasks", newTasks);
    setFormModal({ open: false, taskIndex: -1 });
  };

  const handleSave = async (index) => {
    try {
      const task = tasks[index];

      const isDecisionStep =
        task.decisionStep === true || task.decisionStep === "yes";

      const payload = {
        fmsTemplateId: templateId,
        taskId: task.taskId,
        description: task.description,
        departmentOfAssignToUser: task.dept,
        assignedTo: task.doer,
        frequency: task.frequency || "None",
        linkedWithForm: task.linkedWithForm === "yes",
        xValue: task.value,
        isDependent: task.isDependent === "yes" || task.isDependent === true,
        dependentOn: task.dependentOn,
        startTimeSetting: task.startTime == "none" ? undefined : task.startTime,
        decisionStep: isDecisionStep,
        decisionYesAction: isDecisionStep ? task.decisionYesAction : null,
        triggerFmsTemplate:
          isDecisionStep && task.decisionYesAction === "trigger_fms"
            ? task.triggerFmsTemplate
            : null,
        checklist: task.checklistItems,
        createdForm: task.formFields,
      };

      await api.put(
        `/fms/templates/${templateId}/tasks/${task.taskId}`,
        payload,
      );

      toast.success("Task updated successfully!");
      if (newRowIndex === index) {
        setNewRowIndex(null);
      }

      setEditingIndex(null);
      await fetchTasks(searchTerm, deptFilter);
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to update task");
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
  };

  return (
    <Card className="m-6 shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <CardTitle className="text-lg font-semibold">
              View FMS Template
            </CardTitle>

            {templateCreated && (
              <span className="text-xs text-muted-foreground">
                ID: {templateFMSId}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="">
        <form className="space-y-6" onSubmit={formik.handleSubmit}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>FMS ID *</Label>
                <Input
                  name="fms_id"
                  disabled
                  value={templateFMSId || ""}
                  placeholder="Auto Generated"
                />
              </div>

              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  name="templateName"
                  readOnly={isAlreadyLaunched}
                  value={formik.values.templateName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Enter template name"
                />
              </div>

              <div className="space-y-2">
                <Label>Manager *</Label>
                <Select
                  disabled={isAlreadyLaunched}
                  value={formik.values.manager}
                  onValueChange={(v) => formik.setFieldValue("manager", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((u) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sr Manager</Label>
                <Select
                  disabled={isAlreadyLaunched}
                  value={formik.values.srManager}
                  onValueChange={(v) => formik.setFieldValue("srManager", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Sr Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {srManagers.map((u) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>FMS Duration</Label>
                <div className="border rounded-lg" style={{ padding: "8px" }}>
                  <RadioGroup
                    disabled={isAlreadyLaunched}
                    value={formik.values.fmsDuration}
                    onValueChange={(val) =>
                      formik.setFieldValue("fmsDuration", val)
                    }
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Timeless" id="Timeless" />
                      <Label htmlFor="Timeless">Timeless</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Fixed Period" id="Fixed Period" />
                      <Label htmlFor="Fixed Period">Fixed Period</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {formik.values.fmsDuration === "Fixed Period" && (
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <DatePicker
                    disabled={isAlreadyLaunched}
                    className="w-full"
                    value={
                      formik.values.endDate
                        ? dayjs(formik.values.endDate)
                        : null
                    }
                    onChange={(date) =>
                      formik.setFieldValue(
                        "endDate",
                        date ? date.toISOString() : "",
                      )
                    }
                    format="DD MMM YYYY"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                disabled={isAlreadyLaunched}
                name="description"
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={4}
                placeholder="Enter description..."
              />
            </div>

            {templateCreated && !isAlreadyLaunched && (
              <div className="flex justify-end gap-2 pt-6 border-t">
                <Button
                  type="button"
                  onClick={updateTemplate}
                  disabled={loadUpdate}
                >
                  {"Update Template"}
                </Button>
              </div>
            )}
          </div>

          {templateCreated && (
            <>
              <Divider />
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h3 className="text-lg font-semibold">Task List</h3>
                  {!isAlreadyLaunched && (
                    <Button type="button" onClick={addTask} variant="outline">
                      <Plus className="w-4 h-4 mr-1" /> Add Task
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks by Task Id or Description"
                      className="pl-10 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Depts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Depts</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-[400px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Task Id</TableHead>
                        <TableHead className="w-[300px]">Description</TableHead>
                        <TableHead className="w-[140px]">Department</TableHead>
                        <TableHead className="w-[140px]">Doer</TableHead>
                        <TableHead className="w-[120px]">
                          Is Dependent?
                        </TableHead>
                        <TableHead className="w-[160px]">Depend On</TableHead>
                        <TableHead className="w-[180px]">
                          Start Time Setting
                        </TableHead>
                        {/* 🟢 VIEW LINK WITH FORM COLUMN */}
                        <TableHead className="w-[140px]">
                          Link with Form?
                        </TableHead>
                        <TableHead className="w-[160px]">Frequency</TableHead>
                        <TableHead className="w-[100px]">Value</TableHead>
                        <TableHead className="w-[140px]">
                          Decision Step?
                        </TableHead>
                        <TableHead className="w-[180px]">
                          Decision Action (If Yes)
                        </TableHead>
                        <TableHead className="w-[200px]">
                          Trigger Target FMS
                        </TableHead>
                        <TableHead className="w-[140px]">Checklist</TableHead>
                        <TableHead className="w-[140px]">Create Form</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingTasks ? (
                        <TableRow>
                          <TableCell colSpan={16} className="text-center">
                            <div className="flex justify-center items-center h-32">
                              <Spin />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        tasks.map((task, index) => {
                          const isEditable =
                            !task.isFromAPI || editingIndex === index;
                          const isDecisionYes =
                            task.decisionStep === true ||
                            task.decisionStep === "yes";

                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <Input
                                  value={task.taskId}
                                  name="taskId"
                                  disabled
                                  className="font-mono text-xs w-[150px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  disabled={!isEditable}
                                  className="w-[300px]"
                                  value={task.description}
                                  onChange={(e) =>
                                    handleTaskChange(
                                      index,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  disabled={!isEditable}
                                  value={task.dept}
                                  onValueChange={(v) =>
                                    handleTaskChange(index, "dept", v)
                                  }
                                >
                                  <SelectTrigger className="w-[90px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departments.map((d) => (
                                      <SelectItem key={d._id} value={d._id}>
                                        {d.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  disabled={!isEditable || !task.dept}
                                  value={task.doer}
                                  onValueChange={(v) =>
                                    handleTaskChange(index, "doer", v)
                                  }
                                >
                                  <SelectTrigger className="w-[90px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredUser
                                      .filter((u) =>
                                        task.dept
                                          ? u.department?.some(
                                              (d) =>
                                                String(d._id) ===
                                                String(task.dept),
                                            )
                                          : true,
                                      )
                                      .slice(0, 10)
                                      .map((u) => (
                                        <SelectItem key={u._id} value={u._id}>
                                          {u.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              <TableCell>
                                <Select
                                  disabled={!isEditable}
                                  value={index === 0 ? "no" : task.isDependent}
                                  onValueChange={(v) => {
                                    if (index === 0) return;

                                    handleTaskChange(index, "isDependent", v);

                                    if (v === "no") {
                                      handleTaskChange(
                                        index,
                                        "dependentOn",
                                        "none",
                                      );
                                    }
                                  }}
                                >
                                  <SelectTrigger
                                    className="w-[60px]"
                                    disabled={index === 0}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="no">No</SelectItem>
                                    {index !== 0 && (
                                      <SelectItem value="yes">Yes</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={task.dependentOn || undefined}
                                  onValueChange={(val) =>
                                    handleTaskChange(index, "dependentOn", val)
                                  }
                                  disabled={
                                    !isEditable ||
                                    index === 0 ||
                                    task.isDependent !== "yes"
                                  }
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Select Task" />
                                  </SelectTrigger>

                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {tasks
                                      .filter((_, i) => i !== index)
                                      .map((t) => (
                                        <SelectItem
                                          key={t.taskId}
                                          value={
                                            t.taskId || `temp-${Math.random()}`
                                          }
                                        >
                                          {t.taskId || "New Task"}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  disabled={
                                    !isEditable || task.isDependent == "no"
                                  }
                                  value={task.startTime}
                                  onValueChange={(v) =>
                                    handleTaskChange(index, "startTime", v)
                                  }
                                  className="w-[80px]"
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="planned-to-planned">
                                      Planned-To-Planned
                                    </SelectItem>
                                    <SelectItem value="actual-to-planned">
                                      Actual-To-Planned
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* 🟢 LINK WITH FORM CELL */}
                              <TableCell>
                                <Select
                                  disabled={!isEditable}
                                  value={task.linkedWithForm || "no"}
                                  onValueChange={(v) =>
                                    handleTaskChange(index, "linkedWithForm", v)
                                  }
                                >
                                  <SelectTrigger className="w-[80px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="no">No</SelectItem>
                                    <SelectItem value="yes">Yes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* 🟢 FREQUENCY CELL */}
                              <TableCell>
                                <Select
                                  disabled={!isEditable}
                                  value={task.frequency}
                                  onValueChange={(v) =>
                                    handleTaskChange(index, "frequency", v)
                                  }
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {index === 0 && (
                                      <SelectItem value="None">
                                        None (Standard)
                                      </SelectItem>
                                    )}

                                    {task.isDependent == "no" && (
                                      <>
                                        <SelectItem value="Anytime">
                                          Anytime
                                        </SelectItem>
                                        <SelectItem value="Daily">
                                          Daily
                                        </SelectItem>
                                        <SelectItem value="Weekly">
                                          Weekly
                                        </SelectItem>
                                        <SelectItem value="Monthly">
                                          Monthly
                                        </SelectItem>
                                        <SelectItem value="Start+X in days">
                                          Start+X in days
                                        </SelectItem>
                                        <SelectItem value="Start+X in hours">
                                          Start+X in hours
                                        </SelectItem>

                                        {task.linkedWithForm === "yes" && (
                                          <>
                                            <SelectItem value="Form Event+X in days">
                                              Form Event+X in days
                                            </SelectItem>
                                            <SelectItem value="Form Event+X in hours">
                                              Form Event+X in hours
                                            </SelectItem>
                                          </>
                                        )}
                                      </>
                                    )}

                                    {task.isDependent == "yes" && (
                                      <>
                                        <SelectItem value="Task+X in days">
                                          Task+X in days
                                        </SelectItem>
                                        <SelectItem value="Task+X in hours">
                                          Task+X in hours
                                        </SelectItem>
                                      </>
                                    )}

                                    {formik.values.fmsDuration ==
                                      "Fixed Period" &&
                                      task.isDependent == "no" && (
                                        <>
                                          <SelectItem value="Event+X in days">
                                            Event+X in days
                                          </SelectItem>
                                          <SelectItem value="Event+X in hours">
                                            Event+X in hours
                                          </SelectItem>
                                          <SelectItem value="Event-X in days">
                                            Event-X in days
                                          </SelectItem>
                                          <SelectItem value="Event-X in hours">
                                            Event-X in hours
                                          </SelectItem>
                                        </>
                                      )}
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* Value Cell */}
                              <TableCell>
                                <Input
                                  disabled={
                                    !isEditable ||
                                    task.frequency === "Anytime" ||
                                    task.frequency === "Daily" ||
                                    task.frequency === "Weekly" ||
                                    task.frequency === "Monthly" ||
                                    task.frequency === "None"
                                  }
                                  className="w-16"
                                  value={task.value}
                                  onChange={(e) =>
                                    handleTaskChange(
                                      index,
                                      "value",
                                      e.target.value,
                                    )
                                  }
                                />
                              </TableCell>

                              {/* Decision Step Cell */}
                              <TableCell>
                                <Select
                                  disabled={!isEditable}
                                  value={isDecisionYes ? "yes" : "no"}
                                  onValueChange={(v) =>
                                    handleTaskChange(
                                      index,
                                      "decisionStep",
                                      v === "yes",
                                    )
                                  }
                                  className="w-[80px]"
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="no">No</SelectItem>
                                    <SelectItem value="yes">Yes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* decisionYesAction Dropdown */}
                              <TableCell>
                                <Select
                                  disabled={!isEditable || !isDecisionYes}
                                  value={task.decisionYesAction || ""}
                                  onValueChange={(v) =>
                                    handleTaskChange(
                                      index,
                                      "decisionYesAction",
                                      v,
                                    )
                                  }
                                  className="w-[160px]"
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Action" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="terminate">
                                      Terminate FMS
                                    </SelectItem>
                                    <SelectItem value="trigger_fms">
                                      Trigger Another FMS
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* triggerFmsTemplate Dropdown */}
                              <TableCell>
                                {isDecisionYes &&
                                task.decisionYesAction === "trigger_fms" ? (
                                  <Select
                                    disabled={!isEditable}
                                    value={task.triggerFmsTemplate || ""}
                                    onValueChange={(v) =>
                                      handleTaskChange(
                                        index,
                                        "triggerFmsTemplate",
                                        v,
                                      )
                                    }
                                    className="w-[180px]"
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fmsTemplatesList?.map((template) => (
                                        <SelectItem
                                          key={template._id}
                                          value={template._id}
                                        >
                                          {template.templateName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    —
                                  </span>
                                )}
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center">
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs"
                                    onClick={() => openChecklistModal(index)}
                                  >
                                    <ListCheck className="h-3 w-3 mr-1" />
                                    {task.checklistItems.length > 0
                                      ? "Manage Items"
                                      : "Add Items"}
                                  </Button>

                                  {task.checklistItems.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="ml-2 text-xs"
                                    >
                                      {task.checklistItems.length}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-1 text-xs"
                                    onClick={() => openFormModal(index)}
                                  >
                                    <FilePlus className="h-3 w-3 mr-1" /> Add
                                    Form
                                  </Button>
                                  {task.formFields.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="ml-1 text-xs"
                                    >
                                      {task.formFields.length}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </>
          )}
          {!isAlreadyLaunched && (
            <div className="flex justify-end gap-2 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : templateCreated
                    ? "Save Tasks"
                    : "Create Template"}
              </Button>
            </div>
          )}
        </form>

        {/* Modals */}
        <ChecklistModal
          open={checklistModal.open}
          checklist={
            checklistModal.taskIndex >= 0
              ? tasks[checklistModal.taskIndex]?.checklistItems || []
              : []
          }
          onClose={() => setChecklistModal({ open: false, taskIndex: -1 })}
          onSave={saveChecklistItems}
          isView={true}
        />
        <CustomFormModal
          open={formModal.open}
          formFields={
            formModal.taskIndex >= 0
              ? tasks[formModal.taskIndex]?.formFields || []
              : []
          }
          onClose={() => setFormModal({ open: false, taskIndex: -1 })}
          onSave={saveFormFields}
          isView={true}
        />
      </CardContent>
    </Card>
  );
};

export default ViewFmsTemp;
