import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  FilePenLine,
  Trash2,
  Download,
  UploadCloud,
  FileText,
  ListChecks,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import * as XLSX from "xlsx";
import Papa from "papaparse";

import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import api from "../../lib/api";
import { Modal, TimePicker } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDebounce } from "../../lib/debounce";
import { useSelector } from "react-redux";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

const WorkShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [paginationData, setPaginationData] = useState({});
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [editingShift, setEditingShift] = useState(null);
  const [status, setStatus] = useState("idle");
  const [loading, setLoading] = useState(false);

  // Bulk upload state
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const fetchShifts = async () => {
    setStatus("loading");
    try {
      const response = await api.post("/work-shifts/list", {
        search: debouncedSearchTerm || undefined,
        page,
        limit,
      });
      setShifts(response.data.data);
      setPaginationData(response.data.pagination);
      setStatus("succeeded");
    } catch (error) {
      toast.error("Failed to fetch work shifts.");
      setStatus("failed");
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [debouncedSearchTerm, page, limit]);
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "work_shifts",
    isSuper,
  );
  // Memoized logic for filtering and pagination
  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) =>
      shift.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [shifts, searchTerm]);

  const totalPages = paginationData ? paginationData.totalPages : 1;

  // Export shifts
  const exportShifts = async (format) => {
    const res = await api.post("/work-shifts/export", {
      search: debouncedSearchTerm || undefined,
    });
    const exportData = res.data.data || [];
    if (!exportData || exportData.length === 0) {
      toast.error("No shifts to export");
      return;
    }
    const rows = exportData.map((shift, idx) => ({
      "Sr. No.": idx + 1,
      Name: shift.name,
      "Start Time": shift.startTime,
      "End Time": shift.endTime,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WorkShifts");
    XLSX.writeFile(wb, `work_shifts_export_${Date.now()}.${format}`);
    toast.success(`Shifts exported as ${format.toUpperCase()}`);
  };

  // Import handlers
  const handleDownloadTemplate = () => {
    const headers = ["Name", "Start Time (HH:MM)", "End Time (HH:MM)"];
    const demoRow = ["Morning Shift", "09:00", "17:00"];
    const ws = XLSX.utils.aoa_to_sheet([headers, demoRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shifts Template");
    XLSX.writeFile(wb, "work_shifts_template.csv");
    toast.success("Shifts template downloaded");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setUploadFile(file);
      toast.info(`File selected: ${file.name}`);
    } else {
      toast.error("Please select a valid CSV file.");
      setUploadFile(null);
    }
  };

  const handleImport = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to import.");
      return;
    }
    setImportResult(null);
    setLoading(true);
    const promise = new Promise((resolve, reject) => {
      Papa.parse(uploadFile, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: async (results) => {
          try {
            const rows = results.data;
            const validShifts = [];
            const errorRows = [];
            const timeRegex = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/;

            for (const row of rows) {
              const name = row.Name?.trim();
              const startTime = row["Start Time (HH:MM)"]?.trim();
              const endTime = row["End Time (HH:MM)"]?.trim();

              if (!name || !startTime || !endTime) {
                errorRows.push({
                  ...row,
                  "Error Reason":
                    "Name, Start Time, and End Time are required.",
                });
                continue;
              }
              if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
                errorRows.push({
                  ...row,
                  "Error Reason": "Invalid time format. Use HH:MM.",
                });
                continue;
              }
              validShifts.push({ name, startTime, endTime });
            }

            if (validShifts.length > 0) {
              for (const shiftData of validShifts) {
                await api.post("/work-shifts", shiftData);
              }
            }
            resolve({ validCount: validShifts.length, errorRows });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err),
      });
    });

    toast.promise(promise, {
      loading: "Importing shifts...",
      success: (result) => {
        setImportResult(result);
        setLoading(false);
        fetchShifts();
        return `${result.validCount} shift(s) imported.`;
      },
      error: (err) => {
        setLoading(false);
        return `Import failed: ${err.message || "An unknown error occurred."}`;
      },
    });
  };

  const handleDownloadErrorFile = () => {
    if (
      !importResult ||
      !importResult.errorRows ||
      importResult.errorRows.length === 0
    )
      return;

    const headers = [...Object.keys(importResult.errorRows[0])];
    const ws = XLSX.utils.json_to_sheet(importResult.errorRows, {
      header: headers,
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shift Import Errors");
    XLSX.writeFile(wb, "shift_import_errors.csv");
    toast.success("Error report downloaded.");
  };

  const handleAddClick = () => {
    setEditingShift(null);
    setShiftName("");
    setStartTime("");
    setEndTime("");
    setIsAddEditDialogOpen(true);
  };

  const handleEditClick = (shift) => {
    setEditingShift(shift);
    setShiftName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setIsAddEditDialogOpen(true);
  };

  const handleSubmitShift = async () => {
    if (!shiftName.trim() || !startTime || !endTime) {
      toast.error("Please fill in all fields.");
      return;
    }

    const shiftData = { name: shiftName, startTime, endTime };

    try {
      if (editingShift) {
        await api.put(`/work-shifts/${editingShift._id}`, shiftData);
        toast.success("Work shift updated successfully!");
      } else {
        await api.post("/work-shifts", shiftData);
        toast.success("Work shift added successfully!");
      }
      fetchShifts();
      setIsAddEditDialogOpen(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to save work shift.",
      );
    }
  };

  const handleDeleteShift = async (id) => {
    Modal.confirm({
      title: "Delete Shift?",
      icon: <ExclamationCircleOutlined />,
      content: "Are you sure you want to delete this Shift?",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",

      async onOk() {
        try {
          await api.delete(`/work-shifts/${id}`);
          toast.success("Work shift deleted successfully!");
          fetchShifts();
        } catch (error) {
          console.log(error);
          toast.error(
            error.response.data.message || "Failed to delete work shift.",
          );
        }
      },
    });
  };

  return (
    <Card className="m-6 shadow-lg">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-lg font-semibold">Work Shifts</CardTitle>
          <div className="flex gap-2">
            <Dialog
              open={isAddEditDialogOpen}
              onOpenChange={setIsAddEditDialogOpen}
            >
              {canCreate && (
                <DialogTrigger asChild>
                  <Button onClick={handleAddClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Shift
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingShift ? "Edit Work Shift" : "Add Work Shift"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="items-center gap-4">
                    <Label htmlFor="name" className="text-right pb-3">
                      Shift Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="Shift Name"
                      className="col-span-3"
                      value={shiftName}
                      onChange={(e) => setShiftName(e.target.value)}
                    />
                  </div>
                  <div className="items-center gap-4">
                    <Label htmlFor="startTime" className="text-right pb-3">
                      Start Time
                    </Label>
                    <TimePicker
                      className="col-span-3 w-full h-10"
                      format="HH:mm"
                      value={startTime ? dayjs(startTime, "HH:mm") : null}
                      onChange={(time, timeString) => setStartTime(timeString)}
                      getPopupContainer={(trigger) => trigger.parentNode}
                    />
                    {/* <Input
                      id="startTime"
                      type="time"
                      className="col-span-3"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    /> */}
                  </div>
                  <div className="items-center gap-4">
                    <Label htmlFor="endTime" className="text-right pb-3">
                      End Time
                    </Label>
                    <TimePicker
                      className="col-span-3 w-full h-10"
                      format="HH:mm"
                      value={endTime ? dayjs(endTime, "HH:mm") : null}
                      onChange={(time, timeString) => setEndTime(timeString)}
                      getPopupContainer={(trigger) => trigger.parentNode}
                    />
                    {/* <Input
                      id="endTime"
                      type="time"
                      className="col-span-3"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    /> */}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleSubmitShift}
                    disabled={status === "loading"}
                    className="cursor-pointer"
                  >
                    {status === "loading" ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportShifts("csv")}>
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportShifts("xlsx")}>
                  XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canCreate && (
              <Button
                variant="outline"
                onClick={() => setIsBulkUploadOpen(true)}
              >
                <UploadCloud className="mr-2 h-4 w-4" /> Bulk Upload
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <Input
            placeholder="Search by shift name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="overflow-x-auto">
          {status === "loading" && shifts.length === 0 ? (
            <p>Loading shifts...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">SHIFT NAME</TableHead>
                  <TableHead>START TIME</TableHead>
                  <TableHead>END TIME</TableHead>
                  {(canDelete || canUpdate) && (
                    <TableHead className="text-right">ACTIONS</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(shifts) && shifts.length > 0 ? (
                  shifts.map((shift) => (
                    <TableRow key={shift._id}>
                      <TableCell className="font-medium">
                        {shift.name}
                      </TableCell>
                      <TableCell>{shift.startTime}</TableCell>
                      <TableCell>{shift.endTime}</TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(shift)}
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteShift(shift._id)}
                              className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No work shifts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
      {shifts.length > 0 && (
        <CardFooter className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
              disabled={status === "loading"}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || status === "loading"}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-700 font-medium">
              Page <span className="font-bold">{page}</span> of{" "}
              <span className="font-bold">{totalPages || 1}</span>
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || status === "loading"}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      )}

      {/* --- Bulk Upload Dialog --- */}
      <Dialog
        open={isBulkUploadOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setUploadFile(null);
            setImportResult(null);
          }
          setIsBulkUploadOpen(isOpen);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-blue-600" />
              Bulk Import Work Shifts
            </DialogTitle>
          </DialogHeader>
          {!importResult ? (
            <div className="grid grid-cols-1 gap-6 py-4">
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-gray-500" />
                  Required Columns
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Name</code>{" "}
                    (Text)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Start Time (HH:MM)
                    </code>{" "}
                    (24-hour format)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      End Time (HH:MM)
                    </code>{" "}
                    (24-hour format)
                  </li>
                </ul>
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <label
                  htmlFor="shift-file-upload"
                  className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                >
                  <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm font-semibold text-blue-600">
                    Click to upload
                  </span>
                  <p className="text-xs text-gray-500 mt-2">CSV files only</p>
                  <Input
                    id="shift-file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                </label>
                {uploadFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Selected: {uploadFile.name}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <h3 className="text-lg font-semibold mb-4">Import Complete</h3>
              <div className="flex justify-center gap-8">
                <div className="text-green-600">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {importResult.validCount}
                  </p>
                  <p>Shifts Imported</p>
                </div>
                <div className="text-red-600">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {importResult.errorRows.length}
                  </p>
                  <p>Rows with Errors</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {importResult ? (
              <>
                {importResult.errorRows.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleDownloadErrorFile}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                )}
                <Button onClick={() => setIsBulkUploadOpen(false)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsBulkUploadOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!uploadFile || loading}
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {loading ? "Importing..." : "Import Shifts"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WorkShifts;
