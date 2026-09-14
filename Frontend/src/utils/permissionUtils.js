/**
 * Utility functions for evaluation of array-based RBAC permissions.
 *
 * Permission Item Structure:
 * {
 *   parentModuleKey: "my_day",
 *   submoduleKey: "delegated_recurring",
 *   actions: { create: true, read: true, update: false, delete: false }
 * }
 */

// Action alias mapping to standard CRUD keys
const ACTION_MAP = {
  view: "read",
  read: "read",
  create: "create",
  add: "create",
  edit: "update",
  update: "update",
  delete: "delete",
  remove: "delete",
};

/**
 * Checks if the user has a specific action privilege for a submodule.
 *
 * @param {Array} permissions - Array of submodule permission objects from Redux.
 * @param {string} submoduleKey - Target submodule identifier (e.g., 'delegated_recurring').
 * @param {string} action - Action key ('read' | 'create' | 'update' | 'delete' | 'view' | 'edit').
 * @param {boolean} isSuper - Super User flag.
 * @returns {boolean} True if authorized, otherwise false.
 */
export const checkPermission = (
  permissions = [],
  submoduleKey,
  action = "read",
  isSuper = false,
) => {
  if (isSuper) return true;
  if (
    !submoduleKey ||
    !Array.isArray(permissions) ||
    permissions.length === 0
  ) {
    return false;
  }

  const targetAction = ACTION_MAP[action?.toLowerCase()] || action;

  const item = permissions.find((p) => p.submoduleKey === submoduleKey);
  if (!item || !item.actions) return false;

  return Boolean(item.actions[targetAction]);
};

/**
 * Checks if the user has ALL specified actions for a submodule.
 *
 * @param {Array} permissions - Permission array from Redux.
 * @param {string} submoduleKey - Target submodule identifier.
 * @param {Array<string>} actions - Array of required actions.
 * @param {boolean} isSuper - Super User flag.
 * @returns {boolean}
 */
export const checkAllPermissions = (
  permissions = [],
  submoduleKey,
  actions = ["read"],
  isSuper = false,
) => {
  if (isSuper) return true;
  return actions.every((act) =>
    checkPermission(permissions, submoduleKey, act, isSuper),
  );
};

/**
 * Checks if the user has AT LEAST ONE specified action for a submodule.
 *
 * @param {Array} permissions - Permission array from Redux.
 * @param {string} submoduleKey - Target submodule identifier.
 * @param {Array<string>} actions - Array of potential actions.
 * @param {boolean} isSuper - Super User flag.
 * @returns {boolean}
 */
export const checkAnyPermission = (
  permissions = [],
  submoduleKey,
  actions = ["read", "create", "update", "delete"],
  isSuper = false,
) => {
  if (isSuper) return true;
  return actions.some((act) =>
    checkPermission(permissions, submoduleKey, act, isSuper),
  );
};

/**
 * Extracts full CRUD permissions object for a specific submodule.
 * Useful for UI components that need to check multiple flags at once.
 *
 * @param {Array} permissions - Permission array from Redux.
 * @param {string} submoduleKey - Target submodule identifier.
 * @param {boolean} isSuper - Super User flag.
 * @returns {{ canCreate: boolean, canRead: boolean, canUpdate: boolean, canDelete: boolean }}
 */
export const getSubmodulePermissions = (
  permissions = [],
  submoduleKey,
  isSuper = false,
) => {
  if (isSuper) {
    return { canCreate: true, canRead: true, canUpdate: true, canDelete: true };
  }

  const item = Array.isArray(permissions)
    ? permissions.find((p) => p.submoduleKey === submoduleKey)
    : null;

  const actions = item?.actions || {};

  return {
    canCreate: Boolean(actions.create),
    canRead: Boolean(actions.read),
    canUpdate: Boolean(actions.update),
    canDelete: Boolean(actions.delete),
  };
};
