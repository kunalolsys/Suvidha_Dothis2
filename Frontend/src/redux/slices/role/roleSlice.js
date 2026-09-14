import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../lib/api";

const initialState = {
  roles: [],
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Async thunks
export const fetchRoles = createAsyncThunk("roles/fetchRoles", async () => {
  const response = await api.get("/setup/roles");
  return response.data.data;
});

export const createRole = createAsyncThunk(
  "roles/createRole",
  async (newRole) => {
    const response = await api.post("/setup/roles", newRole);
    return response.data.data;
  },
);

export const updateRole = createAsyncThunk(
  "roles/updateRole",
  async ({ id, ...updatedData }) => {
    const response = await api.put(`/setup/roles/${id}`, updatedData);
    return response.data.data;
  },
);

export const deleteRole = createAsyncThunk(
  "roles/deleteRole",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/setup/roles/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

const roleSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.roles = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.roles.push(action.payload);
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        const index = state.roles.findIndex(
          (role) => role._id === action.payload._id,
        );
        if (index !== -1) {
          state.roles[index] = action.payload;
        }
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.roles = state.roles.filter((role) => role._id !== action.payload);
      });
  },
});

export default roleSlice.reducer;
