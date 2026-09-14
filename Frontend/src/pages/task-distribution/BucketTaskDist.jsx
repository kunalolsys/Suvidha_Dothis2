import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "../../components/ui/index.jsx";

import {
  Users,
  Briefcase,
  CalendarDays,
  Repeat,
  CheckCircle2,
  Send,
  FileText,
  SlidersHorizontal,
  Clock,
} from "lucide-react";

import { Table, Tag, Checkbox, Empty, Input, Select } from "antd";
import api from "../../lib/api.js";
import dayjs from "dayjs";
import TaskBucketListCard from "./TaskBucketListCard.jsx";
import { useDebounce } from "../../lib/debounce.js";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { getSubmodulePermissions } from "../../utils/permissionUtils.js";

const { Search } = Input;

const TaskDistribution = () => {
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [reportingUsers, setReportingUsers] = useState([]);
  const [isBucketComplete, setIsBucketComplete] = useState(false);

  const [selectedAssignments, setSelectedAssignments] = useState({});
  // 🟢 State to keep track of selected department per user: { [userId]: departmentId }
  const [selectedDepartments, setSelectedDepartments] = useState({});

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Pending"); // all | recurring | non-recurring
  const [sortBy, setSortBy] = useState("newest"); // date | title | status
  const debounceSearch = useDebounce(search);
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "my_bucket",
    isSuper,
  );
  // =========================================================
  // FETCH BUCKETS
  // =========================================================

  const fetchBuckets = async () => {
    try {
      const res = await api.get("/task-buckets", {
        params: {
          search: debounceSearch || undefined,
          sortBy: sortBy || undefined,
          status: filterType !== "all" ? filterType : undefined,
        },
      });

      setBuckets(res?.data?.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  // =========================================================
  // FETCH REPORTING USERS
  // =========================================================

  const fetchReportingUsers = async (bucketId) => {
    try {
      const res = await api.get(`/task-buckets/${bucketId}/reporting-users`);
      const users = res?.data?.data || [];
      setReportingUsers(users);
      setIsBucketComplete(res?.data?.isBucketComplete);

      // Pre-fill department selection if user has only 1 department available
      const initialDepts = {};
      users.forEach((u) => {
        const depts = u.department || u.departments || [];
        if (Array.isArray(depts) && depts.length === 1) {
          initialDepts[u._id] = depts[0]._id || depts[0];
        } else if (
          depts &&
          typeof depts === "object" &&
          !Array.isArray(depts)
        ) {
          initialDepts[u._id] = depts._id;
        }
      });
      setSelectedDepartments(initialDepts);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, [debounceSearch, filterType, sortBy]);

  // =========================================================
  // HANDLE SELECT BUCKET
  // =========================================================

  const handleSelectBucket = async (bucket) => {
    setSelectedBucket(bucket);
    setSelectedAssignments({});
    setSelectedDepartments({});

    await fetchReportingUsers(bucket._id);
  };

  // =========================================================
  // TABLE DATA
  // =========================================================

  const tableData = useMemo(() => {
    return reportingUsers.map((u) => ({
      key: u._id,
      userId: u._id,
      userName: u.name,
      email: u.email,
      role: u.role?.name || "-",
      managerId: u.reportingManager?._id,
      managerName: u.reportingManager?.name || "-",
      alreadyAssigned: u.hasBucketTask === true,
      status: u.hasBucketTask ? "Distributed" : "Not Distributed",
      taskStatus: u.completedStatus || "No Task",
      completedAt: u.completedAt || null,

      // 🟢 Extract departments array from user record
      departments: Array.isArray(u.department)
        ? u.department
        : Array.isArray(u.departments)
          ? u.departments
          : u.department
            ? [u.department]
            : [],
    }));
  }, [reportingUsers]);

  // =========================================================
  // DISTRIBUTE TASK
  // =========================================================

  const handleDistribute = async () => {
    try {
      const selectedUsers = Object.keys(selectedAssignments);

      if (!selectedBucket?._id) {
        toast.error("Please select bucket");
        return;
      }

      if (selectedUsers.length === 0) {
        toast.error("Please select users");
        return;
      }

      // 🟢 VALIDATION: Ensure every selected employee has a selected department
      const unselectedDeptUser = selectedUsers.find(
        (userId) => !selectedDepartments[userId],
      );

      if (unselectedDeptUser) {
        const userObj = reportingUsers.find(
          (u) => u._id === unselectedDeptUser,
        );
        toast.error(
          `Please select a department for ${userObj?.name || "all selected employees"}`,
        );
        return;
      }

      // Format payload with user & their chosen department
      const assignments = selectedUsers.map((userId) => ({
        userId,
        departmentId: selectedDepartments[userId],
      }));

      setLoading(true);

      await api.post(`/task-buckets/${selectedBucket._id}/distribute`, {
        selectedUsers,
        assignments,
      });

      toast.success("Tasks distributed successfully");

      // refresh current bucket users
      await fetchReportingUsers(selectedBucket._id);

      // refresh bucket list
      await fetchBuckets();

      // clear selected
      setSelectedAssignments({});
      setSelectedDepartments({});
    } catch (err) {
      console.log(err);
      toast.error(err?.response?.data?.message || "Failed to distribute task");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // HANDLE SELECT USER
  // =========================================================

  const toggleUserSelection = (userId, checked) => {
    setSelectedAssignments((prev) => {
      const updated = { ...prev };

      if (checked) {
        updated[userId] = true;
      } else {
        delete updated[userId];
      }

      return updated;
    });
  };

  // =========================================================
  // TABLE COLUMNS
  // =========================================================

  const columns = [
    {
      title: "Assign",
      dataIndex: "assign",
      width: 70,

      render: (_, record) => (
        <Checkbox
          disabled={record.alreadyAssigned || isBucketComplete}
          checked={
            record.alreadyAssigned || !!selectedAssignments[record.userId]
          }
          onChange={(e) => {
            if (!record.alreadyAssigned) {
              toggleUserSelection(record.userId, e.target.checked);
            }
          }}
        />
      ),
    },

    {
      title: "Employee",
      dataIndex: "userName",

      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-800">{record.userName}</div>
          <div className="text-xs text-slate-500">{record.email}</div>
        </div>
      ),
    },

    {
      title: "Role",
      dataIndex: "role",

      render: (value) => <Tag color="blue">{value}</Tag>,
    },

    // 🟢 NEW COLUMN: DEPARTMENT SELECTION
    {
      title: "Department",
      dataIndex: "departments",
      width: 180,

      render: (departments, record) => {
        const isSelected = !!selectedAssignments[record.userId];
        const hasMissingDept =
          isSelected && !selectedDepartments[record.userId];

        return (
          <Select
            placeholder="Select Department"
            style={{ width: "100%" }}
            disabled={record.alreadyAssigned || isBucketComplete}
            status={hasMissingDept ? "error" : ""}
            value={selectedDepartments[record.userId] || undefined}
            onChange={(deptId) => {
              setSelectedDepartments((prev) => ({
                ...prev,
                [record.userId]: deptId,
              }));
            }}
            options={departments.map((d) => ({
              label: d.name || d.departmentName || d,
              value: d._id || d,
            }))}
          />
        );
      },
    },

    {
      title: "Reporting Manager",
      dataIndex: "managerName",

      render: (value) => (
        <div className="font-medium text-slate-700">{value}</div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) =>
        value === "Distributed" ? (
          <Tag color="green">Distributed</Tag>
        ) : (
          <Tag color="orange">Not Distributed</Tag>
        ),
    },
    {
      title: "Task Status",
      dataIndex: "taskStatus",

      render: (value) => {
        if (value === "Completed") {
          return <Tag color="green">Completed</Tag>;
        }

        if (value === "Pending") {
          return <Tag color="orange">Pending</Tag>;
        }

        return <Tag>No Task</Tag>;
      },
    },
    {
      title: "Completed Time",
      dataIndex: "completedAt",

      render: (value) => {
        if (!value) {
          return <span className="text-slate-400 text-xs">-</span>;
        }

        return (
          <div className="text-xs text-slate-600">
            {new Date(value).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-6">
      <div className="space-y-6">
        {/* ====================================================== */}
        {/* HEADER */}
        {/* ====================================================== */}

        <div className="rounded-[34px] bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-8 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white">
                Bulk Task Distribution
              </h1>

              <p className="text-blue-100 mt-2 max-w-3xl">
                Select task buckets and distribute tasks to employees reporting
                under your management hierarchy.
              </p>
            </div>

            <div className="bg-white/20 p-4 rounded-3xl">
              <Send className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* CONTENT */}
        {/* ====================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ==================================================== */}
          {/* LEFT SIDE */}
          {/* ==================================================== */}

          <div className="xl:col-span-1">
            <TaskBucketListCard
              buckets={buckets}
              selectedBucket={selectedBucket}
              onSelectBucket={handleSelectBucket}
              onBucketCompleted={async () => {
                await fetchBuckets();

                // refresh selected bucket users also
                if (selectedBucket?._id) {
                  await fetchReportingUsers(selectedBucket._id);
                }
              }}
              reportingUsers={reportingUsers}
              setSearch={setSearch}
              search={search}
              setFilterType={setFilterType}
              filterType={filterType}
              setSortBy={setSortBy}
              sortBy={sortBy}
            />
          </div>

          {/* ==================================================== */}
          {/* RIGHT SIDE */}
          {/* ==================================================== */}

          <div className="xl:col-span-2">
            <Card className="rounded-[28px] border-0 shadow-lg">
              <CardHeader className="border-b bg-slate-50 rounded-t-[28px]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-600" />
                      Reporting Team Members
                    </CardTitle>

                    <p className="text-sm text-slate-500 mt-1">
                      Select employees and their target department to receive
                      tasks
                    </p>
                  </div>

                  {canUpdate && (
                    <Button
                      disabled={
                        loading ||
                        !selectedBucket ||
                        Object.keys(selectedAssignments).length === 0
                      }
                      onClick={handleDistribute}
                      className="rounded-xl"
                    >
                      {loading ? "Distributing..." : "Distribute Tasks"}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 mt-2">
                {!selectedBucket ? (
                  <div className="h-[450px] flex items-center justify-center">
                    <Empty description="Select task bucket first" />
                  </div>
                ) : tableData.length === 0 ? (
                  <div className="h-[450px] flex items-center justify-center">
                    <Empty description="No pending employees found" />
                  </div>
                ) : (
                  <Table
                    columns={columns}
                    dataSource={tableData}
                    bordered
                    pagination={{
                      pageSize: 7,
                    }}
                  />
                )}

                {/* ============================================== */}
                {/* FOOTER */}
                {/* ============================================== */}

                {selectedBucket && (
                  <div className="mt-5 rounded-2xl bg-slate-50 border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-500">
                          Selected Employees
                        </div>

                        <div className="font-bold text-2xl mt-1 text-slate-800">
                          {Object.keys(selectedAssignments).length}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm text-slate-500">
                            Total Employees
                          </div>

                          <div className="font-bold text-xl text-slate-800">
                            {tableData.length}
                          </div>
                        </div>

                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDistribution;
