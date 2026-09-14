import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../lib/api.js';

const initialState = {
  workShifts: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Async thunks
export const fetchWorkShifts = createAsyncThunk('workShifts/fetchWorkShifts', async () => {
  const response = await api.get('/work-shifts/getAllWorkShifts');
  return response.data.data || [];
});

const workShiftSlice = createSlice({
  name: 'workShifts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkShifts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWorkShifts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.workShifts = action.payload;
      })
      .addCase(fetchWorkShifts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default workShiftSlice.reducer;
