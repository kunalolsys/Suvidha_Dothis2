import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../lib/api";

const initialState = {
  departments: [],
  allDepartments: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Async thunks
export const fetchDepartments = createAsyncThunk(
  "departments/fetchDepartments",
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        departmentPage = "",
        departmentLimit = "",
        departmentSearchTerm = "",
      } = params;

      const payload = {
        page: departmentPage || undefined,
        limit: departmentLimit || undefined,
        search: departmentSearchTerm || undefined,
      };
      const response = await api.post(`/setup/departments/list`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
export const fetchAllDepartments = createAsyncThunk(
  "departments/fetchAllDepartments",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/setup/departments/allDepartments`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
export const addDepartment = createAsyncThunk(
  "departments/addDepartment",
  async (departmentData, { rejectWithValue }) => {
    try {
      // departmentData contains { name, workingWeekDays }
      const response = await api.post(`/setup/departments`, departmentData);
      return response.data.department || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const updateDepartment = createAsyncThunk(
  "departments/updateDepartment",
  async (departmentData, { rejectWithValue }) => {
    try {
      const { _id, name, workingWeekDays } = departmentData;
      const response = await api.put(`/setup/departments/${_id}`, {
        name,
        workingWeekDays,
      });
      return response.data.data || response.data.department;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const deleteDepartment = createAsyncThunk(
  "departments/deleteDepartment",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/setup/departments/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const exportDepts = createAsyncThunk(
  "departments/exportDepartments",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { departmentSearchTerm = "" } = params;

      const payload = {
        search: departmentSearchTerm || undefined,
      };
      const response = await api.post(`/setup/departments/export`, payload);

      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

const departmentSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Departments
      .addCase(fetchDepartments.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.departments = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Fetch All Departments
      .addCase(fetchAllDepartments.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAllDepartments.fulfilled, (state, action) => {
        state.status = "succeeded";
        // API response ke structure ke according fallback handles (data array direct ya nested)
        state.allDepartments = action.payload.data || action.payload;
      })
      .addCase(fetchAllDepartments.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Add Department
      .addCase(addDepartment.pending, (state) => {
        state.status = "loading";
      })
      .addCase(addDepartment.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.departments.unshift(action.payload);
      })
      .addCase(addDepartment.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Update Department
      .addCase(updateDepartment.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.status = "succeeded";
        const index = state.departments.findIndex(
          (dept) => dept._id === action.payload._id,
        );
        if (index !== -1) {
          state.departments[index] = action.payload;
        }
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Delete Department
      .addCase(deleteDepartment.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.departments = state.departments.filter(
          (dept) => dept._id !== action.payload,
        );
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default departmentSlice.reducer;
