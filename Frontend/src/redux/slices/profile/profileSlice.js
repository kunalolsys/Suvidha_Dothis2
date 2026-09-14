// redux/slices/profileSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import Cookies from "js-cookie";
import api from "../../../lib/api";

const initialState = {
  user: null,
  loading: false,
  saving: false,
  error: null,
};

export const getProfile = createAsyncThunk(
  "profile/getProfile",
  async (_, thunkAPI) => {
    try {
      const userId = Cookies.get("userId");

      const res = await api.get(`/users/${userId}`);

      return res.data?.data || res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || "Failed to load profile",
      );
    }
  },
);

export const updateProfile = createAsyncThunk(
  "profile/updateProfile",
  async ({ form, profileFile, currentUser }, thunkAPI) => {
    try {
      const fd = new FormData();
      const userId = Cookies.get("userId");

      // only changed name
      if (form.name?.trim() !== currentUser?.name) {
        fd.append("name", form.name.trim());
      }

      // password
      if (form.password?.trim()) {
        fd.append("password", form.password.trim());
      }

      // profile photo
      if (profileFile instanceof File) {
        fd.append("profilePhoto", profileFile);
      }

      // nothing changed
      //   if ([...fd.entries()].length === 0) {
      //     return thunkAPI.rejectWithValue("No changes detected");
      //   }

      const res = await api.put(`/users/${userId}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return res.data?.user || res.data?.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || "Failed to update profile",
      );
    }
  },
);

const profileSlice = createSlice({
  name: "profile",
  initialState,

  reducers: {
    updateProfileInstantly: (state, action) => {
      state.user = {
        ...state.user,
        ...action.payload,
      };
    },
  },

  extraReducers: (builder) => {
    builder

      // GET PROFILE
      .addCase(getProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(getProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })

      .addCase(getProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // UPDATE PROFILE
      .addCase(updateProfile.pending, (state) => {
        state.saving = true;
        state.error = null;
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.saving = false;

        state.user = {
          ...state.user,
          ...action.payload,
        };
      })

      .addCase(updateProfile.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const { updateProfileInstantly } = profileSlice.actions;

export default profileSlice.reducer;
