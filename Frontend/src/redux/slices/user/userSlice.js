import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../../lib/api"; // Adjust the import path as needed

// Async thunk to fetch all users
export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        page = 1,
        limit = 10,
        selectedRole = "",
        selectedDepartment = [],
        selectedShift = "",
        debouncedSearch = "",
      } = params;

      const payload = {
        page,
        limit,
        role: selectedRole == "all" ? undefined : selectedRole || undefined,
        department:
          selectedDepartment == "all"
            ? undefined
            : selectedDepartment?.length > 0
              ? selectedDepartment
              : undefined,
        assignShift:
          selectedShift == "all" ? undefined : selectedShift || undefined,
        search: debouncedSearch || undefined,
      };

      const response = await api.post("/setup/users/list", payload);

      return {
        users: response.data.data,
        pagination: response.data.pagination,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Async thunk to add a new user
export const addUser = createAsyncThunk(
  "users/addUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/setup/users", userData);
      return response.data.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
export const getUserForDrop = createAsyncThunk(
  "users/getAllUserForDrop",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/setup/users/list-drop");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Async thunk to fetch a user by ID
export const fetchUserById = createAsyncThunk(
  "users/fetchUserById",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/setup/users/${userId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Async thunk to update a user
export const updateUser = createAsyncThunk(
  "users/updateUser",
  async ({ userId, userData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/setup/users/${userId}`, userData);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

// Async thunk to delete a user
export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      // We don't need the response data, just confirmation of deletion
      await api.delete(`/setup/users/${userId}`);
      return userId; // Return the ID to identify which user to remove from the state
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);
// Async thunk to export a users
export const exportUsers = createAsyncThunk(
  "users/exportUsers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        selectedRole = "",
        selectedDepartment = [],
        selectedShift = "",
        searchTerm = "",
      } = params;

      const payload = {
        role: selectedRole == "all" ? undefined : selectedRole || undefined,
        department:
          selectedDepartment == "all"
            ? undefined
            : selectedDepartment?.length > 0
              ? selectedDepartment
              : undefined,
        assignShift:
          selectedShift == "all" ? undefined : selectedShift || undefined,
        search: searchTerm || undefined,
      };

      const response = await api.post("/setup/users/export", payload);

      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

const userSlice = createSlice({
  name: "users",
  initialState: {
    users: [],
    dropdownUsers: [], // 🔥 NEW
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    currentUser: null,
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.users = action.payload.users;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(getUserForDrop.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getUserForDrop.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.dropdownUsers = action.payload; // 🔥 store separately
      })
      .addCase(getUserForDrop.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Fetch User by ID
      .addCase(fetchUserById.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.currentUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Add User
      .addCase(addUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(addUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        // Instead of just pushing, we mark the state as 'idle'
        // to trigger a refetch on the Users.jsx page.
        state.status = "idle";
      })
      .addCase(addUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        const index = state.users.findIndex(
          (user) => user._id === action.payload._id,
        );
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        state.currentUser = action.payload;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        // Filter out the deleted user from the state
        state.users = state.users.filter((user) => user._id !== action.payload);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { setCurrentUser } = userSlice.actions;

export default userSlice.reducer;
