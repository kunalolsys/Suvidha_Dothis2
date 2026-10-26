import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  fetchUsers,
  deleteUser,
  addUser,
  exportUsers,
  importUsers,
} from "../../redux/slices/user/userSlice";
import { fetchDepartments } from "../../redux/slices/department/departmentSlice";
import { fetchRoles } from "../../redux/slices/role/roleSlice";
import { fetchWorkShifts } from "../../redux/slices/workShift/workShiftSlice";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useDebounce } from "../../lib/debounce";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

// --- Main Component ---
const Users = () => {
  const dispatch = useDispatch();
  const {
    users,
    pagination,
    status: userStatus,
    error: userError,
  } = useSelector((state) => state.users);
  const { departments, status: departmentStatus } = useSelector(
    (state) => state.departments,
  );
  const { roles, status: roleStatus } = useSelector((state) => state.roles);
  const { workShifts, status: workShiftStatus } = useSelector(
    (state) => state.workShifts,
  );

  const [loading, setLoading] = useState(false);
  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    dispatch(
      fetchUsers({
        page,
        limit,
        selectedRole,
        selectedDepartment,
        selectedShift,
        debouncedSearch,
      }),
    );
    dispatch(fetchDepartments());
    dispatch(fetchRoles());
    dispatch(fetchWorkShifts());
  }, [
    dispatch,
    page,
    limit,
    selectedRole,
    selectedDepartment,
    selectedShift,
    debouncedSearch,
  ]);

  useEffect(() => {
    if (userStatus === "failed") {
      toast.error(userError || "Failed to load users.");
    }
  }, [userStatus, userError]);

  // If users already exist and we dispatch a refresh, don't hide the table; show a small inline spinner
  const isRefreshing = userStatus === "loading" && users && users.length > 0;

  // const filteredUsers = useMemo(() => {
  //   return users.filter((user) => {
  //     const matchesSearchTerm =
  //       user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       user.email.toLowerCase().includes(searchTerm.toLowerCase());

  //     const matchesDepartment =
  //       selectedDepartment === "all" ||
  //       user.department?.some((d) => d._id === selectedDepartment);

  //     const matchesRole =
  //       selectedRole === "all" || user.role?._id === selectedRole;

  //     const matchesShift =
  //       selectedShift === "all" || user.assignShift?._id === selectedShift;

  //     return (
  //       matchesSearchTerm && matchesDepartment && matchesRole && matchesShift
  //     );
  //   });
  // }, [users, searchTerm, selectedDepartment, selectedRole, selectedShift]);
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "users",
    isSuper,
  );
  const totalPages = pagination ? pagination.totalPages : 1;

  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
  };

  const handleRoleChange = (value) => {
    setSelectedRole(value);
  };

  const handleShiftChange = (value) => {
    setSelectedShift(value);
  };

  const handleDelete = async (userId) => {
    Modal.confirm({
      title: "Delete User?",
      icon: <ExclamationCircleOutlined />,
      content:
        "Are you sure you want to delete this user? This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",

      async onOk() {
        try {
          await dispatch(deleteUser(userId)).unwrap();
          toast.success("User deleted successfully");

          // 🔥 refresh users if needed
          // dispatch(fetchUsers())
          dispatch(
            fetchUsers({
              page,
              limit,
              selectedRole,
              selectedDepartment,
              selectedShift,
              debouncedSearch,
            }),
          );
        } catch (err) {
          toast.error(err.message || "Failed to delete user.");
        }
      },
    });
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Employee Code",
      "Name",
      "Email",
      "Phone",
      "Role",
      "Department",
      "Shift",
      "Password",
      "Telegram Username",
      "Telegram Notifications",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users Template");
    XLSX.writeFile(wb, "user_upload_template.csv");
    toast.success("Template downloaded successfully");
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
    XLSX.utils.book_append_sheet(wb, ws, "Import Errors");
    XLSX.writeFile(wb, "user_import_errors.csv");
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

    // Dispatch Redux Action
    const promise = dispatch(importUsers(uploadFile)).unwrap();

    toast.promise(promise, {
      loading: "Processing user import on server...",
      success: (res) => {
        // Backend Response Destructuring
        const {
          createdCount = 0,
          updatedCount = 0,
          errorCount = 0,
          errorRows = [],
        } = res?.data || {};
        const apiMessage = res?.message || "Import completed successfully.";

        // State update with all metrics
        setImportResult({
          createdCount,
          updatedCount,
          errorCount,
          errorRows,
          message: apiMessage,
        });

        setLoading(false);

        // Refresh User Table
        dispatch(
          fetchUsers({
            page,
            limit,
            selectedRole,
            selectedDepartment,
            selectedShift,
            debouncedSearch,
          }),
        );

        return apiMessage;
      },
      error: (err) => {
        setLoading(false);
        const errorMessage =
          typeof err === "string"
            ? err
            : err?.message || "An unknown error occurred.";

        setImportResult({
          createdCount: 0,
          updatedCount: 0,
          errorCount: 0,
          errorRows: [],
          generalError: errorMessage,
        });

        return `Import failed: ${errorMessage}`;
      },
    });
  };
  // Export visible users to specified format
  const exportVisible = async (format) => {
    try {
      const res = await dispatch(
        exportUsers({
          role: selectedRole || undefined,
          department: selectedDepartment || undefined,
          assignShift: selectedShift || undefined,
          search: debouncedSearch || undefined,
        }),
      ).unwrap();

      // 1. Safe extraction handling raw array or { success, data } object
      const usersData = Array.isArray(res) ? res : res?.data || [];

      if (!usersData || usersData.length === 0) {
        toast.error("No users to export");
        return;
      }

      // 2. 🟢 Super User exclude filter (Checking both raw 'role.name' and formatted 'Role' string)
      const filteredRes = usersData.filter((user) => {
        const roleName = (
          typeof user.role === "object"
            ? user.role?.name
            : user.Role || user.role || ""
        ).toLowerCase();
        return roleName !== "super";
      });

      if (filteredRes.length === 0) {
        toast.error("No users to export");
        return;
      }

      // 3. 🟢 Clean Row Mapping (Support for pre-formatted Backend Objects)
      const rows = filteredRes.map((user, idx) => {
        return {
          "Sr. No.": idx + 1,
          "Employee Code": user["Employee Code"] || user.employeeCode || "-",
          Name: user.Name || user.name || "N/A",
          Email: user.Email || user.email || "N/A",
          Phone: user.Phone || user.phone || "-",
          Department:
            user.Department ||
            (typeof user.department === "object"
              ? user.department?.name
              : user.department) ||
            "-",
          Role:
            user.Role ||
            (typeof user.role === "object"
              ? user.role?.displayName || user.role?.name
              : user.role) ||
            "N/A",
          Shift:
            user.Shift ||
            (typeof user.assignShift === "object"
              ? user.assignShift?.name
              : user.assignShift) ||
            "N/A",
          "Telegram Username":
            user["Telegram Username"] || user.telegramUserName || "-",
          "Telegram Notifications":
            user["Telegram Notifications"] ||
            (user.telegramNotificationsEnabled ? "Enabled" : "Disabled"),
          Status: user.Status || (user.isActive ? "Active" : "Inactive"),
        };
      });

      const timestamp = Date.now();
      const filename = `users_export_${timestamp}.${format}`;

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");

      XLSX.writeFile(wb, filename, {
        bookType: format === "csv" ? "csv" : format,
      });

      toast.success(`${format.toUpperCase()} exported successfully`);
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Export failed. See console for details.");
    }
  };
  // Search Handler in User Listing Component
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setPage(1); // 👈 Critical Fix: Search change hone par page hamesha 1 reset karo
  };
  return (
    <Card className="m-6 shadow-lg">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-lg font-semibold">
            Users
            {isRefreshing && (
              <div
                className="inline-block ml-3 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"
                title="Refreshing"
                aria-hidden
              />
            )}
          </CardTitle>
          <div className="flex gap-2 ">
            {canCreate && (
              <Link
                to="/setup/add-user"
                className="flex items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-blue-400 hover:from-blue-600 hover:to-blue-700 px-4 py-2 rounded-xl font-medium transition duration-200 ease-in-out"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Add User</span>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-auto flex items-center bg-teal-500 rounded-md dark:bg-teal-600 text-sm text-white cursor-pointer px-3 py-1.5 hover:bg-teal-600 transition font-semibold">
                  <Download className="mr-2 rotate-180 h-5 w-5" /> Export
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => exportVisible("csv")}
                  className="cursor-pointer"
                >
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportVisible("xls")}
                  className="cursor-pointer"
                >
                  XLS
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportVisible("xlsx")}
                  className="cursor-pointer"
                >
                  XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canCreate && (
              <Button
                variant="outline"
                onClick={() => setIsBulkUploadOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Bulk Upload Users
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* --- Filters --- */}
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <Input
            placeholder="Search by name, email or employee code..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e)}
            className="max-w-xs"
          />
          <Select
            onValueChange={handleDepartmentChange}
            value={selectedDepartment}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departmentStatus === "loading" ? (
                <SelectItem value="loading" disabled>
                  Loading...
                </SelectItem>
              ) : (
                departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select onValueChange={handleRoleChange} value={selectedRole}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roleStatus === "loading" ? (
                <SelectItem value="loading" disabled>
                  Loading...
                </SelectItem>
              ) : (
                roles.map((role) => (
                  <SelectItem key={role._id} value={role._id}>
                    {role.displayName || role.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select onValueChange={handleShiftChange} value={selectedShift}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Shifts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shifts</SelectItem>
              {workShiftStatus === "loading" ? (
                <SelectItem value="loading" disabled>
                  Loading...
                </SelectItem>
              ) : (
                workShifts.map((shift) => (
                  <SelectItem key={shift._id} value={shift._id}>
                    {shift.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* --- Users Table --- */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* <TableHead>Sr. No.</TableHead> */}
                <TableHead>Employee Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department(s)</TableHead>
                {/* <TableHead>Reporting Manager</TableHead> */}
                <TableHead>Primary Role</TableHead>
                <TableHead>Shifts</TableHead>
                <TableHead>Telegram Notification</TableHead>
                <TableHead>Telegram Username</TableHead>
                {(canUpdate || canDelete) && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {userStatus === "loading" && (!users || users.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : Array.isArray(users) && users.length > 0 ? (
                users.map((user, index) => (
                  <TableRow key={user._id}>
                    {/* <TableCell>{(page - 1) * limit + index + 1}</TableCell> */}
                    <TableCell>
                      {(user.employeeCode !== "" ? user.employeeCode : "-") ??
                        "-"}
                    </TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.department?.name || user.department || "—"}
                    </TableCell>
                    {/* <TableCell>{user.reportingManager?.name || ""}</TableCell> */}
                    <TableCell>{user.role?.displayName || ""}</TableCell>
                    <TableCell>{user.assignShift?.name}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          user.telegramNotificationsEnabled
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.telegramNotificationsEnabled
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </TableCell>{" "}
                    <TableCell>{user.telegramUserName || "-"}</TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="flex gap-1">
                        {canUpdate && (
                          <Link to={`/setup/edit-user/${user._id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDelete(user._id)}
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
                  <TableCell colSpan={8} className="text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination */}
        {users.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
                disabled={loading}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 font-medium">
                Page <span className="font-bold">{page}</span> of{" "}
                <span className="font-bold">{totalPages || 1}</span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>

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
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-blue-600" />
              Bulk Import Users
            </DialogTitle>
            {!importResult && (
              <DialogDescription>
                Upload a CSV file to add or update multiple users at once.
                Please ensure your file follows the specified format.
              </DialogDescription>
            )}
          </DialogHeader>

          {!importResult ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Instructions Section */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-gray-500" />
                  Required & Optional Columns
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Employee Code
                    </code>{" "}
                    (Text/Number - Used for Upsert)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Name</code>{" "}
                    (Text)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Email</code>{" "}
                    (Unique Email)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Phone</code> (10
                    Digits)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Role</code>{" "}
                    (Exact Role Name)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Department</code>{" "}
                    (Exact Dept Name)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Shift</code>{" "}
                    (Exact Shift Name)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Password</code>{" "}
                    (Required for new, optional on update)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Telegram Username
                    </code>{" "}
                    (Optional)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Telegram Notifications
                    </code>{" "}
                    (Optional, true/false)
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

              {/* Upload Section */}
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                >
                  <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm font-semibold text-blue-600">
                    Click to upload
                  </span>
                  <span className="text-xs text-gray-500">
                    or drag and drop
                  </span>
                  <p className="text-xs text-gray-400 mt-2">CSV files only</p>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                </label>
                {uploadFile && (
                  <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded text-center text-xs text-green-700 font-medium w-full">
                    Selected: {uploadFile.name}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 🟢 UPDATED IMPORT COMPLETE RESPONSE UI */
            <div className="py-6 space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800">
                  Import Summary
                </h3>
                {importResult.message && (
                  <p className="text-sm text-gray-500 mt-1">
                    {importResult.message}
                  </p>
                )}
              </div>

              {/* 3 Metric Cards for Created, Updated, and Errors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Created Users */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-extrabold text-green-700">
                    {importResult.createdCount ?? importResult.validCount ?? 0}
                  </p>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mt-1">
                    Users Created
                  </p>
                </div>

                {/* Updated Users */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-extrabold text-blue-700">
                    {importResult.updatedCount ?? 0}
                  </p>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1">
                    Users Updated
                  </p>
                </div>

                {/* Error Rows */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-3xl font-extrabold text-red-700">
                    {importResult.errorCount ??
                      importResult.errorRows?.length ??
                      0}
                  </p>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mt-1">
                    Rows with Errors
                  </p>
                </div>
              </div>

              {/* General Error Alert if any */}
              {importResult.generalError && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-md text-center">
                  An unexpected error occurred: {importResult.generalError}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {importResult ? (
              <div className="flex items-center justify-between w-full">
                <div>
                  {(importResult.errorCount > 0 ||
                    importResult.errorRows?.length > 0) && (
                    <Button
                      variant="destructive"
                      onClick={handleDownloadErrorFile}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Error Report
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setIsBulkUploadOpen(false);
                    setUploadFile(null);
                    setImportResult(null);
                  }}
                >
                  Close
                </Button>
              </div>
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
                  <Download className="mr-2 h-4 w-4" />
                  {loading ? "Importing..." : "Import Users"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Users;
