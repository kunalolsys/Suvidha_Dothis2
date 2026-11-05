import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../lib/api";
import { fetchTasks } from "../redux/slices/task/taskSlice";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from "../components/ui/index.jsx";

import CreateTaskForm from "../components/CreateTaskForm";
import TaskTable from "../components/TaskTable";
import { fetchUsers } from "../redux/slices/user/userSlice.js";
import { getSubmodulePermissions } from "../utils/permissionUtils.js";

const TaskPage = () => {
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "delegation_task",
    isSuper,
  );

  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [fullDescription, setFullDescription] = useState("");
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [workingWeeks, setWorkingWeeks] = useState(null);

  const dispatch = useDispatch();
  const {
    tasks,
    totalTasks,
    currentPage,
    perPage,
    status,
  } = useSelector((state) => state.tasks);
  const { currentUser } = useSelector((state) => state.users);

  const tasksLoading = status === "loading";

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [userRes, deptRes, holidayRes, workingWeekRes] = await Promise.all([
          api.get("/setup/users/filter-allUsers"),
          api.get("/setup/departments/allDepartments"),
          api.get("/setup/holiday/allHolidays"),
          api.get("/setup/working-week"),
        ]);

        if (mounted) {
          setUsers(userRes?.data?.data || []);
          setDepartments(deptRes?.data?.data || []);
          setHolidays(holidayRes?.data?.data || []);
          setWorkingWeeks(workingWeekRes?.data?.data?.workingWeek?.workingDays || null);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };

    loadData();
    dispatch(fetchUsers());
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const handleRefreshTasks = (params = {}) => {
    dispatch(fetchTasks(params));
  };

  const handleViewDescription = (description) => {
    setFullDescription(description || "No description provided.");
    setIsDescriptionDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 font-sans">
      {canCreate && (
        <CreateTaskForm
          users={users}
          departments={departments}
          holidays={holidays}
          onTaskCreated={() => handleRefreshTasks()}
          allTasks={tasks}
          workingWeeks={workingWeeks}
        />
      )}

      <TaskTable
        allTasks={tasks}
        totalTasks={totalTasks}
        currentPageProp={currentPage}
        perPageProp={perPage}
        tasksLoading={tasksLoading}
        users={users}
        departments={departments}
        currentUser={currentUser}
        holidays={holidays}
        onRefreshTasks={handleRefreshTasks}
        onViewDescription={handleViewDescription}
        workingWeeks={workingWeeks}
        canRead={canRead}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      <Dialog open={isDescriptionDialogOpen} onOpenChange={setIsDescriptionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Full Task Description</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{fullDescription}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDescriptionDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskPage;