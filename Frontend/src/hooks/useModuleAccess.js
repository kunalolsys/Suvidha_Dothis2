import { useSelector } from "react-redux";
import Cookies from "js-cookie";

const useModuleAccess = () => {
  const modules = useSelector(
    (state) => state.modules.modules
  );

  const role = Cookies.get("role") || "";

  const isSuper = role === "Super";

  const isModuleEnabled = (moduleKey) => {
    if (isSuper) return true;

    return modules.some(
      (m) =>
        m.moduleKey === moduleKey &&
        m.isEnabled
    );
  };

  return {
    modules,

    isModuleEnabled,

    isDoThisEnabled:
      isModuleEnabled("DO_THIS2"),

    isFmsEnabled:
      isModuleEnabled("FMS_ENGINE"),

    isCompanySetupEnabled:
      isModuleEnabled("COMPANY_SETUP"),

    isBothDisable:
      !isModuleEnabled("DO_THIS2") &&
      !isModuleEnabled("FMS_ENGINE"),
  };
};

export default useModuleAccess;