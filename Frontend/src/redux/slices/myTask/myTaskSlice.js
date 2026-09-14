import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../lib/api"; // Adjust path as per your project structure
import dayjs from "dayjs";

// --- Thunk to fetch Table Data (Paginated) ---
export const fetchMyTasks = createAsyncThunk(
  "myTasks/fetchMyTasks",
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        userId, // Usually 'assignedTo' for employees
        assignedBy, // NEW: For Manager View
        search,
        status,
        page,
        limit,
        taskCategory,
        type,
        priority,
        dateFilter,
        view, // 'manager' or 'employee'
        creatorOrAssignorId, // NEW: For tasks created OR assigned by current user
      } = params;

      let url = "/tasks";
      const queryParams = [];

      // Filtering Logic:
      // Allow combining filters: include creator/assignor plus assignedBy/userId when provided
      if (creatorOrAssignorId)
        queryParams.push(`creatorOrAssignorId=${creatorOrAssignorId}`);
      if (assignedBy) queryParams.push(`assignedBy=${assignedBy}`);
      if (userId) queryParams.push(`userId=${userId}`);

      if (view) queryParams.push(`view=${view}`);
      if (search) queryParams.push(`search=${search}`);

      // Only append status if it is not 'all' or undefined
      if (status && status !== "all") queryParams.push(`status=${status}`);

      if (page) queryParams.push(`page=${page}`);
      if (limit) queryParams.push(`limit=${limit}`);

      // Handling Tabs & Categories
      if (taskCategory) queryParams.push(`taskCategory=${taskCategory}`);

      // Handling Stat Card Filters (e.g., 'overdue', 'dueToday')
      if (dateFilter) queryParams.push(`dateFilter=${dateFilter}`);

      if (type && type !== "all") queryParams.push(`type=${type}`);
      if (priority && priority !== "all")
        queryParams.push(`priority=${priority}`);

      if (queryParams.length > 0) {
        url = `${url}?${queryParams.join("&")}`;
      }

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
//**my task page listing  */
export const getFilterTasks = createAsyncThunk(
  "myTasks/fetchFilterTasks",
  async (params, { rejectWithValue }) => {
    try {
      const url = "/tasks/filter";

      const {
        userId,
        page = 1,
        limit = 10,
        dateRange,
        search,
        filters = {},
        creatorOrAssignorId,
      } = params;

      const payload = {
        userId,
        page,
        limit,
        creatorOrAssignorId,

        ...(search && { search }),
        ...(dateRange && {
          startDate: dateRange?.[0]
            ? dayjs(dateRange[0]).format("YYYY-MM-DD")
            : null,
          endDate: dateRange?.[1]
            ? dayjs(dateRange[1]).format("YYYY-MM-DD")
            : null,
        }),

        filters: {
          // ✅ STAT (overdue, dueToday, completed, total)
          ...(filters.stat && { stat: filters.stat }),

          // ✅ TAB CATEGORY (today_backlog, upcoming, completed)
          ...(filters.taskCategory && {
            taskCategory: filters.taskCategory,
          }),

          // ✅ STATUS (Pending, Completed, etc.)
          ...(filters.status && { status: filters.status }),

          // ✅ TASK TYPE (DelegationTask, RecurringTask)
          ...(filters.taskType && { taskType: filters.taskType }),
        },
      };

      const response = await api.post(url, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
export const getFilterFMSTasks = createAsyncThunk(
  "myTasks/fetchFilterTasks",
  async (params, { rejectWithValue }) => {
    try {
      const url = "/tasks/filter-fms";

      const {
        userId,
        role,
        page = 1,
        limit = 10,
        dateRange,
        search,
        filters = {},
        creatorOrAssignorId,
      } = params;

      const payload = {
        userId,
        role,
        page,
        limit,
        creatorOrAssignorId,

        ...(search && { search }),
        ...(dateRange && {
          startDate: dateRange?.[0]
            ? dayjs(dateRange[0]).format("YYYY-MM-DD")
            : null,
          endDate: dateRange?.[1]
            ? dayjs(dateRange[1]).format("YYYY-MM-DD")
            : null,
        }),

        filters: {
          // ✅ STAT (overdue, dueToday, completed, total)
          ...(filters.stat && { stat: filters.stat }),

          // ✅ TAB CATEGORY (today_backlog, upcoming, completed)
          ...(filters.taskCategory && {
            taskCategory: filters.taskCategory,
          }),

          // ✅ STATUS (Pending, Completed, etc.)
          ...(filters.status && { status: filters.status }),

          // ✅ TASK TYPE (DelegationTask, RecurringTask)
          ...(filters.taskType && { taskType: filters.taskType }),
        },
      };

      const response = await api.post(url, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
//**Export my task */
export const exportMyTasks = createAsyncThunk(
  "myTasks/exportMyTasks",
  async (params, { rejectWithValue }) => {
    try {
      const url = "/tasks/my-task/export";

      const {
        userId,
        dateRange,
        search,
        filters = {},
        creatorOrAssignorId,
      } = params;

      const payload = {
        userId,
        creatorOrAssignorId,

        ...(search && { search }),
        ...(dateRange && {
          startDate: dateRange?.[0]
            ? dayjs(dateRange[0]).format("YYYY-MM-DD")
            : null,
          endDate: dateRange?.[1]
            ? dayjs(dateRange[1]).format("YYYY-MM-DD")
            : null,
        }),

        filters: {
          // ✅ STAT (overdue, dueToday, completed, total)
          ...(filters.stat && { stat: filters.stat }),

          // ✅ TAB CATEGORY (today_backlog, upcoming, completed)
          ...(filters.taskCategory && {
            taskCategory: filters.taskCategory,
          }),

          // ✅ STATUS (Pending, Completed, etc.)
          ...(filters.status && { status: filters.status }),

          // ✅ TASK TYPE (DelegationTask, RecurringTask)
          ...(filters.taskType && { taskType: filters.taskType }),
        },
      };

      const response = await api.post(url, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
export const exportMyFMSTasks = createAsyncThunk(
  "myTasks/exportMyTasks",
  async (params, { rejectWithValue }) => {
    try {
      const url = "/tasks/my-task/export-fms";

      const {
        userId,
        dateRange,
        search,
        filters = {},
        creatorOrAssignorId,
      } = params;

      const payload = {
        userId,
        creatorOrAssignorId,

        ...(search && { search }),
        ...(dateRange && {
          startDate: dateRange?.[0]
            ? dayjs(dateRange[0]).format("YYYY-MM-DD")
            : null,
          endDate: dateRange?.[1]
            ? dayjs(dateRange[1]).format("YYYY-MM-DD")
            : null,
        }),

        filters: {
          // ✅ STAT (overdue, dueToday, completed, total)
          ...(filters.stat && { stat: filters.stat }),

          // ✅ TAB CATEGORY (today_backlog, upcoming, completed)
          ...(filters.taskCategory && {
            taskCategory: filters.taskCategory,
          }),

          // ✅ STATUS (Pending, Completed, etc.)
          ...(filters.status && { status: filters.status }),

          // ✅ TASK TYPE (DelegationTask, RecurringTask)
          ...(filters.taskType && { taskType: filters.taskType }),
        },
      };

      const response = await api.post(url, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
//**my task view stats */
export const getMyTaskStats = createAsyncThunk(
  "myTasks/fetchMyTasksStats",
  async (params, { rejectWithValue }) => {
    try {
      const url = "/tasks/myTask-stats";

      const { userId, creatorOrAssignorId } = params;

      const payload = {
        userId,
        creatorOrAssignorId,
      };

      const response = await api.post(url, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
export const getMyFMSTaskStats = createAsyncThunk(
  "myTasks/fetchMyTasksStats",
  async (params, { rejectWithValue }) => {
    try {
      const url = "/tasks/myFMSTask-stats";

      const { userId, role, creatorOrAssignorId } = params;

      const payload = {
        userId,
        role,
        creatorOrAssignorId,
      };

      const response = await api.post(url, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
//**role based task filter for manager/admin/owner/sr.manager view */
export const getRoleBasedTasks = createAsyncThunk(
  "myTasks/fetchRoleBasedTasks",
  async (params, { rejectWithValue }) => {
    try {
      const url = "/tasks/role-based-tasks";

      const {
        userId,
        role, // ✅ REQUIRED
        departmentId,
        page,
        limit,
        filters = {},
        selectedDoer,
        selectedManager,
        selectedSrManager,
        search,
        selectedTemplate,
        taskTypeFilter,
      } = params;

      const payload = {
        userId,
        page,
        limit,
        departmentId,
        role,
        selectedDoer,
        selectedManager,
        selectedSrManager,
        selectedTemplate,
        taskTypeFilter,
        ...(search && { search }),

        filters: {
          // ✅ STAT (overdue, dueToday, completed, total)
          ...(filters.stat && { stat: filters.stat }),

          // ✅ TAB CATEGORY (today_backlog, upcoming, completed)
          ...(filters.taskCategory && {
            taskCategory: filters.taskCategory,
          }),

          // ✅ STATUS (Pending, Completed, etc.)
          ...(filters.status && { status: filters.status }),

          // ✅ TASK TYPE (DelegationTask, RecurringTask)
          ...(filters.taskType && { taskType: filters.taskType }),
        },
      };

      const response = await api.post(url, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
// --- Thunk to fetch Global Counts ---
export const fetchTaskCounts = createAsyncThunk(
  "myTasks/fetchTaskCounts",
  async (params, { rejectWithValue }) => {
    try {
      // Params can be an object { userId, assignedBy, view, creatorOrAssignorId }
      let url = "/tasks?limit=10000";

      if (typeof params === "object") {
        if (params.creatorOrAssignorId)
          url += `&creatorOrAssignorId=${params.creatorOrAssignorId}`;
        if (params.assignedBy) url += `&assignedBy=${params.assignedBy}`;
        if (params.userId) url += `&userId=${params.userId}`;
        if (params.view) url += `&view=${params.view}`;
      } else {
        // Fallback for legacy calls passing just ID
        url += `&userId=${params}`;
      }

      const response = await api.get(url);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// ... (Keep addMyTask, updateMyTask, deleteMyTask as they were) ...
export const addMyTask = createAsyncThunk(
  "myTasks/addMyTask",
  async (task, { rejectWithValue }) => {
    try {
      const response = await api.post("/tasks", task);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const updateMyTask = createAsyncThunk(
  "myTasks/updateMyTask",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/tasks/${id}`, updates);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const deleteMyTask = createAsyncThunk(
  "myTasks/deleteMyTask",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/tasks/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const updateMyTaskChecklistItems = createAsyncThunk(
  "myTasks/updateMyTaskChecklistItem",
  async ({ id, index, completed }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/tasks/${id}/checklist/${index}`, {
        index,
        completed,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
export const updateFMSTaskChecklistItems = createAsyncThunk(
  "myTasks/updateFMSTaskChecklistItem",
  async ({ id, taskId, index, completed }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/fms/instances/${id}/tasks/${taskId}/checklist`,
        {
          index,
          completed,
        },
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || error,
      );
    }
  },
);
export const updateMyTaskFormData = createAsyncThunk(
  "myTasks/updateMyTaskFormData",
  async ({ id, taskId, data }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/fms/instances/${id}/tasks/${taskId}/formData`,
        data,
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
export const completeFMSTask = createAsyncThunk(
  "myTasks/completeFmsTask",
  async ({ id, taskId, status }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/fms/instances/${id}/tasks/${taskId}/complete`,
        status,
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  },
);
const myTaskSlice = createSlice({
  name: "myTasks",
  initialState: {
    tasks: [],
    upcomingRecurringTasks: [],
    taskCounts: {
      total: 0,
      overdue: 0,
      completed: 0,
      pending: 0,
    },
    status: "idle",
    error: null,
    totalTasks: 0,
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- Fetch Table Tasks ---
      .addCase(fetchMyTasks.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMyTasks.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.tasks = action.payload.data;
        state.totalTasks = action.payload.totalTasks;
        state.currentPage = action.payload.currentPage;
        state.perPage = action.payload.perPage;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchMyTasks.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(getFilterTasks.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getFilterTasks.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.tasks = action.payload.data;
        state.upcomingRecurringTasks = action.payload.upcomingRecurringTasks;
        state.totalTasks = action.payload.totalTasks;
        state.currentPage = action.payload.currentPage;
        state.perPage = action.payload.perPage;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(getFilterTasks.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(getRoleBasedTasks.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getRoleBasedTasks.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.tasks = action.payload.data;
        state.totalTasks = action.payload.totalTasks;
        state.currentPage = action.payload.currentPage;
        state.perPage = action.payload.perPage;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(getRoleBasedTasks.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })

      // --- Fetch Task Counts Logic ---
      .addCase(getMyTaskStats.fulfilled, (state, action) => {
        const stats = action.payload.stats;

        state.taskCounts = {
          total: stats.total || 0,
          overdue: stats.overdue || 0,
          completed: stats.completed || 0,
          pending: stats.pending || 0,
        };
      })
      // ... (CRUD reducers)
      .addCase(addMyTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload);
      })
      .addCase(updateMyTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(
          (task) =>
            task._id === action.payload._id || task.id === action.payload.id,
        );
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(deleteMyTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(
          (task) => task._id !== action.payload && task.id !== action.payload,
        );
      });
  },
});

export default myTaskSlice.reducer;
