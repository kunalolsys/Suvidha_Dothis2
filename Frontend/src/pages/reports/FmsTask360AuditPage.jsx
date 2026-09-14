import React, { useEffect, useState } from "react";
import {
    Card,
    Table,
    Button,
    Tag,
    Space,
    Typography,
    Input,
    Select,
    DatePicker,
    Drawer,
    Row,
    Col,
    Statistic,
    Badge,
    Descriptions,
    Timeline,
    Tooltip,
    Alert,
    theme,
} from "antd";
import {
    SearchOutlined,
    ReloadOutlined,
    EyeOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    AlertOutlined,
    UserOutlined,
    BankOutlined,
    CalendarOutlined,
    FileTextOutlined,
    ThunderboltOutlined,
    BranchesOutlined,
    AppstoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../lib/api";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLOR_MAP = {
    Completed: { color: "success", textColor: "#16a34a" },
    Overdue: { color: "error", textColor: "#dc2626" },
    Pending: { color: "warning", textColor: "#d97706" },
    "In Progress": { color: "processing", textColor: "#2563eb" },
    Ongoing: { color: "processing", textColor: "#2563eb" },
    Upcoming: { color: "default", textColor: "#64748b" },
};

export default function FmsTask360AuditPage() {
    const { token } = theme.useToken();

    // Filters
    const [search, setSearch] = useState("");
    const [taskCategory, setTaskCategory] = useState("all"); // 'all', 'fms', 'delegation'
    const [status, setStatus] = useState("all");
    const [assignedTo, setAssignedTo] = useState(null);
    const [departmentId, setDepartmentId] = useState(null);
    const [templateId, setTemplateId] = useState("all");
    const [isDependent, setIsDependent] = useState("all");
    const [dateRange, setDateRange] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    // State Data
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState({ total: 0, completed: 0, overdue: 0, pending: 0 });

    // Drawer
    const [selectedTask, setSelectedTask] = useState(null);
    const [drawerVisible, setDrawerVisible] = useState(false);

    // Options
    const [usersList, setUsersList] = useState([]);
    const [departmentsList, setDepartmentsList] = useState([]);
    const [templatesList, setTemplatesList] = useState([]);

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const [uRes, dRes, tRes] = await Promise.all([
                    api.get("/users/filter-allUsers"),
                    api.get("/setup/departments/allDepartmentsForFMS"),
                    api.get("/fms/all-templates"),
                ]);
                setUsersList(uRes.data?.data || []);
                setDepartmentsList(dRes.data?.data || []);
                setTemplatesList(tRes.data?.data || tRes.data || []);
            } catch (err) {
                console.error("Failed to fetch dropdown options:", err);
            }
        };
        fetchDropdowns();
    }, []);

    const fetchUnifiedData = async () => {
        setLoading(true);
        try {
            const res = await api.post("/fms-report/unified-audit", {
                search,
                taskCategory,
                status: status === "all" ? null : status,
                assignedTo,
                departmentId,
                templateId: templateId === "all" ? null : templateId,
                isDependent: isDependent === "all" ? null : isDependent,
                startDate: dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : null,
                endDate: dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : null,
                page,
                limit,
            });

            setTasks(res.data?.tasks || []);
            setTotal(res.data?.total || 0);
            setSummary(res.data?.summary || { total: 0, completed: 0, overdue: 0, pending: 0 });
        } catch (err) {
            console.error("Error fetching task audit:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnifiedData();
    }, [
        search,
        taskCategory,
        status,
        assignedTo,
        departmentId,
        templateId,
        isDependent,
        dateRange,
        page,
        limit,
    ]);

    const handleOpenDrawer = (record) => {
        setSelectedTask(record);
        setDrawerVisible(true);
    };

    const columns = [
        {
            title: "Task ID",
            dataIndex: "taskId",
            key: "taskId",
            width: 150,
            render: (text) => (
                <Text strong style={{ fontFamily: "monospace", color: token.colorPrimary }}>
                    {text || "—"}
                </Text>
            ),
        },
        {
            title: "Category",
            dataIndex: "taskCategory",
            key: "taskCategory",
            width: 130,
            render: (cat) => (
                <Tag color={cat === "FmsInstanceTask" ? "blue" : "purple"}>
                    {cat === "FmsInstanceTask" ? "FMS Step" : "Delegation Task"}
                </Tag>
            ),
        },
        {
            title: "Title / Description",
            dataIndex: "title",
            key: "title",
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Text strong style={{ fontSize: "14px" }}>
                        {record.title || record.description}
                    </Text>
                    {record.instanceName && (
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                            Workflow: <b>{record.instanceName}</b>
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: "Assignee & Dept",
            key: "assignee",
            width: 220,
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Text strong><UserOutlined /> {record.assignedTo?.name || "Unassigned"}</Text>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                        <BankOutlined /> {record.departmentOfAssignToUser?.name || "N/A"}
                    </Text>
                </Space>
            ),
        },
        {
            title: "Due Date",
            dataIndex: "dueDate",
            key: "dueDate",
            width: 170,
            render: (date) => (
                date ? (
                    <Space size={4}>
                        <CalendarOutlined style={{ color: token.colorTextDescription }} />
                        <Text style={{ fontSize: "13px" }}>{dayjs(date).format("DD MMM YYYY, HH:mm")}</Text>
                    </Space>
                ) : <Text type="secondary">Pending Parent</Text>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 130,
            render: (s) => {
                const meta = STATUS_COLOR_MAP[s] || { color: "default", textColor: "#64748b" };
                return <Badge status={meta.color} text={<Text style={{ fontWeight: 600, color: meta.textColor }}>{s}</Text>} />;
            },
        },
        {
            title: "Action",
            key: "action",
            width: 90,
            render: (_, record) => (
                <Button type="primary" ghost size="small" icon={<EyeOutlined />} onClick={() => handleOpenDrawer(record)}>
                    Inspect
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: "24px", background: "#F8FAFC", minHeight: "100vh" }}>
            {/* Page Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                    <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                        Unified 360° Task Audit Workspace
                    </Title>
                    <Text type="secondary">Consolidated view of all FMS Workflow steps and Normal Delegation tasks.</Text>
                </div>
                <Button icon={<ReloadOutlined />} onClick={fetchUnifiedData} loading={loading}>
                    Refresh Ledger
                </Button>
            </div>

            {/* Summary KPI Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: "20px" }}>
                <Col xs={12} sm={6}>
                    <Card bordered={false} style={{ borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                        <Statistic title="Total Tasks In View" value={summary.total} prefix={<FileTextOutlined style={{ color: token.colorPrimary }} />} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bordered={false} style={{ borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                        <Statistic title="Overdue Tasks" value={summary.overdue} valueStyle={{ color: "#dc2626" }} prefix={<AlertOutlined />} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bordered={false} style={{ borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                        <Statistic title="Pending / Waiting" value={summary.pending} valueStyle={{ color: "#d97706" }} prefix={<ClockCircleOutlined />} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bordered={false} style={{ borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                        <Statistic title="Completed Tasks" value={summary.completed} valueStyle={{ color: "#16a34a" }} prefix={<CheckCircleOutlined />} />
                    </Card>
                </Col>
            </Row>

            {/* Filter Toolbar */}
            <Card bordered={false} style={{ borderRadius: "16px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={5}>
                        <Text strong style={{ fontSize: "12px" }}>Search ID / Title</Text>
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="Search tasks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            allowClear
                            style={{ marginTop: "4px" }}
                        />
                    </Col>
                    <Col xs={12} md={4}>
                        <Text strong style={{ fontSize: "12px" }}>Task Category</Text>
                        <Select
                            value={taskCategory}
                            onChange={setTaskCategory}
                            style={{ width: "100%", marginTop: "4px" }}
                            options={[
                                { value: "all", label: "All Categories" },
                                { value: "fms", label: "FMS Workflows" },
                                { value: "delegation", label: "Delegation Tasks" },
                            ]}
                        />
                    </Col>
                    <Col xs={12} md={4}>
                        <Text strong style={{ fontSize: "12px" }}>Status</Text>
                        <Select
                            value={status}
                            onChange={setStatus}
                            style={{ width: "100%", marginTop: "4px" }}
                            options={[
                                { value: "all", label: "All Statuses" },
                                { value: "Overdue", label: "Overdue" },
                                { value: "Pending", label: "Pending" },
                                { value: "In Progress", label: "In Progress" },
                                { value: "Completed", label: "Completed" },
                            ]}
                        />
                    </Col>
                    <Col xs={12} md={5}>
                        <Text strong style={{ fontSize: "12px" }}>Assignee</Text>
                        <Select
                            showSearch
                            allowClear
                            placeholder="All Members"
                            value={assignedTo}
                            onChange={setAssignedTo}
                            style={{ width: "100%", marginTop: "4px" }}
                            optionFilterProp="label"
                            options={usersList.map((u) => ({ value: u._id, label: u.name }))}
                        />
                    </Col>
                    <Col xs={12} md={6}>
                        <Text strong style={{ fontSize: "12px" }}>Department</Text>
                        <Select
                            showSearch
                            allowClear
                            placeholder="All Departments"
                            value={departmentId}
                            onChange={setDepartmentId}
                            style={{ width: "100%", marginTop: "4px" }}
                            optionFilterProp="label"
                            options={departmentsList.map((d) => ({ value: d._id, label: d.name }))}
                        />
                    </Col>
                    <Col xs={24} md={8}>
                        <Text strong style={{ fontSize: "12px" }}>Date Range</Text>
                        <RangePicker value={dateRange} onChange={setDateRange} style={{ width: "100%", marginTop: "4px" }} format="DD MMM YYYY" />
                    </Col>
                    <Col xs={12} md={4}>
                        <Text strong style={{ fontSize: "12px" }}>FMS Template</Text>
                        <Select
                            value={templateId}
                            onChange={setTemplateId}
                            style={{ width: "100%", marginTop: "4px" }}
                            options={[
                                { value: "all", label: "All Templates" },
                                ...templatesList.map((t) => ({ value: t._id, label: t.templateName })),
                            ]}
                        />
                    </Col>
                    <Col xs={12} md={4}>
                        <Text strong style={{ fontSize: "12px" }}>Is Dependent?</Text>
                        <Select
                            value={isDependent}
                            onChange={setIsDependent}
                            style={{ width: "100%", marginTop: "4px" }}
                            options={[
                                { value: "all", label: "All" },
                                { value: "yes", label: "Dependent Only" },
                                { value: "no", label: "Non-Dependent" },
                            ]}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Main Table */}
            <Card bordered={false} style={{ borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }} bodyStyle={{ padding: 0 }}>
                <Table
                    loading={loading}
                    columns={columns}
                    dataSource={tasks}
                    rowKey={(record) => record._id}
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total,
                        onChange: (p, l) => {
                            setPage(p);
                            setLimit(l);
                        },
                        showSizeChanger: true,
                    }}
                />
            </Card>

            {/* 360° Drawer Details */}
            <Drawer
                title={<Space><ThunderboltOutlined style={{ color: token.colorPrimary }} /> Task Detailed Audit Profile</Space>}
                width={700}
                open={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                destroyOnClose
            >
                {selectedTask && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <Alert
                            message={`ID: ${selectedTask.taskId} | Category: ${selectedTask.taskCategory}`}
                            description={selectedTask.title || selectedTask.description}
                            type={selectedTask.status === "Overdue" ? "error" : "info"}
                            showIcon
                        />

                        <Card size="small" title="Assignee & Shift Context">
                            <Descriptions column={2} size="small">
                                <Descriptions.Item label="Assigned Member"><b>{selectedTask.assignedTo?.name || "Unassigned"}</b></Descriptions.Item>
                                <Descriptions.Item label="Email">{selectedTask.assignedTo?.email || "—"}</Descriptions.Item>
                                <Descriptions.Item label="Department">{selectedTask.departmentOfAssignToUser?.name || "—"}</Descriptions.Item>
                                <Descriptions.Item label="Assigned By">{selectedTask.assignedBy?.name || "System"}</Descriptions.Item>
                                <Descriptions.Item label="Frequency">{selectedTask.frequency || "Standard"}</Descriptions.Item>
                            </Descriptions>
                        </Card>

                        <Card size="small" title="Execution Timeline Audit">
                            <Timeline
                                items={[
                                    {
                                        color: "blue",
                                        children: (
                                            <div>
                                                <Text type="secondary">START DATE</Text>
                                                <div><b>{selectedTask.startDate ? dayjs(selectedTask.startDate).format("DD MMM YYYY, HH:mm") : "—"}</b></div>
                                            </div>
                                        ),
                                    },
                                    {
                                        color: selectedTask.status === "Overdue" ? "red" : "orange",
                                        children: (
                                            <div>
                                                <Text type="secondary">DUE DATE</Text>
                                                <div><b>{selectedTask.dueDate ? dayjs(selectedTask.dueDate).format("DD MMM YYYY, HH:mm") : "Pending Parent Completion"}</b></div>
                                            </div>
                                        ),
                                    },
                                    {
                                        color: selectedTask.completedAt ? "green" : "gray",
                                        children: (
                                            <div>
                                                <Text type="secondary">COMPLETED AT</Text>
                                                <div><b>{selectedTask.completedAt ? dayjs(selectedTask.completedAt).format("DD MMM YYYY, HH:mm") : "Not Closed Yet"}</b></div>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
                    </div>
                )}
            </Drawer>
        </div>
    );
}