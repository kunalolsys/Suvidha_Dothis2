// src/redux/slices/permission/permissionSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../lib/api";

// Helper: Converts flat key-value objects into array format
const normalizePermissions = (rawPermissions) => {
  if (Array.isArray(rawPermissions)) {
    return rawPermissions;
  }

  if (typeof rawPermissions === "object" && rawPermissions !== null) {
    const map = new Map();

    Object.entries(rawPermissions).forEach(([key, value]) => {
      // Splits keys like 'dashboard_read' -> submodule: 'dashboard', action: 'read'
      const lastUnderscore = key.lastIndexOf("_");
      if (lastUnderscore === -1) return;

      const submoduleKey = key.substring(0, lastUnderscore);
      let action = key.substring(lastUnderscore + 1);

      // Map 'edit' or 'view' aliases to CRUD keys
      if (action === "view") action = "read";
      if (action === "edit") action = "update";

      if (!["create", "read", "update", "delete"].includes(action)) return;

      if (!map.has(submoduleKey)) {
        map.set(submoduleKey, {
          parentModuleKey: submoduleKey,
          submoduleKey,
          actions: { create: false, read: false, update: false, delete: false },
        });
      }

      if (value === true) {
        map.get(submoduleKey).actions[action] = true;
      }
    });

    return Array.from(map.values());
  }

  return [];
};

// Async thunk to re-hydrate permissions on page refresh (F5)
export const fetchMyPermissions = createAsyncThunk(
  "permissions/fetchMyPermissions",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/setup/roles/my-permissions");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch active permissions",
      );
    }
  },
);

const initialState = {
  permissions: [],
  isSuper: false,
  status: "idle",
  error: null,
};

const permissionSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    setPermissions: (state, action) => {
      const rawData = action.payload?.permissions || action.payload || [];
      state.permissions = normalizePermissions(rawData);
      state.isSuper = Boolean(action.payload?.isSuper);
      state.status = "succeeded";
      state.error = null;
    },
    clearPermissions: (state) => {
      state.permissions = [];
      state.isSuper = false;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyPermissions.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMyPermissions.fulfilled, (state, action) => {
        const rawData = action.payload?.permissions || [];
        state.permissions = normalizePermissions(rawData);
        state.isSuper = Boolean(action.payload?.isSuper);
        state.status = "succeeded";
      })
      .addCase(fetchMyPermissions.rejected, (state, action) => {
        state.permissions = [];
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { setPermissions, clearPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;
