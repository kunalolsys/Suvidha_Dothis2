import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";
import { useSelector, useDispatch } from "react-redux";
import { getAccessToken } from "./lib/tokenManager";
import { fetchMyPermissions } from "./redux/slices/permissions/permissionSlice";

const PermissionRoute = ({
  children,
  requiredPermission,
  isSuperOnly = false,
}) => {
  const dispatch = useDispatch();

  // 1. 🔥 Redux Selectors
  const {
    permissions = [],
    isSuper: isSuperFromStore = false,
    status = "idle",
  } = useSelector((state) => state.permissions || {});

  const token = getAccessToken();
  const roleCookie = (Cookies.get("role") || "").trim().toLowerCase();
  const isSuper = isSuperFromStore || roleCookie.includes("super");

  // 2. 🔥 Re-hydrate Permissions from API on F5 Reload
  useEffect(() => {
    if (token && status === "idle") {
      dispatch(fetchMyPermissions());
    }
  }, [token, status, dispatch]);

  // 🔴 AUTH CHECK
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 🔒 STRICT SUPER USER ONLY ROUTE CHECK
  if (isSuperOnly || requiredPermission === "module_setting") {
    if (!isSuper) {
      return <Navigate to="/page-restrict-found" replace />;
    }
    return children;
  }

  // 🟢 SUPER USER BYPASS
  if (isSuper) {
    return children;
  }

  // ⏳ LOADING STATE ON F5 REFRESH
  if (status === "loading" || status === "idle") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-indigo-600 font-semibold text-xs">
        Verifying Security Rights...
      </div>
    );
  }

  // 🔴 PERMISSION EVALUATION CHECK
  let hasAccess = false;

  if (Array.isArray(permissions)) {
    const match = permissions.find(
      (p) => p.submoduleKey === requiredPermission,
    );
    if (match && match.actions) {
      // Require read/view access for route navigation
      hasAccess = Boolean(match.actions.read || match.actions.view);
    }
  } else if (typeof permissions === "object" && permissions !== null) {
    hasAccess =
      permissions[requiredPermission] === true ||
      permissions[`${requiredPermission}_view`] === true ||
      permissions[`${requiredPermission}_read`] === true;
  }

  if (!hasAccess) {
    return <Navigate to="/page-restrict-found" replace />;
  }

  return children;
};

export default PermissionRoute;
