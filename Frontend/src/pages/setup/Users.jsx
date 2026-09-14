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
      "Reporting Manager",
      "Password",
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
    const promise = new Promise((resolve, reject) => {
      Papa.parse(uploadFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rows = results.data;
            const validUsers = [];
            const errorRows = [];
            const emailsInFile = new Set();

            const existingEmails = new Set(
              users.map((u) => u.email.toLowerCase()),
            );

            for (const row of rows) {
              let errorReason = "";
              const email = row.Email?.trim().toLowerCase();

              // Validation checks
              if (
                !row.Name ||
                !email ||
                !row.Role ||
                !row.Department ||
                !row.Shift ||
                !row.Password
              ) {
                errorReason =
                  "Missing one or more required fields (Name, Email, Role, Department, Shift, Password).";
              } else if (emailsInFile.has(email)) {
                errorReason = "Duplicate email address found in this file.";
              } else if (existingEmails.has(email)) {
                errorReason =
                  "A user with this email already exists in the system.";
              }

              if (errorReason) {
                errorRows.push({ ...row, "Error Reason": errorReason });
                continue;
              }

              // Find IDs for Role, Department, Shift, and Reporting Manager
              const role = roles.find(
                (r) => r.name.toLowerCase() === row.Role.trim().toLowerCase(),
              );
              const shift = workShifts.find(
                (s) => s.name.toLowerCase() === row.Shift.trim().toLowerCase(),
              );
              const manager = users.find(
                (u) =>
                  u.name.toLowerCase() ===
                  row["Reporting Manager"]?.trim().toLowerCase(),
              );

              const departmentString = row.Department || "";
              const departmentNames = departmentString
                .split(",")
                .map((d) => d.trim().toLowerCase());

              const departmentIds = departments
                .filter((d) => departmentNames.includes(d.name.toLowerCase()))
                .map((d) => d._id);

              if (!role) {
                errorRows.push({
                  ...row,
                  "Error Reason": `Role '${row.Role}' not found.`,
                });
                continue;
              }
              if (!shift) {
                errorRows.push({
                  ...row,
                  "Error Reason": `Shift '${row.Shift}' not found.`,
                });
                continue;
              }

              emailsInFile.add(email);
              validUsers.push({
                name: row.Name,
                email: row.Email,
                phone: row.Phone || "",
                password: row.Password,
                employeeCode: row["Employee Code"]?.trim() || undefined,
                role: role._id,
                department: departmentIds,
                assignShift: shift._id,
                reportingManager: manager?._id,
              });
            }

            // Process valid users
            if (validUsers.length > 0) {
              for (const userData of validUsers) {
                await dispatch(addUser(userData)).unwrap();
              }
            }

            resolve({ validCount: validUsers.length, errorRows });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => {
          reject(err);
        },
      });
    });

    toast.promise(promise, {
      loading: "Processing user import...",
      success: ({ validCount, errorRows }) => {
        const result = { validCount, errorRows };
        setImportResult(result);
        setLoading(false);
        dispatch(
          fetchUsers({
            page,
            limit,
            selectedRole,
            selectedDepartment,
            selectedShift,
            debouncedSearch,
          }),
        ); // Refresh user list

        return `${validCount} user(s) processed. Check the dialog for details.`;
      },
      error: (err) => {
        setLoading(false);
        setImportResult({
          validCount: 0,
          errorRows: [],
          generalError: err.message,
        });
        return `Import failed: ${err.message || "An unknown error occurred."}`;
      },
    });
  };
  // Export visible users to specified format
  const exportVisible = async (format) => {
    try {
      const res = await dispatch(
        exportUsers({
          selectedRole,
          selectedDepartment,
          selectedShift,
          searchTerm: debouncedSearch,
        }),
      ).unwrap();
      if (!res || res.length === 0) {
        toast.error("No users to export");
        return;
      }

      const rows = res.map((user, idx) => {
        const manager = res.find((u) => u._id === user.reportingManager);
        return {
          "Sr. No.": idx + 1,
          "Employee Code": user.employeeCode || "-",
          Name: user.name || "N/A",
          Email: user.email || "N/A",
          Phone: user.phone || "-",
          Department: user.department?.map((d) => d.name).join(", ") || "-",
          Role: user.role?.name || "N/A",
          Shift: user.assignShift?.name || "N/A",
          "Reporting Manager": manager?.name || "N/A",
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
                    {role.displayName||role.name}
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
                <TableHead>Reporting Manager</TableHead>
                <TableHead>Primary Role</TableHead>
                <TableHead>Shifts</TableHead>
                <TableHead>Telegram Notification</TableHead>
                <TableHead>Telegram Chat ID</TableHead>
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
                      {user.department?.map((d) => d.name).join(", ")}
                    </TableCell>
                    <TableCell>{user.reportingManager?.name || ""}</TableCell>
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
                    <TableCell>{user.telegramChatId || "-"}</TableCell>
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
                Upload a CSV file to add multiple users at once. Please ensure
                your file follows the specified format.
              </DialogDescription>
            )}
          </DialogHeader>

          {!importResult ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Instructions Section */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-gray-500" />
                  Required Columns
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Employee Code
                    </code>{" "}
                    (Text or Number)
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
                    <code className="bg-gray-200 px-1 rounded">Phone</code>{" "}
                    (Text)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Role</code> (Must
                    match an existing Role name)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Department</code>{" "}
                    (Use exact names from Setup page, comma-separated for
                    multiple)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Shift</code>{" "}
                    (Must match an existing Shift name)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">
                      Reporting Manager
                    </code>{" "}
                    (Manager's Name)
                  </li>
                  <li>
                    <code className="bg-gray-200 px-1 rounded">Password</code>{" "}
                    (Min. 6 characters)
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
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
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
                  <p className="text-xs text-gray-500 mt-2">CSV files only</p>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                </label>
                {uploadFile && (
                  <div className="mt-4 text-center text-sm text-green-600 font-medium">
                    <p>Selected: {uploadFile.name}</p>
                  </div>
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
                  <p>Users Imported Successfully</p>
                </div>
                <div className="text-red-600">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {importResult.errorRows.length}
                  </p>
                  <p>Rows with Errors</p>
                </div>
              </div>
              {importResult.generalError && (
                <p className="text-red-500 mt-4">
                  An error occurred: {importResult.generalError}
                </p>
              )}
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
                <Button
                  onClick={() => {
                    setIsBulkUploadOpen(false);
                    setUploadFile(null);
                    setImportResult(null);
                  }}
                >
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
