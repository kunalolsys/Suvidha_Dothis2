import React, { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Rocket,
  CheckCircle2,
  User,
  Briefcase,
  LayoutTemplate,
} from "lucide-react";
import { format } from "date-fns";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import api from "../../lib/api";
import dayjs from "dayjs";
import { DatePicker, Modal, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getSubmodulePermissions } from "../../utils/permissionUtils";
const { Text } = Typography;
const FmsLaunch = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [startDate, setStartDate] = useState();
  const [endDate, setEndDate] = useState();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [srManagers, setSrManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedSrManager, setSelectedSrManager] = useState(null);
  const currentUser = useSelector((state) => state.users.currentUser);
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "launch_fms",
    isSuper,
  );
  const fetchTemplates = async () => {
    try {
      const res = await api.post(`/fms/templates-list-drop/`, {
        role: currentUser?.role?.name,
      });
      setTemplates(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch tasks");
    } finally {
      console.log("object");
    }
  };
  const fetchTasks = async (templateID) => {
    if (!templateID) return;

    try {
      const res = await api.post(`/fms/templates/${templateID}/tasks-list`, {});
      const tasksData = res.data.data || [];
      setTasks(tasksData);
    } catch (err) {
      toast.error("Failed to load tasks");
    }
  };
  useEffect(() => {
    fetchTemplates();
  }, [currentUser]);
  useEffect(() => {
    if (selectedTemplate !== "none") {
      fetchTasks(selectedTemplate);
    }
  }, [selectedTemplate]);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/setup/users/allUsers");
        const users = response.data?.data || [];
        const managers = users.filter((u) => u.role?.name === "manager");
        const srManagers = users.filter((u) => u.role?.name === "sr._manager");

        // ✅ SET STATE
        setManagers(managers);
        setSrManagers(srManagers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast.error("Could not load users.");
      }
    };

    fetchUsers();
  }, []);

  const currentTemplate =
    selectedTemplate && selectedTemplate !== "none"
      ? templates.filter((items) => items._id == selectedTemplate)
      : null;
  useEffect(() => {
    if (currentTemplate) {
      setEndDate(currentTemplate[0].endDate || null);
      setSelectedManager(currentTemplate[0].manager?._id || "");
      setSelectedSrManager(currentTemplate[0].srManager?._id || "");
    }
  }, [currentTemplate]);
  const handleTemplateChange = (value) => {
    setSelectedTemplate(value);
    setStartDate(null);
    setEndDate(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startDate) {
      toast.error("Start date is required.");
      return;
    }

    Modal.confirm({
      title: "🚀 Confirm Launch FMS",
      content: (
        <div className="space-y-2">
          <Text strong>Are you sure you want to launch this FMS?</Text>

          <div className="text-sm text-gray-600">
            <p>⚠️ Once launched:</p>
            <ul className="list-disc ml-5">
              <li>Tasks will be auto-generated</li>
              <li>Template structure cannot be edited</li>
              <li>Assigned users will start receiving tasks</li>
            </ul>
          </div>

          <div className="mt-2 text-sm">
            <p>
              <strong>Start Date:</strong>{" "}
              {dayjs(startDate).format("DD MMM YYYY")}
            </p>

            {endDate && (
              <p>
                <strong>End Date:</strong>{" "}
                {dayjs(endDate).format("DD MMM YYYY")}
              </p>
            )}
          </div>
        </div>
      ),
      okText: "Yes, Launch",
      okType: "primary",
      cancelText: "Cancel",

      onOk: async () => {
        setLoading(true);

        const payload = {
          launchDate: dayjs(startDate).format("YYYY-MM-DD"),
          endDate,
        };

        try {
          const res = await api.post(
            `/fms/instances/${selectedTemplate}/launch`,
            payload,
          );

          if (res.data.success) {
            toast.success("FMS has been launched successfully 🚀");
            navigate("/fms-engine/upcoming");
          }
        } catch (error) {
          console.log(error);
          toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
          setLoading(false);
        }
      },
    });
  };
  return (
    <div className="bg-gray-50/50 flex items-center justify-center p-6">
      <Card className="w-full shadow-xl border-slate-200 bg-white">
        {/* --- Header --- */}
        <CardHeader className="bg-slate-50/50 border-b pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-800">
                Launch New FMS
              </CardTitle>
              <CardDescription>
                Select a workflow template to initialize a new project.
              </CardDescription>
            </div>
          </div>

          {/* --- Template Select (Prominent) --- */}
          <div className="pt-4">
            <Label
              htmlFor="template-select"
              className="text-slate-600 font-medium mb-2 block"
            >
              Choose a Template
            </Label>
            <Select onValueChange={handleTemplateChange}>
              <SelectTrigger
                id="template-select"
                className="h-12 text-base bg-white border-slate-300 focus:ring-blue-500/20"
              >
                <div className="flex items-center gap-2 text-slate-700">
                  <LayoutTemplate className="w-4 h-4 text-slate-400" />
                  <SelectValue placeholder="Select a workflow template..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(templates) &&
                templates.filter((item) => !item.isLaunched).length > 0 ? (
                  templates
                    .filter((items) => !items.isLaunched)
                    .map((items) => {
                      return (
                        <SelectItem
                          key={items.id || items._id}
                          value={items.id || items._id}
                          disabled={items.isLaunched}
                        >
                          <div className="flex items-center justify-between w-full">
                            {/* Left: Name */}
                            <span>
                              {items.fmsId} - {items.templateName}
                            </span>

                            {/* Right: Badge */}
                            {items.isLaunched && (
                              <span
                                className={cn(
                                  "ml-2 px-2 py-0.5 text-xs rounded-md font-medium",
                                  items.isLaunched
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700",
                                )}
                              >
                                {items.isLaunched
                                  ? "Already Launched"
                                  : "Draft"}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                ) : (
                  <SelectItem value="none">No templates found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* --- Conditional Form Details (Animated) --- */}
            {selectedTemplate !== "none" && currentTemplate?.length > 0 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    Configuration:{" "}
                    {currentTemplate?.[0]?.templateName || "Untitled"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {currentTemplate?.[0]?.description ||
                      "No description available"}
                  </p>
                </div>

                {/* --- Form Fields Grid --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label className="text-slate-600">Start Date</Label>

                    <DatePicker
                      className="w-full h-9"
                      value={startDate ? dayjs(startDate) : null}
                      onChange={(date) =>
                        setStartDate(date ? date.toDate() : null)
                      }
                      format="DD MMM YYYY"
                      placeholder="Pick a date"
                      disabledDate={(current) =>
                        current && current < dayjs().startOf("day")
                      }
                    />
                  </div>

                  {/* End Date (Conditional) */}
                  {currentTemplate?.[0]?.fmsDuration === "Fixed Period" && (
                    <div className="space-y-2">
                      <Label className="text-slate-600">
                        Expected End Date
                      </Label>

                      <DatePicker
                        className="w-full h-9"
                        disabled
                        value={endDate ? dayjs(endDate) : null}
                        onChange={(date) =>
                          setEndDate(date ? date.toDate() : null)
                        }
                        format="DD MMM YYYY"
                        placeholder="Pick a date"
                      />
                    </div>
                  )}

                  {/* Manager */}
                  <div className="space-y-2">
                    <Label htmlFor="manager-select" className="text-slate-600">
                      Manager
                    </Label>
                    <Select
                      disabled
                      value={selectedManager}
                      onValueChange={(val) => setSelectedManager(val)}
                    >
                      <SelectTrigger
                        id="manager-select"
                        className="h-11 border-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <SelectValue placeholder="Assign Manager" />
                        </div>
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

                  {/* Sr. Manager */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="sr-manager-select"
                      className="text-slate-600"
                    >
                      Sr. Manager
                    </Label>
                    <Select
                      disabled
                      value={selectedSrManager}
                      onValueChange={(val) => setSelectedSrManager(val)}
                    >
                      <SelectTrigger
                        id="sr-manager-select"
                        className="h-11 border-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <SelectValue placeholder="Assign Sr. Manager" />
                        </div>
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
                </div>

                {/* --- Tasks Preview (Enhanced UI) --- */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                  <h4 className="flex items-center gap-2 font-semibold text-blue-900 mb-3 text-sm uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Included Tasks Preview
                  </h4>
                  <ul
                    className={`grid grid-cols-1 ${Array.isArray(tasks) && tasks.length == 1 ? "md:grid-cols-1" : "md:grid-cols-2"} gap-3`}
                  >
                    {" "}
                    {Array.isArray(tasks) && tasks.length > 0 ? (
                      tasks.map((task, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-4 p-3 rounded-lg border bg-white shadow-sm hover:shadow-md transition"
                        >
                          {/* Task ID Badge */}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 leading-snug">
                              {task.description}
                            </p>

                            {/* Extra Info Row */}
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>
                                🏢 {task.departmentOfAssignToUser?.name}
                              </span>

                              <span>👤 {task.assignedTo?.name}</span>

                              {task.taskDependent && (
                                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                                  Depends on: {task.taskDependent}
                                </span>
                              )}

                              {task.startTimeSetting && (
                                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                                  {task.startTimeSetting ===
                                  "planned-to-planned"
                                    ? "Planned → Planned"
                                    : task.startTimeSetting ===
                                        "actual-to-planned"
                                      ? "Actual → Planned"
                                      : task.startTimeSetting ===
                                          "actual-to-actual"
                                        ? "Actual → Actual"
                                        : task.startTimeSetting}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {task.frequency}
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded ${
                                  task.isDependent
                                    ? "bg-red-100 text-red-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {task.isDependent ? "Dependent" : "Independent"}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <div>No task found</div>
                    )}
                  </ul>
                </div>

                {/* --- Submit Button --- */}
                {canCreate && (
                  <div className="sticky bottom-0 bg-white pt-4 pb-4 border-t z-10">
                    <Button
                      type="submit"
                      disabled={loading}
                      size="lg"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-lg h-12 shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.01]"
                    >
                      Launch FMS Workflow
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Empty State Placeholder */}
            {!selectedTemplate && (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Please select a template above to begin configuration.</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FmsLaunch;
