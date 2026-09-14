import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
} from "@reduxjs/toolkit";
import api from "../../../lib/api";

const fmsTemplatesAdapter = createEntityAdapter({
  selectId: (template) => template._id,
  sortComparer: (a, b) => a.templateName.localeCompare(b.templateName),
});

const initialState = fmsTemplatesAdapter.getInitialState({
  loading: "idle",
  error: null,
  instances: [],
  currentInstance: null,
  statuses: {
    fetchTemplates: "idle",
    createTemplate: "idle",
    launchInstance: "idle",
  },
});

// Async Thunks
export const fetchTemplates = createAsyncThunk(
  "fms/fetchTemplates",
  async (params = {}, { rejectWithValue }) => {
    const { page, limit,role } = params;
    const payload = {
      page,
      limit,
      role
    };
    try {
      const response = await api.post("/fms/templates-list", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const createTemplate = createAsyncThunk(
  "fms/createTemplate",
  async (templateData, { rejectWithValue }) => {
    try {
      const response = await api.post("/fms/templates", templateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchTemplateById = createAsyncThunk(
  "fms/fetchTemplateById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/fms/templates/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateTemplate = createAsyncThunk(
  "fms/updateTemplate",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/fms/templates/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteTemplate = createAsyncThunk(
  "fms/deleteTemplate",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/fms/templates/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const launchInstance = createAsyncThunk(
  "fms/launchInstance",
  async ({ templateId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/fms/instances/${templateId}/launch`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchInstances = createAsyncThunk(
  "fms/fetchInstances",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/fms/instances");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchInstanceById = createAsyncThunk(
  "fms/fetchInstanceById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/fms/instances/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchInstanceTasks = createAsyncThunk(
  "fms/fetchInstanceTasks",
  async (instanceId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/fms/instances/${instanceId}/tasks`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateInstanceTask = createAsyncThunk(
  "fms/updateInstanceTask",
  async ({ instanceId, taskId, data }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/fms/instances/${instanceId}/tasks/${taskId}`,
        data,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const completeInstanceTask = createAsyncThunk(
  "fms/completeInstanceTask",
  async ({ instanceId, taskId }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/fms/instances/${instanceId}/tasks/${taskId}/complete`,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const stopInstance = createAsyncThunk(
  "fms/stopInstance",
  async (instanceId, { rejectWithValue }) => {
    try {
      const response = await api.put(`/fms/instances/${instanceId}/stop`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const fetchInstanceHistory = createAsyncThunk(
  "fms/fetchInstanceHistory",
  async (instanceId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/fms/instances/${instanceId}/history`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

const fmsSlice = createSlice({
  name: "fms",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentInstance: (state, action) => {
      state.currentInstance = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Templates
      .addCase(fetchTemplates.pending, (state) => {
        state.statuses.fetchTemplates = "loading";
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.statuses.fetchTemplates = "succeeded";
        fmsTemplatesAdapter.setAll(state, action.payload);
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.statuses.fetchTemplates = "failed";
        state.error = action.payload;
      })
      .addCase(createTemplate.pending, (state) => {
        state.statuses.createTemplate = "loading";
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.statuses.createTemplate = "succeeded";
        fmsTemplatesAdapter.addOne(state, action.payload);
      })
      .addCase(createTemplate.rejected, (state, action) => {
        state.statuses.createTemplate = "failed";
        state.error = action.payload;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        fmsTemplatesAdapter.updateOne(state, {
          id: action.payload._id,
          changes: action.payload,
        });
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        fmsTemplatesAdapter.removeOne(state, action.payload);
      })
      // Instances
      .addCase(fetchInstances.fulfilled, (state, action) => {
        state.instances = action.payload;
      })
      .addCase(launchInstance.fulfilled, (state, action) => {
        state.instances.push(action.payload);
        state.currentInstance = action.payload;
      })
      .addCase(fetchInstanceById.fulfilled, (state, action) => {
        state.currentInstance = action.payload;
      })
      .addCase(fetchInstanceTasks.fulfilled, (state, action) => {
        if (state.currentInstance) {
          state.currentInstance.tasks = action.payload;
        }
      })
      .addCase(updateInstanceTask.fulfilled, (state, action) => {
        if (state.currentInstance) {
          const taskIndex = state.currentInstance.tasks.findIndex(
            (t) => t._id === action.payload._id,
          );
          if (taskIndex !== -1) {
            state.currentInstance.tasks[taskIndex] = action.payload;
          }
        }
      })
      .addCase(completeInstanceTask.fulfilled, (state, action) => {
        if (state.currentInstance) {
          const taskIndex = state.currentInstance.tasks.findIndex(
            (t) => t._id === action.payload._id,
          );
          if (taskIndex !== -1) {
            state.currentInstance.tasks[taskIndex] = action.payload;
          }
        }
      })
      .addCase(fetchInstanceHistory.fulfilled, (state, action) => {
        if (state.currentInstance) {
          state.currentInstance.history = action.payload;
        }
      });
  },
});

export const { clearError, setCurrentInstance } = fmsSlice.actions;

export default fmsSlice.reducer;

export const {
  selectAll: selectAllTemplates,
  selectById: selectTemplateById,
  selectIds: selectTemplateIds,
} = fmsTemplatesAdapter.getSelectors((state) => state.fms);

export const selectTemplatesLoading = (state) =>
  state.fms.statuses.fetchTemplates;
export const selectInstances = (state) => state.fms.instances;
export const selectCurrentInstance = (state) => state.fms.currentInstance;
