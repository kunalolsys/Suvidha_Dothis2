import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../lib/api";

const initialState = {
  company: null,
  loading: false,
  saving: false,
  error: null,
};

// GET company
export const fetchCompany = createAsyncThunk(
  "company/fetchCompany",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/company");
      return res.data?.data || res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || "Failed to fetch company",
      );
    }
  },
);

// UPDATE company
export const updateCompany = createAsyncThunk(
  "company/updateCompany",
  async (payload, thunkAPI) => {
    try {
      const fd = new FormData();

      // append all fields dynamically
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          // map frontend key
          if (key === "companyName") {
            fd.append("softwareName", value);
          } else if (key === "logoFile") {
            fd.append("logo", value);
          } else if (key === "faviconFile") {
            fd.append("favicon", value);
          } else {
            fd.append(key, value);
          }
        }
      });

      const res = await api.put("/company", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return res.data?.data || res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || "Failed to update company",
      );
    }
  },
);

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    builder

      // fetch
      .addCase(fetchCompany.pending, (state) => {
        state.loading = true;
      })

      .addCase(fetchCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.company = action.payload;
      })

      .addCase(fetchCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // update
      .addCase(updateCompany.pending, (state) => {
        state.saving = true;
      })

      .addCase(updateCompany.fulfilled, (state, action) => {
        state.saving = false;
        state.company = action.payload;
      })

      .addCase(updateCompany.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export default companySlice.reducer;
