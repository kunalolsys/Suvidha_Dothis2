import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Select,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  message,
  Progress,
  Badge,
  Tooltip,
  theme,
  Row,
  Col,
  Statistic,
  List,
  Checkbox,
  Divider,
  Segmented,
  Alert,
} from "antd";
import {
  UserOutlined,
  SwapOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  ReloadOutlined,
  DeploymentUnitOutlined,
  CheckSquareOutlined,
  AlertOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  BankOutlined,
} from "@ant-design/icons";
import api from "../../lib/api";
import { formatLabel } from "../../lib/utilFunctions";
import { useSelector } from "react-redux";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

const { Title, Text, Paragraph } = Typography;

export default function TaskReassignmentPage() {
  const { token } = theme.useToken();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [fromUserId, setFromUserId] = useState(null);
  const [toDepartmentId, setToDepartmentId] = useState(null); // 🟢 NEW: Target Department ID
  const [toUserId, setToUserId] = useState(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRowData, setSelectedRowData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskFrequency, setTaskFrequency] = useState("one-time");
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "task_reassigning",
    isSuper,
  );
  // 1. Fetch Departments
  const fetchDepartments = async () => {
    try {
      const response = await api.get("/setup/departments/allDepartmentsForFMS");
      setDepartments(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  // 2. Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await api.get("/users/filter-allUsers");
      const data = res.data.data || [];
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  // 3. Fetch Assigned Tasks
  const fetchTask = async () => {
    try {
      const res = await api.post("/tasks/filter", {
        userId: fromUserId,
        filters: {
          taskType: taskFrequency === "recurring" ? "recurring" : "All",
        },
        limit: 100000,
        page: 1,
      });
      const task = res.data.data;
      setTasks(task);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!fromUserId) return;
    fetchTask();
  }, [fromUserId, taskFrequency]);

  // Derive execution contexts
  const filteredTasks = tasks.filter(
    (task) => task.assignedTo?._id === fromUserId,
  );
  const finalTasks = useMemo(
    () => filteredTasks.filter((item) => item.status !== "Completed"),
    [filteredTasks],
  );
  const totalTasksCount = finalTasks.length;
  const delayedTasksCount = finalTasks.filter(
    (t) => t.status === "Delayed",
  ).length;

  // 🟢 Target Department badalne par Target User reset hoga aur Filter honge
  const handleToDepartmentChange = (deptId) => {
    setToDepartmentId(deptId);
    setToUserId(null); // Clear selected user when department changes
  };

  // 🟢 Filter users belonging to selected target department
  const availableTargetUsers = useMemo(() => {
    if (!toDepartmentId) return [];

    return users.filter((u) => {
      // Exclude Owner roles & Source User
      if (u?.role?.name === "Owner") return false;
      if ((u?._id || u?.id) === fromUserId) return false;

      // Check if user belongs to selected department
      const userDepts = Array.isArray(u.department) ? u.department : [];
      return userDepts.some(
        (d) => String(d?._id || d) === String(toDepartmentId),
      );
    });
  }, [users, toDepartmentId, fromUserId]);

  const handleFromUserChange = (value) => {
    setFromUserId(value);
    setSelectedRowKeys([]);
    if (value === toUserId) setToUserId(null);
  };

  const handleReassignmentSave = async () => {
    if (!toDepartmentId) {
      message.error("Please select a target department first.");
      return;
    }
    if (!toUserId) {
      message.error("Please select a target destination user.");
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.error("Please select at least one task to reassign.");
      return;
    }

    const targetUserObj = users.find((u) => (u._id || u.id) === toUserId);

    // 🟢 Payload includes both newly assigned user & their target department
    const payload = {
      assignedTo: toUserId,
      departmentOfAssignToUser: toDepartmentId,
    };

    setIsSubmitting(true);

    try {
      const updatePromises = selectedRowData.map((task) =>
        task.taskType === "FmsInstanceTask"
          ? api.patch(
              `/fms/instances/${task.fmsInstanceId}/tasks/${task.taskId}`,
              payload,
            )
          : api.put(`/tasks/${task._id}`, payload),
      );

      await Promise.all(updatePromises);

      message.success(
        `Tasks were successfully reassigned to ${targetUserObj?.name}.`,
      );
      fetchTask();
      setSelectedRowKeys([]);
    } catch (error) {
      console.error("Reassignment batch execution error:", error);
      message.error(
        error.response?.data?.message ||
          "Database rejected batch assignment stream.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Task Tracking ID",
      dataIndex: "TaskId",
      key: "TaskId",
      width: "180px",
      render: (text) => (
        <Text
          strong
          style={{
            fontFamily: "var(--ant-font-family-code, monospace)",
            color: token.colorTextSecondary,
          }}
        >
          {text}
        </Text>
      ),
    },
    {
      title: "Task Details / Context",
      dataIndex: "title",
      key: "title",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Space size={8}>
            <Text style={{ fontWeight: 600, fontSize: "14px" }}>
              {record.title}
            </Text>
            {record.isReopen && (
              <Tooltip title={`Reason: ${record.reopenedReason}`}>
                <Tag
                  color="volcano"
                  style={{
                    border: "none",
                    borderRadius: "2px",
                    fontWeight: 500,
                    fontSize: "11px",
                  }}
                >
                  Reopened
                </Tag>
              </Tooltip>
            )}
          </Space>
          <Paragraph
            type="secondary"
            style={{ margin: 0, fontSize: "12px", maxWidth: "500px" }}
            ellipsis={{ rows: 1 }}
          >
            {record.description}
          </Paragraph>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "taskType",
      key: "taskType",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontWeight: 600, fontSize: "14px" }}>
            {record.taskType === "FmsInstanceTask"
              ? "FMS"
              : formatLabel(record.taskType)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: "160px",
      render: (status) => {
        const statusConfig = {
          Pending: { color: "warning", textColor: "#d97706" },
          "In Progress": { color: "processing", textColor: "#1677ff" },
          Completed: { color: "success", textColor: "#16a34a" },
          Delayed: { color: "error", textColor: "#dc2626" },
          Overdue: { color: "error", textColor: "#b91c1c" },
          Upcoming: { color: "default", textColor: "#52b1ff" },
          Delegated: { color: "processing", textColor: "#7c3aed" },
          Cancelled: { color: "default", textColor: "#6b7280" },
          Rejected: { color: "error", textColor: "#ef4444" },
          Approved: { color: "success", textColor: "#22c55e" },
          Review: { color: "warning", textColor: "#f59e0b" },
          Hold: { color: "warning", textColor: "#ca8a04" },
        };

        const currentStatus = statusConfig[status] || {
          color: "default",
          textColor: "#6b7280",
        };

        return (
          <Badge
            status={currentStatus.color}
            text={
              <Text
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: currentStatus.textColor,
                }}
              >
                {status || "-"}
              </Text>
            }
          />
        );
      },
    },
    {
      title: "Target Due Date",
      key: "dueDate",
      width: "160px",
      render: (_, record) => {
        if (!record.dueDate) return <Text type="secondary">—</Text>;
        const rawDate = new Date(record.dueDate);
        const formatted = rawDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return (
          <Space size={6} style={{ color: token.colorTextDescription }}>
            <CalendarOutlined style={{ fontSize: "12px" }} />
            <span style={{ fontSize: "13px" }}>{formatted}</span>
          </Space>
        );
      },
    },
  ];

  return (
    <div
      style={{
        backgroundColor: "#fcfdfe",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      {/* 1. Header Area */}
      <div
        style={{
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          paddingBottom: "20px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div className="flex" style={{ flexDirection: "column" }}>
          <div>
            <Title
              level={3}
              style={{ margin: 0, fontWeight: 700, letterSpacing: "-0.3px" }}
            >
              Task Allocation & Transfer Management
            </Title>
            <Text type="secondary" style={{ fontSize: "13px" }}>
              Smart administrative workspace for bulk task reassignment,
              workload balancing, and operational continuity management.
            </Text>
          </div>
          <div style={{ marginTop: "5px" }}>
            <Segmented
              size="large"
              value={taskFrequency}
              onChange={(value) => {
                setTaskFrequency(value);
                setSelectedRowKeys([]);
              }}
              options={[
                {
                  label: "One-Time Tasks",
                  value: "one-time",
                  icon: <ThunderboltOutlined />,
                },
                {
                  label: "Repeated Tasks",
                  value: "recurring",
                  icon: <ClockCircleOutlined />,
                },
              ]}
            />
          </div>
        </div>

        {fromUserId && (
          <Space size={16} wrap>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #f1f5f9",
                borderRadius: "12px",
                padding: "12px 20px",
                minWidth: "200px",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.02), 0 8px 16px -4px rgba(148, 163, 184, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Space direction="vertical" size={2}>
                <Text
                  type="secondary"
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    letterSpacing: "0.3px",
                  }}
                >
                  Workload Balance
                </Text>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: token.colorTextHeading,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {totalTasksCount}{" "}
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 400,
                      color: token.colorTextDescription,
                    }}
                  >
                    tasks loaded
                  </span>
                </span>
              </Space>
              <div
                style={{
                  background: token.colorInfoBg,
                  padding: "10px",
                  borderRadius: "10px",
                  display: "flex",
                  color: token.colorInfo,
                }}
              >
                <DeploymentUnitOutlined style={{ fontSize: "18px" }} />
              </div>
            </div>

            <div
              style={{
                background: delayedTasksCount > 0 ? "#fff1f0" : "#ffffff",
                border: `1px solid ${
                  delayedTasksCount > 0 ? "#ffccc7" : "#f1f5f9"
                }`,
                borderRadius: "12px",
                padding: "12px 20px",
                minWidth: "200px",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.02), 0 8px 16px -4px rgba(148, 163, 184, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.3s ease",
              }}
            >
              <Space direction="vertical" size={2}>
                <Text
                  type="secondary"
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    letterSpacing: "0.3px",
                    color:
                      delayedTasksCount > 0
                        ? "#a8071a"
                        : token.colorTextDescription,
                  }}
                >
                  Risk Assessment
                </Text>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color:
                      delayedTasksCount > 0
                        ? token.colorError
                        : token.colorTextHeading,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {delayedTasksCount}{" "}
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 400,
                      color:
                        delayedTasksCount > 0
                          ? "#cf1322"
                          : token.colorTextDescription,
                    }}
                  >
                    delayed
                  </span>
                </span>
              </Space>
              <div
                style={{
                  background:
                    delayedTasksCount > 0
                      ? "#ff383815"
                      : token.colorBgContainerDisabled,
                  padding: "10px",
                  borderRadius: "10px",
                  display: "flex",
                  color:
                    delayedTasksCount > 0
                      ? token.colorError
                      : token.colorTextDisabled,
                }}
              >
                <AlertOutlined style={{ fontSize: "18px" }} />
              </div>
            </div>
          </Space>
        )}
      </div>

      {/* 2. TOP FILTER CONTROLS BAR (3 STEPS: Source User -> Target Dept -> Target User) */}
      <Card
        bordered={false}
        style={{
          boxShadow:
            "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
          borderRadius: "8px",
          marginBottom: "16px",
          background: "#fff",
          border: "1px solid #f0f0f0",
        }}
        bodyStyle={{ padding: "16px 24px" }}
      >
        <Row gutter={[16, 16]} align="middle">
          {/* STEP 1: Source User */}
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text
                strong
                style={{ color: token.colorTextHeading, fontSize: "13px" }}
              >
                1. Select Source Account Assignee
              </Text>
              <Select
                showSearch
                allowClear
                size="large"
                placeholder="Search employee by name or role..."
                style={{ width: "100%" }}
                value={fromUserId}
                onChange={handleFromUserChange}
                suffixIcon={<UserOutlined />}
                optionFilterProp="searchLabel"
                popupMatchSelectWidth={false}
                autoClearSearchValue
                filterOption={(input, option) =>
                  option?.searchLabel
                    ?.toLowerCase()
                    ?.includes(input.toLowerCase())
                }
                options={users
                  .filter((item) => item?.role?.name !== "Owner")
                  .map((u) => ({
                    value: u?._id || u?.id,
                    label: `${u?.name}`,
                    searchLabel: `${u?.name || ""} ${u?.email || ""} ${
                      u?.role?.name || ""
                    }`,
                    customLabel: (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "14px" }}>
                            {u?.name}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            {u?.email}
                          </div>
                        </div>
                        <Tag color="blue">{u?.role?.name}</Tag>
                      </div>
                    ),
                  }))}
                optionRender={(option) => option.data.customLabel}
              />
            </Space>
          </Col>

          {/* STEP 2: Target Department Dropdown (NEW) */}
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text
                strong
                style={{ color: token.colorTextHeading, fontSize: "13px" }}
              >
                2. Target Department
              </Text>
              <Select
                showSearch
                allowClear
                size="large"
                placeholder={
                  fromUserId
                    ? "Select target department..."
                    : "Awaiting step 1..."
                }
                style={{ width: "100%" }}
                value={toDepartmentId}
                onChange={handleToDepartmentChange}
                disabled={!fromUserId}
                suffixIcon={<BankOutlined />}
                optionFilterProp="label"
                options={departments.map((d) => ({
                  value: d._id,
                  label: d.name,
                }))}
              />
            </Space>
          </Col>

          {/* STEP 3: Target Destination User (Filtered by Selected Department) */}
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text
                strong
                style={{ color: token.colorTextHeading, fontSize: "13px" }}
              >
                3. Specify Destination Target Account
              </Text>
              <Select
                showSearch
                allowClear
                size="large"
                placeholder={
                  toDepartmentId
                    ? "Select recipient user in department..."
                    : "Awaiting step 2 (Department)..."
                }
                style={{ width: "100%" }}
                value={toUserId}
                onChange={(v) => setToUserId(v)}
                disabled={!toDepartmentId}
                suffixIcon={<UserOutlined />}
                optionFilterProp="searchLabel"
                popupMatchSelectWidth={false}
                autoClearSearchValue
                filterOption={(input, option) =>
                  option?.searchLabel
                    ?.toLowerCase()
                    ?.includes(input.toLowerCase())
                }
                options={availableTargetUsers.map((u) => ({
                  value: u?._id || u?.id,
                  label: `${u?.name}`,
                  searchLabel: `${u?.name || ""} ${u?.email || ""} ${
                    u?.role?.name || ""
                  }`,
                  customLabel: (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px" }}>
                          {u?.name}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginTop: "2px",
                          }}
                        >
                          {u?.email}
                        </div>
                      </div>
                      <Tag color="blue">{u?.role?.name}</Tag>
                    </div>
                  ),
                }))}
                optionRender={(option) => option.data.customLabel}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 3. CONTEXTUAL ACTION NOTIFICATION STRIP */}
      {canUpdate && selectedRowKeys.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "14px 24px",
            borderRadius: "6px",
            marginBottom: "16px",
            boxShadow: "0 4px 6px -1px rgba(240, 253, 244, 0.5)",
          }}
        >
          <Space size={12}>
            <div
              style={{
                background: "#dcfce7",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertOutlined style={{ color: "#16a34a" }} />
            </div>
            <div>
              <Text strong style={{ color: "#14532d", fontSize: "14px" }}>
                Staged Transaction Verified
              </Text>
              <Text
                style={{
                  color: "#166534",
                  fontSize: "13px",
                  marginLeft: "8px",
                }}
              >
                You have staged <b>{selectedRowKeys.length}</b> work item
                targets to transfer over to your selected destination pipeline.
              </Text>
            </div>
          </Space>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleReassignmentSave}
            loading={isSubmitting}
            disabled={!toUserId}
            style={{
              background: "#16a34a",
              borderColor: "#16a34a",
              boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            Authorize Reassignment Update
          </Button>
        </div>
      )}

      {/* 4. BOTTOM WORKLOAD LEDGER TABLE AREA */}
      <Card
        bordered={false}
        style={{
          boxShadow:
            "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
          borderRadius: "8px",
          background: "#fff",
          border: "1px solid #f0f0f0",
        }}
        bodyStyle={{ padding: "0px" }}
      >
        {fromUserId ? (
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: (k, record) => {
                setSelectedRowData(record);
                setSelectedRowKeys(k);
              },
            }}
            columns={columns}
            dataSource={finalTasks}
            rowKey={(record) => record._id}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              hideOnSinglePage: true,
            }}
            expandable={{
              expandedRowRender: (record) => {
                const createdDate = record?.createdAt
                  ? new Date(record.createdAt).toLocaleString("en-IN")
                  : "-";

                const startDate = record?.startDate
                  ? new Date(record.startDate).toLocaleString("en-IN")
                  : "-";

                const dueDate = record?.dueDate
                  ? new Date(record.dueDate).toLocaleString("en-IN")
                  : "-";

                const completedDate = record?.completedAt
                  ? new Date(record.completedAt).toLocaleString("en-IN")
                  : "-";

                const completedChecklist =
                  record?.checklist?.filter((i) => i.isCompleted)?.length || 0;

                const totalChecklist = record?.checklist?.length || 0;

                return (
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 20,
                      overflow: "hidden",
                      border: `1px solid ${token.colorBorderSecondary}`,
                      boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
                    }}
                    bodyStyle={{
                      padding: 0,
                    }}
                  >
                    {/* HEADER */}
                    <div
                      style={{
                        padding: "24px",
                        background:
                          "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 20,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Space wrap align="center">
                            <Text
                              strong
                              style={{
                                fontSize: 22,
                                lineHeight: 1.3,
                              }}
                            >
                              {record?.title}
                            </Text>

                            <Tag color="blue">{record?.taskType}</Tag>

                            <Tag
                              color={
                                record?.status === "Completed"
                                  ? "success"
                                  : record?.status === "Pending"
                                    ? "warning"
                                    : record?.status === "Overdue"
                                      ? "error"
                                      : "processing"
                              }
                            >
                              {record?.status}
                            </Tag>

                            {record?.isReopen && (
                              <Tag color="volcano">Reopened</Tag>
                            )}
                          </Space>

                          <Paragraph
                            style={{
                              marginTop: 14,
                              marginBottom: 0,
                              color: token.colorTextSecondary,
                              fontSize: 13,
                              lineHeight: "24px",
                              maxWidth: "95%",
                            }}
                          >
                            {record?.description || "No description available"}
                          </Paragraph>
                        </div>

                        <div>
                          <div
                            style={{
                              background: "#fff",
                              padding: "14px 18px",
                              borderRadius: 14,
                              border: `1px solid ${token.colorBorderSecondary}`,
                              minWidth: 220,
                            }}
                          >
                            <Text
                              type="secondary"
                              style={{
                                fontSize: 11,
                                display: "block",
                                marginBottom: 6,
                              }}
                            >
                              TASK TRACKING ID
                            </Text>

                            <Text
                              strong
                              copyable
                              style={{
                                fontFamily: "monospace",
                                fontSize: 15,
                              }}
                            >
                              {record?.TaskId}
                            </Text>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BODY */}
                    <div style={{ padding: 24 }}>
                      <Row gutter={[20, 20]}>
                        <Col xs={24} lg={16}>
                          <Space
                            direction="vertical"
                            size={20}
                            style={{ width: "100%" }}
                          >
                            <Card
                              size="small"
                              title="Task Information"
                              style={{ borderRadius: 16 }}
                            >
                              <Row gutter={[16, 16]}>
                                <Col xs={24} md={12}>
                                  <Statistic
                                    title="Assigned To"
                                    value={record?.assignedTo?.name || "-"}
                                    valueStyle={{ fontSize: 15 }}
                                  />
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                  >
                                    {record?.assignedTo?.email}
                                  </Text>
                                </Col>

                                <Col xs={24} md={12}>
                                  <Statistic
                                    title="Assigned By"
                                    value={record?.assignedBy?.name || "-"}
                                    valueStyle={{ fontSize: 15 }}
                                  />
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                  >
                                    {record?.assignedBy?.email}
                                  </Text>
                                </Col>

                                <Col xs={12} md={8}>
                                  <Statistic
                                    title="Department"
                                    value={
                                      record?.departmentOfAssignToUser?.name ||
                                      "-"
                                    }
                                    valueStyle={{ fontSize: 15 }}
                                  />
                                </Col>

                                <Col xs={12} md={8}>
                                  <Statistic
                                    title="Duration"
                                    value={record?.taskEndDays || 0}
                                    suffix="Days"
                                    valueStyle={{ fontSize: 15 }}
                                  />
                                </Col>

                                <Col xs={12} md={8}>
                                  <Statistic
                                    title="Checklist"
                                    value={`${completedChecklist}/${totalChecklist}`}
                                    valueStyle={{ fontSize: 15 }}
                                  />
                                </Col>
                              </Row>
                            </Card>

                            <Card
                              size="small"
                              title="Task Checklist"
                              extra={
                                <Tag color="processing">
                                  {completedChecklist}/{totalChecklist}{" "}
                                  Completed
                                </Tag>
                              }
                              style={{ borderRadius: 16 }}
                            >
                              <Progress
                                percent={
                                  totalChecklist > 0
                                    ? Math.round(
                                        (completedChecklist / totalChecklist) *
                                          100,
                                      )
                                    : 0
                                }
                                strokeWidth={8}
                              />

                              <List
                                style={{ marginTop: 18 }}
                                dataSource={record?.checklist || []}
                                locale={{
                                  emptyText: "No checklist items",
                                }}
                                renderItem={(item, index) => (
                                  <List.Item
                                    style={{
                                      padding: "10px 0",
                                      borderBottom:
                                        index !== totalChecklist - 1
                                          ? `1px solid ${token.colorBorderSecondary}`
                                          : "none",
                                    }}
                                  >
                                    <Checkbox
                                      checked={item?.isCompleted}
                                      disabled
                                    >
                                      <span
                                        style={{
                                          fontSize: 13,
                                          textDecoration: item?.isCompleted
                                            ? "line-through"
                                            : "none",
                                          color: item?.isCompleted
                                            ? token.colorTextDisabled
                                            : token.colorText,
                                        }}
                                      >
                                        {item?.text}
                                      </span>
                                    </Checkbox>
                                  </List.Item>
                                )}
                              />
                            </Card>

                            {record?.isReopen && record?.reopenedReason && (
                              <Alert
                                type="warning"
                                showIcon
                                message="Task Reopened"
                                description={record?.reopenedReason}
                                style={{ borderRadius: 14 }}
                              />
                            )}
                          </Space>
                        </Col>

                        <Col xs={24} lg={8}>
                          <Card
                            size="small"
                            title="Timeline & Activity"
                            style={{ borderRadius: 16, height: "100%" }}
                          >
                            <Space
                              direction="vertical"
                              size={16}
                              style={{ width: "100%" }}
                            >
                              {[
                                {
                                  label: "Start Date",
                                  value: startDate,
                                },
                                {
                                  label: "Due Date",
                                  value: dueDate,
                                  color: "#d46b08",
                                  bg: "#fff7e6",
                                },
                                {
                                  label: "Created At",
                                  value: createdDate,
                                },
                                ...(record?.completedAt
                                  ? [
                                      {
                                        label: "Completed At",
                                        value: completedDate,
                                        color: "#389e0d",
                                        bg: "#f6ffed",
                                      },
                                    ]
                                  : []),
                              ].map((item, index) => (
                                <div
                                  key={index}
                                  style={{
                                    padding: 16,
                                    borderRadius: 14,
                                    background: item.bg || "#fafafa",
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                  }}
                                >
                                  <Text
                                    type="secondary"
                                    style={{
                                      fontSize: 11,
                                      display: "block",
                                      marginBottom: 6,
                                    }}
                                  >
                                    {item.label}
                                  </Text>

                                  <Text
                                    strong
                                    style={{
                                      fontSize: 13,
                                      color: item.color || token.colorText,
                                      lineHeight: "22px",
                                    }}
                                  >
                                    {item.value}
                                  </Text>
                                </div>
                              ))}
                            </Space>
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  </Card>
                );
              },
              rowExpandable: () => true,
            }}
          />
        ) : (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <InboxOutlined
              style={{
                fontSize: "40px",
                color: token.colorTextDisabled,
                marginBottom: "12px",
              }}
            />
            <Title
              level={5}
              style={{
                margin: 0,
                fontWeight: 600,
                color: token.colorTextDescription,
              }}
            >
              No Active Task Data Available
            </Title>
            <Text
              type="secondary"
              style={{ fontSize: "13px", marginTop: "4px", display: "block" }}
            >
              Use the employee selector above to retrieve assigned workloads and
              begin task transfer management.
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
}
