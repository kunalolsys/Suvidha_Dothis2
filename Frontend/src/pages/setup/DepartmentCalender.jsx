import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  Globe,
  Building2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

import * as XLSX from "xlsx";
import Papa from "papaparse";

import {
  fetchDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  exportDepts,
} from "../../redux/slices/department/departmentSlice";
import {
  fetchHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  exportHolidaysRecord,
} from "../../redux/slices/holiday/holidaySlice";
import {
  fetchWorkingWeek,
  updateWorkingWeek,
} from "../../redux/slices/workingWeek/workingWeekSlice";
import {
  fetchScheduleHolidayTask,
  upsertScheduleHolidayTask,
} from "../../redux/slices/scheduleHolidayTask/scheduleHolidayTaskSlice";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
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
import { Badge } from "../../components/ui/badge";
import { useDebounce } from "../../lib/debounce";
import { Modal } from "antd";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

const initialWeekConfig = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

const DepartmentCalender = () => {
  const dispatch = useDispatch();

  // Redux Selectors
  const {
    departments,
    pagination: departmentPagination,
    status: deptStatus,
    error: deptError,
  } = useSelector((state) => state.departments);

  const {
    holidays,
    pagination: holidayPagination,
    status: holidayStatus,
    error: holidayError,
  } = useSelector((state) => state.holidays);

  const {
    workingWeek: reduxWorkingWeek,
    status: workingWeekStatus,
    error: workingWeekError,
  } = useSelector((state) => state.workingWeek) || {};

  const {
    task: scheduleHolidayTask,
    status: scheduleHolidayTaskStatus,
    error: scheduleHolidayTaskError,
  } = useSelector((state) => state.scheduleHolidayTask);

  // Form States
  const [workingWeek, setWorkingWeek] = useState(initialWeekConfig);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [deptWorkingWeek, setDeptWorkingWeek] = useState(initialWeekConfig);
  const [useCustomDeptWeek, setUseCustomDeptWeek] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  // Holiday Form States
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");
  const [isGlobalHoliday, setIsGlobalHoliday] = useState(true);
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [editingHoliday, setEditingHoliday] = useState(null);

  const [loading, setLoading] = useState(false);
  const [holidayAction, setHolidayAction] = useState("AFTER");

  // Bulk Upload States
  const [isDeptBulkUploadOpen, setIsDeptBulkUploadOpen] = useState(false);
  const [deptUploadFile, setDeptUploadFile] = useState(null);
  const [deptImportResult, setDeptImportResult] = useState(null);

  const [isHolidayBulkUploadOpen, setIsHolidayBulkUploadOpen] = useState(false);
  const [holidayUploadFile, setHolidayUploadFile] = useState(null);
  const [holidayImportResult, setHolidayImportResult] = useState(null);

  // Search and Pagination
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
  const [departmentPage, setDepartmentPage] = useState(1);
  const [departmentLimit, setDepartmentLimit] = useState(5);

  const [holidaySearchTerm, setHolidaySearchTerm] = useState("");
  const [holidayPage, setHolidayPage] = useState(1);
  const [holidayLimit, setHolidayLimit] = useState(5);

  const debouncedDepartmentSearchTerm = useDebounce(departmentSearchTerm, 500);
  const debouncedHolidaySearchTerm = useDebounce(holidaySearchTerm, 500);
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "departments_calendar",
    isSuper,
  );
  // Fetch Data
  useEffect(() => {
    dispatch(
      fetchDepartments({
        departmentPage,
        departmentLimit,
        departmentSearchTerm: debouncedDepartmentSearchTerm,
      }),
    );
  }, [departmentPage, departmentLimit, debouncedDepartmentSearchTerm]);

  useEffect(() => {
    dispatch(
      fetchHolidays({
        holidayPage,
        holidayLimit,
        holidaySearchTerm: debouncedHolidaySearchTerm,
      }),
    );
  }, [holidayPage, holidayLimit, debouncedHolidaySearchTerm]);

  useEffect(() => {
    dispatch(fetchScheduleHolidayTask());
    dispatch(fetchWorkingWeek());
  }, []);

  useEffect(() => {
    if (reduxWorkingWeek && reduxWorkingWeek.workingDays) {
      setWorkingWeek(reduxWorkingWeek.workingDays);
    }
  }, [reduxWorkingWeek]);

  useEffect(() => {
    if (scheduleHolidayTask && scheduleHolidayTask.holidayAction) {
      setHolidayAction(scheduleHolidayTask.holidayAction);
    }
  }, [scheduleHolidayTask]);

  useEffect(() => {
    if (deptStatus === "failed")
      toast.error(deptError || "Failed to load departments.");
    if (holidayStatus === "failed")
      toast.error(holidayError || "Failed to load holidays.");
    if (workingWeekStatus === "failed")
      toast.error(
        workingWeekError || "Failed to load working week configuration.",
      );
    if (scheduleHolidayTaskStatus === "failed")
      toast.error(
        scheduleHolidayTaskError || "Failed to load schedule holiday task.",
      );
  }, [
    deptStatus,
    deptError,
    holidayStatus,
    holidayError,
    workingWeekStatus,
    workingWeekError,
    scheduleHolidayTaskStatus,
    scheduleHolidayTaskError,
  ]);

  const totalDepartmentPages = departmentPagination?.totalPages || 1;
  const totalHolidayPages = holidayPagination?.totalPages || 1;

  const formatDate2_0 = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // ── EXPORT HANDLERS ──────────────────────────────────────────────────────
  const exportDepartments = async (format) => {
    const exportData = await dispatch(
      exportDepts({ departmentSearchTerm: debouncedDepartmentSearchTerm }),
    ).unwrap();
    if (!exportData || exportData.length === 0) {
      toast.error("No departments to export");
      return;
    }
    const rows = exportData.map((dept, idx) => ({
      "Sr. No.": idx + 1,
      Name: dept.name,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departments");
    XLSX.writeFile(wb, `departments_export_${Date.now()}.${format}`);
    toast.success(`Departments exported as ${format.toUpperCase()}`);
  };

  const exportHolidays = async (format) => {
    const exportData = await dispatch(
      exportHolidaysRecord({ holidaySearchTerm: debouncedHolidaySearchTerm }),
    ).unwrap();
    if (!exportData || exportData.length === 0) {
      toast.error("No holidays to export");
      return;
    }
    const rows = exportData.map((holiday, idx) => ({
      "Sr. No.": idx + 1,
      Date: formatDate2_0(holiday.date),
      "Holiday Name": holiday.name,
      Description: holiday.description || "-",
      Type: holiday.isGlobal ? "Global" : "Departmental",
      Departments: holiday.isGlobal
        ? "All"
        : holiday.applicableDepartments?.map((d) => d.name || d).join(", ") ||
          "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Holidays");
    XLSX.writeFile(wb, `holidays_export_${Date.now()}.${format}`);
    toast.success(`Holidays exported as ${format.toUpperCase()}`);
  };

  // ── DEPARTMENT BULK IMPORT (UPDATED FOR NEW SCHEMA) ─────────────────────
  const handleDownloadDeptTemplate = () => {
    const headers = [
      "Name",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const demoRow1 = [
      "Human Resources",
      "TRUE",
      "TRUE",
      "TRUE",
      "TRUE",
      "TRUE",
      "FALSE",
      "FALSE",
    ];
    const demoRow2 = [
      "Operations",
      "TRUE",
      "TRUE",
      "TRUE",
      "TRUE",
      "TRUE",
      "TRUE",
      "FALSE",
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, demoRow1, demoRow2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departments Template");
    XLSX.writeFile(wb, "department_upload_template.csv");
    toast.success("Department template downloaded");
  };

  const handleDeptFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setDeptUploadFile(file);
      toast.info(`File selected: ${file.name}`);
    } else {
      toast.error("Please select a valid CSV file.");
      setDeptUploadFile(null);
    }
  };

  const parseBooleanVal = (val, defaultVal = true) => {
    if (val === undefined || val === null || val === "") return defaultVal;
    const str = String(val).trim().toLowerCase();
    if (str === "true" || str === "1" || str === "yes") return true;
    if (str === "false" || str === "0" || str === "no") return false;
    return defaultVal;
  };

  const handleDeptImport = async () => {
    if (!deptUploadFile) {
      toast.error("Please select a file to import.");
      return;
    }
    setDeptImportResult(null);
    setLoading(true);

    const promise = new Promise((resolve, reject) => {
      Papa.parse(deptUploadFile, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: async (results) => {
          try {
            const rows = results.data;
            const validDepts = [];
            const errorRows = [];
            const existingDeptNames = new Set(
              departments.map((d) => d.name.toLowerCase()),
            );

            for (const row of rows) {
              const keys = Object.keys(row);
              const nameKey = keys.find((k) => k.toLowerCase() === "name");
              const deptName = row[nameKey]?.toString().trim();

              if (!deptName) {
                errorRows.push({
                  ...row,
                  "Error Reason": "Department name is missing.",
                });
                continue;
              }

              if (existingDeptNames.has(deptName.toLowerCase())) {
                errorRows.push({
                  ...row,
                  "Error Reason": `Department '${deptName}' already exists.`,
                });
                continue;
              }

              // Extract custom working week days if present in CSV columns
              const hasCustomWeekColumns = keys.some((k) =>
                [
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ].includes(k.toLowerCase()),
              );

              let workingWeekDays = null;

              if (hasCustomWeekColumns) {
                const monKey = keys.find((k) => k.toLowerCase() === "monday");
                const tueKey = keys.find((k) => k.toLowerCase() === "tuesday");
                const wedKey = keys.find(
                  (k) => k.toLowerCase() === "wednesday",
                );
                const thuKey = keys.find((k) => k.toLowerCase() === "thursday");
                const friKey = keys.find((k) => k.toLowerCase() === "friday");
                const satKey = keys.find((k) => k.toLowerCase() === "saturday");
                const sunKey = keys.find((k) => k.toLowerCase() === "sunday");

                workingWeekDays = {
                  monday: parseBooleanVal(row[monKey], true),
                  tuesday: parseBooleanVal(row[tueKey], true),
                  wednesday: parseBooleanVal(row[wedKey], true),
                  thursday: parseBooleanVal(row[thuKey], true),
                  friday: parseBooleanVal(row[friKey], true),
                  saturday: parseBooleanVal(row[satKey], false),
                  sunday: parseBooleanVal(row[sunKey], false),
                };
              }

              validDepts.push({
                name: deptName,
                ...(workingWeekDays ? { workingWeekDays } : {}),
              });

              existingDeptNames.add(deptName.toLowerCase());
            }

            if (validDepts.length > 0) {
              for (const deptData of validDepts) {
                await dispatch(addDepartment(deptData)).unwrap();
              }
            }

            await dispatch(
              fetchDepartments({
                departmentPage,
                departmentLimit,
                departmentSearchTerm: debouncedDepartmentSearchTerm,
              }),
            );

            resolve({ validCount: validDepts.length, errorRows });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err),
      });
    });

    toast.promise(promise, {
      loading: "Importing departments...",
      success: (result) => {
        setDeptImportResult(result);
        setLoading(false);
        dispatch(
          fetchDepartments({
            departmentPage,
            departmentLimit,
            departmentSearchTerm: debouncedDepartmentSearchTerm,
          }),
        );
        return `${result.validCount} department(s) imported.`;
      },
      error: (err) => {
        setLoading(false);
        return `Import failed: ${err.message || "An unknown error occurred."}`;
      },
    });
  };

  const handleDownloadDeptErrorFile = () => {
    if (!deptImportResult?.errorRows?.length) return;
    const headers = [...Object.keys(deptImportResult.errorRows[0])];
    const ws = XLSX.utils.json_to_sheet(deptImportResult.errorRows, {
      header: headers,
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Department Import Errors");
    XLSX.writeFile(wb, "department_import_errors.csv");
    toast.success("Error report downloaded.");
  };

  // ── HOLIDAY BULK IMPORT (WITH DEPARTMENT NAME MATCHING) ──────────────────
  const handleDownloadHolidayTemplate = () => {
    const headers = [
      "Date (DD-MM-YYYY or DD/MM/YYYY)",
      "Holiday Name",
      "Department",
      "Description",
    ];
    const demoRow1 = [
      "01-01-2027",
      "New Year's Day",
      "Global",
      "First day of the year",
    ];
    const demoRow2 = [
      "15-08-2027",
      "Department Foundation Day",
      "Human Resources",
      "Department Special Off",
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, demoRow1, demoRow2]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Holidays Template");
    XLSX.writeFile(wb, "holiday_upload_template.csv");
    toast.success("Holiday template downloaded");
  };

  const handleHolidayFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setHolidayUploadFile(file);
      toast.info(`File selected: ${file.name}`);
    } else {
      toast.error("Please select a valid CSV file.");
      setHolidayUploadFile(null);
    }
  };

  const handleHolidayImport = async () => {
    if (!holidayUploadFile) {
      toast.error("Please select a file to import.");
      return;
    }
    setHolidayImportResult(null);
    setLoading(true);

    // Map department name to MongoDB _id lookup map
    const deptNameToIdMap = new Map(
      departments.map((d) => [d.name.toLowerCase().trim(), d._id]),
    );

    const promise = new Promise((resolve, reject) => {
      Papa.parse(holidayUploadFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: async (results) => {
          try {
            const rows = results.data;
            if (rows.length === 0) {
              return resolve({ validCount: 0, errorRows: [] });
            }

            const parsedHeaders = Object.keys(rows[0]);
            const nameHeader = parsedHeaders.find((h) =>
              h.toLowerCase().includes("holiday name"),
            );
            const dateHeader = parsedHeaders.find((h) =>
              h.toLowerCase().includes("date"),
            );
            const deptHeader = parsedHeaders.find((h) =>
              h.toLowerCase().includes("department"),
            );
            const descHeader = parsedHeaders.find((h) =>
              h.toLowerCase().includes("description"),
            );

            const validHolidays = [];
            const errorRows = [];

            for (const row of rows) {
              const holidayNameStr = row[nameHeader]?.toString().trim();
              const holidayDateStr = row[dateHeader]?.toString().trim();
              const deptNameStr = row[deptHeader]?.toString().trim();

              if (!holidayNameStr || !holidayDateStr) {
                errorRows.push({
                  ...row,
                  "Error Reason": "Holiday Name and Date are required.",
                });
                continue;
              }

              // Parse DD-MM-YYYY or DD/MM/YYYY into YYYY-MM-DD
              const parts = holidayDateStr.split(/[-/]/);
              if (parts.length !== 3) {
                errorRows.push({
                  ...row,
                  "Error Reason": `Invalid date format: ${holidayDateStr}. Use DD-MM-YYYY or DD/MM/YYYY.`,
                });
                continue;
              }

              let day = parts[0].padStart(2, "0");
              let month = parts[1].padStart(2, "0");
              let year = parts[2];
              if (year.length === 2) year = `20${year}`;

              const isoDate = `${year}-${month}-${day}`;
              if (isNaN(new Date(isoDate).getTime())) {
                errorRows.push({
                  ...row,
                  "Error Reason": `Invalid date: ${holidayDateStr}.`,
                });
                continue;
              }

              // Handle Global vs Departmental linking based on CSV column
              let isGlobal = true;
              let applicableDepartments = [];

              if (
                deptNameStr &&
                deptNameStr.toLowerCase() !== "global" &&
                deptNameStr.toLowerCase() !== "all"
              ) {
                // Split comma-separated department names if user enters multiple
                const rawDeptNames = deptNameStr.split(",");
                const matchedIds = [];
                const unmatchedNames = [];

                for (const dName of rawDeptNames) {
                  const cleanDName = dName.toLowerCase().trim();
                  if (deptNameToIdMap.has(cleanDName)) {
                    matchedIds.push(deptNameToIdMap.get(cleanDName));
                  } else {
                    unmatchedNames.push(dName.trim());
                  }
                }

                if (unmatchedNames.length > 0) {
                  errorRows.push({
                    ...row,
                    "Error Reason": `Department(s) not found in system: ${unmatchedNames.join(
                      ", ",
                    )}`,
                  });
                  continue;
                }

                isGlobal = false;
                applicableDepartments = matchedIds;
              }

              validHolidays.push({
                name: holidayNameStr,
                date: isoDate,
                description: row[descHeader]?.toString().trim() || "",
                isGlobal,
                applicableDepartments,
              });
            }

            if (validHolidays.length > 0) {
              for (const holidayData of validHolidays) {
                await dispatch(createHoliday(holidayData)).unwrap();
              }
            }
            resolve({ validCount: validHolidays.length, errorRows });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err),
      });
    });

    toast.promise(promise, {
      loading: "Importing holidays...",
      success: (result) => {
        setHolidayImportResult(result);
        setLoading(false);
        dispatch(
          fetchHolidays({
            holidayPage,
            holidayLimit,
            holidaySearchTerm: debouncedHolidaySearchTerm,
          }),
        );
        return `${result.validCount} holiday(s) imported.`;
      },
      error: (err) => {
        setLoading(false);
        return `Import failed: ${err.message || "An unknown error occurred."}`;
      },
    });
  };

  const handleDownloadHolidayErrorFile = () => {
    if (!holidayImportResult?.errorRows?.length) return;
    const headers = [...Object.keys(holidayImportResult.errorRows[0])];
    const ws = XLSX.utils.json_to_sheet(holidayImportResult.errorRows, {
      header: headers,
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Holiday Import Errors");
    XLSX.writeFile(wb, "holiday_import_errors.csv");
    toast.success("Error report downloaded.");
  };

  // ── DEPARTMENT CRUD HANDLERS ─────────────────────────────────────────────
  const handleAddClick = () => {
    setEditingDepartment(null);
    setDepartmentName("");
    setDeptWorkingWeek(workingWeek);
    setUseCustomDeptWeek(false);
    setIsAddEditDialogOpen(true);
  };

  const handleEditClick = (department) => {
    setEditingDepartment(department);
    setDepartmentName(department.name);
    if (department.workingWeekDays) {
      setDeptWorkingWeek(department.workingWeekDays);
      setUseCustomDeptWeek(true);
    } else {
      setDeptWorkingWeek(workingWeek);
      setUseCustomDeptWeek(false);
    }
    setIsAddEditDialogOpen(true);
  };

  const handleSubmitDepartment = async () => {
    if (departmentName.trim() === "") {
      toast.error("Department name cannot be empty.");
      return;
    }

    const payload = {
      name: departmentName,
      workingWeekDays: useCustomDeptWeek ? deptWorkingWeek : null,
    };

    try {
      if (editingDepartment) {
        await dispatch(
          updateDepartment({ _id: editingDepartment._id, ...payload }),
        ).unwrap();
        toast.success("Department updated successfully!");
      } else {
        await dispatch(addDepartment(payload)).unwrap();
        toast.success("Department added successfully!");
      }
      dispatch(
        fetchDepartments({
          departmentPage,
          departmentLimit,
          departmentSearchTerm: debouncedDepartmentSearchTerm,
        }),
      );
      setDepartmentName("");
      setEditingDepartment(null);
      setIsAddEditDialogOpen(false);
    } catch (err) {
      toast.error(err || "Failed to save department.");
    }
  };

  const handleDeleteDepartment = (id) => {
    Modal.confirm({
      title: "Delete Department",
      content: "Are you sure you want to delete this department?",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        try {
          await dispatch(deleteDepartment(id)).unwrap();
          dispatch(
            fetchDepartments({
              departmentPage,
              departmentLimit,
              departmentSearchTerm: debouncedDepartmentSearchTerm,
            }),
          );
          toast.success("Department deleted successfully!");
        } catch (err) {
          toast.error(err || "Failed to delete department.");
        }
      },
    });
  };

  // ── HOLIDAY CRUD HANDLERS ────────────────────────────────────────────────
  const handleAddHolidayClick = () => {
    setEditingHoliday(null);
    setHolidayName("");
    setHolidayDate("");
    setHolidayDescription("");
    setIsGlobalHoliday(true);
    setSelectedDeptIds([]);
    setIsHolidayDialogOpen(true);
  };

  const handleEditHolidayClick = (holiday) => {
    setEditingHoliday(holiday);
    setHolidayName(holiday.name);
    setHolidayDate(new Date(holiday.date).toISOString().split("T")[0]);
    setHolidayDescription(holiday.description || "");
    setIsGlobalHoliday(holiday.isGlobal ?? true);
    setSelectedDeptIds(
      holiday.applicableDepartments?.map((d) => d._id || d) || [],
    );
    setIsHolidayDialogOpen(true);
  };

  const toggleDeptSelection = (deptId) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId],
    );
  };

  const handleSubmitHoliday = async () => {
    if (holidayName.trim() === "") {
      toast.error("Holiday name cannot be empty.");
      return;
    }
    if (!holidayDate) {
      toast.error("Holiday date is required.");
      return;
    }

    if (!isGlobalHoliday && selectedDeptIds.length === 0) {
      toast.error(
        "Please select at least one department for a departmental holiday.",
      );
      return;
    }

    try {
      const holidayData = {
        name: holidayName,
        date: holidayDate,
        description: holidayDescription,
        isGlobal: isGlobalHoliday,
        applicableDepartments: isGlobalHoliday ? [] : selectedDeptIds,
      };

      if (editingHoliday) {
        await dispatch(
          updateHoliday({ id: editingHoliday._id, holidayData }),
        ).unwrap();
        toast.success("Holiday updated successfully!");
      } else {
        await dispatch(createHoliday(holidayData)).unwrap();
        toast.success("Holiday added successfully!");
      }

      dispatch(
        fetchHolidays({
          holidayPage,
          holidayLimit,
          holidaySearchTerm: debouncedHolidaySearchTerm,
        }),
      );
      setHolidayName("");
      setHolidayDate("");
      setHolidayDescription("");
      setEditingHoliday(null);
      setIsHolidayDialogOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to save holiday.");
    }
  };

  const handleDeleteHoliday = (id) => {
    Modal.confirm({
      title: "Delete Holiday",
      content: "Are you sure you want to delete this holiday?",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        try {
          await dispatch(deleteHoliday(id)).unwrap();
          dispatch(
            fetchHolidays({
              holidayPage,
              holidayLimit,
              holidaySearchTerm: debouncedHolidaySearchTerm,
            }),
          );
          toast.success("Holiday deleted successfully!");
        } catch (err) {
          toast.error(err?.message || "Failed to delete holiday.");
        }
      },
    });
  };

  // ── WORKING WEEK & SCHEDULE TASK ─────────────────────────────────────────
  const handleWeekChange = (day) => {
    setWorkingWeek((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const handleSubmitWorkingWeek = async () => {
    try {
      await dispatch(updateWorkingWeek({ workingDays: workingWeek })).unwrap();
      toast.success("Working week updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update working week.");
    }
  };

  const handleSaveScheduleHolidayTask = async () => {
    try {
      await dispatch(upsertScheduleHolidayTask({ holidayAction })).unwrap();
      toast.success("Schedule holiday task updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update schedule holiday task.");
    }
  };

  return (
    <div className="space-y-6 m-6">
      {/* ── CARD 1: DEPARTMENTS ────────────────────────────────────────────── */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg font-semibold">Departments</CardTitle>
            <div className="flex gap-2">
              <Dialog
                open={isAddEditDialogOpen}
                onOpenChange={setIsAddEditDialogOpen}
              >
                {canCreate && (
                  <DialogTrigger asChild>
                    <Button onClick={handleAddClick}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Department
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDepartment ? "Edit Department" : "Add Department"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="items-center gap-4">
                      <Label htmlFor="name" className="text-right pb-3">
                        Department Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="Department Name"
                        className="col-span-3"
                        value={departmentName}
                        onChange={(e) => setDepartmentName(e.target.value)}
                      />
                    </div>

                    {/* Department Custom Working Week Settings */}
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="custom-dept-week"
                          checked={useCustomDeptWeek}
                          onCheckedChange={(checked) =>
                            setUseCustomDeptWeek(Boolean(checked))
                          }
                        />
                        <Label
                          htmlFor="custom-dept-week"
                          className="font-semibold text-xs cursor-pointer"
                        >
                          Enable Custom Working Days for this Department
                        </Label>
                      </div>

                      {useCustomDeptWeek && (
                        <div className="p-3 border rounded-lg bg-gray-50 grid grid-cols-2 gap-2 mt-2">
                          {Object.keys(deptWorkingWeek).map((day) => (
                            <div
                              key={day}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`dept-day-${day}`}
                                checked={deptWorkingWeek[day]}
                                onCheckedChange={() =>
                                  setDeptWorkingWeek((prev) => ({
                                    ...prev,
                                    [day]: !prev[day],
                                  }))
                                }
                              />
                              <Label
                                htmlFor={`dept-day-${day}`}
                                className="capitalize text-xs cursor-pointer"
                              >
                                {day}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSubmitDepartment}
                      disabled={deptStatus === "loading"}
                      className="cursor-pointer"
                    >
                      {deptStatus === "loading" ? "Saving..." : "Save"}
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
                  <DropdownMenuItem onClick={() => exportDepartments("csv")}>
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportDepartments("xlsx")}>
                    XLSX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {canCreate && (
                <Button
                  variant="outline"
                  onClick={() => setIsDeptBulkUploadOpen(true)}
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
              placeholder="Search by department name..."
              value={departmentSearchTerm}
              onChange={(e) => setDepartmentSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
          {deptStatus === "loading" && departments.length === 0 ? (
            <p>Loading departments...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DEPARTMENT</TableHead>
                  <TableHead>SCHEDULE TYPE</TableHead>
                  {(canUpdate || canDelete) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept._id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>
                      {dept.workingWeekDays ? (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                          <Settings2 className="w-3 h-3 mr-1" /> Custom Schedule
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">
                          Global Default
                        </Badge>
                      )}
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(dept)}
                          >
                            <FilePenLine className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDepartment(dept._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {departments.length > 0 && (
          <CardFooter className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={departmentLimit}
                onChange={(e) => {
                  setDepartmentLimit(Number(e.target.value));
                  setDepartmentPage(1);
                }}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                disabled={deptStatus === "loading"}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setDepartmentPage((p) => Math.max(1, p - 1))}
                disabled={departmentPage === 1 || deptStatus === "loading"}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700 font-medium">
                Page <span className="font-bold">{departmentPage}</span> of{" "}
                <span className="font-bold">{totalDepartmentPages || 1}</span>
              </span>
              <Button
                onClick={() =>
                  setDepartmentPage((p) =>
                    Math.min(totalDepartmentPages, p + 1),
                  )
                }
                disabled={
                  departmentPage === totalDepartmentPages ||
                  deptStatus === "loading"
                }
                variant="outline"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* ── CARD 2: HOLIDAYS WITH DEPARTMENT LINKING ─────────────────────── */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg font-semibold">Holidays</CardTitle>
            <div className="flex gap-2">
              <Dialog
                open={isHolidayDialogOpen}
                onOpenChange={setIsHolidayDialogOpen}
              >
                {canCreate && (
                  <DialogTrigger asChild>
                    <Button onClick={handleAddHolidayClick}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Holiday
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingHoliday ? "Edit Holiday" : "Add Holiday"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="items-center gap-4">
                      <Label htmlFor="holiday-name" className="text-right pb-3">
                        Holiday Name
                      </Label>
                      <Input
                        id="holiday-name"
                        placeholder="Holiday Name"
                        className="col-span-3"
                        value={holidayName}
                        onChange={(e) => setHolidayName(e.target.value)}
                      />
                    </div>
                    <div className="items-center gap-4">
                      <Label htmlFor="holiday-date" className="text-right pb-3">
                        Date
                      </Label>
                      <Input
                        id="holiday-date"
                        type="date"
                        className="col-span-3"
                        value={holidayDate}
                        onChange={(e) => setHolidayDate(e.target.value)}
                      />
                    </div>

                    {/* Scope & Department Linking */}
                    <div className="space-y-3 border-t pt-3">
                      <Label className="font-semibold text-xs text-gray-700">
                        Holiday Scope
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is-global"
                          checked={isGlobalHoliday}
                          onCheckedChange={(checked) =>
                            setIsGlobalHoliday(Boolean(checked))
                          }
                        />
                        <Label
                          htmlFor="is-global"
                          className="text-xs cursor-pointer"
                        >
                          Apply to ALL Departments (Global)
                        </Label>
                      </div>

                      {!isGlobalHoliday && (
                        <div className="space-y-2 pl-4 pt-2 border-l-2 border-blue-500">
                          <Label className="text-xs text-gray-600">
                            Select Applicable Departments:
                          </Label>
                          <div className="max-h-36 overflow-y-auto space-y-2 border p-2 rounded bg-white">
                            {departments.map((dept) => (
                              <div
                                key={dept._id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`link-dept-${dept._id}`}
                                  checked={selectedDeptIds.includes(dept._id)}
                                  onCheckedChange={() =>
                                    toggleDeptSelection(dept._id)
                                  }
                                />
                                <Label
                                  htmlFor={`link-dept-${dept._id}`}
                                  className="text-xs cursor-pointer"
                                >
                                  {dept.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="items-center gap-4">
                      <Label
                        htmlFor="holiday-description"
                        className="text-right pb-3"
                      >
                        Description (Optional)
                      </Label>
                      <Input
                        id="holiday-description"
                        placeholder="Description"
                        className="col-span-3"
                        value={holidayDescription}
                        onChange={(e) => setHolidayDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSubmitHoliday}
                      disabled={holidayStatus === "loading"}
                      className="cursor-pointer"
                    >
                      {holidayStatus === "loading" ? "Saving..." : "Save"}
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
                  <DropdownMenuItem onClick={() => exportHolidays("csv")}>
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportHolidays("xlsx")}>
                    XLSX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {canCreate && (
                <Button
                  variant="outline"
                  onClick={() => setIsHolidayBulkUploadOpen(true)}
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
              placeholder="Search by holiday name..."
              value={holidaySearchTerm}
              onChange={(e) => setHolidaySearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
          {holidayStatus === "loading" && holidays.length === 0 ? (
            <p>Loading holidays...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DATE</TableHead>
                  <TableHead>HOLIDAY NAME</TableHead>
                  <TableHead>SCOPE</TableHead>
                  <TableHead>APPLICABLE DEPARTMENTS</TableHead>
                  <TableHead>DESCRIPTION</TableHead>
                  {(canUpdate || canDelete) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(holidays) && holidays.length > 0 ? (
                  holidays.map((holiday) => (
                    <TableRow key={holiday._id}>
                      <TableCell>{formatDate2_0(holiday.date)}</TableCell>
                      <TableCell className="font-medium">
                        {holiday.name}
                      </TableCell>
                      <TableCell>
                        {holiday.isGlobal ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Globe className="w-3 h-3 mr-1" /> Global
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            <Building2 className="w-3 h-3 mr-1" /> Departmental
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {holiday.isGlobal ? (
                          <span className="text-xs text-gray-500">
                            All Departments
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {holiday.applicableDepartments?.map((dept) => (
                              <Badge
                                key={dept._id || dept}
                                variant="outline"
                                className="text-xs"
                              >
                                {dept.name || "Dept"}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{holiday.description || "-"}</TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell className="text-right">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditHolidayClick(holiday)}
                            >
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteHoliday(holiday._id)}
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
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground font-medium"
                    >
                      No holidays found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {holidays.length > 0 && (
          <CardFooter className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={holidayLimit}
                onChange={(e) => {
                  setHolidayLimit(Number(e.target.value));
                  setHolidayPage(1);
                }}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                disabled={holidayStatus === "loading"}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setHolidayPage((p) => Math.max(1, p - 1))}
                disabled={holidayPage === 1 || holidayStatus === "loading"}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700 font-medium">
                Page <span className="font-bold">{holidayPage}</span> of{" "}
                <span className="font-bold">{totalHolidayPages || 1}</span>
              </span>
              <Button
                onClick={() =>
                  setHolidayPage((p) => Math.min(totalHolidayPages, p + 1))
                }
                disabled={
                  holidayPage === totalHolidayPages ||
                  holidayStatus === "loading"
                }
                variant="outline"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* ── DEPARTMENT BULK UPLOAD DIALOG ─────────────────────────────────── */}
      <Dialog
        open={isDeptBulkUploadOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeptUploadFile(null);
            setDeptImportResult(null);
          }
          setIsDeptBulkUploadOpen(isOpen);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-blue-600" />
              Bulk Import Departments
            </DialogTitle>
          </DialogHeader>
          {!deptImportResult ? (
            <div className="grid grid-cols-1 gap-6 py-4">
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-gray-500" />
                  Required & Optional Columns
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Name</code>{" "}
                    (Required, must be unique)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Monday, Tuesday... Sunday
                    </code>{" "}
                    (Optional — set TRUE/FALSE for custom working week days)
                  </li>
                </ul>
                <Button
                  variant="outline"
                  onClick={handleDownloadDeptTemplate}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <label
                  htmlFor="dept-file-upload"
                  className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                >
                  <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm font-semibold text-blue-600">
                    Click to upload
                  </span>
                  <p className="text-xs text-gray-500 mt-2">CSV files only</p>
                  <Input
                    id="dept-file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleDeptFileChange}
                  />
                </label>
                {deptUploadFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Selected: {deptUploadFile.name}
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
                    {deptImportResult.validCount}
                  </p>
                  <p>Departments Imported</p>
                </div>
                <div className="text-red-600">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {deptImportResult.errorRows.length}
                  </p>
                  <p>Rows with Errors</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {deptImportResult ? (
              <>
                {deptImportResult.errorRows.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleDownloadDeptErrorFile}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                )}
                <Button onClick={() => setIsDeptBulkUploadOpen(false)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsDeptBulkUploadOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeptImport}
                  disabled={!deptUploadFile || loading}
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {loading ? "Importing..." : "Import Departments"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── HOLIDAY BULK UPLOAD DIALOG (SUPPORTING DEPARTMENT FIELD) ─────── */}
      <Dialog
        open={isHolidayBulkUploadOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setHolidayUploadFile(null);
            setHolidayImportResult(null);
          }
          setIsHolidayBulkUploadOpen(isOpen);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-blue-600" />
              Bulk Import Holidays
            </DialogTitle>
          </DialogHeader>
          {!holidayImportResult ? (
            <div className="grid grid-cols-1 gap-6 py-4">
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-gray-500" />
                  Required & Optional Columns
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Date (DD-MM-YYYY or DD/MM/YYYY)
                    </code>
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Holiday Name
                    </code>
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Department</code>{" "}
                    (Optional — leave as "Global" or blank for all departments,
                    or enter department name)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Description
                    </code>{" "}
                    (Optional)
                  </li>
                </ul>
                <Button
                  variant="outline"
                  onClick={handleDownloadHolidayTemplate}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <label
                  htmlFor="holiday-file-upload"
                  className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                >
                  <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm font-semibold text-blue-600">
                    Click to upload
                  </span>
                  <p className="text-xs text-gray-500 mt-2">CSV files only</p>
                  <Input
                    id="holiday-file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleHolidayFileChange}
                  />
                </label>
                {holidayUploadFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Selected: {holidayUploadFile.name}
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
                    {holidayImportResult.validCount}
                  </p>
                  <p>Holidays Imported</p>
                </div>
                <div className="text-red-600">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {holidayImportResult.errorRows.length}
                  </p>
                  <p>Rows with Errors</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {holidayImportResult ? (
              <>
                {holidayImportResult.errorRows.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleDownloadHolidayErrorFile}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Error Report
                  </Button>
                )}
                <Button onClick={() => setIsHolidayBulkUploadOpen(false)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsHolidayBulkUploadOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleHolidayImport}
                  disabled={!holidayUploadFile || loading}
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {loading ? "Importing..." : "Import Holidays"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CARD 3: WORKING WEEK ──────────────────────────────────────────── */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Global Working Week
          </CardTitle>
          <CardDescription>
            Select the working days in a week for all departments.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.keys(workingWeek).map((day) => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={day}
                checked={workingWeek[day]}
                onCheckedChange={() => handleWeekChange(day)}
              />
              <Label htmlFor={day} className="capitalize">
                {day}
              </Label>
            </div>
          ))}
        </CardContent>
        {(canUpdate || canCreate) && (
          <CardFooter>
            <Button
              onClick={handleSubmitWorkingWeek}
              disabled={workingWeekStatus === "loading"}
              className="cursor-pointer"
            >
              {workingWeekStatus === "loading" ? "Saving..." : "Save"}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* ── CARD 4: SCHEDULE HOLIDAY TASK ─────────────────────────────────── */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Schedule Holiday Task
          </CardTitle>
          <CardDescription>
            Choose whether the holiday task should be scheduled before or after
            the holiday.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={holidayAction} onValueChange={setHolidayAction}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="BEFORE" id="before" />
              <Label htmlFor="before">Before Holiday</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="AFTER" id="after" />
              <Label htmlFor="after">After Holiday</Label>
            </div>
          </RadioGroup>
        </CardContent>
        {(canUpdate || canCreate) && (
          <CardFooter>
            <Button
              onClick={handleSaveScheduleHolidayTask}
              disabled={scheduleHolidayTaskStatus === "loading"}
              className="cursor-pointer"
            >
              {scheduleHolidayTaskStatus === "loading" ? "Saving..." : "Save"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default DepartmentCalender;
