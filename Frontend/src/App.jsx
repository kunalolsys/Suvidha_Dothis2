import React, { useState, useEffect } from "react";
import "@radix-ui/themes/styles.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TaskPage from "./pages/TaskPage";
import ProtectedLayout from "./ProtectedLayout";
import Login from "./pages/Login";

// Dashboard imports
import AdminDashboard from "./pages/dashboard/AdminDashboard";

// Setup imports
import RolesPermissions from "./pages/setup/RolesPermissions";
import Users from "./pages/setup/Users";
import WorkShifts from "./pages/setup/WorkShifts";
import DepartmentCalender from "./pages/setup/DepartmentCalender";
import DataMaster from "./pages/setup/DataMaster";
import AddUser from "./pages/setup/AddUser";
import EditUser from "./pages/setup/EditUser";

// My-Day imports
import ManagerView from "./pages/myDay/ManagerView";
import MyTask from "./pages/myDay/MyTask";
import FmsTasks from "./pages/myDay/FmsTask";
import PCView from "./pages/myDay/PcView";
import TaskReassignmentPage from "./pages/myDay/TaskReassignmentPage";
import UserTaskHistory from "./pages/myDay/userTaskView";

// Reports & Audit imports
import MisReports from "./pages/reports/MisReports";
import FmsReports from "./pages/reports/FmsReports";
import FmsTask360AuditPage from "./pages/reports/FmsTask360AuditPage";

// FMS Engine imports
import UpcomingOngoingFms from "./pages/fmsEngine/UpcomingOngoingFms";
import FmsTemplates from "./pages/fmsEngine/FmsTemplates";
import FmsLaunch from "./pages/fmsEngine/FmsLaunch";
import CreateNewFmsTem from "./pages/fmsEngine/CreateNewFmsTem";
import ViewFmsTemp from "./pages/fmsEngine/ViewFmsTemp";
import FmsLaunchedView from "./pages/fmsEngine/fmsInstanceView";
import OpenFormBuilder from "./pages/fmsEngine/OpenForm";
import OpenFormResponses from "./pages/fmsEngine/OpenFormResponses";

// Task Delegation & Buckets imports
import TaskDistributionCenter from "./pages/task-distribution/TaskDistribution";
import BucketCreation from "./pages/task-distribution/BucketTaskCreation";
import DistributionBuckets from "./pages/task-distribution/BucketTaskDist";
import BucketListingPage from "./pages/task-distribution/BucketListingPage";
import PendingBucketRequest from "./pages/task-distribution/PendingBucketReques";
import TaskAudienceMaster from "./components/RoleMaster/TargetRoleMaster";

// Public Forms
import PublicOpenForm from "./pages/public-form/PublicOpenForm";
import BucketReqOpenForm from "./pages/public-form/BucketReqOpenForm";

// Utility / System Components
import { Toaster } from "sonner";
import PageNotFound from "./pages/PageNotFound";
import ResetPassword from "./pages/ResetPassword";
import AccessDenied from "./pages/AccessDenied";
import PermissionRoute from "./PermissionRoute";
import ImportTask from "./pages/ImportTask";
import Profile from "./pages/Profile";
import SessionTimeoutDialog from "./components/SessionTimeoutDialog";
import LogsDashboard from "./pages/logs";
import { SocketProvider } from "./context/SocketContext";
import { TaskChatProvider } from "./context/TaskChatContext";
import FloatingManualButton from "./components/FloatingManualButton";
import SuperModuleSettings from "./pages/SuperModuleSettings";
import CompanyProfile from "./pages/CompanyProfile";
import NotificationIntegrations from "./pages/Notificationintegrations";

function App() {
  const [isSessionTimeoutModalOpen, setIsSessionTimeoutModalOpen] =
    useState(false);

  const handleSessionTimeout = () => {
    setIsSessionTimeoutModalOpen(true);
  };

  const handleCloseSessionTimeoutModal = () => {
    setIsSessionTimeoutModalOpen(false);
  };

  useEffect(() => {
    const sessionTimeoutListener = () => {
      handleSessionTimeout();
    };

    window.addEventListener("session-timeout", sessionTimeoutListener);

    return () => {
      window.removeEventListener("session-timeout", sessionTimeoutListener);
    };
  }, []);

  return (
    <>
      <Toaster richColors position="top-center" />
      <BrowserRouter>
        <SessionTimeoutDialog
          open={isSessionTimeoutModalOpen}
          onCancel={handleCloseSessionTimeoutModal}
        />
        <SocketProvider>
          <TaskChatProvider>
            <Routes>
              {/* Public Unprotected Routes */}
              <Route path="/" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/page-restrict-found" element={<AccessDenied />} />
              <Route path="/open-form/:slug" element={<PublicOpenForm />} />
              <Route path="/open-bucket-form" element={<BucketReqOpenForm />} />

              {/* Protected Workspace Layout */}
              <Route element={<ProtectedLayout />}>
                {/* 1. Dashboard & Core Profile */}
                <Route
                  path="/dashboard"
                  element={
                    <PermissionRoute requiredPermission="dashboard">
                      <AdminDashboard />
                    </PermissionRoute>
                  }
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="/logs" element={<LogsDashboard />} />

                {/* 2. My Day Submodules */}
                <Route
                  path="/my-day/mytasks"
                  element={
                    <PermissionRoute requiredPermission="delegated_recurring">
                      <MyTask />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/my-day/my-fms-tasks"
                  element={
                    <PermissionRoute requiredPermission="fms_tasks">
                      <FmsTasks />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/my-day/view"
                  element={
                    <PermissionRoute requiredPermission="role_view">
                      <ManagerView />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/my-day/pc-view"
                  element={
                    <PermissionRoute requiredPermission="role_view">
                      <PCView />
                    </PermissionRoute>
                  }
                />
                <Route path="/user/:userId" element={<UserTaskHistory />} />

                {/* 3. Delegation Tasks & Reassignment */}
                <Route
                  path="/delegation-tasks"
                  element={
                    <PermissionRoute requiredPermission="delegation_task">
                      <TaskPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/reassign"
                  element={
                    <PermissionRoute requiredPermission="task_reassigning">
                      <TaskReassignmentPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/import-tasks"
                  element={
                    <PermissionRoute requiredPermission="delegation_task">
                      <ImportTask />
                    </PermissionRoute>
                  }
                />

                {/* 4. Delegation Buckets */}
                <Route
                  path="/task-distribution"
                  element={
                    <PermissionRoute requiredPermission="bucket_view">
                      <TaskDistributionCenter />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/delegate/task-buckets"
                  element={
                    <PermissionRoute requiredPermission="task_buckets">
                      <BucketCreation />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/delegate/task-buckets/edit/:bucketId"
                  element={
                    <PermissionRoute requiredPermission="task_buckets">
                      <BucketCreation />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/delegate/pending-buckets"
                  element={
                    <PermissionRoute requiredPermission="pending_buckets">
                      <PendingBucketRequest />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/delegate/bucket-view"
                  element={
                    <PermissionRoute requiredPermission="bucket_view">
                      <BucketListingPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/bucket/my-bucket"
                  element={
                    <PermissionRoute requiredPermission="my_bucket">
                      <DistributionBuckets />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/delegate/audience-master"
                  element={
                    <PermissionRoute requiredPermission="manage_assignee">
                      <TaskAudienceMaster />
                    </PermissionRoute>
                  }
                />

                {/* 5. FMS Engine Submodules */}
                <Route
                  path="/fms-engine/templates"
                  element={
                    <PermissionRoute requiredPermission="fms_templates">
                      <FmsTemplates />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/fms-engine/create-template"
                  element={
                    <PermissionRoute requiredPermission="fms_templates">
                      <CreateNewFmsTem />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/fms-engine/edit-template/:id"
                  element={
                    <PermissionRoute requiredPermission="fms_templates">
                      <CreateNewFmsTem />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/fms-engine/view-template/:id"
                  element={
                    <PermissionRoute requiredPermission="fms_templates">
                      <ViewFmsTemp />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/fms-engine/launch"
                  element={
                    <PermissionRoute requiredPermission="launch_fms">
                      <FmsLaunch />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/fms-engine/upcoming"
                  element={
                    <PermissionRoute requiredPermission="upcoming_ongoing_fms">
                      <UpcomingOngoingFms />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/fms-engine/instance/:id"
                  element={
                    <PermissionRoute requiredPermission="upcoming_ongoing_fms">
                      <FmsLaunchedView />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/form-builder"
                  element={
                    <PermissionRoute requiredPermission="form_builder">
                      <OpenFormBuilder />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/form-submissions"
                  element={
                    <PermissionRoute requiredPermission="responses">
                      <OpenFormResponses />
                    </PermissionRoute>
                  }
                />

                {/* 6. Reports Submodules */}
                <Route
                  path="/reports/mis"
                  element={
                    <PermissionRoute requiredPermission="mis_reports">
                      <MisReports />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/reports/fms"
                  element={
                    <PermissionRoute requiredPermission="fms_reports">
                      <FmsReports />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/reports/360"
                  element={
                    <PermissionRoute requiredPermission="fms_reports">
                      <FmsTask360AuditPage />
                    </PermissionRoute>
                  }
                />

                {/* 7. Setup & System Administration */}
                <Route
                  path="/setup/departments-calendar"
                  element={
                    <PermissionRoute requiredPermission="departments_calendar">
                      <DepartmentCalender />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/setup/work-shifts"
                  element={
                    <PermissionRoute requiredPermission="work_shifts">
                      <WorkShifts />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/setup/data-masters"
                  element={
                    <PermissionRoute requiredPermission="users">
                      <DataMaster />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/setup/users"
                  element={
                    <PermissionRoute requiredPermission="users">
                      <Users />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/setup/add-user"
                  element={
                    <PermissionRoute requiredPermission="users">
                      <AddUser />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/setup/edit-user/:id"
                  element={
                    <PermissionRoute requiredPermission="users">
                      <EditUser />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/company-setup"
                  element={
                    <PermissionRoute requiredPermission="company_setup">
                      <CompanyProfile />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/channel-setup"
                  element={
                    <PermissionRoute requiredPermission="company_setup">
                      <NotificationIntegrations />
                    </PermissionRoute>
                  }
                />

                {/* 🔒 STRICT SUPER USER EXCLUSIVE ROUTES */}
                <Route
                  path="/setup/roles-permissions"
                  element={
                    <PermissionRoute
                      // isSuperOnly={true}
                      requiredPermission="roles_permissions"
                    >
                      <RolesPermissions />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="/super/modules"
                  element={
                    <PermissionRoute
                      isSuperOnly={true}
                      requiredPermission="module_setting"
                    >
                      <SuperModuleSettings />
                    </PermissionRoute>
                  }
                />
              </Route>

              {/* Fallback 404 Route */}
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </TaskChatProvider>
        </SocketProvider>
      </BrowserRouter>
      <FloatingManualButton />
    </>
  );
}

export default App;
