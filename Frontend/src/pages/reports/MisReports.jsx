import {
  Download,
  Filter,
  TrendingUp,
  Crown,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useSelector } from "react-redux";
import api from "../../lib/api";
import { DatePicker, Tooltip } from "antd";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { EyeFilled } from "@ant-design/icons";

const { RangePicker } = DatePicker;

const MisReports = () => {
  const { currentUser } = useSelector((state) => state.users);
  const navigate = useNavigate();
  const [selectedDoer, setSelectedDoer] = useState("all");
  const [selectedManager, setSelectedManager] = useState("all");
  const [selectedSrManager, setSelectedSrManager] = useState("all");

  const [doers, setDoers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [srManagers, setSrManagers] = useState([]);

  const [dateRange, setDateRange] = useState([null, null]);
  const [interval, setInterval] = useState("yearly");

  const [taskDetails, setTaskDetails] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [summary, setSummary] = useState({});
  const [topPerformers, setTopPerformers] = useState([]);
  const [lowPerformers, setLowPerformers] = useState([]);

  const handleChange = (dates) => {
    setDateRange(dates);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/setup/users/allUsers");

        const users = response.data?.data || [];

        const doers = users.filter((u) => u.role?.name === "member");

        const managers = users.filter((u) => u.role?.name === "manager");

        const srManagers = users.filter((u) => u.role?.name === "sr._manager");

        setDoers(doers);
        setManagers(managers);
        setSrManagers(srManagers);
      } catch (error) {
        console.log(error);
      }
    };

    if (currentUser?._id) {
      fetchUsers();
    }
  }, [currentUser]);

  const handleGetReport = async () => {
    try {
      const payload = {
        period: interval,
        startDate: dateRange?.[0]?.format("YYYY-MM-DD"),
        endDate: dateRange?.[1]?.format("YYYY-MM-DD"),
        srManagerId:
          selectedSrManager !== "all" ? selectedSrManager : undefined,
        managerId: selectedManager !== "all" ? selectedManager : undefined,
        memberIds: selectedDoer !== "all" ? [selectedDoer] : [],
      };

      const response = await api.post("/mis/report", payload);

      setTaskDetails(response.data.reports || []);
      setAllTasks(response.data.tasks || []);
      setSummary(response.data.summary || {});
      setTopPerformers(response.data.topPerformers || []);
      setLowPerformers(response.data.lowPerformers || []);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch report");
    }
  };

  useEffect(() => {
    handleGetReport();
  }, [interval]);

  const exportToCSV = (data, fileName = "MIS_Report.csv") => {
    if (!data?.length) {
      toast.error("No record found");
      return;
    }

    const formattedData = data.map((item, index) => ({
      "Sr No": index + 1,
      "User Name": item.userName,
      Role: item.role,
      Departments: item.departments?.join(", "),
      "Total Tasks": item.totalTasks,
      Completed: item.completed,
      Pending: item.pending,
      Upcoming: item.upcoming,
      Overdue: item.overdue,
      Delayed: item.delayed,
      "Completion Rate %": item.completionRate,
      "On Time Rate %": item.onTimeRate,
      "Overdue Rate %": item.overdueRate,
    }));

    const headers = Object.keys(formattedData[0]);

    const csvRows = [
      headers.join(","),
      ...formattedData.map((row) =>
        headers.map((field) => `"${row[field] ?? ""}"`).join(","),
      ),
    ];

    const csvString = csvRows.join("\n");

    const blob = new Blob([csvString], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", fileName);

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* FILTER SECTION */}

      <div className="bg-white border rounded-xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Filter className="w-5 h-5 text-blue-600" />
            </div>

            <div>
              <h1 className="text-lg font-semibold">MIS Reports</h1>
              <p className="text-xs text-gray-500">
                Team performance analytics
              </p>
            </div>
          </div>

          <Button onClick={() => exportToCSV(taskDetails)}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Interval */}

          <div className="min-w-[160px]">
            <label className="text-xs text-gray-500">Interval</label>

            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Interval" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}

          <div className="min-w-[250px]">
            <label className="text-xs text-gray-500">Date Range</label>

            <RangePicker
              value={dateRange}
              onChange={handleChange}
              className="w-full h-9"
            />
          </div>

          {/* SR MANAGER */}

          <div className="min-w-[180px]">
            <label className="text-xs text-gray-500">Sr Manager</label>

            <Select
              value={selectedSrManager}
              onValueChange={setSelectedSrManager}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All</SelectItem>

                {srManagers.map((item) => (
                  <SelectItem key={item._id} value={item._id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MANAGER */}

          <div className="min-w-[180px]">
            <label className="text-xs text-gray-500">Manager</label>

            <Select value={selectedManager} onValueChange={setSelectedManager}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All</SelectItem>

                {managers.map((item) => (
                  <SelectItem key={item._id} value={item._id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MEMBER */}

          <div className="min-w-[180px]">
            <label className="text-xs text-gray-500">Member</label>

            <Select value={selectedDoer} onValueChange={setSelectedDoer}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All</SelectItem>

                {doers.map((item) => (
                  <SelectItem key={item._id} value={item._id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGetReport}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Get Report
          </Button>
        </div>
      </div>

      {/* SUMMARY */}

      {/* <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {[
          {
            label: "Total",
            value: summary.totalTasks || 0,
            bg: "bg-blue-100",
            text: "text-blue-700",
          },
          {
            label: "Completed",
            value: summary.completed || 0,
            bg: "bg-green-100",
            text: "text-green-700",
          },
          {
            label: "Pending",
            value: summary.pending || 0,
            bg: "bg-yellow-100",
            text: "text-yellow-700",
          },
          {
            label: "Upcoming",
            value: summary.upcoming || 0,
            bg: "bg-indigo-100",
            text: "text-indigo-700",
          },
          {
            label: "Overdue",
            value: summary.overdue || 0,
            bg: "bg-red-100",
            text: "text-red-700",
          },
          {
            label: "Delayed",
            value: summary.delayed || 0,
            bg: "bg-orange-100",
            text: "text-orange-700",
          },
          {
            label: "On Time",
            value: summary.doneOnTime || 0,
            bg: "bg-emerald-100",
            text: "text-emerald-700",
          },
        ].map((item, index) => (
          <Card key={index} className="p-4 shadow-sm border">
            <div
              className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}
            >
              <Sparkles className={`w-5 h-5 ${item.text}`} />
            </div>

            <p className="text-sm text-gray-500">{item.label}</p>

            <h2 className={`text-2xl font-bold mt-1 ${item.text}`}>
              {item.value}
            </h2>
          </Card>
        ))}
      </div> */}

      {/* CHART + TOP */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* TOP PERFORMERS */}

        <Card className="p-5 shadow-sm border">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Crown className="w-5 h-5 text-yellow-700" />
            </div>

            <h2 className="font-semibold text-lg">Top Performers</h2>
          </div>

          <div className="space-y-4">
            {topPerformers?.length > 0 ? (
              topPerformers.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <h3 className="font-semibold">{item.userName}</h3>

                    <p className="text-xs text-gray-500">{item.role}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-green-600 font-bold">
                      {item.completionRate}%
                    </p>

                    <p className="text-xs text-gray-500">Completion Rate</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                No top performers found
              </div>
            )}
          </div>
        </Card>

        {/* LOW PERFORMERS */}

        <Card className="p-5 shadow-sm border">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-700" />
            </div>

            <h2 className="font-semibold text-lg">Low Performers</h2>
          </div>

          <div className="space-y-4">
            {lowPerformers?.length > 0 ? (
              lowPerformers.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <h3 className="font-semibold">{item.userName}</h3>

                    <p className="text-xs text-gray-500">{item.role}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-red-600 font-bold">
                      {item.overdueRate}%
                    </p>

                    <p className="text-xs text-gray-500">Overdue Rate</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                No low performers found
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* CHART */}

      <Card className="p-5 shadow-sm border mb-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-indigo-700" />
          </div>

          <h2 className="font-semibold text-lg">Performance Overview</h2>
        </div>

        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taskDetails}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="userName" tick={{ fontSize: 12 }} interval={0} />

              <YAxis
                domain={[-100, 0]}
                reversed={true}
                ticks={[0, -25, -50, -75, -100]}
              />

              <Tooltip
                formatter={(value) => [`${value}%`, "Completion Rate"]}
              />

              <Bar dataKey="completionRate" radius={[8, 8, 0, 0]}>
                {taskDetails.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.completionRate >= -30
                        ? "#22c55e"
                        : entry.completionRate >= -70
                          ? "#eab308"
                          : "#ef4444"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* USER TABLE */}

      <Card className="shadow-sm border overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">User Performance Report</h2>

            <p className="text-sm text-gray-500 mt-1">
              Detailed user-wise productivity analytics
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="min-w-[60px]">Sr. No.</TableHead>

                <TableHead className="min-w-[220px]">Doer</TableHead>

                <TableHead className="min-w-[120px]">Role</TableHead>

                <TableHead className="min-w-[180px]">Departments</TableHead>

                <TableHead className="text-center">Total</TableHead>

                <TableHead className="text-center">Completed</TableHead>

                <TableHead className="text-center">On Time</TableHead>

                <TableHead className="text-center">Delayed</TableHead>

                <TableHead className="text-center">Pending</TableHead>

                <TableHead className="text-center">Upcoming</TableHead>

                <TableHead className="text-center">Overdue</TableHead>

                <TableHead className="text-center">
                  Overall Completion %
                </TableHead>

                <TableHead className="text-center">On Time %</TableHead>

                <TableHead className="text-center">Not On Time %</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {taskDetails?.length > 0 ? (
                taskDetails.map((item, index) => {
                  const completionRate = item.completionRate || 0;

                  const onTimeRate =
                    item.onTimeCompletionRate || item.onTimeRate || 0;

                  const delayedRate = item.delayedCompletionRate || 0;

                  return (
                    <TableRow
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* SR */}
                      <TableCell className="font-medium">{index + 1}</TableCell>

                      {/* USER */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">
                            {item.userName || "-"}
                          </span>

                          <span className="text-xs text-gray-500">
                            {item.email || "-"}
                          </span>
                        </div>
                      </TableCell>

                      {/* ROLE */}
                      <TableCell>
                        <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                          {item.role || "-"}
                        </span>
                      </TableCell>

                      {/* DEPARTMENT */}
                      <TableCell>
                        <div className="text-sm text-gray-700">
                          {Array.isArray(item.departments)
                            ? item.departments.join(", ")
                            : item.departments || "-"}
                        </div>
                      </TableCell>

                      {/* TOTAL */}
                      <TableCell className="text-center font-semibold">
                        {item.totalTasks || 0}
                      </TableCell>

                      {/* COMPLETED */}
                      <TableCell className="text-center">
                        <span className="font-semibold">
                          {item.completed || 0}
                        </span>
                      </TableCell>

                      {/* ON TIME */}
                      <TableCell className="text-center">
                        <span className="font-semibold">
                          {item.doneOnTime || 0}
                        </span>
                      </TableCell>

                      {/* DELAYED */}
                      <TableCell className="text-center">
                        <span className="font-semibold">
                          {item.delayed || 0}
                        </span>
                      </TableCell>

                      {/* PENDING */}
                      <TableCell className="text-center">
                        <span className="font-semibold">
                          {item.pending || 0}
                        </span>
                      </TableCell>

                      {/* UPCOMING */}
                      <TableCell className="text-center">
                        <span className="font-semibold">
                          {item.upcoming || 0}
                        </span>
                      </TableCell>

                      {/* OVERDUE */}
                      <TableCell className="text-center">
                        <span className="font-semibold">
                          {item.overdue || 0}
                        </span>
                      </TableCell>

                      {/* COMPLETION RATE */}
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold `}
                        >
                          {completionRate}
                        </span>
                      </TableCell>

                      {/* ON TIME RATE */}
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold `}
                        >
                          {onTimeRate}
                        </span>
                      </TableCell>

                      {/* DELAYED RATE */}
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold `}
                        >
                          {delayedRate}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <EyeFilled
                          height={35}
                          width={35}
                          onClick={() =>
                            navigate(`/user/${item.userId}`, {
                              state: {
                                userName: item.userName,
                              },
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={14}
                    className="text-center py-14 text-gray-500"
                  >
                    No report data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default MisReports;
