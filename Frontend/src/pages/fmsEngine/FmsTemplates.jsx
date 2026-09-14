import React, { useEffect, useRef, useState } from "react";
import {
  FilePenLine,
  Trash2,
  Plus,
  Edit,
  Zap,
  Sparkles,
  ListTodo,
  User,
  Building2,
  Eye,
} from "lucide-react";
import * as XLSX from "xlsx";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Download, Upload } from "lucide-react";
import { fetchTemplates } from "../../redux/slices/fms/fmsSlice";
import DataPagination from "../../components/ui/commonPagination";
import { toast } from "sonner";
import { Checkbox, Modal, Popconfirm, Spin, Input } from "antd";
const { TextArea } = Input;

import api from "../../lib/api";
import { cn } from "../../lib/utils";
import { ExportOutlined } from "@ant-design/icons";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

// --- Helper for Badges ---
const getDurationBadge = (duration) => {
  if (duration === "Timeless") {
    return (
      <Badge
        variant="default"
        className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200 text-sm px-2 py-1"
      >
        Timeless
      </Badge>
    );
  }
  if (duration === "Fixed Period") {
    return (
      <Badge
        variant="default"
        className="bg-purple-100 text-purple-800 hover:bg-purple-100 border border-purple-200 text-sm px-2 py-1"
      >
        Fixed Period
      </Badge>
    );
  }
  return <Badge variant="outline">{duration}</Badge>;
};

// --- Main Component ---
const FmsTemplates = () => {
  const dispatch = useDispatch();
  const [fmsTemplates, setFmsTemplates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const currentUser = useSelector((state) => state.users.currentUser);
  const role = currentUser?.role?.name;
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "fms_templates",
    isSuper,
  );
  // Import states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [parsedTemplates, setParsedTemplates] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef(null);
  // Download sample handler
  const handleDownloadSample = () => {
    const sampleData = [
      {
        templateName: "Marketing Campaign 2025",
        description: "Annual marketing template for Q1-Q4",
        fmsDuration: "Timeless",
        manager: "Manager Name",
        srManager: "Sr. Manager Name",
        endDate: "",
      },
      {
        templateName: "Q1 Sales Drive",
        description: "Sales push for January-March",
        fmsDuration: "Fixed Period",
        manager: "Manager Name",
        srManager: "",
        endDate: "2025-03-31",
      },
    ];

    // ✅ Define headers explicitly (important for CSV consistency)
    const headers = [
      "templateName",
      "description",
      "fmsDuration",
      "manager",
      "srManager",
      "endDate",
    ];

    // ✅ Convert to CSV
    const csvRows = [];

    // Header row
    csvRows.push(headers.join(","));

    // Data rows
    sampleData.forEach((row) => {
      const values = headers.map((header) => {
        let cell = row[header] ?? "";

        // Escape commas, quotes, newlines
        if (typeof cell === "string") {
          cell = cell.replace(/"/g, '""'); // escape quotes
          if (cell.includes(",") || cell.includes("\n")) {
            cell = `"${cell}"`;
          }
        }

        return cell;
      });

      csvRows.push(values.join(","));
    });

    const csvString = csvRows.join("\n");

    // ✅ Download file
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "fms-templates-sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    toast.success("CSV sample file downloaded!");
  };
  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);

    const fileName = file.name.toLowerCase();

    // 🔥 JSON FILE
    if (fileName.endsWith(".json")) {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const templates = JSON.parse(e.target.result);

          if (Array.isArray(templates)) {
            setParsedTemplates(templates);
            toast.success(`Parsed ${templates.length} templates (JSON)`);
          } else {
            toast.error("Invalid JSON format. Expected array.");
          }
        } catch {
          toast.error("Invalid JSON file");
        }
      };

      reader.readAsText(file);
      return;
    }

    // 🔥 CSV OR XLSX
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;

        let workbook;

        // XLSX / XLS
        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          workbook = XLSX.read(data, { type: "binary" });
        }
        // CSV
        else if (fileName.endsWith(".csv")) {
          workbook = XLSX.read(data, { type: "string" });
        } else {
          toast.error("Unsupported file type");
          return;
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert sheet → JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          defval: "", // keep empty fields
        });

        if (!jsonData.length) {
          toast.error("Empty file");
          return;
        }

        // ✅ Normalize keys (optional but recommended)
        const normalized = jsonData.map((row) => ({
          templateName: row.templateName || "",
          description: row.description || "",
          fmsDuration: row.fmsDuration || "",
          manager: row.manager || "",
          srManager: row.srManager || "",
          endDate: row.endDate || "",
        }));

        setParsedTemplates(normalized);
        toast.success(
          `Parsed ${normalized.length} templates (${fileName.split(".").pop().toUpperCase()})`,
        );
      } catch (err) {
        console.error(err);
        toast.error("Error parsing file");
      }
    };

    // ⚠️ Important: different read modes
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Submit import
  const handleImportSubmit = async () => {
    if (!parsedTemplates.length) {
      toast.error("No valid templates to import");
      return;
    }

    setImportLoading(true);
    try {
      const res = await api.post("/fms/templates-import", {
        templates: parsedTemplates,
      });
      const { created = [], errors = [], message } = res.data;
      const updatedRows = parsedTemplates.map((row) => {
        const match = errors.find((e) => e.templateName === row.templateName);

        return {
          ...row,
          error: match ? match.error : null,
        };
      });

      setParsedTemplates(updatedRows);

      if (errors.length && created.length) {
        toast.warning(`${created.length} imported, ${errors.length} failed`);
      } else if (errors.length) {
        toast.error(`Import failed: ${errors.length} errors`);
      } else {
        toast.success(`Imported ${created.length} templates`);
        setImportModalOpen(false);
        setImportFile(null);
        setParsedTemplates([]);
        getTemplates();
      }
      getTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed");
    } finally {
      setImportLoading(false);
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  const handleFileClick = (e) => {
    // clear previous file before opening picker
    setImportFile(null);
    setParsedTemplates([]);

    // also reset input value (important)
    e.target.value = null;
  };
  const getTemplates = async () => {
    const res = await dispatch(fetchTemplates({ page, limit, role })).unwrap();
    setFmsTemplates(res.data);
    setPagination(res.pagination);
  };
  useEffect(() => {
    getTemplates();
  }, [page, limit, role]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  // Note: selectedTemplateId unused but kept for future
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const fetchTasks = async (templateId) => {
    setLoadingTasks(true);
    try {
      const res = await api.post(`/fms/templates/${templateId}/tasks-list`, {});
      setTasks(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch tasks");
    } finally {
      setLoadingTasks(false);
    }
  };
  const handleOpenTasks = async (templateId) => {
    // setSelectedTemplateId(templateId);
    setIsTaskModalOpen(true);
    fetchTasks(templateId);
  };
  // const handleDeleteTemplate = async (templateId) => {
  //   try {
  //     await api.delete(`/fms/templates/${templateId}`);
  //     toast.success("Template deleted successfully");
  //     getTemplates();
  //   } catch (err) {
  //     console.error(err);
  //     toast.error(err.response?.data?.message || "Failed to delete template");
  //   }
  // };

  const handleDeleteTemplate = (templateId) => {
    let reason = "";
    let forceDelete = false;

    Modal.confirm({
      title: "Delete Template",
      content: (
        <div className="space-y-3">
          <p>⚠️ This will delete the template.</p>

          <p className="text-sm text-muted-foreground">
            If active or On Hold instances exist, deletion may fail unless
            forced.
          </p>

          <TextArea
            rows={3}
            placeholder="Enter reason (optional)"
            onChange={(e) => (reason = e.target.value)}
          />

          {role == "Admin" && (
            <Checkbox onChange={(e) => (forceDelete = e.target.checked)}>
              Force delete (remove even if instances exist)
            </Checkbox>
          )}
        </div>
      ),
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",

      onOk: async () => {
        try {
          // 🔹 Try normal delete first
          await api.delete(`/fms/templates/${templateId}`, {
            data: { reason },
          });

          toast.success("Template deleted successfully");
          getTemplates();
        } catch (err) {
          const message = err.response?.data?.message || "Delete failed";

          // 🔴 If failed and force not checked
          if (!forceDelete) {
            toast.error(message);
            throw new Error("Delete blocked"); // keep modal open
          }

          // 🔥 Force delete
          try {
            await api.delete(`/fms/templates/${templateId}?force=true`, {
              data: { reason },
            });

            toast.success("Template force deleted");
            getTemplates();
          } catch (forceErr) {
            toast.error(
              forceErr.response?.data?.message || "Force delete failed",
            );
            throw forceErr;
          }
        }
      },
    });
  };
  const handleExportTemplates = async () => {
    try {
      const response = await api.get("/fms/templates/export", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "templates.xlsx");

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Templates exported successfully");
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.message || "Failed to export templates.",
      );
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4">
      {/* Animated Background Elements */}
      <div className="fixed top-0 left-0 w-72 h-72 bg-blue-200/10 rounded-full blur-3xl animate-pulse -z-10"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-purple-200/10 rounded-full blur-3xl animate-pulse delay-1000 -z-10"></div>

      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-gray-200/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                FMS Templates
              </CardTitle>
            </div>
            <div className="flex gap-2 w-full lg:w-auto justify-start lg:justify-end">
              <Button
                variant="outline"
                onClick={handleExportTemplates}
                className="flex items-center gap-2"
              >
                <ExportOutlined size={15} />
                Export
              </Button>
              <Button
                onClick={handleDownloadSample}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Sample
              </Button>
              <Button
                onClick={() => setImportModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import Templates
              </Button>
              {canCreate && (
                <Link
                  to="/fms-engine/create-template"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center text-sm font-semibold"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New
                </Link>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <div className="rounded-lg border border-gray-200/50 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-sm p-3">
                      FMS ID
                    </TableHead>
                    <TableHead className="font-semibold text-sm p-3">
                      TEMPLATE NAME
                    </TableHead>
                    <TableHead className="font-semibold text-sm p-3">
                      DESCRIPTION
                    </TableHead>
                    <TableHead className="font-semibold text-sm p-3">
                      FMS DURATION
                    </TableHead>
                    <TableHead className="font-semibold text-sm p-3">
                      TASKS
                    </TableHead>
                    <TableHead className="font-semibold text-sm p-3">
                      CREATED BY
                    </TableHead>
                    {/* 🟢 NEW COLUMN HEADER */}
                    <TableHead className="font-semibold text-sm p-3">
                      LINKED WITH FORM
                    </TableHead>
                    <TableHead className="font-semibold text-sm p-3">
                      LAUNCHED
                    </TableHead>
                    {(canUpdate || canDelete) && (
                      <TableHead className="font-semibold text-sm p-3">
                        ACTIONS
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(fmsTemplates) && fmsTemplates.length > 0 ? (
                    fmsTemplates.map((template) => (
                      <TableRow
                        key={template.id || template._id}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <TableCell className="font-medium p-3 text-sm">
                          {template.fmsId}
                        </TableCell>
                        <TableCell className="p-3 text-sm">
                          {template.templateName}
                        </TableCell>
                        <TableCell className="p-3 text-sm">
                          {template.description}
                        </TableCell>
                        <TableCell className="p-3">
                          {getDurationBadge(template.fmsDuration)}
                        </TableCell>
                        <TableCell className="p-3 text-sm">
                          <div
                            className="flex items-center gap-2 text-gray-600 cursor-pointer"
                            onClick={() => handleOpenTasks(template._id)}
                          >
                            <ListTodo className="h-4 w-4" />
                            <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-md">
                              {template.tasks?.length || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="p-3 text-sm">
                          {template.user?.name || "—"}
                        </TableCell>

                        {/* 🟢 NEW CELL: LINKED WITH FORM BADGE */}
                        <TableCell className="p-3 text-sm">
                          <span
                            className={cn(
                              "px-2 py-0.5 text-xs rounded-md font-medium",
                              template.isLinkedWithForm
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200",
                            )}
                          >
                            {template.isLinkedWithForm ? "Yes" : "No"}
                          </span>
                        </TableCell>

                        {/* 🟢 UPDATED CELL: DYNAMIC LAUNCHED STATUS LABEL */}
                        <TableCell className="p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "px-2 py-0.5 text-xs rounded-md font-medium",
                                template.isLinkedWithForm
                                  ? "bg-blue-100 text-blue-700"
                                  : template.isLaunched
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700",
                              )}
                            >
                              {template.isLinkedWithForm
                                ? "Form Linked"
                                : template.isLaunched
                                  ? "Launched"
                                  : "Draft"}
                            </span>
                          </div>
                        </TableCell>

                        {(canUpdate || canDelete) && (
                          <TableCell className="p-3">
                            <div className="flex gap-2">
                              <div className="flex items-center gap-2">
                                {/* Eye (View) Icon — Always Visible */}
                                <Link
                                  to={`/fms-engine/view-template/${template._id}`}
                                  className="h-8 w-8 bg-green-100 text-green-600 rounded-md flex items-center justify-center hover:bg-green-200 transition-colors duration-200"
                                  title="View Template"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>

                                {/* Edit Icon — Visible to Admin */}
                                {canUpdate && role === "Admin" && (
                                  <Link
                                    to={`/fms-engine/edit-template/${template._id}`}
                                    className="h-8 w-8 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center hover:bg-blue-200 transition-colors duration-200"
                                    title="Edit Template"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                )}
                              </div>

                              {canDelete &&
                                (role === "Sr. Manager" ||
                                  role === "Admin") && (
                                  <Popconfirm
                                    title="Delete Template"
                                    description="Are you sure you want to delete this template?"
                                    onConfirm={() =>
                                      handleDeleteTemplate(template._id)
                                    }
                                    okText="Yes"
                                    cancelText="No"
                                    okButtonProps={{ danger: true }}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors duration-200"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </Popconfirm>
                                )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="hover:bg-gray-50 transition-colors duration-200">
                      <TableCell
                        colSpan={10} // Adjusted for 10 total columns
                        className="p-3 text-sm text-center text-gray-500"
                      >
                        No templates found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DataPagination
            page={page}
            limit={limit}
            total={pagination?.total || 0}
            totalPages={pagination?.pages || 1}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1); // reset page when limit changes
            }}
          />
          {/* Import Modal */}
          <Modal
            title="Import FMS Templates"
            open={importModalOpen}
            onCancel={() => {
              setImportModalOpen(false);
              setImportFile(null);
              setParsedTemplates([]);
            }}
            footer={[
              <Button
                key="cancel"
                className="me-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-none"
                onClick={() => {
                  setImportModalOpen(false);
                  setImportFile(null);
                  setParsedTemplates([]);
                }}
              >
                Cancel
              </Button>,

              <Button
                key="submit"
                loading={importLoading}
                disabled={!parsedTemplates.length}
                onClick={handleImportSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
              >
                Import Templates
              </Button>,
            ]}
            width={800}
          >
            <div className="space-y-4">
              <div>
                {/* <label className="block text-sm font-medium mb-2">
                  Upload JSON file
                </label> */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls, .json"
                  onClick={handleFileClick}
                  onChange={handleFileUpload}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
                {importFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>
              {parsedTemplates.length > 0 && (
                <div className="max-h-60 overflow-auto border rounded-md mt-3">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Template</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTemplates.map((row, index) => (
                        <tr
                          key={index}
                          className={row.error ? "bg-red-50" : "bg-green-50"}
                        >
                          <td className="p-2">{row.templateName}</td>
                          <td className="p-2">
                            {row.error ? (
                              <span className="text-red-600">{row.error}</span>
                            ) : (
                              <span className="text-green-600">Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* {parsedTemplates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preview ({parsedTemplates.length} templates)
                  </label>
                  <div className="max-h-48 overflow-auto border rounded-md p-3 bg-gray-50">
                    {parsedTemplates.slice(0, 3).map((tpl, idx) => (
                      <div
                        key={idx}
                        className="mb-2 p-2 bg-white rounded border"
                      >
                        <div className="font-medium">{tpl.templateName}</div>
                        <div className="text-sm text-gray-600">
                          {tpl.fmsDuration}
                        </div>
                      </div>
                    ))}
                    {parsedTemplates.length > 3 && (
                      <p className="text-xs text-gray-500 mt-2">
                        ... and {parsedTemplates.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )} */}
            </div>
          </Modal>

          <Modal
            title="Tasks List"
            open={isTaskModalOpen}
            onCancel={() => setIsTaskModalOpen(false)}
            footer={null}
            width={700}
          >
            {loadingTasks ? (
              <div className="flex justify-center items-center h-40">
                <Spin />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-center text-gray-500">No tasks found</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {tasks.map((task) => (
                  <div
                    key={task._id}
                    className="flex items-start gap-3 p-3 border rounded-md hover:shadow-sm transition bg-white"
                  >
                    {/* Left Accent */}
                    <div className="w-1.5 h-full bg-indigo-500 rounded-full mt-1" />

                    {/* Content */}
                    <div className="flex-1">
                      {/* Top Row */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800">
                          {task.taskId}
                        </span>

                        <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                          {task.frequency}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                        {task.description}
                      </p>

                      {/* Bottom Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {task.assignedTo?.name || "-"}
                        </div>

                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {task.departmentOfAssignToUser?.name || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        </CardContent>
      </Card>
    </div>
  );
};

export default FmsTemplates;
