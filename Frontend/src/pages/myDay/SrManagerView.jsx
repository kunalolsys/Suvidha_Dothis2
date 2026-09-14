import React, { useState } from 'react';
import { 
  Pause, 
  Trash2, 
  Check, 
  Upload, 
  FileText, 
  Info,
  History,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { Progress } from "../../components/ui/progress";

// --- Data from your images ---
const todayTasks = [
  {
    sr: 1,
    title: 'Finalize Marketing Budget',
    type: 'Delegate',
    source: 'Atul Mohan',
    attachment: true,
    dueDate: '2025-10-26',
    delay: '2 days',
    status: 'Overdue',
    isOverdue: true,
    priority: 'high',
  },
  {
    sr: 2,
    title: 'FMS-1-L1-03',
    type: 'Timeless FMS',
    source: 'Social Media FMS',
    attachment: false,
    dueDate: '2025-10-28',
    delay: null,
    status: 'Due Today',
    isOverdue: false,
    priority: 'medium',
  },
  {
    sr: 3,
    title: 'FMS-2-L1-02',
    type: 'Fixed Period FMS',
    source: 'Quarterly Financial Audit',
    attachment: false,
    dueDate: '2025-10-28',
    delay: null,
    status: 'Due Today',
    isOverdue: false,
    priority: 'low',
  },
];

const upcomingTasks = [
  {
    sr: 1,
    title: 'Prepare Q1 Sales Deck',
    type: 'Delegate',
    source: 'Atul Mohan',
    attachment: true,
    frequency: 'One-time',
    plannedDate: '2025-11-15',
    priority: 'high',
  },
  {
    sr: 2,
    title: 'Weekly Team Sync',
    type: 'Delegate',
    source: 'Self',
    attachment: false,
    frequency: 'Weekly',
    plannedDate: '2025-11-04',
    priority: 'medium',
  },
  {
    sr: 3,
    title: 'FMS-3-L1-01',
    type: 'Timeless FMS',
    source: 'New Employee Onboarding',
    attachment: false,
    frequency: 'One-time',
    plannedDate: '2025-11-01',
    priority: 'low',
  },
];

const completedTasks = [
  {
    sr: 1,
    title: 'Review Q4 Marketing Report',
    type: 'Delegate',
    source: 'Atul Mohan',
    attachment: true,
    plannedDate: '2025-10-25',
    actualDate: '2025-10-26',
    delay: '1 day',
    status: 'completed',
  },
  {
    sr: 2,
    title: 'FMS-2-L1-01',
    type: 'Fixed Period FMS',
    source: 'Quarterly Audit',
    attachment: false,
    plannedDate: '2025-10-27',
    actualDate: '2025-10-27',
    delay: '0',
    status: 'completed',
  },
];

const escalatedTasks = [
    {
      "srNo": 1,
      "taskId": "T-001",
      "descriptionLink": "/tasks/T-001",
      "doer": "Jane Doe",
      "dueDate": "2025-10-07",
      "delay": "1 day",
      "escalatedBy": "Baldev Singh",
      "escalationDate": "2025-10-08",
      "commentsLink": "/comments/T-001"
    },
    {
      "srNo": 2,
      "taskId": "FMS-1-L1-02",
      "descriptionLink": "/tasks/FMS-1-L1-02",
      "doer": "John Smith",
      "dueDate": "2025-10-07",
      "delay": "2 days",
      "escalatedBy": "Baldev Singh",
      "escalationDate": "2025-10-09",
      "commentsLink": "/comments/FMS-1-L1-02"
    }
  ]

// --- Helper Components ---

// Priority Badge
const PriorityBadge = ({ priority }) => {
  const config = {
    high: { label: 'High', class: 'bg-red-100 text-red-800 border-red-200' },
    medium: { label: 'Medium', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    low: { label: 'Low', class: 'bg-green-100 text-green-800 border-green-200' },
  };
  
  const { label, class: className } = config[priority] || config.medium;
  
  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  );
};

// Status Badges with icons
const getStatusBadge = (status) => {
  switch (status) {
    case 'Overdue':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {status}
        </Badge>
      );
    case 'Due Today':
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 border-yellow-300 bg-yellow-50">
          <Clock className="h-3 w-3" />
          {status}
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-300 bg-green-50">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Enhanced View Link
const ViewLink = ({ hasAttachment = true }) => (
  <Button 
    variant="link" 
    className={`p-0 h-auto ${hasAttachment ? 'text-blue-600' : 'text-gray-400 cursor-not-allowed'}`}
    disabled={!hasAttachment}
  >
    View
  </Button>
);

// Enhanced Today's Task Actions
const TodayTaskActions = ({ task }) => (
  <TooltipProvider>
    <div className="flex gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
            <History className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>View History</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Delete</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-green-600 hover:bg-green-50"
          >
            <Check className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Mark as Done</p></TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);

// Enhanced Completed Task Details
const CompletedTaskDetails = () => (
  <TooltipProvider>
    <div className="flex gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
            <FileText className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>View Form</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:bg-gray-50">
            <Info className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>View Details</p></TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);

// Task Progress Component
const TaskProgress = ({ completed, total }) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3">
      <Progress value={percentage} className="w-24" />
      <span className="text-sm text-gray-600">{completed}/{total}</span>
    </div>
  );
};

// Stats Cards Component
const StatsCards = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Total Tasks</p>
            <p className="text-2xl font-bold text-blue-700">12</p>
          </div>
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600">Overdue</p>
            <p className="text-2xl font-bold text-red-700">3</p>
          </div>
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Completed</p>
            <p className="text-2xl font-bold text-green-700">8</p>
          </div>
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600">Due Today</p>
            <p className="text-2xl font-bold text-purple-700">2</p>
          </div>
          <div className="p-2 bg-purple-100 rounded-lg">
            <Clock className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Enhanced Filter Bar Component
const FilterBar = ({ showExport = false }) => (
  <div className="flex flex-col md:flex-row gap-3 mt-6 p-4 bg-gray-50 rounded-lg border">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Search tasks, descriptions..."
        className="pl-10 bg-white"
      />
    </div>
    
    <div className="flex flex-col sm:flex-row gap-2 flex-1">
      <Select>
        <SelectTrigger className="w-full bg-white">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="delegate">Delegate</SelectItem>
          <SelectItem value="fms">FMS</SelectItem>
        </SelectContent>
      </Select>
      
      <Select>
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="due-today">Due Today</SelectItem>
        </SelectContent>
      </Select>
      
      <Select>
        <SelectTrigger className="w-full bg-white">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
    
    {showExport && (
      <Button className="bg-gray-800 hover:bg-gray-900 text-white whitespace-nowrap">
        <Upload className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
    )}
  </div>
);

// --- Main Component ---
const SrManagerView = () => {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-700 text-white pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">Senior Manager View</CardTitle>
                <CardDescription className="text-blue-100 mt-2">
                  Oversee your team's tasks and escalations
                </CardDescription>
              </div>
              <TaskProgress completed={8} total={12} />
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <StatsCards />
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 p-1 bg-gray-100 rounded-lg">
                <TabsTrigger 
                  value="today" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                >
                  Today's Task
                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                    {todayTasks.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="upcoming" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                >
                  Upcoming Tasks
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                >
                  Completed Tasks
                </TabsTrigger>
                <TabsTrigger 
                  value="escalated" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                >
                  Escalated
                </TabsTrigger>
              </TabsList>

              <FilterBar showExport={true} />

              {/* --- Today's Task Tab --- */}
              <TabsContent value="today" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr. No.</TableHead>
                        <TableHead>Task Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Attachment</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Delay</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayTasks.map((task) => (
                        <TableRow key={task.sr} className={task.isOverdue ? 'bg-red-50' : ''}>
                          <TableCell>{task.sr}</TableCell>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell><ViewLink /></TableCell>
                          <TableCell>{task.type}</TableCell>
                          <TableCell>{task.source}</TableCell>
                          <TableCell><ViewLink hasAttachment={task.attachment} /></TableCell>
                          <TableCell>{task.dueDate}</TableCell>
                          <TableCell className={task.delay ? 'text-red-600' : ''}>{task.delay}</TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell><TodayTaskActions task={task} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              {/* --- Upcoming Tasks Tab --- */}
              <TabsContent value="upcoming" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr. No.</TableHead>
                        <TableHead>Task Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Attachment</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Planned Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingTasks.map((task) => (
                        <TableRow key={task.sr}>
                          <TableCell>{task.sr}</TableCell>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell><ViewLink /></TableCell>
                          <TableCell>{task.type}</TableCell>
                          <TableCell>{task.source}</TableCell>
                          <TableCell><ViewLink hasAttachment={task.attachment} /></TableCell>
                          <TableCell>{task.frequency}</TableCell>
                          <TableCell>{task.plannedDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* --- Completed Tasks Tab --- */}
              <TabsContent value="completed" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr. No.</TableHead>
                        <TableHead>Task Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Attachment</TableHead>
                        <TableHead>Planned Date</TableHead>
                        <TableHead>Actual Date</TableHead>
                        <TableHead>Delay</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedTasks.map((task) => (
                        <TableRow key={task.sr}>
                          <TableCell>{task.sr}</TableCell>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell><ViewLink /></TableCell>
                          <TableCell>{task.type}</TableCell>
                          <TableCell>{task.source}</TableCell>
                          <TableCell><ViewLink hasAttachment={task.attachment} /></TableCell>
                          <TableCell>{task.plannedDate}</TableCell>
                          <TableCell>{task.actualDate}</TableCell>
                          <TableCell className={task.delay !== '0' ? 'text-red-600' : ''}>{task.delay}</TableCell>
                          <TableCell><CompletedTaskDetails /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* --- Escalated Tasks Tab --- */}
              <TabsContent value="escalated" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr. No.</TableHead>
                        <TableHead>Task Id</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Doer</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Delay</TableHead>
                        <TableHead>Escalated By</TableHead>
                        <TableHead>Escalation Date</TableHead>
                        <TableHead>Comments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escalatedTasks.map((task) => (
                        <TableRow key={task.srNo}>
                          <TableCell>{task.srNo}</TableCell>
                          <TableCell>{task.taskId}</TableCell>
                          <TableCell><ViewLink /></TableCell>
                          <TableCell>{task.doer}</TableCell>
                          <TableCell>{task.dueDate}</TableCell>
                          <TableCell className={task.delay ? 'text-red-600' : ''}>{task.delay}</TableCell>
                          <TableCell>{task.escalatedBy}</TableCell>
                          <TableCell>{task.escalationDate}</TableCell>
                          <TableCell><ViewLink /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SrManagerView;
