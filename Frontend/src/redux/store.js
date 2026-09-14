// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/user/userSlice";
import departmentReducer from "./slices/department/departmentSlice";
import roleReducer from "./slices/role/roleSlice";
import workShiftReducer from "./slices/workShift/workShiftSlice";
import holidayReducer from "./slices/holiday/holidaySlice";
import taskReducer from "./slices/task/taskSlice";
import myTaskReducer from "./slices/myTask/myTaskSlice";
import workingWeekReducer from "./slices/workingWeek/workingWeekSlice";
import scheduleHolidayTaskReducer from "./slices/scheduleHolidayTask/scheduleHolidayTaskSlice";
import fmsReducer from "./slices/fms/fmsSlice";
import notificationReducer from "./slices/notification/notificationSlice";
import companyReducer from "./slices/company/companySlice";
import profileReducer from "./slices/profile/profileSlice";
import moduleReducer from "./slices/moduleSetting/moduleSlice";
import permissionReducer from "./slices/permissions/permissionSlice"; // 🔥 Added

const store = configureStore({
  reducer: {
    users: userReducer,
    departments: departmentReducer,
    roles: roleReducer,
    workShifts: workShiftReducer,
    holidays: holidayReducer,
    workingWeek: workingWeekReducer,
    tasks: taskReducer,
    myTasks: myTaskReducer,
    scheduleHolidayTask: scheduleHolidayTaskReducer,
    fms: fmsReducer,
    notifications: notificationReducer,
    company: companyReducer,
    profile: profileReducer,
    modules: moduleReducer,
    permissions: permissionReducer, // 🔥 Added
  },
});

export default store;
