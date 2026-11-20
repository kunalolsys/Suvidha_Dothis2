import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Check,
  X,
  Search,
  RefreshCcw,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
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
import { Popover } from "antd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip"; // Ya "../components/ui/tooltip"
import api from "../lib/api";
import { useSelector } from "react-redux";
import { getSubmodulePermissions } from "../utils/permissionUtils";
const AdminExtensionApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewingId, setReviewingId] = useState(null);
  const [editableDays, setEditableDays] = useState({}); // 🟢 Store custom approved days per request
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canRead, canUpdate } = getSubmodulePermissions(
    permissions,
    "extension_approvals",
    isSuper,
  );
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/task-extension/pending-requests");
      const list = res.data.data || [];
      setRequests(list);

      // Initialize editableDays with requestedExtensionDays
      const initialDays = {};
      list.forEach((item) => {
        initialDays[item._id] = item.requestedExtensionDays;
      });
      setEditableDays(initialDays);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load approval requests",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDaysChange = (requestId, value) => {
    setEditableDays((prev) => ({
      ...prev,
      [requestId]: value,
    }));
  };

  const handleReview = async (requestId, action) => {
    const rawDays = editableDays[requestId];
    const approvedDays = Number(rawDays);

    if (action === "APPROVE" && (!approvedDays || approvedDays < 1)) {
      toast.error("Approved days must be at least 1.");
      return;
    }

    setReviewingId(requestId);
    try {
      const res = await api.post("/task-extension/review", {
        requestId,
        action,
        approvedDays: action === "APPROVE" ? approvedDays : undefined, // 🟢 Send custom days
      });
      toast.success(res.data.message || `Request ${action.toLowerCase()}ed!`);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setReviewingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(
      (r) =>
        (r.taskId?.title || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (r.taskId?.TaskId || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (r.requestedBy?.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );
  }, [requests, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 py-4">
      <div className="shadow-xl border-0 overflow-hidden rounded-xl bg-white">
        {/* Header */}
        <div className="p-4 py-4">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 border-y border-white/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-xs">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Extension Approvals
                </h1>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Single-click review for task due date extension requests
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRequests}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        <div className="p-4 pt-0">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-700">
                    Pending Requests
                  </p>
                  <p className="text-2xl font-bold text-amber-800">
                    {requests.length}
                  </p>
                </div>
                <div className="p-2 bg-amber-200/60 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-700">
                    Ready to Approve
                  </p>
                  <p className="text-2xl font-bold text-emerald-800">
                    {requests.length}
                  </p>
                </div>
                <div className="p-2 bg-emerald-200/60 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Filter */}
          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by User Name, Task ID or Title..."
                className="pl-9 bg-white text-xs h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Approvals Table */}
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-16">Sr. No.</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Task ID</TableHead>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Current Due Date</TableHead>
                  <TableHead>Requested Days</TableHead>
                  <TableHead>Approve Days</TableHead>
                  <TableHead>New Due Date (If Approved)</TableHead>
                  <TableHead>Reason</TableHead>
                  {canUpdate && (
                    <TableHead className="text-center">
                      Single-Click Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10">
                      <RefreshCcw className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((req, idx) => {
                    const currentApprovedDays =
                      editableDays[req._id] ?? req.requestedExtensionDays;
                    const validDays = Math.max(
                      0,
                      Number(currentApprovedDays) || 0,
                    );
                    const newDueDate = moment(req.currentDueDate).add(
                      validDays,
                      "days",
                    );

                    return (
                      <TableRow key={req._id} className="hover:bg-slate-50/70">
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-gray-900">
                              {req.requestedBy?.name || "-"}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {req.requestedBy?.employeeCode ||
                                req.requestedBy?.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-blue-600">
                          {req.taskId?.TaskId || "-"}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 max-w-xs truncate">
                          {req.taskId?.title}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                          {moment(req.currentDueDate).format("DD MMM YYYY")}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold">
                            +{req.requestedExtensionDays} Days
                          </Badge>
                        </TableCell>

                        {/* 🟢 Editable Approved Days Field */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={1}
                              value={currentApprovedDays}
                              onChange={(e) =>
                                handleDaysChange(req._id, e.target.value)
                              }
                              className="w-20 h-8 text-xs font-semibold text-center border-emerald-300 focus-visible:ring-emerald-500"
                            />
                            <span className="text-xs text-gray-500">days</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                          {validDays > 0
                            ? newDueDate.format("DD MMM YYYY")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Popover
                            trigger="click"
                            placement="topLeft"
                            content={
                              <div className="w-64 p-1 space-y-1">
                                <p className="text-xs font-bold text-gray-800">
                                  Reason for Request:
                                </p>
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-md border whitespace-pre-wrap">
                                  {req.reason || "No specific reason provided."}
                                </p>
                              </div>
                            }
                          >
                            <button className="text-xs text-blue-600 hover:underline cursor-pointer font-medium">
                              View Reason
                            </button>
                          </Popover>
                        </TableCell>
                        {canUpdate && (
                          <TableCell className="text-center">
                            <TooltipProvider delayDuration={150}>
                              <div className="flex items-center justify-center gap-1.5">
                                {/* 🟢 Single-Click Approve Button */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      disabled={
                                        reviewingId === req._id || validDays < 1
                                      }
                                      onClick={() =>
                                        handleReview(req._id, "APPROVE")
                                      }
                                      className="h-8 w-8 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                    >
                                      {reviewingId === req._id ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                      ) : (
                                        <Check className="h-4 w-4 stroke-[2.5]" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs font-medium">
                                      Approve (+{validDays} Days)
                                    </p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* 🔴 Single-Click Reject Button */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      disabled={reviewingId === req._id}
                                      onClick={() =>
                                        handleReview(req._id, "REJECT")
                                      }
                                      className="h-8 w-8 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-all duration-200 cursor-pointer disabled:opacity-50"
                                    >
                                      <X className="h-4 w-4 stroke-[2.5]" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs font-medium text-rose-600">
                                      Reject Request
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-8 text-gray-500 text-xs"
                    >
                      No pending extension requests right now.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExtensionApprovals;
