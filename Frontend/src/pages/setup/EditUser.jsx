import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  fetchUserById,
  updateUser,
  fetchUsers,
  getUserForDrop,
} from "../../redux/slices/user/userSlice";
import { fetchAllDepartments, fetchDepartments } from "../../redux/slices/department/departmentSlice";
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
import { Button as AntdBTN } from "antd";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ArrowLeft } from "lucide-react";
import { Switch } from "../../components/ui/switch";
import { Badge, Select as AntdSelect } from "antd";

// --- Main Component ---
const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    users,
    dropdownUsers,
    currentUser,
    status: userStatus,
    error: userError,
  } = useSelector((state) => state.users);
  const {
    allDepartments,
    status: departmentStatus,
    error: departmentError,
  } = useSelector((state) => state.departments);
  const {
    roles,
    status: roleStatus,
    error: roleError,
  } = useSelector((state) => state.roles);
  const {
    workShifts,
    status: workShiftStatus,
    error: workShiftError,
  } = useSelector((state) => state.workShifts);

  // const [formData, setFormData] = useState({
  //   name: "",
  //   email: "",
  //   phone: "",
  //   role: "",
  //   reportingManager: "",
  //   assignShift: "",
  //   password: "",
  //   confirmPassword: "",
  //   employeeCode: "",
  // });
  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      telegramUserName: "",
      role: "",
      department: [],
      reportingManager: "",
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
      // telegramUserName: Yup.string().required("Chat id is required"),
      // email: Yup.string().email("Invalid email").required("Email is required"),
      secondaryEmail: Yup.string().when("mainEmailType", {
        is: "secondaryEmail", // 👉 condition
        then: (schema) => schema.required("Secondary email is required"),
        otherwise: (schema) => schema.notRequired(),
      }),
      telegramUserName: Yup.string().when("telegramNotificationsEnabled", {
        is: true, // 👉 condition
        then: (schema) => schema.required("Chat id is required"),
        otherwise: (schema) => schema.notRequired(),
      }),
      phone: Yup.string()
        .matches(/^[0-9]{10}$/, "Phone must be 10 digits")
        .required("Phone is required"),
      // department: Yup.array()
      //   .min(1, "Select at least one department")
      //   .required("Department is required"),
      department: Yup.array().when("role", {
        is: (roleId) => {
          const selectedRole = roles.find((r) => r._id === roleId);
          return (
            selectedRole?.name !== "Owner" && selectedRole?.name !== "Admin"
          );
        },
        then: (schema) =>
          schema
            .min(1, "Select at least one department")
            .required("Department is required"),
        otherwise: (schema) => schema.notRequired(),
      }),
      role: Yup.string().required("Role is required"),
      // reportingManager: Yup.string().required("Reporting Manager is required"),
      reportingManager: Yup.string().when("role", {
        is: (roleId) => {
          const selectedRole = roles.find((r) => r._id === roleId);
          return (
            selectedRole?.name !== "Owner" && selectedRole?.name !== "Admin"
          );
        },
        then: (schema) => schema.required("Reporting Manager is required"),
        otherwise: (schema) => schema.notRequired(),
      }),
      assignShift: Yup.string().required("Assign Shift is required"),
      password: Yup.string().min(6, "Password must be at least 6 characters"),
      confirmPassword: Yup.string().when("password", {
        is: (password) => password && password.length > 0,
        then: (schema) =>
          schema
            .required("Confirm Password is required")
            .oneOf([Yup.ref("password")], "Passwords must match"),
        otherwise: (schema) => schema.notRequired(),
      }),
    }),

    onSubmit: async (values) => {
      const userData = {
        ...values,
        department: Array.from(values.department),
        assignShift: values.assignShift || undefined,
      };
      delete userData.confirmPassword;

      try {
        await dispatch(updateUser({ userId: id, userData })).unwrap();
        toast.success("User updated successfully!");
        dispatch(fetchUsers()); // Refresh the users list
        navigate("/setup/users"); // Navigate back to users list
      } catch (err) {
        toast.error(err || "Failed to update user.");
      }
    },
  });
  // const [selectedDepts, setSelectedDepts] = useState(new Set());

  useEffect(() => {
    dispatch(fetchUserById(id));
    dispatch(fetchDepartments());
    dispatch(fetchAllDepartments());
    dispatch(fetchUsers()); // Fetch all users for the reporting manager dropdown
    dispatch(getUserForDrop()); // Fetch all users for the reporting manager dropdown
    dispatch(fetchRoles());
    dispatch(fetchWorkShifts());
  }, [dispatch, id]);

  useEffect(() => {
    if (currentUser) {
      formik.setValues({
        name: currentUser.name || "",
        email: currentUser.email || "",
        secondaryEmail: currentUser.secondaryEmail || "",
        mainEmailType: currentUser.mainEmailType || "",
        isEmailNotificationEnabled: currentUser.isEmailNotificationEnabled,
        telegramNotificationsEnabled: currentUser.telegramNotificationsEnabled,
        phone: currentUser.phone || "",
        telegramUserName: currentUser.telegramUserName || "",
        employeeCode:
          currentUser.employeeCode && currentUser.employeeCode !== "null"
            ? currentUser.employeeCode
            : "",
        role: currentUser.role?._id || "",
        reportingManager: currentUser?.reportingManager?._id || "",
        assignShift: currentUser.assignShift?._id || "",
        password: "",
        confirmPassword: "",
        department:
          Array.isArray(currentUser.department) &&
          currentUser.department.length > 0
            ? currentUser.department?.map((dept) => dept._id)
            : [],
      });
      // setSelectedDepts(
      //   new Set(currentUser.department?.map((dept) => dept._id) || []),
      // );
    }
  }, [currentUser, id]);

  // const handleInputChange = (e) => {
  //   const { id, value } = e.target;
  //   setFormData((prev) => ({ ...prev, [id]: value }));
  // };

  // const handleSelectChange = (id, value) => {
  //   setFormData((prev) => ({ ...prev, [id]: value }));
  // };

  // const handleDeptChange = (deptId) => {
  //   const newSet = new Set(selectedDepts);
  //   if (newSet.has(deptId)) {
  //     newSet.delete(deptId);
  //   } else {
  //     newSet.add(deptId);
  //   }
  //   setSelectedDepts(newSet);
  // };
  const handleDeptChange = (id) => {
    const current = formik.values.department;

    if (current.includes(id)) {
      formik.setFieldValue(
        "department",
        current.filter((item) => item !== id),
      );
    } else {
      formik.setFieldValue("department", [...current, id]);
    }
  };

  const selectedRole = roles.find((r) => r._id === formik.values.role);
  const roleColors = {
    Owner: "bg-red-100 text-red-700",
    Admin: "bg-blue-100 text-blue-700",
    "Sr. Manager": "bg-purple-100 text-purple-700",
    Manager: "bg-green-100 text-green-700",
    Member: "bg-gray-100 text-gray-700",
  };
  if (userStatus === "loading" || !currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="m-6 shadow-lg">
      <form className="space-y-4" onSubmit={formik.handleSubmit}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold ">
            <div className="flex items-center gap-2">
              <div className="cursor-pointer">
                <ArrowLeft size={20} onClick={() => navigate("/setup/users")} />
              </div>
              <div>Edit User</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* --- Row 1 --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeCode">Employee Code (Optional)</Label>
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
              <Label htmlFor="email">
                Email Address
                {/* <span className="text-red-500">*</span> */}
              </Label>
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
                {formik.values.mainEmailType == "email" && (
                  <span className="font-light text-sm">(optional)</span>
                )}{" "}
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
                {/* PRIMARY EMAIL */}
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

                {/* SECONDARY EMAIL */}
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
                {formik.values.telegramNotificationsEnabled == false && (
                  <span className="font-light text-sm">(optional)</span>
                )}
                {formik.values.telegramNotificationsEnabled == true && (
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

          {/* --- Row 3 --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>
                Department(s)
                {selectedRole?.name !== "Owner" &&
                  selectedRole?.name !== "Admin" && (
                    <span className="text-red-500">*</span>
                  )}
              </Label>
              <ScrollArea className="h-32 w-full rounded-md border p-4">
                <div className="space-y-2">
                  {departmentStatus === "loading" && <p>Loading...</p>}
                  {(allDepartments || []).map((dept) => (
                    <div key={dept._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={dept._id}
                        checked={formik.values.department.includes(dept._id)}
                        onCheckedChange={() => handleDeptChange(dept._id)}
                      />
                      <Label htmlFor={dept._id} className="font-normal">
                        {dept.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {formik.touched.department && formik.errors.department && (
                <span className="text-red-500 text-xs">
                  {formik.errors.department}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <SelectItem disabled>Loading...</SelectItem>
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
              {selectedRole?.name !== "Owner" && (
                <div className="space-y-2">
                  <Label htmlFor="reportingManager">
                    Reporting Manager{" "}
                    {selectedRole?.name !== "Owner" &&
                      selectedRole?.name !== "Admin" && (
                        <span className="text-red-500">*</span>
                      )}
                  </Label>
                  <AntdSelect
                    showSearch
                    placeholder="Select Manager"
                    value={formik.values.reportingManager}
                    onChange={(value) =>
                      formik.setFieldValue("reportingManager", value)
                    }
                    style={{ width: "100%", minHeight: 38 }}
                    // 🔥 IMPORTANT: disable default label search (we control it)
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={dropdownUsers
                      .filter((user) => {
                        if (!selectedRole) return true;

                        if (selectedRole.name === "Admin") {
                          return user.role?.name === "Owner";
                        }

                        if (selectedRole.name === "Sr. Manager") {
                          return ["Owner", "Admin"].includes(user.role?.name);
                        }

                        if (selectedRole.name === "Manager") {
                          return ["Owner", "Admin", "Sr. Manager"].includes(
                            user.role?.name,
                          );
                        }

                        return true;
                      })
                      .map((user) => ({
                        value: user._id,

                        // ✅ search text only (no JSX)
                        label: `${user.name}`,
                        user,
                      }))}
                    // 🎯 UI DESIGN (badge role)
                    optionRender={(option) => {
                      const user = option?.data?.user;

                      if (!user) return null; // ✅ prevents crash

                      return (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-medium">
                            {user.name}
                          </span>

                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              roleColors[user.role?.name] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {user.role?.name || "-"}
                          </span>
                        </div>
                      );
                    }}
                  />
                  {/* <Select
                    onValueChange={(value) =>
                      formik.setFieldValue("reportingManager", value)
                    }
                    value={formik.values.reportingManager}
                  >
                    <SelectTrigger id="reportingManager">
                      <SelectValue placeholder="Select Manager" />
                    </SelectTrigger>

                    <SelectContent>
                      {userStatus === "loading" && (
                        <SelectItem disabled>Loading...</SelectItem>
                      )}

                      {dropdownUsers
                        .filter((user) => {
                          if (!selectedRole) return true;

                          // ✅ Admin / Sr. Manager → only Owner
                          if (selectedRole.name === "Admin") {
                            return user.role?.name === "Owner";
                          }
                          if (selectedRole.name === "Sr. Manager") {
                            return ["Owner", "Admin"].includes(user.role?.name);
                          }

                          // ✅ Manager → Owner + Admin + Sr. Manager
                          if (selectedRole.name === "Manager") {
                            return ["Owner", "Admin", "Sr. Manager"].includes(
                              user.role?.name,
                            );
                          }

                          return true;
                        })
                        .map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="me-2">{user.name}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  roleColors[user.role?.name] ||
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {user.role?.name}
                              </span>
                            </div>{" "}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select> */}

                  {formik.touched.reportingManager &&
                    formik.errors.reportingManager && (
                      <span className="text-red-500 text-xs">
                        {formik.errors.reportingManager}
                      </span>
                    )}
                </div>
              )}
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
                      <SelectItem disabled>Loading...</SelectItem>
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
                  Password{" "}
                  <span className="text-xs text-muted-foreground">
                    (Leave blank to keep current)
                  </span>
                </Label>

                <Input
                  id="password"
                  type="password"
                  placeholder="New Password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {/* {formik.touched.password && formik.errors.password && (
                <span className="text-red-500 text-xs">
                  {formik.errors.password}
                </span>
              )} */}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password{" "}
                  {formik.values.password && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm New Password"
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

export default EditUser;
