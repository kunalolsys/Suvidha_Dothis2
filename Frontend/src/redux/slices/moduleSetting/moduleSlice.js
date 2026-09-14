import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import Cookies from "js-cookie";
import api from "../../../lib/api";

export const fetchModules = createAsyncThunk(
  "modules/fetchModules",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/setup/modules/list");

      return res.data?.data ?? [];
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch modules"
      );
    }
  }
);

const initialState = {
  modules: [],
  loading: false,
  error: null,
};

const moduleSlice = createSlice({
  name: "modules",
  initialState,

  reducers: {},

  extraReducers: (builder) => {
    builder

      .addCase(fetchModules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchModules.fulfilled, (state, action) => {
        state.loading = false;
        state.modules = action.payload;
      })

      .addCase(fetchModules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default moduleSlice.reducer;