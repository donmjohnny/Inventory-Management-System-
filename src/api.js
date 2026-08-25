// Section: API Client Configuration
// strBaseUrl is a string containing the root endpoint for the RBAC backend APIs.
const strBaseUrl = 'http://127.0.0.1:8000/api/rbac';

// objApi is an object grouping backend fetch function properties.
export const objApi = {
  // funcGetUsers is an async function that fetches the list of users.
  funcGetUsers: async () => {
    const objRes = await fetch(`${strBaseUrl}/users/`);
    if (!objRes.ok) throw new Error("Failed to fetch users");
    return objRes.json();
  },
  // funcCreateUser is an async function that sends user data object to create a new user.
  funcCreateUser: async (objUserData) => {
    const objRes = await fetch(`${strBaseUrl}/users/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(objUserData)
    });
    if (!objRes.ok) throw new Error("Failed to create user");
    return objRes.json();
  },
  // funcUpdateUser is an async function that patches a user record by ID.
  funcUpdateUser: async (intId, objPatchData) => {
    const objRes = await fetch(`${strBaseUrl}/users/${intId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(objPatchData)
    });
    if (!objRes.ok) throw new Error("Failed to update user");
    return objRes.json();
  },
  // funcDeleteUser is an async function that deletes a user record by ID.
  funcDeleteUser: async (intId) => {
    const objRes = await fetch(`${strBaseUrl}/users/${intId}/`, {
      method: 'DELETE'
    });
    if (!objRes.ok) throw new Error("Failed to delete user");
    return true;
  },
  // funcGetRoles is an async function that fetches roles.
  funcGetRoles: async () => {
    const objRes = await fetch(`${strBaseUrl}/roles/`);
    if (!objRes.ok) throw new Error("Failed to fetch roles");
    return objRes.json();
  },
  // funcGetPermissions is an async function that fetches permissions.
  funcGetPermissions: async () => {
    const objRes = await fetch(`${strBaseUrl}/permissions/`);
    if (!objRes.ok) throw new Error("Failed to fetch permissions");
    return objRes.json();
  },

  // --- Requisition API Functions ---

  // funcGetCatalogItems fetches all active items for the requisition search dropdown.
  funcGetCatalogItems: async () => {
    const objRes = await fetch(`${strBaseUrl}/catalog/items/`);
    if (!objRes.ok) throw new Error("Failed to fetch catalog items");
    return objRes.json();
  },
  // funcGetCatalogBranches fetches all branches for the requisition branch dropdown.
  funcGetCatalogBranches: async () => {
    const objRes = await fetch(`${strBaseUrl}/catalog/branches/`);
    if (!objRes.ok) throw new Error("Failed to fetch branches");
    return objRes.json();
  },
  // funcGetNextRequisitionNo fetches the next auto-generated requisition number.
  funcGetNextRequisitionNo: async () => {
    const objRes = await fetch(`${strBaseUrl}/requisitions/next-no/`);
    if (!objRes.ok) throw new Error("Failed to fetch next requisition number");
    return objRes.json();
  },
  // funcGetRequisitions fetches requisitions, optionally filtered by status and/or user_id.
  funcGetRequisitions: async (strStatus = null, intUserId = null) => {
    const params = new URLSearchParams();
    if (strStatus) params.append('status', strStatus);
    if (intUserId) params.append('user_id', intUserId);
    const objRes = await fetch(`${strBaseUrl}/requisitions/?${params.toString()}`);
    if (!objRes.ok) throw new Error("Failed to fetch requisitions");
    return objRes.json();
  },
  // funcCreateRequisition creates a new requisition (Draft or Pending).
  funcCreateRequisition: async (objData) => {
    const objRes = await fetch(`${strBaseUrl}/requisitions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(objData)
    });
    if (!objRes.ok) throw new Error("Failed to create requisition");
    return objRes.json();
  },
  // funcUpdateRequisition patches an existing requisition by ID (e.g. re-save draft).
  funcUpdateRequisition: async (intId, objData) => {
    const objRes = await fetch(`${strBaseUrl}/requisitions/${intId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(objData)
    });
    if (!objRes.ok) throw new Error("Failed to update requisition");
    return objRes.json();
  },
  // funcDeleteRequisition deletes a Draft requisition by ID.
  funcDeleteRequisition: async (intId) => {
    const objRes = await fetch(`${strBaseUrl}/requisitions/${intId}/`, {
      method: 'DELETE'
    });
    if (!objRes.ok) throw new Error("Failed to delete requisition");
    return true;
  },
  // funcSubmitRequisition transitions a Draft requisition to Pending status.
  funcSubmitRequisition: async (intId) => {
    const objRes = await fetch(`${strBaseUrl}/requisitions/${intId}/submit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!objRes.ok) throw new Error("Failed to submit requisition");
    return objRes.json();
  },
  // funcApproveRequisition transitions a Pending requisition to Approved status.
  funcApproveRequisition: async (intId, strDecidedBy, arrItems = null) => {
    const payload = { strDecidedBy: strDecidedBy || 'Stock Manager' };
    if (arrItems) payload.arrItems = arrItems;
    const objRes = await fetch(`${strBaseUrl}/requisitions/${intId}/approve/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!objRes.ok) throw new Error("Failed to approve requisition");
    return objRes.json();
  },
  // funcRejectRequisition transitions a Pending requisition to Rejected status with a reason.
  funcRejectRequisition: async (intId, strRejectReason, strDecidedBy) => {
    const objRes = await fetch(`${strBaseUrl}/requisitions/${intId}/reject/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strRejectReason: strRejectReason || '', strDecidedBy: strDecidedBy || 'Stock Manager' })
    });
    if (!objRes.ok) throw new Error("Failed to reject requisition");
    return objRes.json();
  },
};
