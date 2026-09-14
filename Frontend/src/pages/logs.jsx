import React, { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from "../components/ui/index.jsx";
import {
  Users,
  ListTodo,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
// Utility functions (migrated)
const formatDate = (dateStr) => {
  return dateStr
    ? format(new Date(dateStr), "MMM dd, yyyy 'at' hh:mmaaa")
    : "-";
};

const getActionColor = (action) => {
  switch (action) {
    case "CREATE":
      return "bg-green-100 text-green-800 border-green-200";
    case "UPDATE":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "DELETE":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const LogRow = ({ log, onView }) => {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition">
      <td className="px-4 py-3 text-sm font-medium">
        {log.performedBy?.name || "System"}
      </td>

      <td className="px-4 py-3 text-xs">
        <span
          className={`px-2 py-1 rounded-md text-xs font-medium ${getActionColor(log.action)}`}
        >
          {log.action}
        </span>
      </td>

      <td className="px-4 py-3 text-xs text-muted-foreground">{log.module}</td>

      <td className="px-4 py-3 text-sm text-muted-foreground">{log.message}</td>

      <td className="px-4 py-3 text-center">
        {log.action === "UPDATE" ? (
          <button
            onClick={() => onView(log)}
            className="p-1.5 rounded-md hover:bg-muted transition"
          >
            <Eye className="w-4 h-4 opacity-70" />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      <td className="px-4 py-3 text-xs text-right text-muted-foreground">
        {formatDate(log.createdAt)}
      </td>
    </tr>
  );
};
const ChangeModal = ({ open, onClose, log }) => {
  if (!open || !log) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-[600px] rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Changes</h2>
          <button
            onClick={onClose}
            className="text-sm opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>

        {/* Content (YOUR EXISTING LOGIC) */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <ChangeTable oldData={log.oldData} newData={log.newData} />
        </div>
      </div>
    </div>
  );
};
const LogsTable = ({ logs, onView }) => {
  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      {/* 👇 Scroll container */}
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-left">
          {/* Sticky header (important for UX) */}
          <thead className="bg-muted text-xs uppercase text-muted-foreground sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3 text-center">View</th>
              <th className="px-4 py-3 text-right">Date</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <LogRow key={log._id} log={log} onView={onView} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const ChangeTable = ({ oldData, newData }) => {
  const changes = [];
  const keys = Object.keys(newData);

  keys.forEach((key) => {
    const oldVal = oldData[key];
    const newVal = newData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase()),
        oldValue: formatValue(oldVal),
        newValue: formatValue(newVal),
      });
    }
  });

  if (changes.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Old</TableHead>
            <TableHead>New</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {changes.map((change, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium">{change.field}</TableCell>
              <TableCell className="text-muted-foreground">
                {change.oldValue}
              </TableCell>
              <TableCell className="font-semibold">{change.newValue}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const formatValue = (val) => {
  if (val === null || val === undefined) return "-";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val))
    return val.map((v) => v?.name || String(v)).join(", ");
  if (typeof val === "object") return val?.name || JSON.stringify(val);
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return format(new Date(val), "MMM dd, yyyy");
  }
  return String(val);
};
const LogsDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [groupedData, setGroupedData] = useState({});

  // Expand state for rows
  const [expandedIds, setExpandedIds] = useState(new Set());

  const fetchAllLogs = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get("/logs", {
        params: filters,
      });

      setLogs(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAllLogs();
  }, [filters, fetchAllLogs]);

  // Group logs by module → documentId
  useEffect(() => {
    const grouped = {};
    logs.forEach((log) => {
      const module = log.module || "OTHER";
      if (!grouped[module]) grouped[module] = {};

      const docId = log.documentId;
      if (!grouped[module][docId]) {
        grouped[module][docId] = {
          displayId: extractDisplayId(log),
          logs: [],
          count: 0,
        };
      }
      grouped[module][docId].logs.push(log);
      grouped[module][docId].count = grouped[module][docId].logs.length;
    });

    // Sort logs within each group (newest first)
    Object.keys(grouped).forEach((module) => {
      Object.keys(grouped[module]).forEach((docId) => {
        grouped[module][docId].logs.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
      });
    });

    setGroupedData(grouped);
  }, [logs]);

  const extractDisplayId = (log) => {
    // Extract TaskId from TASK logs
    if (log.module === "TASK" && log.newData?.TaskId) {
      return log.newData.TaskId;
    }
    if (log.message && log.message.includes("ID:")) {
      const match = log.message.match(/ID:\s*(\d+)/);
      if (match) return match[1];
    }
    // USER: employeeCode
    if (log.newData?.employeeCode) return log.newData.employeeCode;
    if (log.newData?.companyCode) return log.newData.companyCode;
    return log.documentId?.slice(-6) || "N/A";
  };

  const toggleExpand = (module, docId) => {
    const key = `${module}-${docId}`;
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isExpanded = (module, docId) => expandedIds.has(`${module}-${docId}`);

  const getModuleIcon = (module) => {
    return module === "TASK" ? (
      <ListTodo className="w-5 h-5" />
    ) : (
      <Users className="w-5 h-5" />
    );
  };

  const getModuleColor = (module) => {
    return module === "TASK"
      ? "bg-blue-100 text-blue-800"
      : "bg-green-100 text-green-800";
  };
  const [selectedLog, setSelectedLog] = useState(null);
  const [open, setOpen] = useState(false);

  const handleView = (log) => {
    setSelectedLog(log);
    setOpen(true);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Hero Header */}
      <Card className="border-0 shadow-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Activity Timeline
              </CardTitle>
              <p className="text-muted-foreground text-lg">
                Comprehensive audit trail for all USER & TASK actions
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border">
                <span className="text-2xl font-bold text-blue-600">
                  {logs.length}
                </span>
                <div className="text-xs text-muted-foreground">Total Logs</div>
              </div>
              {Object.keys(groupedData).map((module) => (
                <div
                  key={module}
                  className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border"
                >
                  <span className="text-lg font-bold capitalize text-blue-600">
                    {Object.keys(groupedData[module]).length}
                  </span>
                  <div className="text-xs text-muted-foreground capitalize">
                    {module}s
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={filters.action || ""}
              onValueChange={(val) =>
                setFilters((prev) => ({ ...prev, action: val || undefined }))
              }
            >
              <SelectTrigger className="w-full sm:w-52 bg-white/70 hover:bg-white shadow-sm">
                <SelectValue placeholder="🔍 Filter by Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CREATE">➕ Create</SelectItem>
                <SelectItem value="UPDATE">✏️ Update</SelectItem>
                <SelectItem value="DELETE">🗑️ Delete</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.module || ""}
              onValueChange={(val) =>
                setFilters((prev) => ({ ...prev, module: val || undefined }))
              }
            >
              <SelectTrigger className="w-full sm:w-52 bg-white/70 hover:bg-white shadow-sm">
                <SelectValue placeholder="📂 Filter by Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TASK">📋 Task</SelectItem>
                <SelectItem value="USER">👥 User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Module Groups */}
      {Object.entries(groupedData).map(([module, items]) => (
        <Card key={module}>
          <CardHeader className="group bg-gradient-to-br p-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div
              className={`p-6 pr-16 group-hover:shadow-xl transition-all duration-300 border-r-8 ${getModuleColor(module)}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-white/50">
                  {getModuleIcon(module)}
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold capitalize">
                    {module}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-1 text-sm">
                    {Object.keys(items).length} items •{" "}
                    {logs.filter((l) => l.module === module).length} logs
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Latest Action</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Logs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(items).map(([docId, data]) => {
                  const latestLog = data.logs[0];
                  const performedBy = latestLog?.performedBy;
                  return (
                    <>
                      <TableRow
                        key={docId}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => toggleExpand(module, docId)}
                      >
                        <TableCell className="font-mono font-semibold">
                          {data.displayId}
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          {/* <Avatar className="w-8 h-8">
                            {performedBy?.name?.[0]?.toUpperCase() || "?"}
                          </Avatar> */}
                          <div>
                            <div className="font-medium">
                              {performedBy?.name || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {performedBy?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getActionColor(latestLog?.action)}
                          >
                            {latestLog?.action || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(latestLog?.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(module, docId);
                            }}
                          >
                            {isExpanded(module, docId) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Sub-Table */}
                      {isExpanded(module, docId) && (
                        <tr>
                          <td colSpan={5} className="p-3">
                            {/* <div className="border-t">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-muted">
                                  <tr className="text-xs text-muted-foreground uppercase">
                                    <th className="px-4 py-2">User</th>
                                    <th className="px-4 py-2">Action</th>
                                    <th className="px-4 py-2">Module</th>
                                    <th className="px-4 py-2">Message</th>
                                    <th className="px-4 py-2 text-right">
                                      Date
                                    </th>
                                  </tr>
                                </thead>

                                <tbody> */}
                            <LogsTable logs={data.logs} onView={handleView} />
                            {/* </tbody>
                              </table>
                            </div> */}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <ChangeModal
        open={open}
        log={selectedLog}
        onClose={() => setOpen(false)}
      />
      {logs.length === 0 && !loading && (
        <Card className="text-center py-20 border-dashed border-2 border-muted">
          <ListTodo className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-2xl font-bold text-muted-foreground mb-2">
            No logs found
          </h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your filters or there might be no activity yet.
          </p>
          <Button onClick={() => setFilters({})} variant="outline" size="lg">
            Clear Filters
          </Button>
        </Card>
      )}
    </div>
  );
};

export default LogsDashboard;
