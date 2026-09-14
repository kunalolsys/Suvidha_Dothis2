import { useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "../ui";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";

import { Select as AntdSelect } from "antd";

import { Users, Save, ShieldCheck, UserRound } from "lucide-react";

import api from "../../lib/api";

import { useDispatch, useSelector } from "react-redux";

import { fetchRoles } from "../../redux/slices/role/roleSlice";
import { getUserForDrop } from "../../redux/slices/user/userSlice";
import { toast } from "sonner";
import { getSubmodulePermissions } from "../../utils/permissionUtils";

const TaskAudienceMaster = () => {
  const dispatch = useDispatch();

  const { dropdownUsers: users } = useSelector((state) => state.users);

  const { roles } = useSelector((state) => state.roles);

  const [loading, setLoading] = useState(false);

  const [masterId, setMasterId] = useState(null);

  const [assignmentMode, setAssignmentMode] = useState("Role");

  const [selectedRole, setSelectedRole] = useState(null);

  const [selectedMemberRole, setSelectedMemberRole] = useState(null);

  const [selectedMembers, setSelectedMembers] = useState([]);
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canCreate, canRead, canUpdate, canDelete } = getSubmodulePermissions(
    permissions,
    "manage_assignee",
    isSuper,
  );
  useEffect(() => {
    dispatch(fetchRoles());
    dispatch(getUserForDrop());

    fetchMaster();
  }, [dispatch]);

  const fetchMaster = async () => {
    try {
      const res = await api.get("/task-audience-masters");

      const master = res?.data?.data;

      if (!master) return;

      setMasterId(master._id);

      setAssignmentMode(master.assignmentMode);
      if (master.assignmentMode === "Role") {
        setSelectedRole(
          typeof master.targetRole === "object"
            ? master.targetRole?._id
            : master.targetRole,
        );

        setSelectedMemberRole(null);

        setSelectedMembers([]);
      } else {
        // role from backend
        setSelectedMemberRole(
          typeof master.memberRole === "object"
            ? master.memberRole?._id
            : master.memberRole,
        );

        // selected users
        setSelectedMembers(
          master.targetUsers?.map((u) => (typeof u === "object" ? u._id : u)) ||
            [],
        );

        setSelectedRole(null);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!selectedMemberRole) return [];

    return users.filter((u) => {
      const roleId = typeof u.role === "object" ? u.role?._id : u.role;

      const roleName = typeof u.role === "object" ? u.role?.name : "";

      return (
        roleId === selectedMemberRole &&
        !["Admin", "Owner", "Member"].includes(roleName)
      );
    });
  }, [selectedMemberRole, users]);

  const handleSave = async () => {
    try {
      setLoading(true);

      const payload = {
        name: "Default Audience",

        assignmentMode,
      };

      if (assignmentMode === "Role") {
        payload.targetRole = selectedRole;

        payload.memberRole = null;

        payload.targetUsers = [];
      } else {
        payload.memberRole = selectedMemberRole;

        payload.targetUsers = selectedMembers;

        payload.targetRole = null;
      }

      if (masterId) {
        await api.put(`/task-audience-masters/${masterId}`, payload);
      } else {
        const res = await api.post("/task-audience-masters", payload);

        setMasterId(res?.data?.data?._id);
      }

      toast.success("Audience master saved");
    } catch (err) {
      console.log(err);

      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleData = roles.find((r) => r._id === selectedRole);

  const selectedUsersPreview = users.filter((u) =>
    selectedMembers.includes(u._id),
  );

  return (
    <div className="mx-auto p-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT */}

        <div className="lg:col-span-2">
          <Card className="rounded-[30px] border-0 shadow-xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />

            <CardContent className="p-8 space-y-8">
              {/* HEADER */}

              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Task Audience Master
                </h2>

                <p className="text-slate-500 mt-1">
                  Configure default task audience
                </p>
              </div>

              {/* MODE */}

              <div className="space-y-3">
                <Label>Assignment Mode</Label>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setAssignmentMode("Role")}
                    className={`h-28 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${
                      assignmentMode === "Role"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200"
                    }`}
                  >
                    <ShieldCheck className="w-7 h-7 text-blue-600" />

                    <span className="font-semibold">Role Based</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentMode("Users")}
                    className={`h-28 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${
                      assignmentMode === "Users"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200"
                    }`}
                  >
                    <Users className="w-7 h-7 text-indigo-600" />

                    <span className="font-semibold">Specific Users</span>
                  </button>
                </div>
              </div>

              {/* ROLE MODE */}

              {assignmentMode === "Role" ? (
                <div className="space-y-3">
                  <Label>Select Role</Label>

                  <AntdSelect
                    size="large"
                    placeholder="Choose role"
                    value={selectedRole || undefined}
                    onChange={setSelectedRole}
                    style={{ width: "100%" }}
                    options={roles
                      .filter(
                        (r) => !["Admin", "Owner", "Member"].includes(r.name),
                      )
                      .map((r) => ({
                        value: r._id,
                        label: r.displayName || r.name,
                      }))}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* ROLE */}

                  <div className="space-y-3">
                    <Label>Select Role</Label>

                    <AntdSelect
                      size="large"
                      placeholder="Choose role"
                      value={selectedMemberRole || undefined}
                      onChange={(value) => {
                        setSelectedMemberRole(value);
                        setSelectedMembers([]);
                      }}
                      style={{ width: "100%" }}
                      options={roles
                        .filter(
                          (r) => !["Admin", "Owner", "Member"].includes(r.name),
                        )
                        .map((r) => ({
                          value: r._id,
                          label: r.displayName || r.name,
                        }))}
                    />
                  </div>

                  {/* USERS */}

                  <div className="space-y-3">
                    <Label>Select Users</Label>

                    <AntdSelect
                      mode="multiple"
                      size="large"
                      placeholder="Choose users"
                      value={selectedMembers}
                      onChange={setSelectedMembers}
                      style={{ width: "100%" }}
                      optionFilterProp="label"
                      options={filteredMembers.map((u) => ({
                        value: u._id,
                        label: u.name,
                      }))}
                    />
                  </div>
                </div>
              )}

              {/* BUTTON */}

              {canUpdate && (
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base"
                >
                  <Save className="w-5 h-5 mr-2" />

                  {loading ? "Saving..." : "Save Audience Master"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT */}

        <div>
          <Card className="rounded-[30px] border-0 shadow-xl sticky top-5 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />

            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold">Audience Preview</h3>

                <p className="text-sm text-slate-500 mt-1">
                  Current default audience
                </p>
              </div>

              {assignmentMode === "Role" ? (
                selectedRoleData ? (
                  <Badge className="rounded-xl px-4 py-3 bg-blue-100 text-blue-700 border-blue-200 text-sm">
                    👥 {selectedRoleData.name}
                  </Badge>
                ) : (
                  <div className="text-sm text-slate-400">No role selected</div>
                )
              ) : selectedUsersPreview.length === 0 ? (
                <div className="text-sm text-slate-400">No users selected</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedUsersPreview.map((u) => (
                    <Badge
                      key={u._id}
                      className="rounded-xl px-3 py-2 bg-indigo-100 text-indigo-700 border-indigo-200"
                    >
                      <UserRound className="w-3 h-3 mr-1" />

                      {u.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TaskAudienceMaster;
