import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Trash2,
  Search,
  Check,
  Save,
  ShieldCheck,
  Layers,
  AlertCircle,
  Sparkles,
  SlidersHorizontal,
  FolderTree,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../../redux/slices/role/roleSlice";

// shadcn/ui components
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { toast } from "sonner";
import { Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

const ACTIONS = [
  { key: "create", label: "Create", color: "text-emerald-700" },
  { key: "read", label: "View", color: "text-blue-700" },
  { key: "update", label: "Edit", color: "text-amber-700" },
  { key: "delete", label: "Delete", color: "text-rose-700" },
];

// Helper: Action Disabling Rules for UI Interaction
const isActionDisabledForSubmodule = (submoduleKey, actionKey) => {
  if (
    submoduleKey === "dashboard" ||
    submoduleKey === "role_view" ||
    submoduleKey === "upcoming_ongoing_fms" ||
    submoduleKey === "mis_reports" ||
    submoduleKey === "fms_reports"
  ) {
    return actionKey !== "read";
  }
  if (
    submoduleKey === "task_reassigning" ||
    submoduleKey === "responses" ||
    submoduleKey === "my_bucket" ||
    submoduleKey === "manage_assignee"
  ) {
    return actionKey !== "read" && actionKey !== "update";
  }
  if (submoduleKey === "launch_fms" || submoduleKey === "task_buckets") {
    return actionKey !== "read" && actionKey !== "create";
  }

  return false;
};

const RolesPermissions = () => {
  const dispatch = useDispatch();

  // 1. Roles State from Redux Store
  const { roles: rawRoles = [], status } = useSelector(
    (state) => state.roles || {},
  );

  // 2. 🔥 PERMISSIONS STATE DIRECTLY FROM REDUX STORE
  const reduxPermissions = useSelector(
    (state) => state.permissions?.permissions || {},
  );
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "roles_permissions",
    isSuper,
  );
  // Component State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [permissionMatrix, setPermissionMatrix] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth User Role Check
  const userRole = useMemo(() => {
    return (Cookies.get("role") || "").toLowerCase();
  }, []);

  // Check Page Access using Redux Permissions State
  const canViewPage = useMemo(() => {
    if (
      userRole.includes("admin") ||
      userRole.includes("owner") ||
      userRole.includes("super")
    ) {
      return true;
    }

    if (Array.isArray(reduxPermissions)) {
      const match = reduxPermissions.find(
        (p) => p.submoduleKey === "roles_permissions",
      );
      return Boolean(match?.actions?.read || match?.actions?.create);
    }

    if (typeof reduxPermissions === "object" && reduxPermissions !== null) {
      return Boolean(
        reduxPermissions["roles_permissions_view"] ||
        reduxPermissions["roles_permissions_read"] ||
        reduxPermissions["roles_permissions"],
      );
    }

    return false;
  }, [userRole, reduxPermissions]);

  // Fetch Roles on Load
  useEffect(() => {
    if (canViewPage) {
      dispatch(fetchRoles());
    }
  }, [canViewPage, dispatch]);

  // Dynamic Modules Tree Extraction Directly from API Response
  const systemModulesTree = useMemo(() => {
    const parentMap = new Map();

    (rawRoles || []).forEach((r) => {
      const perms = Array.isArray(r.permissions) ? r.permissions : [];
      perms.forEach((p) => {
        if (p?.parentModuleKey && p?.submoduleKey) {
          if (!parentMap.has(p.parentModuleKey)) {
            parentMap.set(p.parentModuleKey, {
              key: p.parentModuleKey,
              label: p.parentModuleKey.replace(/_/g, " ").toUpperCase(),
              submodules: new Map(),
            });
          }

          const parent = parentMap.get(p.parentModuleKey);
          if (!parent.submodules.has(p.submoduleKey)) {
            parent.submodules.set(p.submoduleKey, {
              key: p.submoduleKey,
              label: p.submoduleKey.replace(/_/g, " "),
            });
          }
        }
      });
    });

    return Array.from(parentMap.values()).map((parent) => ({
      ...parent,
      submodules: Array.from(parent.submodules.values()),
    }));
  }, [rawRoles]);

  // Permission Matrix Initialization Helper (Retains DB Values)
  const initMatrix = useCallback(
    (existingPermissions = []) => {
      const initial = {};

      systemModulesTree.forEach((parent) => {
        parent.submodules.forEach((sub) => {
          const match = Array.isArray(existingPermissions)
            ? existingPermissions.find((p) => p.submoduleKey === sub.key)
            : null;

          if (match && match.actions) {
            initial[sub.key] = {
              parentModuleKey: parent.key,
              create: Boolean(match.actions.create),
              read: Boolean(match.actions.read),
              update: Boolean(match.actions.update),
              delete: Boolean(match.actions.delete),
            };
          } else {
            initial[sub.key] = {
              parentModuleKey: parent.key,
              create: false,
              read: false,
              update: false,
              delete: false,
            };
          }
        });
      });

      return initial;
    },
    [systemModulesTree],
  );

  // Sync selected role data when rawRoles updates from API
  useEffect(() => {
    if (selectedRole && !isCreatingNew) {
      const updatedRoleObj = rawRoles.find(
        (r) => (r._id || r.id) === (selectedRole._id || selectedRole.id),
      );
      if (updatedRoleObj) {
        setSelectedRole(updatedRoleObj);
        setRoleName(updatedRoleObj.displayName || updatedRoleObj.name || "");
        setPermissionMatrix(initMatrix(updatedRoleObj.permissions || []));
      }
    } else if (rawRoles.length > 0 && !selectedRole && !isCreatingNew) {
      const defaultRole =
        rawRoles.find((r) => r.name?.toLowerCase() !== "owner") || rawRoles[0];
      selectRoleToEdit(defaultRole);
    }
  }, [rawRoles, systemModulesTree]);

  const selectRoleToEdit = (role) => {
    setIsCreatingNew(false);
    setSelectedRole(role);
    setRoleName(role.displayName || role.name || "");
    setPermissionMatrix(initMatrix(role.permissions || []));
  };

  const startCreateRole = () => {
    setIsCreatingNew(true);
    setSelectedRole(null);
    setRoleName("");
    setPermissionMatrix(initMatrix([]));
  };

  // Action Checkbox Handler
  const handleCheckboxChange = (submoduleKey, actionKey, checked) => {
    if (isActionDisabledForSubmodule(submoduleKey, actionKey)) return;

    setPermissionMatrix((prev) => ({
      ...prev,
      [submoduleKey]: {
        ...prev[submoduleKey],
        [actionKey]: checked,
      },
    }));
  };

  // Toggle Submodule Actions (Ignores disabled checkboxes)
  const toggleAllForSubmodule = (submoduleKey, checked) => {
    setPermissionMatrix((prev) => {
      const current = prev[submoduleKey] || {};
      return {
        ...prev,
        [submoduleKey]: {
          ...current,
          create: isActionDisabledForSubmodule(submoduleKey, "create")
            ? current.create
            : checked,
          read: isActionDisabledForSubmodule(submoduleKey, "read")
            ? current.read
            : checked,
          update: isActionDisabledForSubmodule(submoduleKey, "update")
            ? current.update
            : checked,
          delete: isActionDisabledForSubmodule(submoduleKey, "delete")
            ? current.delete
            : checked,
        },
      };
    });
  };

  // Toggle Parent Module Actions (Ignores disabled checkboxes)
  const toggleAllForParentModule = (parentModule, checked) => {
    const updated = { ...permissionMatrix };
    parentModule.submodules.forEach((sub) => {
      const current = updated[sub.key] || {};
      updated[sub.key] = {
        ...current,
        parentModuleKey: parentModule.key,
        create: isActionDisabledForSubmodule(sub.key, "create")
          ? current.create
          : checked,
        read: isActionDisabledForSubmodule(sub.key, "read")
          ? current.read
          : checked,
        update: isActionDisabledForSubmodule(sub.key, "update")
          ? current.update
          : checked,
        delete: isActionDisabledForSubmodule(sub.key, "delete")
          ? current.delete
          : checked,
      };
    });
    setPermissionMatrix(updated);
  };

  const applyPreset = (type) => {
    const updated = {};
    systemModulesTree.forEach((parent) => {
      parent.submodules.forEach((sub) => {
        const current = permissionMatrix[sub.key] || {};
        updated[sub.key] = {
          parentModuleKey: parent.key,
          create: isActionDisabledForSubmodule(sub.key, "create")
            ? current.create
            : type === "ALL",
          read: isActionDisabledForSubmodule(sub.key, "read")
            ? current.read
            : type === "ALL" || type === "READ",
          update: isActionDisabledForSubmodule(sub.key, "update")
            ? current.update
            : type === "ALL",
          delete: isActionDisabledForSubmodule(sub.key, "delete")
            ? current.delete
            : type === "ALL",
        };
      });
    });
    setPermissionMatrix(updated);
  };

  // Active Rights Calculator
  const totalActiveRights = useMemo(() => {
    let count = 0;
    Object.values(permissionMatrix).forEach((item) => {
      if (item) {
        if (item.create) count++;
        if (item.read) count++;
        if (item.update) count++;
        if (item.delete) count++;
      }
    });
    return count;
  }, [permissionMatrix]);

  // Build Payload Array for API Update
  const buildPayload = () => {
    const permissionsPayload = [];

    systemModulesTree.forEach((parent) => {
      parent.submodules.forEach((sub) => {
        const data = permissionMatrix[sub.key] || {};

        permissionsPayload.push({
          parentModuleKey: parent.key,
          submoduleKey: sub.key,
          actions: {
            create: Boolean(data.create),
            read: Boolean(data.read),
            update: Boolean(data.update),
            delete: Boolean(data.delete),
          },
        });
      });
    });

    return permissionsPayload;
  };

  // Save Role Handler
  const handleSave = async () => {
    const trimmedName = roleName.trim();
    if (!trimmedName) {
      toast.error("Please enter a role display name");
      return;
    }

    const payloadPermissions = buildPayload();

    setIsSubmitting(true);
    try {
      if (isCreatingNew) {
        const payload = {
          name: trimmedName,
          displayName: trimmedName,
          permissions: payloadPermissions,
        };
        const result = await dispatch(createRole(payload)).unwrap();
        toast.success("New role created successfully!");
        setIsCreatingNew(false);
        dispatch(fetchRoles());
        if (result?.data || result) {
          selectRoleToEdit(result.data || result);
        }
      } else if (selectedRole) {
        const roleId = selectedRole._id || selectedRole.id;
        const payload = {
          id: roleId,
          name: selectedRole.isSystemRole ? selectedRole.name : trimmedName,
          displayName: trimmedName,
          description: selectedRole.description || "",
          permissions: payloadPermissions,
        };

        await dispatch(updateRole(payload)).unwrap();
        toast.success("Role permissions updated successfully!");

        // Re-fetch fresh roles from API
        await dispatch(fetchRoles()).unwrap();
      }
    } catch (err) {
      toast.error(err?.message || err || "Failed to save role");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Role Handler
  const handleDelete = (role) => {
    if (role.isSystemRole || role.canDelete === false) {
      Modal.warning({
        title: "System Protected Role",
        content: "Default system roles cannot be deleted.",
      });
      return;
    }

    Modal.confirm({
      title: "Delete Role",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${role.displayName || role.name}"?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await dispatch(deleteRole(role._id || role.id)).unwrap();
          toast.success("Role deleted successfully");
          setSelectedRole(null);
          setIsCreatingNew(false);
          dispatch(fetchRoles());
        } catch (err) {
          toast.error(err?.message || err || "Delete operation failed");
        }
      },
    });
  };

  // Roles Search Filter
  const filteredRoles = useMemo(() => {
    return (rawRoles || [])
      .filter((r) => r.name?.toLowerCase() !== "owner")
      .filter((r) =>
        (r.displayName || r.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      );
  }, [rawRoles, searchTerm]);

  if (!canViewPage) {
    return (
      <div className="flex justify-center items-center h-screen w-full p-8 bg-slate-50">
        <Card className="w-full max-w-md text-center p-6 border-rose-200 bg-white shadow-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-slate-800">Access Denied</h2>
          <p className="text-xs text-slate-500 mt-1">
            You do not have permission to view or manage role configurations.
          </p>
        </Card>
      </div>
    );
  }

  if (status === "loading" && rawRoles.length === 0) {
    return (
      <div className="p-8 text-center text-indigo-600 font-medium">
        Loading Roles Engine...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-100/60 text-slate-800 flex flex-col font-sans">
      {/* HEADER BAR */}
      <header className="w-full bg-white border-b border-slate-200/80 px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Roles & Permissions Studio
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage module and submodule level CRUD permissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <Button
              onClick={startCreateRole}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-10 px-5 rounded-xl shadow-xs transition-all"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Custom Role
            </Button>
          )}
          {(canUpdate || canCreate) && (
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-10 px-6 rounded-xl shadow-xs transition-all"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Privileges"}
            </Button>
          )}
        </div>
      </header>

      {/* PANELS */}
      <div className="w-full flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT PANEL: ROLES LIST */}
        <div className="w-full md:w-80 border-r border-slate-200/80 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[calc(100vh-140px)]">
            {filteredRoles.length > 0 ? (
              filteredRoles.map((role) => {
                const isSelected =
                  selectedRole?._id === role._id && !isCreatingNew;
                const isSystem = role.isSystemRole || role.canDelete === false;

                return (
                  <div
                    key={role._id || role.id}
                    onClick={() => selectRoleToEdit(role)}
                    className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-indigo-50/90 border border-indigo-200 text-indigo-900 font-semibold shadow-2xs"
                        : "hover:bg-slate-100/70 border border-transparent text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-medium">
                        {role.displayName || role.name}
                      </span>
                      {isSystem && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 font-normal"
                        >
                          System
                        </Badge>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching roles found.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: MATRIX GRID */}
        <div className="flex-1 flex flex-col bg-slate-50/60 overflow-y-auto p-6 space-y-4">
          {/* Header Controls */}
          <div className="p-6 border border-slate-200/80 bg-white rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
            <div className="flex-1 max-w-md">
              <Label className="text-xs text-slate-600 font-semibold mb-1.5 block">
                Role Display Title
              </Label>
              <Input
                value={roleName}
                disabled={selectedRole?.isSystemRole && !isCreatingNew}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Operations Manager"
                className="h-10 text-xs border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-indigo-50/80 px-3.5 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-indigo-950 font-medium">
                  Active Rights:{" "}
                  <strong className="text-indigo-600 font-bold text-sm">
                    {totalActiveRights}
                  </strong>
                </span>
              </div>

              {/* Presets Toolbar */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyPreset("ALL")}
                  className="text-xs h-7 text-emerald-700 hover:bg-emerald-50 rounded-lg font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Allow All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyPreset("READ")}
                  className="text-xs h-7 text-blue-700 hover:bg-blue-50 rounded-lg font-medium"
                >
                  Read Only
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyPreset("NONE")}
                  className="text-xs h-7 text-slate-600 hover:bg-slate-200/60 rounded-lg font-medium"
                >
                  Clear All
                </Button>
              </div>

              {canDelete &&
                !isCreatingNew &&
                selectedRole &&
                !selectedRole?.isSystemRole &&
                selectedRole?.canDelete !== false && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(selectedRole)}
                    className="text-xs h-9 text-rose-600 hover:bg-rose-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete Role
                  </Button>
                )}
            </div>
          </div>

          {/* Module Section Accordion Grid */}
          <div className="space-y-4">
            {systemModulesTree.map((parent) => {
              const isParentFullySelected = parent.submodules.every((sub) =>
                ACTIONS.every((act) => permissionMatrix[sub.key]?.[act.key]),
              );
              console.log(parent.key)
              if (parent.key == "module_management") {
                return null; // Skip rendering the "module_management" parent module
              }
              return (
                <div
                  key={parent.key}
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
                >
                  {/* Parent Module Header */}
                  <div className="px-6 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FolderTree className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        {parent.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 sm:gap-10 pr-2">
                      {ACTIONS.map((act) => (
                        <span
                          key={act.key}
                          className={`w-12 text-center text-[11px] font-bold uppercase ${act.color}`}
                        >
                          {act.label}
                        </span>
                      ))}

                      {/* Parent Toggle All Checkbox */}
                      <div className="w-24 text-center border-l border-slate-200 pl-3">
                        <label
                          htmlFor={`cb-parent-${parent.key}`}
                          className="text-[11px] font-bold text-indigo-700 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Checkbox
                            id={`cb-parent-${parent.key}`}
                            checked={isParentFullySelected}
                            onCheckedChange={(checked) =>
                              toggleAllForParentModule(parent, Boolean(checked))
                            }
                            className="h-4 w-4 rounded-md border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          />
                          Module All
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Submodule Rows */}
                  <div className="divide-y divide-slate-100">
                    {parent.submodules.map((sub) => {
                      const currentActions = permissionMatrix[sub.key] || {};
                      const isSubmoduleFullySelected = ACTIONS.every(
                        (a) => currentActions[a.key],
                      );

                      return (
                        <div
                          key={sub.key}
                          className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-semibold text-xs text-slate-800 block capitalize">
                                {sub.label}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Key: {sub.key}
                              </span>
                            </div>
                          </div>

                          {/* Action Checkboxes */}
                          <div className="flex items-center gap-6 sm:gap-10 pr-2">
                            {ACTIONS.map((act) => {
                              const isChecked = Boolean(
                                currentActions[act.key],
                              );
                              const isDisabled = isActionDisabledForSubmodule(
                                sub.key,
                                act.key,
                              );
                              const checkboxId = `cb-${sub.key}-${act.key}`;

                              return (
                                <div
                                  key={act.key}
                                  className="w-12 flex items-center justify-center"
                                >
                                  <label
                                    htmlFor={checkboxId}
                                    className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                                      isDisabled
                                        ? "cursor-not-allowed opacity-50"
                                        : "cursor-pointer hover:bg-slate-100/80"
                                    }`}
                                  >
                                    <Checkbox
                                      id={checkboxId}
                                      checked={isChecked}
                                      disabled={isDisabled}
                                      onCheckedChange={(checked) =>
                                        handleCheckboxChange(
                                          sub.key,
                                          act.key,
                                          Boolean(checked),
                                        )
                                      }
                                      className="h-4.5 w-4.5 rounded-md border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 disabled:data-[state=checked]:bg-slate-400 disabled:data-[state=checked]:border-slate-400"
                                    />
                                  </label>
                                </div>
                              );
                            })}

                            {/* Row Select All */}
                            <div className="w-24 flex items-center justify-center border-l border-slate-100 pl-3">
                              <label
                                htmlFor={`cb-${sub.key}-all`}
                                className="p-1.5 rounded-lg cursor-pointer hover:bg-slate-100/80 transition-colors flex items-center justify-center"
                              >
                                <Checkbox
                                  id={`cb-${sub.key}-all`}
                                  checked={isSubmoduleFullySelected}
                                  onCheckedChange={(checked) =>
                                    toggleAllForSubmodule(
                                      sub.key,
                                      Boolean(checked),
                                    )
                                  }
                                  className="h-4.5 w-4.5 rounded-md border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPermissions;
