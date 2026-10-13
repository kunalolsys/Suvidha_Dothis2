import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  addUser,
  fetchUsers,
  getUserForDrop,
} from "../../redux/slices/user/userSlice";
import {
  fetchAllDepartments,
  fetchDepartments,
} from "../../redux/slices/department/departmentSlice";
import { fetchRoles } from "../../redux/slices/role/roleSlice";
import { fetchWorkShifts } from "../../redux/slices/workShift/workShiftSlice";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Switch } from "../../components/ui/switch";

// --- Main Component ---
const AddUser = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { status: userStatus } = useSelector((state) => state.users);

  const { allDepartments, status: departmentStatus } = useSelector(
    (state) => state.departments,
  );

  const { roles, status: roleStatus } = useSelector((state) => state.roles);

  const { workShifts, status: workShiftStatus } = useSelector(
    (state) => state.workShifts,
  );

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      telegramUserName: "",
      role: "",
      department: "", // 🟢 Changed from array [] to single string
      assignShift: "",
      password: "",
      confirmPassword: "",
      employeeCode: "",
      secondaryEmail: "",
      mainEmailType: "email",
      isEmailNotificationEnabled: true,
      telegramNotificationsEnabled: true,
    },

    validationSchema: Yup.object({
      name: Yup.string().required("Name is required"),

      secondaryEmail: Yup.string().when("mainEmailType", {
        is: "secondaryEmail",
        then: (schema) => schema.required("Secondary email is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

      telegramUserName: Yup.string().when("telegramNotificationsEnabled", {
        is: true,
        then: (schema) => schema.required("Chat id is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

      phone: Yup.string()
        .matches(/^[0-9]{10}$/, "Phone must be 10 digits")
        .required("Phone is required"),

      // 🟢 Single department validation rule
      department: Yup.string().when("role", {
        is: (roleId) => {
          const selectedRole = roles.find((r) => r._id === roleId);
          return (
            selectedRole?.name !== "Owner" && selectedRole?.name !== "Admin"
          );
        },
        then: (schema) => schema.required("Department is required"),
        otherwise: (schema) => schema.notRequired(),
      }),

      role: Yup.string().required("Role is required"),
      assignShift: Yup.string().required("Assign Shift is required"),

      password: Yup.string()
        .min(6, "Minimum 6 characters")
        .required("Password is required"),

      confirmPassword: Yup.string()
        .required("Confirm Password is required")
        .oneOf([Yup.ref("password")], "Passwords must match"),
    }),

    onSubmit: async (values) => {
      const userData = {
        ...values,
        department: values.department || undefined, // 🟢 Single ObjectId passed
        assignShift: values.assignShift || undefined,
      };
      delete userData.confirmPassword;

      try {
        await dispatch(addUser(userData)).unwrap();
        toast.success("User added successfully!");
        navigate("/setup/users");
      } catch (err) {
        toast.error(err || "Failed to add user.");
      }
    },
  });

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(getUserForDrop());
    dispatch(fetchDepartments());
    dispatch(fetchAllDepartments());
    dispatch(fetchRoles());
    dispatch(fetchWorkShifts());
  }, [dispatch]);

  const selectedRole = roles.find((r) => r._id === formik.values.role);

  return (
    <Card className="m-6 shadow-lg">
      <form className="space-y-4" onSubmit={formik.handleSubmit}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Add New User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* --- Row 1 --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeCode">Employee Code</Label>
              <Input
                id="employeeCode"
                placeholder="Enter Employee Code"
                value={formik.values.employeeCode}
                onChange={formik.handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name<span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.name && formik.errors.name && (
                <span className="text-red-500 text-xs">
                  {formik.errors.name}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.email && formik.errors.email && (
                <span className="text-red-500 text-xs">
                  {formik.errors.email}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryEmail">
                Secondary Email{" "}
                {formik.values.mainEmailType === "email" && (
                  <span className="font-light text-sm">(optional)</span>
                )}
                {formik.errors.secondaryEmail && (
                  <span className="text-red-500">*</span>
                )}
              </Label>
              <Input
                id="secondaryEmail"
                type="email"
                placeholder="Enter email address"
                value={formik.values.secondaryEmail}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.secondaryEmail &&
                formik.errors.secondaryEmail && (
                  <span className="text-red-500 text-xs">
                    {formik.errors.secondaryEmail}
                  </span>
                )}
            </div>
            <div className="space-y-2">
              <Label>Email for Receiving Notifications</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mainEmailType"
                    value="email"
                    checked={formik.values.mainEmailType === "email"}
                    onChange={formik.handleChange}
                  />
                  <span>Primary Email</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mainEmailType"
                    value="secondaryEmail"
                    checked={formik.values.mainEmailType === "secondaryEmail"}
                    onChange={formik.handleChange}
                  />
                  <span>Secondary Email</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    Email Notification
                  </label>
                  <Switch
                    checked={formik.values.isEmailNotificationEnabled}
                    onCheckedChange={(value) =>
                      formik.setFieldValue("isEmailNotificationEnabled", value)
                    }
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    Telegram Notification
                  </label>
                  <Switch
                    checked={formik.values.telegramNotificationsEnabled}
                    onCheckedChange={(value) =>
                      formik.setFieldValue(
                        "telegramNotificationsEnabled",
                        value,
                      )
                    }
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Mobile Number<span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter mobile number"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.phone && formik.errors.phone && (
                <span className="text-red-500 text-xs">
                  {formik.errors.phone}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegramUserName">
                Telegram username
                {formik.values.telegramNotificationsEnabled === false && (
                  <span className="font-light text-sm">(optional)</span>
                )}
                {formik.values.telegramNotificationsEnabled === true && (
                  <span className="text-red-500">*</span>
                )}
              </Label>
              <Input
                id="telegramUserName"
                type="text"
                placeholder="Enter username"
                value={formik.values.telegramUserName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.telegramUserName &&
                formik.errors.telegramUserName && (
                  <span className="text-red-500 text-xs">
                    {formik.errors.telegramUserName}
                  </span>
                )}
            </div>
          </div>

          {/* --- Row 2 --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* 🟢 Single Department Select Field */}
            <div className="space-y-2">
              <Label htmlFor="department">
                Department
                {selectedRole?.name !== "Owner" &&
                  selectedRole?.name !== "Admin" && (
                    <span className="text-red-500">*</span>
                  )}
              </Label>
              <Select
                onValueChange={(value) =>
                  formik.setFieldValue("department", value)
                }
                value={formik.values.department}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentStatus === "loading" && (
                    <SelectItem disabled value="loading">
                      Loading...
                    </SelectItem>
                  )}
                  {(allDepartments || []).map((dept) => (
                    <SelectItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.department && formik.errors.department && (
                <p className="text-red-500 text-xs mt-1">
                  {formik.errors.department}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                Primary Operational Role
                <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(value) => formik.setFieldValue("role", value)}
                value={formik.values.role}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {roleStatus === "loading" && (
                    <SelectItem disabled value="loading">
                      Loading...
                    </SelectItem>
                  )}
                  {roles.map((role) => (
                    <SelectItem key={role._id} value={role._id}>
                      {role.displayName || role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.role && formik.errors.role && (
                <span className="text-red-500 text-xs">
                  {formik.errors.role}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignShift">
                Assign Shift<span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(value) =>
                  formik.setFieldValue("assignShift", value)
                }
                value={formik.values.assignShift}
              >
                <SelectTrigger id="assignShift">
                  <SelectValue placeholder="Select Shift" />
                </SelectTrigger>
                <SelectContent>
                  {workShiftStatus === "loading" && (
                    <SelectItem disabled value="loading">
                      Loading...
                    </SelectItem>
                  )}
                  {workShifts.map((shift) => (
                    <SelectItem key={shift._id} value={shift._id}>
                      {shift.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.assignShift && formik.errors.assignShift && (
                <span className="text-red-500 text-xs">
                  {formik.errors.assignShift}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password<span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.password && formik.errors.password && (
                <span className="text-red-500 text-xs">
                  {formik.errors.password}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password<span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
              />
              {formik.touched.confirmPassword &&
                formik.errors.confirmPassword && (
                  <span className="text-red-500 text-xs">
                    {formik.errors.confirmPassword}
                  </span>
                )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/setup/users")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={userStatus === "loading"}>
            {userStatus === "loading" ? "Saving..." : "Save"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default AddUser;
