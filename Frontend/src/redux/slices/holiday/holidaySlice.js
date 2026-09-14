import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../lib/api";

// Async thunk to fetch all holidays
export const fetchHolidays = createAsyncThunk(
  "holidays/fetchHolidays",
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        holidayPage = "",
        holidayLimit = "",
        holidaySearchTerm = "",
      } = params;

      const payload = {
        page: holidayPage || undefined,
        limit: holidayLimit || undefined,
        search: holidaySearchTerm || undefined,
      };

      const response = await api.post("/setup/holiday/list", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Async thunk to create a holiday
export const createHoliday = createAsyncThunk(
  "holidays/createHoliday",
  async (holidayData, { rejectWithValue }) => {
    try {
      // holidayData includes { name, date, description, isGlobal, applicableDepartments }
      const response = await api.post("/setup/holiday", holidayData);
      return response.data.data.holiday;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Async thunk to update a holiday
export const updateHoliday = createAsyncThunk(
  "holidays/updateHoliday",
  async ({ id, holidayData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/setup/holiday/${id}`, holidayData);
      return response.data.data.holiday;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Async thunk to delete a holiday
export const deleteHoliday = createAsyncThunk(
  "holidays/deleteHoliday",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/setup/holiday/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const exportHolidaysRecord = createAsyncThunk(
  "holidays/exportHolidays",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { holidaySearchTerm = "" } = params;

      const payload = {
        search: holidaySearchTerm || undefined,
      };
      const response = await api.post("/setup/holiday/export", payload);

      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

const holidaySlice = createSlice({
  name: "holidays",
  initialState: {
    holidays: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Holidays
      .addCase(fetchHolidays.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchHolidays.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.holidays = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchHolidays.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Create Holiday
      .addCase(createHoliday.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createHoliday.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.holidays.unshift(action.payload);
      })
      .addCase(createHoliday.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Update Holiday
      .addCase(updateHoliday.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateHoliday.fulfilled, (state, action) => {
        state.status = "succeeded";
        const index = state.holidays.findIndex(
          (holiday) => holiday._id === action.payload._id,
        );
        if (index !== -1) {
          state.holidays[index] = action.payload;
        }
      })
      .addCase(updateHoliday.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Delete Holiday
      .addCase(deleteHoliday.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteHoliday.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.holidays = state.holidays.filter(
          (holiday) => holiday._id !== action.payload,
        );
      })
      .addCase(deleteHoliday.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default holidaySlice.reducer;
