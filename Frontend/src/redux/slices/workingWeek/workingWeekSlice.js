import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../lib/api";

const initialWorkingDays = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

// Async thunk to fetch global working week configuration
export const fetchWorkingWeek = createAsyncThunk(
  "workingWeek/fetchWorkingWeek",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/setup/working-week`);
      // Return workingWeek object or fallback
      return response.data?.data?.workingWeek || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch working week",
      );
    }
  },
);

// Async thunk to update global working week configuration
export const updateWorkingWeek = createAsyncThunk(
  "workingWeek/updateWorkingWeek",
  async (workingWeekData, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/setup/working-week`, workingWeekData);
      return response.data?.data?.workingWeek || null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update working week",
      );
    }
  },
);

// Slice
const workingWeekSlice = createSlice({
  name: "workingWeek",
  initialState: {
    workingWeek: {
      workingDays: initialWorkingDays,
    },
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    updateWorkingDay: (state, action) => {
      const { day, value } = action.payload;
      if (state.workingWeek?.workingDays) {
        state.workingWeek.workingDays[day] = value;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Working Week
      .addCase(fetchWorkingWeek.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchWorkingWeek.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        if (action.payload && action.payload.workingDays) {
          state.workingWeek = action.payload;
        } else {
          // Keep default workingDays if DB record hasn't been created yet
          state.workingWeek = { workingDays: initialWorkingDays };
        }
      })
      .addCase(fetchWorkingWeek.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Update Working Week
      .addCase(updateWorkingWeek.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateWorkingWeek.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        if (action.payload && action.payload.workingDays) {
          state.workingWeek = action.payload;
        }
      })
      .addCase(updateWorkingWeek.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { updateWorkingDay } = workingWeekSlice.actions;
export default workingWeekSlice.reducer;
