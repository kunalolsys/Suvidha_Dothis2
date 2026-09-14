import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../lib/api"; // Replace axios with the api utility

// Async actions
export const fetchTasks = createAsyncThunk(
  "tasks/fetchTasks",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { userId, search, status, page, limit } = params;
      let url = "/tasks";
      const queryParams = [];

      if (userId) queryParams.push(`userId=${userId}`);
      if (search) queryParams.push(`search=${search}`);
      if (status) queryParams.push(`status=${status}`);
      if (page) queryParams.push(`page=${page}`);
      if (limit) {
        queryParams.push(`limit=${limit}`);
      } else {
        queryParams.push(`limit=10000`);
      }

      if (queryParams.length > 0) {
        url = `${url}?${queryParams.join("&")}`;
      }

      const response = await api.get(url);
      return response.data; // Return the whole data object including pagination info
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
//**Role based task counts */
export const fetchTasksWithStats = createAsyncThunk(
  "tasks/fetchTasksWithStats",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { filterType, userId, role } = params;
      const response = await api.post(`tasks/tasks-with-stats`, {
        filterType: filterType == "all" ? undefined : filterType,
        userId,
        role,
      });
      return response.data; // Return the whole data object including pagination info
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const addTask = createAsyncThunk(
  "tasks/addTask",
  async (task, { rejectWithValue }) => {
    try {
      const response = await api.post("/tasks", task);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const updateTask = createAsyncThunk(
  "tasks/updateTask",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/tasks/${id}`, updates);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const deleteTask = createAsyncThunk(
  "tasks/deleteTask",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/tasks/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Slice
const taskSlice = createSlice({
  name: "tasks",
  initialState: {
    tasks: [],
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
      .addCase(fetchTasks.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.tasks = action.payload.data;
        state.totalTasks = action.payload.totalTasks;
        state.currentPage = action.payload.currentPage;
        state.perPage = action.payload.perPage;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(
          (task) => task.id === action.payload.id,
        );
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((task) => task.id !== action.payload);
      });
  },
});

export default taskSlice.reducer;
