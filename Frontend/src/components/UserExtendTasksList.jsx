import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock,
  Search,
  Clock,
  Send,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import api from "../lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip"; // Ya "../components/ui/tooltip"
import { CalendarPlus } from "lucide-react";
const UserExtendTasksList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [masterConfig, setMasterConfig] = useState({
    daysBeforeDueDate: 2,
    maxExtensionDays: 3,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [extensionDays, setExtensionDays] = useState(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Description Modal State
  const [descDialogOpen, setDescDialogOpen] = useState(false);
  const [fullDesc, setFullDesc] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/task-extension/user-eligible-tasks");
      setTasks(res.data.data || []);
      if (res.data.master) setMasterConfig(res.data.master);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleOpenExtendModal = (task) => {
    setSelectedTask(task);
    setExtensionDays(1);
    setReason("");
    setIsModalOpen(true);
  };

  const handleRequestSubmit = async () => {
    if (!selectedTask) return;
    if (extensionDays < 1 || extensionDays > masterConfig.maxExtensionDays) {
      toast.error(
        `Extension days 1 se ${masterConfig.maxExtensionDays} ke beech hone chahiye.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/task-extension/request", {
        taskId: selectedTask._id,
        extensionDays: Number(extensionDays),
        reason,
      });
      toast.success("Extension request sent successfully!");
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        (t.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.TaskId || "").toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tasks, searchTerm]);

  const requestedCount = useMemo(
    () => tasks.filter((t) => t.hasPendingRequest).length,
    [tasks],
  );
  const eligibleCount = useMemo(
    () => tasks.filter((t) => !t.hasPendingRequest).length,
    [tasks],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 py-4">
      <div className="shadow-xl border-0 overflow-hidden rounded-xl bg-white">
        {/* Header Bar */}
        <div className="p-4 py-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 border-y border-white/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-xs">
                <CalendarClock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Extendable Tasks
                </h1>
                <p className="text-xs text-blue-100 mt-0.5">
                  Due date window ke andar aane wale tasks jinki date extend
                  karwa sakte hain
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTasks}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        <div className="p-4 pt-0">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">
                    Total In Window
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {tasks.length}
                  </p>
                </div>
                <div className="p-2 bg-blue-200/60 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-700">
                    Eligible to Request
                  </p>
                  <p className="text-2xl font-bold text-emerald-800">
                    {eligibleCount}
                  </p>
                </div>
                <div className="p-2 bg-emerald-200/60 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-700">
                    Pending Approvals
                  </p>
                  <p className="text-2xl font-bold text-amber-800">
                    {requestedCount}
                  </p>
                </div>
                <div className="p-2 bg-amber-200/60 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Filter Bar */}
          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Task ID or Title..."
                className="pl-9 bg-white text-xs h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-16">Sr. No.</TableHead>
                  <TableHead>Task ID</TableHead>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Current Due Date</TableHead>
                  <TableHead>Allowed Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <RefreshCcw className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredTasks.length > 0 ? (
                  filteredTasks.map((task, idx) => (
                    <TableRow key={task._id} className="hover:bg-slate-50/70">
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-blue-600">
                        {task.TaskId || "-"}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 max-w-xs truncate">
                        {task.title}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-blue-600 text-xs"
                          onClick={() => {
                            setFullDesc(task.description || "No description.");
                            setDescDialogOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                      <TableCell className="text-xs text-gray-700 whitespace-nowrap">
                        {task.dueDate
                          ? moment(task.dueDate).format("DD MMM YYYY, hh:mm A")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border font-medium">
                          Max +{masterConfig.maxExtensionDays} Days
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                        >
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider delayDuration={150}>
                          <div className="flex items-center justify-center">
                            {task.hasPendingRequest ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 cursor-default">
                                    <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">
                                    Pending Approval (+
                                    {
                                      task.pendingDetails
                                        ?.requestedExtensionDays
                                    }{" "}
                                    Days)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg cursor-pointer transition-all duration-200"
                                    onClick={() => handleOpenExtendModal(task)}
                                  >
                                    <CalendarPlus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">
                                    Request Date Extension
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500 text-xs"
                    >
                      No tasks found in current window.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Extend Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Due Date Extension</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-gray-50 p-3 rounded-lg border">
              <p className="text-xs text-gray-500">Selected Task</p>
              <p className="text-sm font-semibold text-gray-800">
                {selectedTask?.title}
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                Additional Days (Max Allowed: {masterConfig.maxExtensionDays}{" "}
                Days)
              </Label>
              <Input
                type="number"
                min={1}
                max={masterConfig.maxExtensionDays}
                value={extensionDays}
                onChange={(e) => setExtensionDays(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                Reason for Delay
              </Label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the reason why extension is required..."
                className="w-full border rounded-lg p-2.5 text-xs bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleRequestSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Description Dialog */}
      <Dialog open={descDialogOpen} onOpenChange={setDescDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Task Description</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {fullDesc}
          </div>
          <DialogFooter>
            <Button onClick={() => setDescDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserExtendTasksList;
