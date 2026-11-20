import React, { useState, useEffect } from "react";
import { SlidersHorizontal, Save, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import api from "../lib/api";
import { useSelector } from "react-redux";
import { getSubmodulePermissions } from "../utils/permissionUtils";

const AdminExtensionMaster = () => {
  const [daysBeforeDueDate, setDaysBeforeDueDate] = useState(2);
  // const [maxExtensionDays, setMaxExtensionDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { permissions, isSuper } = useSelector((state) => state.permissions);

  // Destructure clean capability flags
  const { canRead, canUpdate } = getSubmodulePermissions(
    permissions,
    "extension_master",
    isSuper,
  );
  const fetchMaster = async () => {
    setLoading(true);
    try {
      const res = await api.get("/task-extension/master");
      if (res.data?.data) {
        setDaysBeforeDueDate(res.data.data.daysBeforeDueDate);
        // setMaxExtensionDays(res.data.data.maxExtensionDays);
      }
    } catch (err) {
      toast.error("Failed to fetch master configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaster();
  }, []);

  const handleSave = async () => {
    if (daysBeforeDueDate < 1 /* || maxExtensionDays < 1 */) {
      toast.error("Values must be at least 1 day.");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/task-extension/master", {
        daysBeforeDueDate: Number(daysBeforeDueDate),
        // maxExtensionDays: Number(maxExtensionDays),
      });
      toast.success("Task Extension Master rules updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 py-4">
      <div className="shadow-xl border-0 overflow-hidden rounded-xl bg-white max-w-2xl mx-auto">
        <div className="p-4 py-4">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-4 border-y border-white/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-xs">
                <SlidersHorizontal className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Task Extension Master
                </h1>
                <p className="text-xs text-purple-100 mt-0.5">
                  Global display window aur max extendable days configure karein
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMaster}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <RefreshCcw className="h-4 w-4 mr-1.5" />
            </Button>
          </div>
        </div>

        <div className="p-6 pt-0 space-y-5">
          <Card className="border border-slate-200 bg-gray-50/50">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Days Before Due Date
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={daysBeforeDueDate}
                  onChange={(e) => setDaysBeforeDueDate(e.target.value)}
                  className="bg-white text-xs h-10"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Task ki due date se itne din pehle employee ko "Extend Date"
                  button dikhega.
                </span>
              </div>

              {/* <div>
                <Label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Maximum Allowable Extension Days
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={maxExtensionDays}
                  onChange={(e) => setMaxExtensionDays(e.target.value)}
                  className="bg-white text-xs h-10"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Employee ek request mein maximum itne dino tak ki extension
                  maang sakta hai.
                </span>
              </div> */}

              {canUpdate && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving || loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-10 rounded-lg mt-2"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {isSaving ? "Saving Settings..." : "Save Master Settings"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminExtensionMaster;
