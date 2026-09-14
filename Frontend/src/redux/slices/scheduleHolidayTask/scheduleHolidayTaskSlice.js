import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../lib/api'; // Assuming you have a centralized api handler

export const fetchScheduleHolidayTask = createAsyncThunk(
  'scheduleHolidayTask/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/schedule-holiday-task');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const upsertScheduleHolidayTask = createAsyncThunk(
  'scheduleHolidayTask/upsert',
  async (taskData, { rejectWithValue }) => {
    try {
      // Since we are creating or updating, we can use a POST request.
      // The backend seems to handle creation, but a PUT or POST is fine.
      const response = await api.post('/schedule-holiday-task', taskData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const scheduleHolidayTaskSlice = createSlice({
  name: 'scheduleHolidayTask',
  initialState: {
    task: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchScheduleHolidayTask.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchScheduleHolidayTask.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.task = action.payload.data;
      })
      .addCase(fetchScheduleHolidayTask.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload.message;
      })
      .addCase(upsertScheduleHolidayTask.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(upsertScheduleHolidayTask.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.task = action.payload.data.task; // Adjust based on backend response
      })
      .addCase(upsertScheduleHolidayTask.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload.message;
      });
  },
});

export default scheduleHolidayTaskSlice.reducer;
