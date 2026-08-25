import { useState, useEffect, useMemo, useRef } from "react";
import { arrInitialUsers, arrInitialNotifications, arrPresetAvatars } from "./mockData";
import Requisition from "./Requisition";
import Purchase from "./Purchase";
import UsersPage from "./UsersPage";
import Categories from "./Categories";
import Items from "./Items";
import Suppliers from "./Suppliers";
import Branches from "./Branches";
import Login from "./Login";
import Approval from "./Approval";
import Dispatch from "./Dispatch";
import Dashboard from "./Dashboard";
import StockBalance from "./StockBalance";
import BranchReceipt from "./BranchReceipt";

const funcGetInitials = (strName) => {
  if (!strName || typeof strName !== 'string') return "?";
  const arrParts = strName.trim().split(/\s+/).filter(Boolean);
  if (arrParts.length === 0) return "?";
  if (arrParts.length === 1) return arrParts[0].substring(0, 2).toUpperCase();
  return (arrParts[0][0] + arrParts[1][0]).toUpperCase();
};

// Section: Navigation Group Definitions
// arrNavGroups defines the sections and items in the sidebar navigation.
const arrNavGroups = [
  {
    strTitle: 'Overview',
    arrItems: [
      { strIcon: 'layout-dashboard', strLabel: 'Dashboard' },
      { strIcon: 'box',              strLabel: 'Items' },
      { strIcon: 'tags',             strLabel: 'Categories' },
      { strIcon: 'truck',            strLabel: 'Suppliers' },
      { strIcon: 'building',         strLabel: 'Branches' }
    ]
  },
  {
    strTitle: 'Operations',
    arrItems: [
      { strIcon: 'shopping-cart',    strLabel: 'Purchase' },
      { strIcon: 'file-text',        strLabel: 'Requisition' },
      { strIcon: 'circle-check',     strLabel: 'Approval' },
      { strIcon: 'send',             strLabel: 'Dispatch' },
      { strIcon: 'building-warehouse', strLabel: 'Branch Receipt' }
    ]
  },
  {
    strTitle: 'Insight',
    arrItems: [
      { strIcon: 'database',         strLabel: 'Stock Balance' }
    ]
  },
  {
    strTitle: 'Management',
    arrItems: [
      { strIcon: 'users',            strLabel: 'Users' },
      { strIcon: 'key',              strLabel: 'Roles' }
    ]
  }
];


// Section: Wave Drawing Component
// Renders a custom styled SVG wave graph line.
function Wave({ strColor }) {
  const strStroke =
    strColor === 'purple' ? '#7c3aed' :
    strColor === 'red'    ? '#ef4444' :
    strColor === 'blue'   ? '#6366f1' :
    strColor === 'green'  ? '#10b981' : '#9ca3af';
  const objMid =
    strColor === 'red'  ? { floaA: 10, floaB: 32 } :
    strColor === 'gray' ? { floaA: 22, floaB: 18 } :
    strColor === 'green' ? { floaA: 12, floaB: 28 } :
                          { floaA: 8,  floaB: 30 };
  return (
    <svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg"
         style={{ display: 'block', width: '100%', height: '40px' }}>
      <path className="wave-path"
        d={`M0,20 C30,${objMid.floaA} 60,${objMid.floaB} 100,20 C140,${objMid.floaA} 170,${objMid.floaB} 200,20`}
        fill="none" stroke={strStroke} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Section: Stat Card Component
// Renders a grid box containing dynamic status numbers and graphics.
function StatCard({ strIcon, strNum, strLabel, strColor, strWave }) {
  return (
    <div className="stat-card">
      <div className="stat-card-left">
        <div className="stat-icon" style={{ background: strColor + '22', color: strColor }}>
          <i className={`ti ti-${strIcon}`}></i>
        </div>
        <div className="stat-num">{strNum}</div>
        <div className="stat-label">{strLabel}</div>
      </div>
      <div className="stat-card-graph">
        <Wave strColor={strWave} />
      </div>
    </div>
  );
}

// Section: Role Badge Component
// Renders colored labels representing different privilege levels.
function RoleBadge({ strRole, intNum }) {
  const strCls =
    strRole === 'Admin'         ? 'role-admin' :
    strRole === 'Stock Manager' ? 'role-stock'  : 'role-branch';
  return <span className={`role-badge ${strCls}`}>{intNum} • {strRole}</span>;
}

// Section: Action Button Component
// Renders standard toolbar actions with hovering text descriptions.
function ActionBtn({ strIcon, strTip, funcOnClick }) {
  return (
    <button className="action-btn" data-tip={strTip} aria-label={strTip} onClick={funcOnClick}>
      <i className={`ti ti-${strIcon}`} style={{ fontSize: 16 }}></i>
      <div className="tooltip-box">{strTip}</div>
    </button>
  );
}

// Section: Dot Pagination Component
// Renders page switcher dots in footer area.
function PaginationDots({ intCurrent, intTotal, funcOnChange }) {
  const funcGetRange = () => {
    if (intTotal <= 7) return Array.from({ length: intTotal }, (_, intI) => intI + 1);
    if (intCurrent <= 4)        return [1, 2, 3, 4, 5, '…', intTotal];
    if (intCurrent >= intTotal - 3)  return [1, '…', intTotal - 4, intTotal - 3, intTotal - 2, intTotal - 1, intTotal];
    return [1, '…', intCurrent - 1, intCurrent, intCurrent + 1, '…', intTotal];
  };

  return (
    <div className="pag-dots">
      {funcGetRange().map((objPg, intI) =>
        objPg === '…'
          ? <span key={'el' + intI} style={{ fontSize: 14, color: '#9ca3af', padding: '0 2px' }}>…</span>
          : (
            <div
              key={objPg}
              className={`pag-dot${objPg === intCurrent ? ' active' : ''}`}
              onClick={() => funcOnChange(objPg)}
              title={`Page ${objPg}`}
            />
          )
      )}
    </div>
  );
}

// Section: Main Application Dashboard Component
// leoInventoryUsers handles global state, backend connection, sidebars, topbar navigation, modal displays, CSV functions.
export default function leoInventoryUsers() {
  // --- DATABASE & LOG STATE ---
  const [boolIsLoggedIn, funcSetIsLoggedIn] = useState(false);
  const [arrUsers, funcSetUsers] = useState(arrInitialUsers);
  const [arrNotifications, funcSetNotifications] = useState(arrInitialNotifications);

  // --- ROLES & PERMISSIONS STATE ---
  const [arrRolesList, funcSetRolesList] = useState(['Admin', 'Stock Manager', 'Branch User']);
  const [objRoleDescriptions, funcSetRoleDescriptions] = useState({
    'Admin': 'Full system administrative access',
    'Stock Manager': 'Manage inventory, vendors and branch reports',
    'Branch User': 'Request items and view local branch transactions'
  });
  const objHardcodedRolePermissions = {
    'Admin': {
      'Dashboard': true,
      'Inventory': true,
      'Items': true,
      'Categories': true,
      'Suppliers': true,
      'Branches': true,
      'Analytics': true,
      'Purchase': true,
      'Requisition': true,
      'Approval': true,
      'Dispatch': true,
      'Branch Receipt': true,
      'Stock Balance': true,
      'Users': true,
      'Roles': true,
      'Settings': true,
    },
    'Stock Manager': {
      'Dashboard': true,
      'Inventory': true,
      'Items': true,
      'Categories': true,
      'Suppliers': true,
      'Branches': true,
      'Analytics': false,
      'Purchase': true,
      'Requisition': false,
      // Approval is FALSE by default — Admin must explicitly toggle it ON in the Roles page
      // for any role that should be able to view and manage requisition approvals.
      'Approval': false,
      'Dispatch': true,
      'Branch Receipt': false,
      'Stock Balance': true,
      'Users': false,
      'Roles': false,
      'Settings': false,
    },
    'Branch User': {
      'Dashboard': true,
      'Inventory': false,
      'Items': false,
      'Categories': false,
      'Suppliers': false,
      'Branches': false,
      'Analytics': false,
      'Purchase': false,
      'Requisition': true,
      'Approval': false,
      'Dispatch': false,
      'Branch Receipt': true,
      'Stock Balance': false,
      'Users': false,
      'Roles': false,
      'Settings': false,
    }
  };

  // Initialize role permissions from localStorage (persisted admin settings) so that
  // toggle choices survive page reloads. Falls back to hardcoded defaults.
  const [objRolePermissions, funcSetRolePermissions] = useState(() => {
    try {
      const strSaved = localStorage.getItem('leoInventory_rolePermissions_v2');
      if (strSaved) {
        const objSaved = JSON.parse(strSaved);
        // Merge: saved settings override hardcoded defaults, keeping any new role entries
        return { ...objHardcodedRolePermissions, ...objSaved };
      }
    } catch (_) {}
    return objHardcodedRolePermissions;
  });

  const [objCurrentUser, funcSetCurrentUser] = useState(() => {
    return arrInitialUsers[0] || { intId: 1, strName: 'admin', strFull: 'System Admin', strRole: 'Admin', strInitials: 'SA' };
  });
  const [boolShowAddRoleModal, funcSetShowAddRoleModal] = useState(false);
  const [strRoleFormName, funcSetRoleFormName] = useState("");
  const [strRoleFormDesc, funcSetRoleFormDesc] = useState("");

  // --- INTERACTION & MENU STATE ---
  const [strActiveNav, funcSetActiveNav] = useState('Dashboard');
  const [intPage, funcSetPage] = useState(1);
  const [intPerPage, funcSetPerPage] = useState(10);

  // --- BRANCHES LIST STATE ---
  const [arrBranchesList, funcSetBranchesList] = useState([]);

  // --- FILTERS & SEARCH STATE ---
  const [strSearchQuery, funcSetSearchQuery] = useState("");
  const [strUserSearchQuery, funcSetUserSearchQuery] = useState("");
  const [strSearchPropagation, funcSetSearchPropagation] = useState("");
  const [arrGlobalItems, funcSetGlobalItems] = useState([]);
  const [arrGlobalCategories, funcSetGlobalCategories] = useState([]);
  const [arrGlobalSuppliers, funcSetGlobalSuppliers] = useState([]);
  const [arrGlobalPurchases, funcSetGlobalPurchases] = useState([]);
  const [arrGlobalRequisitions, funcSetGlobalRequisitions] = useState([]);
  const [strRoleFilter, funcSetRoleFilter] = useState("All roles");
  const [strBranchFilter, funcSetBranchFilter] = useState("All branches");
  const [strSortField, funcSetSortField] = useState(null);
  const [strSortDirection, funcSetSortDirection] = useState('asc');

  // --- DROPDOWN VISIBILITY ---
  const [boolShowRoleDropdown, funcSetShowRoleDropdown] = useState(false);
  const [boolShowBranchDropdown, funcSetShowBranchDropdown] = useState(false);
  const [boolShowPerPageDropdown, funcSetShowPerPageDropdown] = useState(false);

  // --- THEME STATE ---
  const [strTheme, funcSetTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  // --- TOAST STATE ---
  const [arrToasts, funcSetToasts] = useState([]);
  const [arrLowStockItemsList, funcSetLowStockItemsList] = useState([]);
  const [boolShowLowStockModal, funcSetShowLowStockModal] = useState(false);

  // --- MODALS STATE ---
  const [objSelectedUserForView, funcSetSelectedUserForView] = useState(null);
  const [objSelectedUserForEdit, funcSetSelectedUserForEdit] = useState(null);
  const [boolShowAddModal, funcSetShowAddModal] = useState(false);
  const [boolShowLogoutModal, funcSetShowLogoutModal] = useState(false);
  const [objSelectedUserForResetPassword, funcSetSelectedUserForResetPassword] = useState(null);
  const [strResetPasswordVal, funcSetResetPasswordVal] = useState("");
  const [boolResetSuccess, funcSetResetSuccess] = useState(false);

  // --- FORM STATE ---
  const [strFormName, funcSetFormName] = useState("");
  const [strFormFull, funcSetFormFull] = useState("");
  const [strFormEmail, funcSetFormEmail] = useState("");
  const [strFormPhone, funcSetFormPhone] = useState("");
  const [strFormPassword, funcSetFormPassword] = useState("");
  const [strFormRole, funcSetFormRole] = useState("Branch User");
  const [strFormBranch, funcSetFormBranch] = useState("");
  const [strFormStatus, funcSetFormStatus] = useState("Active");
  const [objSelectedAvatarPreset, funcSetSelectedAvatarPreset] = useState(arrPresetAvatars[0]);

  // --- REFS FOR CLICK OUTSIDE & IMPORT ---
  const refRoleDropdown = useRef(null);
  const refBranchDropdown = useRef(null);
  const refPerPageDropdown = useRef(null);
  const refFileInput = useRef(null);
  const refSearchBox = useRef(null);

  // --- SYNC THEME TO DOCUMENT ---
  useEffect(() => {
    const objRoot = document.documentElement;
    if (strTheme === 'dark') {
      objRoot.classList.add('dark');
    } else {
      objRoot.classList.remove('dark');
    }
    localStorage.setItem('theme', strTheme);
  }, [strTheme]);
  // --- INACTIVITY AUTO-LOGOUT ---
  // Persist role permission toggles to localStorage so admin settings survive page reloads
  useEffect(() => {
    try {
      localStorage.setItem('leoInventory_rolePermissions_v2', JSON.stringify(objRolePermissions));
    } catch (_) {}
  }, [objRolePermissions]);
  // --- INACTIVITY AUTO-LOGOUT ---
  useEffect(() => {
    if (!boolIsLoggedIn) return;

    // Inactivity timeout set to 30 minutes (1,800,000 ms)
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; 
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        funcSetIsLoggedIn(false);
        funcTriggerToast("Logged out due to 30 minutes of inactivity.", "warning");
      }, INACTIVITY_TIMEOUT);
    };

    // Initialize timer
    resetTimer();

    // Listen to user interactions (specifically scroll, as well as general interactions)
    const events = ["scroll", "click", "keydown", "mousemove", "touchstart"];
    const addListeners = () => {
      events.forEach((event) => {
        window.addEventListener(event, resetTimer, { passive: true });
      });
    };

    const removeListeners = () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };

    addListeners();

    // Cleanup listeners and timer
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      removeListeners();
    };
  }, [boolIsLoggedIn]);
  const funcCheckLowStockGlobal = async () => {
    const objPermissions = objRolePermissions[objCurrentUser?.strRole] || {};
    if (!objPermissions['Items'] && !objPermissions['Inventory']) {
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/items/");
      if (res.ok) {
        const data = await res.json();
        const lowStock = data.filter(item => item.current_stock < item.reorder_level && item.status === 'Active');
        if (lowStock.length > 0) {
          funcSetLowStockItemsList(lowStock);
          funcSetShowLowStockModal(true);
        }
      }
    } catch (err) {
      console.warn("Failed to check low stock globally:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const strBackendUrl = "http://127.0.0.1:8000";
      const objBranchRes = await fetch(`${strBackendUrl}/api/branches/`);
      if (objBranchRes.ok) {
        const arrBranchData = await objBranchRes.json();
        funcSetBranchesList(arrBranchData);
        return arrBranchData;
      }
    } catch (branchErr) {
      console.warn("Failed to fetch branches dynamically:", branchErr);
    }
    return [];
  };

  // --- LOAD DATA FROM DJANGO BACKEND ---
  useEffect(() => {
    async function funcFetchBackendData() {
      try {
        const strBackendUrl = "http://127.0.0.1:8000";

        // Fetch Permissions
        const objPermRes = await fetch(`${strBackendUrl}/api/rbac/permissions/`);
        if (!objPermRes.ok) throw new Error("Failed to fetch permissions");
        const arrPermData = await objPermRes.json();

        // Fetch Roles
        const objRoleRes = await fetch(`${strBackendUrl}/api/rbac/roles/`);
        if (!objRoleRes.ok) throw new Error("Failed to fetch roles");
        const arrRoleData = await objRoleRes.json();

        // Fetch Branches
        const arrBranchData = await fetchBranches();

        // Fetch Users
        const objUserRes = await fetch(`${strBackendUrl}/api/rbac/users/`);
        if (!objUserRes.ok) throw new Error("Failed to fetch users");
        const arrUserData = await objUserRes.json();

        // Map Roles from backend to frontend state format
        const arrBackendRoles = arrRoleData.map(r => r.strName);
        const objBackendDescriptions = {};
        const objBackendPermissions = {};

        arrRoleData.forEach(objR => {
          objBackendDescriptions[objR.strName] = objR.strDescription;
          // Build codename-based permissions from the backend
          const objCodePerms = {};
          arrPermData.forEach(objP => {
            objCodePerms[objP.strCodename] = objR.listPermissions.some(objRp => objRp.strCodename === objP.strCodename);
          });
          // Preserve existing nav-label permissions (e.g. 'Approval', 'Dashboard') stored in frontend state.
          // If this is a custom role loaded from the backend that isn't in our local state yet, use default perms.
          const objDefaultNewPermsFallback = {
            'Dashboard': true,
            'Inventory': false,
            'Items': false,
            'Categories': false,
            'Suppliers': false,
            'Branches': false,
            'Analytics': false,
            'Purchase': false,
            'Requisition': true,
            'Approval': false,
            'Dispatch': false,
            'Branch Receipt': false,
            'Stock Balance': true,
            'Users': false,
            'Settings': false,
          };
          const objExistingNavPerms = objRolePermissions[objR.strName] || objDefaultNewPermsFallback;
          objBackendPermissions[objR.strName] = { ...objExistingNavPerms, ...objCodePerms };
        });

        funcSetRolesList(arrBackendRoles);
        funcSetRoleDescriptions(objBackendDescriptions);
        funcSetRolePermissions(objBackendPermissions);

        // Map Users from backend to frontend state format
        const arrMappedUsers = arrUserData.map(objU => {
          const strInitials = funcGetInitials(objU.strName);

          const intRoleNum = arrBackendRoles.indexOf(objU.strRoleName) !== -1 ? arrBackendRoles.indexOf(objU.strRoleName) + 1 : 3;
          const objPreset = arrPresetAvatars[objU.id % arrPresetAvatars.length] || arrPresetAvatars[0];

          return {
            intId: objU.id,
            strInitials: strInitials,
            strUsername: objU.strUsername,
            strName: objU.strName,
            strFull: objU.strName,
            strRole: objU.strRoleName,
            strRoleName: objU.strRoleName,
            intRoleNum: intRoleNum,
            strBranch: objU.strBranch || "",
            strLastLogin: objU.dtLastLogin ? new Date(objU.dtLastLogin).toLocaleString(undefined, {
              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
            }) : "Never",
            strStatus: objU.strStatus,
            strAvatarBg: objPreset.strBg,
            strAvatarColor: objPreset.strColor,
            strEmail: objU.strEmail,
            strPhone: "+91 98765 00000",
            strJoinedDate: "10 Jun 2026",
            arrPermissions: objU.listPermissions
          };
        });

        funcSetUsers(arrMappedUsers);

        const objUpdatedAdmin = arrMappedUsers.find(u => u.strRole === 'Admin') || arrMappedUsers[0];
        if (objUpdatedAdmin) {
          funcSetCurrentUser(objUpdatedAdmin);
        }

        funcTriggerToast("Connected to Django RBAC PostgreSQL Backend!", "success");
      } catch (err) {
        console.error("Backend offline. Falling back to local frontend mock data.", err);
      }
    }
    funcFetchBackendData();
  }, []);

  const funcFetchGlobalSearchData = async () => {
    const strBackendUrl = "http://127.0.0.1:8000";
    
    // Fetch Items
    try {
      const res = await fetch(`${strBackendUrl}/api/items/`);
      if (res.ok) {
        const data = await res.json();
        funcSetGlobalItems(data);
      } else {
        throw new Error();
      }
    } catch (_) {
      try {
        const saved = localStorage.getItem("stockflow_items");
        if (saved) funcSetGlobalItems(JSON.parse(saved).map(item => ({ code: item[0], name: item[1], category: { name: item[2] }, unit: item[3], reorder_level: item[4], status: item[5], description: item[6], current_stock: item[7] })));
      } catch (_) {}
    }

    // Fetch Categories
    try {
      const res = await fetch(`${strBackendUrl}/api/categories/`);
      if (res.ok) {
        const data = await res.json();
        funcSetGlobalCategories(data);
      } else {
        throw new Error();
      }
    } catch (_) {
      try {
        const saved = localStorage.getItem("stockflow_categories");
        if (saved) funcSetGlobalCategories(JSON.parse(saved));
      } catch (_) {}
    }

    // Fetch Suppliers
    try {
      const res = await fetch(`${strBackendUrl}/api/suppliers/`);
      if (res.ok) {
        const data = await res.json();
        funcSetGlobalSuppliers(data);
      } else {
        throw new Error();
      }
    } catch (_) {
      try {
        const saved = localStorage.getItem("stockflow_suppliers");
        if (saved) funcSetGlobalSuppliers(JSON.parse(saved));
      } catch (_) {}
    }

    // Fetch Requisitions
    try {
      const res = await fetch(`${strBackendUrl}/api/rbac/requisitions/`);
      if (res.ok) {
        const data = await res.json();
        funcSetGlobalRequisitions(data);
      }
    } catch (_) {}

    // Fetch Purchases
    try {
      const res = await fetch(`${strBackendUrl}/api/purchases/`);
      if (res.ok) {
        const data = await res.json();
        funcSetGlobalPurchases(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (boolIsLoggedIn) {
      funcFetchGlobalSearchData();
    }
  }, [boolIsLoggedIn]);

  const objSearchResults = useMemo(() => {
    const strQ = strSearchQuery.trim().toLowerCase();
    if (!strQ) return null;

    const results = {
      pages: [],
      users: [],
      items: [],
      categories: [],
      suppliers: [],
      branches: [],
      purchases: [],
      requisitions: []
    };

    const objPermissions = objRolePermissions[objCurrentUser.strRole] || {};
    arrNavGroups.flatMap(g => g.arrItems).forEach(item => {
      if (objPermissions[item.strLabel] && item.strLabel.toLowerCase().includes(strQ)) {
        results.pages.push({
          label: item.strLabel,
          icon: item.strIcon,
          type: 'page',
          path: item.strLabel
        });
      }
    });

    arrUsers.forEach(u => {
      if (
        (u.strName || "").toLowerCase().includes(strQ) ||
        (u.strUsername || "").toLowerCase().includes(strQ) ||
        (u.strFull || "").toLowerCase().includes(strQ) ||
        (u.strBranch || "").toLowerCase().includes(strQ) ||
        (u.strRole || "").toLowerCase().includes(strQ)
      ) {
        results.users.push({
          label: u.strFull || u.strName || u.strUsername,
          subtext: `${u.strRole} • ${u.strBranch || 'Central'}`,
          type: 'user',
          path: 'Users',
          data: u
        });
      }
    });

    arrGlobalItems.forEach(item => {
      const code = item.code || "";
      const name = item.name || "";
      const category = item.category?.name || "";
      const desc = item.description || "";
      if (
        code.toLowerCase().includes(strQ) ||
        name.toLowerCase().includes(strQ) ||
        category.toLowerCase().includes(strQ) ||
        desc.toLowerCase().includes(strQ)
      ) {
        results.items.push({
          label: name,
          subtext: `${code} • ${category} • Stock: ${item.current_stock ?? 0}`,
          type: 'item',
          path: 'Items',
          data: item
        });
      }
    });

    arrGlobalCategories.forEach(cat => {
      const name = cat.name || "";
      if (name.toLowerCase().includes(strQ)) {
        results.categories.push({
          label: name,
          subtext: `Category Code: CAT-${String(cat.id || 0).padStart(3, '0')}`,
          type: 'category',
          path: 'Categories',
          data: cat
        });
      }
    });

    arrGlobalSuppliers.forEach(sup => {
      const name = sup.name || "";
      const email = sup.email || "";
      const code = sup.code || "";
      if (name.toLowerCase().includes(strQ) || email.toLowerCase().includes(strQ) || code.toLowerCase().includes(strQ)) {
        results.suppliers.push({
          label: name,
          subtext: `${code || 'SUP'} • ${email || 'No email'}`,
          type: 'supplier',
          path: 'Suppliers',
          data: sup
        });
      }
    });

    arrBranchesList.forEach(branch => {
      const name = branch.name || "";
      const code = branch.code || "";
      const city = branch.city || "";
      if (name.toLowerCase().includes(strQ) || code.toLowerCase().includes(strQ) || city.toLowerCase().includes(strQ)) {
        results.branches.push({
          label: name,
          subtext: `Code: ${code} • City: ${city}`,
          type: 'branch',
          path: 'Branches',
          data: branch
        });
      }
    });

    arrGlobalPurchases.forEach(p => {
      const poNo = p.strPurchaseNo || p.purchase_no || "";
      const supplier = p.strSupplier || p.supplier_name || "";
      if (poNo.toLowerCase().includes(strQ) || supplier.toLowerCase().includes(strQ)) {
        results.purchases.push({
          label: poNo,
          subtext: `${supplier} • Total: ₹${p.floaTotal || p.total || 0} (${p.strStatus || p.status})`,
          type: 'purchase',
          path: 'Purchase',
          data: p
        });
      }
    });

    arrGlobalRequisitions.forEach(r => {
      const reqNo = r.strRequisitionNo || r.requisition_no || "";
      const itemNames = r.arrItems ? r.arrItems.map(it => it.strName || it.item_name).join(", ") : "";
      const status = r.strStatus || r.status || "";
      if (reqNo.toLowerCase().includes(strQ) || itemNames.toLowerCase().includes(strQ) || status.toLowerCase().includes(strQ)) {
        results.requisitions.push({
          label: reqNo,
          subtext: `${itemNames || 'No items'} • Status: ${status}`,
          type: 'requisition',
          path: 'Requisition',
          data: r
        });
      }
    });

    return results;
  }, [strSearchQuery, arrUsers, arrBranchesList, arrGlobalItems, arrGlobalCategories, arrGlobalSuppliers, arrGlobalPurchases, arrGlobalRequisitions, objRolePermissions, objCurrentUser.strRole]);

  const funcHandleSearchResultClick = (item) => {
    funcSetActiveNav(item.path);
    funcSetSearchPropagation(strSearchQuery);
    
    if (item.type === 'user' && item.data) {
      funcSetUserSearchQuery(item.data.strUsername);
    }
    funcSetSearchQuery("");
  };

  // --- TOAST HELPER ---
  const funcTriggerToast = (strMessage, strType = "success") => {
    const intId = Date.now();
    funcSetToasts((prev) => [...prev, { id: intId, message: strMessage, type: strType }]);
    setTimeout(() => {
      funcSetToasts((prev) => prev.filter((t) => t.id !== intId));
    }, 3500);
  };

  // --- CLICK OUTSIDE HANDLER ---
  useEffect(() => {
    function funcHandleClickOutside(event) {
      if (refRoleDropdown.current && !refRoleDropdown.current.contains(event.target)) {
        funcSetShowRoleDropdown(false);
      }
      if (refBranchDropdown.current && !refBranchDropdown.current.contains(event.target)) {
        funcSetShowBranchDropdown(false);
      }
      if (refPerPageDropdown.current && !refPerPageDropdown.current.contains(event.target)) {
        funcSetShowPerPageDropdown(false);
      }
      if (refSearchBox.current && !refSearchBox.current.contains(event.target)) {
        funcSetSearchQuery("");
      }
    }
    document.addEventListener("mousedown", funcHandleClickOutside);
    return () => document.removeEventListener("mousedown", funcHandleClickOutside);
  }, []);

  // --- FILTER USERS ---
  const arrFilteredUsers = useMemo(() => {
    let arrFiltered = [...arrUsers];

    // Search query (Topbar)
    if (strSearchQuery.trim() !== "") {
      const strQ = strSearchQuery.toLowerCase();
      arrFiltered = arrFiltered.filter(u =>
        (u.strName || "").toLowerCase().includes(strQ) ||
        (u.strUsername || "").toLowerCase().includes(strQ) ||
        (u.strFull || "").toLowerCase().includes(strQ) ||
        (u.strBranch || "").toLowerCase().includes(strQ) ||
        (u.strRole || "").toLowerCase().includes(strQ)
      );
    }

    // Local Search input
    if (strUserSearchQuery.trim() !== "") {
      const strQ = strUserSearchQuery.toLowerCase();
      arrFiltered = arrFiltered.filter(u =>
        (u.strName || "").toLowerCase().includes(strQ) ||
        (u.strUsername || "").toLowerCase().includes(strQ) ||
        (u.strFull || "").toLowerCase().includes(strQ)
      );
    }

    // Role filter
    if (strRoleFilter !== "All roles") {
      arrFiltered = arrFiltered.filter(u => u.strRole === strRoleFilter);
    }

    // Branch filter
    if (strBranchFilter !== "All branches") {
      arrFiltered = arrFiltered.filter(u => u.strBranch === strBranchFilter);
    }

    // Apply Sorting
    if (strSortField) {
      arrFiltered.sort((objA, objB) => {
        let objValA = objA[strSortField] || '';
        let objValB = objB[strSortField] || '';
        
        if (typeof objValA === 'string') objValA = objValA.toLowerCase();
        if (typeof objValB === 'string') objValB = objValB.toLowerCase();

        if (objValA < objValB) return strSortDirection === 'asc' ? -1 : 1;
        if (objValA > objValB) return strSortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return arrFiltered;
  }, [arrUsers, strSearchQuery, strUserSearchQuery, strRoleFilter, strBranchFilter, strSortField, strSortDirection]);

  const funcHandleSort = (strField) => {
    if (strSortField === strField) {
      if (strSortDirection === 'asc') {
        funcSetSortDirection('desc');
      } else {
        funcSetSortField(null);
      }
    } else {
      funcSetSortField(strField);
      funcSetSortDirection('asc');
    }
  };

  
        // --- PAGINATION METRICS ---
  const intTotalPages = Math.ceil(arrFilteredUsers.length / intPerPage) || 1;

  // Reset page if it exceeds totalPages
  useEffect(() => {
    if (intPage > intTotalPages) {
      funcSetPage(1);
    }
  }, [intTotalPages, intPage]);

  const arrCurrentFilteredUsers = useMemo(() => {
    const intStartIdx = (intPage - 1) * intPerPage;
    return arrFilteredUsers.slice(intStartIdx, intStartIdx + intPerPage);
  }, [arrFilteredUsers, intPage, intPerPage]);

  // --- DYNAMIC CARD STATS ---
  const arrStats = useMemo(() => {
    const intTotal = arrUsers.length;
    const intActive = arrUsers.filter(u => u.strStatus === 'Active').length;
    const intInactive = arrUsers.filter(u => u.strStatus === 'Inactive').length;
    const intAdmins = arrUsers.filter(u => u.strRole === 'Admin').length;

    return [
      { strIcon: 'users',        strNum: intTotal.toString(), strLabel: 'Total Users',    strColor: '#7c3aed', strWave: 'purple' },
      { strIcon: 'user-check',   strNum: intActive.toString(),  strLabel: 'Active',         strColor: '#10b981', strWave: 'green'  },
      { strIcon: 'user-x',       strNum: intInactive.toString(),strLabel: 'Inactive',       strColor: '#ef4444', strWave: 'red'    },
      { strIcon: 'shield-check', strNum: intAdmins.toString(),   strLabel: 'Admin',          strColor: '#6366f1', strWave: 'blue'   },
    ];
  }, [arrUsers]);

  // --- POPULATE FORM FOR ADD/EDIT ---
  const funcOpenAddModal = async () => {
    const branches = await fetchBranches();
    funcSetFormName("");
    funcSetFormFull("");
    funcSetFormEmail("");
    funcSetFormPhone("");
    funcSetFormPassword("");
    funcSetFormRole("Branch User");
    funcSetFormBranch(branches.length > 0 ? branches[0].name : "");
    funcSetFormStatus("Active");
    funcSetSelectedAvatarPreset(arrPresetAvatars[Math.floor(Math.random() * arrPresetAvatars.length)]);
    funcSetShowAddModal(true);
  };

  const funcOpenEditModal = async (objUser) => {
    await fetchBranches();
    funcSetSelectedUserForEdit(objUser);
    funcSetFormName(objUser.strUsername || "");
    funcSetFormFull(objUser.strName || "");
    funcSetFormEmail(objUser.strEmail || "");
    funcSetFormPhone(objUser.strPhone || "");
    funcSetFormRole(objUser.strRole);
    funcSetFormBranch(objUser.strBranch || "");
    funcSetFormStatus(objUser.strStatus);
    
    const objMatchedPreset = arrPresetAvatars.find(p => p.strBg === objUser.strAvatarBg) || arrPresetAvatars[0];
    funcSetSelectedAvatarPreset(objMatchedPreset);
  };

  // --- CRUD ACTIONS ---
  const funcHandleAddUser = async (event) => {
    event.preventDefault();
    if (!strFormName.trim() || !strFormFull.trim()) {
      funcTriggerToast("Please fill in the Username and Full Name fields.", "error");
      return;
    }

    const strEmail = strFormEmail.trim() || `${strFormName.trim()}@leoinventory.com`;
    const strPhone = strFormPhone.trim() || "+91 98765 00000";
    
    // Create initials
    const strInitials = funcGetInitials(strFormFull);

    const intRoleNum = arrRolesList.indexOf(strFormRole) !== -1 ? arrRolesList.indexOf(strFormRole) + 1 : 3;

    let intId = Date.now();
    let strFinalBranch = strFormBranch;

    try {
      const objPayload = {
        strName: strFormFull.trim(),
        strUsername: strFormName.trim().toLowerCase().replace(/\s+/g, '.'),
        strEmail: strEmail,
        strRoleName: strFormRole,
        strStatus: strFormStatus,
        strBranch: strFormBranch
      };
      
      const objRes = await fetch("http://127.0.0.1:8000/api/rbac/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(objPayload)
      });
      
      if (objRes.ok) {
        const objCreated = await objRes.json();
        intId = objCreated.id;
        strFinalBranch = objCreated.strBranch || strFormBranch;
      } else {
        const objErr = await objRes.json();
        funcTriggerToast(objErr.error || "Failed to save user to backend.", "error");
        return;
      }
    } catch (err) {
      console.warn("Backend offline, creating user locally.", err);
    }

    const objNewUser = {
      intId,
      strInitials,
      strName: strFormName.trim().toLowerCase(),
      strFull: strFormFull.trim(),
      strRole: strFormRole,
      strRoleName: strFormRole,
      intRoleNum,
      strBranch: strFinalBranch,
      strLastLogin: 'Never',
      strStatus: strFormStatus,
      strAvatarBg: objSelectedAvatarPreset.strBg,
      strAvatarColor: objSelectedAvatarPreset.strColor,
      strEmail,
      strPhone,
      strPassword: strFormPassword.trim() || funcGenerateRandomPassword(),
      strJoinedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    funcSetUsers(prev => [objNewUser, ...prev]);
    funcSetShowAddModal(false);

    funcSetNotifications(prev => [
      { intId: Date.now(), strType: 'user_created', strText: `New user "${objNewUser.strName}" created by Alex Rivera`, strTime: 'Just now' },
      ...prev
    ]);

    funcTriggerToast(`User "${objNewUser.strFull}" created successfully!`);
  };

  const funcHandleEditUser = async (event) => {
    event.preventDefault();
    if (!strFormName.trim() || !strFormFull.trim()) {
      funcTriggerToast("Username and Full Name are required.", "error");
      return;
    }

    const objUserToEdit = objSelectedUserForEdit;
    try {
      const objRes = await fetch(`http://127.0.0.1:8000/api/rbac/users/${objUserToEdit.intId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strName: strFormFull.trim(),
          strUsername: strFormName.trim().toLowerCase().replace(/\s+/g, '.'),
          strEmail: strFormEmail.trim() || `${strFormName.trim()}@leoinventory.com`,
          strRoleName: strFormRole,
          strStatus: strFormStatus,
          strBranch: strFormBranch
        })
      });

      if (!objRes.ok) {
        const objErrData = await objRes.json();
        funcTriggerToast(objErrData.error || "Failed to update user on backend.", "error");
        return;
      }

      const objUpdated = await objRes.json();
      
      const strInitials = funcGetInitials(objUpdated.strName);
      
      const intRoleNum = arrRolesList.indexOf(objUpdated.strRoleName) !== -1 ? arrRolesList.indexOf(objUpdated.strRoleName) + 1 : 3;
      
      funcSetUsers(prev => prev.map(u => {
        if (u.intId === objUserToEdit.intId) {
          return {
            ...u,
            strInitials: strInitials,
            strUsername: objUpdated.strUsername,
            strName: objUpdated.strName,
            strFull: objUpdated.strName,
            strRole: objUpdated.strRoleName,
            strRoleName: objUpdated.strRoleName,
            intRoleNum: intRoleNum,
            strStatus: objUpdated.strStatus,
            strEmail: objUpdated.strEmail,
            strPhone: strFormPhone.trim() || u.strPhone,
            strBranch: strFormBranch,
            strAvatarBg: objSelectedAvatarPreset.strBg,
            strAvatarColor: objSelectedAvatarPreset.strColor,
          };
        }
        return u;
      }));

      if (objCurrentUser.intId === objUserToEdit.intId) {
        funcSetCurrentUser(prev => ({
          ...prev,
          strInitials: strInitials,
          strUsername: objUpdated.strUsername,
          strName: objUpdated.strName,
          strFull: objUpdated.strName,
          strRole: objUpdated.strRoleName,
          strRoleName: objUpdated.strRoleName,
          strStatus: objUpdated.strStatus,
          strEmail: objUpdated.strEmail,
          strPhone: strFormPhone.trim() || prev.strPhone,
          strBranch: strFormBranch,
          strAvatarBg: objSelectedAvatarPreset.strBg,
          strAvatarColor: objSelectedAvatarPreset.strColor,
        }));
      }

      funcSetNotifications(prev => [
        { intId: Date.now(), strType: 'user_updated', strText: `User "${objUpdated.strUsername}" updated on backend`, strTime: 'Just now' },
        ...prev
      ]);

      funcTriggerToast(`User "${strFormFull.trim()}" updated successfully!`);
      funcSetSelectedUserForEdit(null);
    } catch (err) {
      console.error(err);
      funcTriggerToast("Network error updating user on backend.", "error");
    }
  };

  const funcHandleDeleteUser = async (intUserId) => {
    const objUserToDelete = arrUsers.find(u => u.intId === intUserId);
    if (!objUserToDelete) return;

    if (window.confirm(`Are you sure you want to delete user "${objUserToDelete.strFull}"?`)) {
      try {
        const objRes = await fetch(`http://127.0.0.1:8000/api/rbac/users/${intUserId}/`, {
          method: 'DELETE'
        });
        if (!objRes.ok) {
          funcTriggerToast("Failed to delete user on backend.", "error");
          return;
        }

        funcSetUsers(prev => prev.filter(u => u.intId !== intUserId));

        funcSetNotifications(prev => [
          { intId: Date.now(), strType: 'user_deleted', strText: `User "${objUserToDelete.strUsername}" deleted from backend`, strTime: 'Just now' },
          ...prev
        ]);

        funcTriggerToast(`User "${objUserToDelete.strFull}" deleted successfully.`, "warning");
      } catch (err) {
        console.error(err);
        funcTriggerToast("Network error deleting user on backend.", "error");
      }
    }
  };

  // --- PASSWORD RESET UTILITY ---
  const funcGenerateRandomPassword = () => {
    const strChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let strPwd = "";
    for (let intI = 0; intI < 10; intI++) {
      strPwd += strChars.charAt(Math.floor(Math.random() * strChars.length));
    }
    return strPwd;
  };

  const funcHandleOpenResetPassword = (objUser) => {
    funcSetSelectedUserForResetPassword(objUser);
    funcSetResetPasswordVal(funcGenerateRandomPassword());
    funcSetResetSuccess(false);
  };

  const funcHandleConfirmResetPassword = async (event) => {
    event.preventDefault();
    if (!strResetPasswordVal.trim()) {
      funcTriggerToast("Please enter or generate a password.", "error");
      return;
    }

    try {
      const objRes = await fetch(`http://127.0.0.1:8000/api/rbac/users/${objSelectedUserForResetPassword.intId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strPassword: strResetPasswordVal.trim()
        })
      });

      if (!objRes.ok) {
        const objErr = await objRes.json();
        funcTriggerToast(objErr.error || "Failed to reset password on backend.", "error");
        return;
      }

      funcSetUsers(prev => prev.map(u => {
        if (u.intId === objSelectedUserForResetPassword.intId) {
          return {
            ...u,
            strPassword: strResetPasswordVal.trim()
          };
        }
        return u;
      }));

      funcSetNotifications(prev => [
        { intId: Date.now(), strType: 'user_updated', strText: `Reset password for user "${objSelectedUserForResetPassword.strName}"`, strTime: 'Just now' },
        ...prev
      ]);

      funcSetResetSuccess(true);
      funcTriggerToast(`Password reset successfully for ${objSelectedUserForResetPassword.strFull}!`);
    } catch (err) {
      console.error(err);
      funcTriggerToast("Network error resetting password on backend.", "error");
    }
  };

  // --- CSV EXPORT UTILITY ---
  const funcHandleExportCSV = () => {
    if (arrFilteredUsers.length === 0) {
      funcTriggerToast("No user data to export.", "warning");
      return;
    }

    const arrHeaders = ["ID", "Username", "Full Name", "Role", "Branch", "Last Login", "Status", "Email", "Phone", "Joined Date"];
    const arrRows = arrFilteredUsers.map(u => [
      u.intId,
      u.strUsername,
      u.strName,
      u.strRole,
      u.strBranch,
      u.strLastLogin,
      u.strStatus,
      u.strEmail || "",
      u.strPhone || "",
      u.strJoinedDate || ""
    ]);

    const strCsvContent = "data:text/csv;charset=utf-8," 
      + [arrHeaders.join(","), ...arrRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const strEncodedUri = encodeURI(strCsvContent);
    const objLink = document.createElement("a");
    objLink.setAttribute("href", strEncodedUri);
    objLink.setAttribute("download", `leoInventory_Users_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(objLink);
    objLink.click();
    document.body.removeChild(objLink);

    funcTriggerToast("CSV Export downloaded successfully!");
  };

  // --- CSV IMPORT UTILITY ---
  const funcHandleImportCSV = (event) => {
    const objFile = event.target.files[0];
    if (!objFile) return;

    const objReader = new FileReader();
    objReader.onload = async (e) => {
      try {
        const strText = e.target.result;
        const arrLines = strText.split(/\r?\n/);
        if (arrLines.length <= 1) {
          funcTriggerToast("The file is empty or has no data rows.", "error");
          return;
        }

        const arrHeaders = arrLines[0].split(",").map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
        
        const arrNewUsers = [];
        const seenUsernames = new Set();
        const seenEmails = new Set();

        for (let intI = 1; intI < arrLines.length; intI++) {
          if (!arrLines[intI].trim()) continue;
          
          const arrColumns = arrLines[intI].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^["']|["']$/g, '').trim());
          
          const funcGetVal = (strName, intIndex) => {
            const intHIdx = arrHeaders.indexOf(strName);
            return intHIdx !== -1 ? arrColumns[intHIdx] : arrColumns[intIndex];
          };

          const strName = funcGetVal("username", 1) || funcGetVal("name", 1) || `user_${Date.now()}_${intI}`;
          const strFull = funcGetVal("full name", 2) || funcGetVal("full", 2) || strName;
          const strRole = funcGetVal("role", 3) || "Branch User";
          const strBranch = funcGetVal("branch", 4) || "";
          const strLastLogin = funcGetVal("last login", 5) || "Never";
          const strStatus = funcGetVal("status", 6) || "Active";
          const strEmail = funcGetVal("email", 7) || `${strName}@leoinventory.com`;
          const strPhone = funcGetVal("phone", 8) || "+91 98765 00000";
          const strJoinedDate = funcGetVal("joined date", 9) || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

          const strUsernameLower = strName.toLowerCase();
          const strEmailLower = strEmail.toLowerCase();

          // local deduplication
          if (seenUsernames.has(strUsernameLower) || seenEmails.has(strEmailLower)) {
            continue;
          }
          seenUsernames.add(strUsernameLower);
          seenEmails.add(strEmailLower);

          const strInitials = funcGetInitials(strFull);

          const intRoleNum = arrRolesList.indexOf(strRole) !== -1 ? arrRolesList.indexOf(strRole) + 1 : 3;
          const objPreset = arrPresetAvatars[Math.floor(Math.random() * arrPresetAvatars.length)];

          arrNewUsers.push({
            intId: Date.now() + intI,
            strInitials,
            strName: strUsernameLower,
            strFull,
            strRole,
            strRoleName: strRole,
            intRoleNum,
            strBranch,
            strLastLogin,
            strStatus: strStatus === 'Active' || strStatus === 'Inactive' ? strStatus : 'Active',
            strAvatarBg: objPreset.strBg,
            strAvatarColor: objPreset.strColor,
            strEmail,
            strPhone,
            strJoinedDate
          });
        }

        if (arrNewUsers.length > 0) {
          let intImportedCount = 0;
          let intSkippedCount = 0;

          for (const u of arrNewUsers) {
            try {
              const objPayload = {
                strName: u.strFull,
                strUsername: u.strName,
                strEmail: u.strEmail,
                strRoleName: u.strRole,
                strStatus: u.strStatus,
                strBranch: u.strBranch,
                strPassword: "password123" // default password
              };
              
              const objRes = await fetch("http://127.0.0.1:8000/api/rbac/users/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(objPayload)
              });

              if (objRes.ok) {
                intImportedCount++;
              } else {
                const objErr = await objRes.json();
                if (objErr.error && (objErr.error.includes("already taken") || objErr.error.includes("already registered"))) {
                  intSkippedCount++;
                } else {
                  console.warn(`Failed to import user ${u.strName}:`, objErr.error);
                }
              }
            } catch (err) {
              console.error(`Network error importing user ${u.strName}:`, err);
            }
          }
  // Fetch updated users from database to synchronize state
          try {
            const objUserRes = await fetch("http://127.0.0.1:8000/api/rbac/users/");
            if (objUserRes.ok) {
              const arrUserData = await objUserRes.json();
              const arrMappedUsers = arrUserData.map(objU => {
                const strInitials = funcGetInitials(objU.strName);
                const intRoleNum = arrRolesList.indexOf(objU.strRoleName) !== -1 ? arrRolesList.indexOf(objU.strRoleName) + 1 : 3;
                const objPreset = arrPresetAvatars[objU.id % arrPresetAvatars.length] || arrPresetAvatars[0];
                return {
                  intId: objU.id,
                  strInitials: strInitials,
                  strUsername: objU.strUsername,
                  strName: objU.strName,
                  strFull: objU.strName,
                  strRole: objU.strRoleName,
                  strRoleName: objU.strRoleName,
                  intRoleNum: intRoleNum,
                  strBranch: objU.strBranch || "",
                  strLastLogin: "Just now",
                  strStatus: objU.strStatus,
                  strAvatarBg: objPreset.strBg,
                  strAvatarColor: objPreset.strColor,
                  strEmail: objU.strEmail,
                  strPhone: "+91 98765 00000",
                  strJoinedDate: "10 Jun 2026",
                  arrPermissions: objU.listPermissions
                };
              });
              funcSetUsers(arrMappedUsers);
            }
          } catch (fetchErr) {
            console.error("Failed to re-fetch users from backend after import:", fetchErr);
          }

          funcSetNotifications(prev => [
            { 
              intId: Date.now(), 
              strType: 'user_created', 
              strText: `Imported CSV: ${intImportedCount} new users added, ${intSkippedCount} skipped (already existed).`, 
              strTime: 'Just now' 
            },
            ...prev
          ]);
          funcTriggerToast(`Import completed: ${intImportedCount} added, ${intSkippedCount} skipped.`);
        } else {
          funcTriggerToast("No valid user records found in CSV.", "error");
        }
      } catch (err) {
        console.error(err);
        funcTriggerToast("Error parsing CSV file. Check formatting.", "error");
      }
      event.target.value = null;
    };
    objReader.readAsText(objFile);
  };

  // --- ROLE HANDLERS ---
  const funcHandleTogglePermission = async (strRoleName, strPageLabel) => {
    if (strRoleName === 'Admin' && (strPageLabel === 'Users' || strPageLabel === 'Dashboard')) {
      funcTriggerToast("Cannot remove access to Dashboard or Users for Admin role.", "error");
      return;
    }

    const objCurrentRolePerms = objRolePermissions[strRoleName] || {};
    const boolNextVal = !objCurrentRolePerms[strPageLabel];

    try {
      const strBackendUrl = "http://127.0.0.1:8000";
      
      const objRoleRes = await fetch(`${strBackendUrl}/api/rbac/roles/`);
      const arrRoleList = await objRoleRes.json();
      const objDbRole = arrRoleList.find(r => r.strName === strRoleName);

      if (!objDbRole) {
        funcSetRolePermissions(prev => ({
          ...prev,
          [strRoleName]: {
            ...objCurrentRolePerms,
            [strPageLabel]: boolNextVal
          }
        }));
        funcTriggerToast(`${boolNextVal ? 'Granted' : 'Revoked'} ${strPageLabel} locally (Backend offline/no role).`);
        return;
      }

      const objPermRes = await fetch(`${strBackendUrl}/api/rbac/permissions/`);
      const arrPermList = await objPermRes.json();

      const arrActiveCodenames = Object.keys(objCurrentRolePerms).filter(k => 
        k === strPageLabel ? boolNextVal : objCurrentRolePerms[k]
      );
      if (boolNextVal && !arrActiveCodenames.includes(strPageLabel)) {
        arrActiveCodenames.push(strPageLabel);
      }
      
      const arrPermissionIds = arrPermList
        .filter(p => arrActiveCodenames.includes(p.strCodename))
        .map(p => p.id);

      const objUpdateRes = await fetch(`${strBackendUrl}/api/rbac/roles/${objDbRole.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listPermissionIds: arrPermissionIds })
      });

      if (objUpdateRes.ok) {
        funcSetRolePermissions(prev => ({
          ...prev,
          [strRoleName]: {
            ...objCurrentRolePerms,
            [strPageLabel]: boolNextVal
          }
        }));
        funcTriggerToast(`${boolNextVal ? 'Granted' : 'Revoked'} ${strPageLabel} visibility for ${strRoleName} on backend.`);
      } else {
        funcTriggerToast("Failed to update role permissions on backend.", "error");
      }
    } catch (err) {
      console.error(err);
      funcSetRolePermissions(prev => ({
        ...prev,
        [strRoleName]: {
          ...objCurrentRolePerms,
          [strPageLabel]: boolNextVal
        }
      }));
      funcTriggerToast(`${boolNextVal ? 'Granted' : 'Revoked'} ${strPageLabel} locally (Backend offline).`);
    }
  };

  const funcHandleDeleteRole = async (strRoleToDelete) => {
    if (strRoleToDelete === 'Admin' || strRoleToDelete === 'Stock Manager' || strRoleToDelete === 'Branch User') {
      funcTriggerToast("Cannot delete core system roles.", "error");
      return;
    }

    if (window.confirm(`Are you sure you want to delete the role "${strRoleToDelete}"? Users assigned to this role will be reverted to "Branch User".`)) {
      try {
        const strBackendUrl = "http://127.0.0.1:8000";
        const objRoleRes = await fetch(`${strBackendUrl}/api/rbac/roles/`);
        const arrRoleList = await objRoleRes.json();
        const objDbRole = arrRoleList.find(r => r.strName === strRoleToDelete);

        if (objDbRole) {
          await fetch(`${strBackendUrl}/api/rbac/roles/${objDbRole.id}/`, {
            method: 'DELETE'
          });
        }
      } catch (err) {
        console.error("Error deleting role from backend:", err);
      }

      funcSetRolesList(prev => prev.filter(r => r !== strRoleToDelete));

      funcSetRoleDescriptions(prev => {
        const objNext = { ...prev };
        delete objNext[strRoleToDelete];
        return objNext;
      });

      funcSetRolePermissions(prev => {
        const objNext = { ...prev };
        delete objNext[strRoleToDelete];
        return objNext;
      });

      funcSetUsers(prev => prev.map(u => {
        if (u.strRole === strRoleToDelete) {
          return {
            ...u,
            strRole: 'Branch User',
            strRoleName: 'Branch User',
            intRoleNum: 3
          };
        }
        return u;
      }));

      if (objCurrentUser.strRole === strRoleToDelete) {
        const objUpdatedUser = {
          ...objCurrentUser,
          strRole: 'Branch User',
          strRoleName: 'Branch User',
          intRoleNum: 3
        };
        funcSetCurrentUser(objUpdatedUser);
        
        const objBranchUserPerms = objRolePermissions['Branch User'] || {};
        if (!objBranchUserPerms[strActiveNav]) {
          const objFirstPermitted = arrNavGroups.flatMap(g => g.arrItems).find(item => objBranchUserPerms[item.strLabel]);
          if (objFirstPermitted) {
            funcSetActiveNav(objFirstPermitted.strLabel);
          } else {
            funcSetActiveNav('Users');
          }
        }
      }

      funcTriggerToast(`Role "${strRoleToDelete}" deleted successfully. Users holding this role reverted to Branch User.`, "warning");
    }
  };

  const funcHandleAddRole = async (event) => {
    event.preventDefault();
    const strRoleName = strRoleFormName.trim();
    if (!strRoleName) {
      funcTriggerToast("Please enter a role name.", "error");
      return;
    }

    if (arrRolesList.includes(strRoleName)) {
      funcTriggerToast(`Role "${strRoleName}" already exists.`, "error");
      return;
    }

    const objDefaultNewPerms = {
      'Dashboard': true,
      'Inventory': false,
      'Items': false,
      'Categories': false,
      'Suppliers': false,
      'Branches': false,
      'Analytics': false,
      'Purchase': false,
      'Requisition': true,
      'Approval': false,
      'Dispatch': false,
      'Branch Receipt': false,
      'Stock Balance': true,
      'Users': false,
      'Settings': false,
    };

    try {
      const strBackendUrl = "http://127.0.0.1:8000";

      const objPermRes = await fetch(`${strBackendUrl}/api/rbac/permissions/`);
      const arrPermList = await objPermRes.json();
      
      const arrDefaultActiveCodenames = Object.keys(objDefaultNewPerms).filter(k => objDefaultNewPerms[k]);
      const arrPermissionIds = arrPermList
        .filter(p => arrDefaultActiveCodenames.includes(p.strCodename))
        .map(p => p.id);

      const objCreateRes = await fetch(`${strBackendUrl}/api/rbac/roles/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strName: strRoleName,
          strDescription: strRoleFormDesc.trim() || 'Custom defined user role',
          listPermissionIds: arrPermissionIds
        })
      });

      if (!objCreateRes.ok) {
        throw new Error("Failed to create role on backend");
      }
    } catch (err) {
      console.error(err);
      funcTriggerToast("Created role locally (Backend database write offline).", "warning");
    }

    funcSetRolesList(prev => [...prev, strRoleName]);

    funcSetRoleDescriptions(prev => ({
      ...prev,
      [strRoleName]: strRoleFormDesc.trim() || 'Custom defined user role'
    }));

    funcSetRolePermissions(prev => ({
      ...prev,
      [strRoleName]: objDefaultNewPerms
    }));

    funcSetRoleFormName("");
    funcSetRoleFormDesc("");
    funcSetShowAddRoleModal(false);

    funcSetNotifications(prev => [
      { intId: Date.now(), strType: 'settings_changed', strText: `New role "${strRoleName}" created`, strTime: 'Just now' },
      ...prev
    ]);

    funcTriggerToast(`Role "${strRoleName}" created successfully!`);
  };

  // --- PRIVILEGES COMPUTED ---
  const funcGetPrivilegesForRole = (strRole) => {
    if (strRole === 'Admin') {
      return [
        "Full system settings modifications",
        "Add, edit and delete system users",
        "Manage stock configurations globally",
        "Access full audit and logs history",
        "Override inventory approvals"
      ];
    } else if (strRole === 'Stock Manager') {
      return [
        "Edit, restock and categorize inventory",
        "Add new supply catalogs & check vendors",
        "Generate branch reports and statistics",
        "Request local branch updates",
        "Initiate branch stock transfers"
      ];
    } else if (strRole === 'Branch User') {
      return [
        "View lreturnocal branch inventory dashboard",
        "Log items checked-in and checked-out",
        "Register local sales transactions",
        "Report inventory damaged items",
        "View basic analytical profile updates"
      ];
    } else {
      const objPermissions = objRolePermissions[strRole] || {};
      const arrEnabledPages = Object.keys(objPermissions).filter(k => objPermissions[k]);
      if (arrEnabledPages.length === 0) return ["No page permissions assigned yet."];
      return arrEnabledPages.map(strPage => `Access to ${strPage} page`);
    }
  };

  if (!boolIsLoggedIn) {
    return (
      <Login 
        funcOnLogin={(user) => {
          funcSetCurrentUser(user);
          // Find first permitted panel for the user's role
          const objPermissions = objRolePermissions[user.strRole] || {};
          const objFirstPermitted = arrNavGroups.flatMap(g => g.arrItems).find(item => objPermissions[item.strLabel]);
          if (objFirstPermitted) {
            funcSetActiveNav(objFirstPermitted.strLabel);
          } else {
            funcSetActiveNav('Users');
          }
          funcSetIsLoggedIn(true);
          funcTriggerToast(`Welcome back, ${user.strFull || user.strName}!`, "success");
          
          setTimeout(() => {
            funcCheckLowStockGlobal();
          }, 600);
        }}
        arrUsers={arrUsers}
        strTheme={strTheme}
        funcSetTheme={funcSetTheme}
      />
    );
  }
  return (
    <div className="app">
      {/* ── TOAST NOTIFICATIONS ── */}
      <div className="toast-container">
        {arrToasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <i className={`ti ti-${
              t.type === 'success' ? 'circle-check' :
              t.type === 'warning' ? 'alert-triangle' :
              t.type === 'error' ? 'alert-circle' : 'info-circle'
            }`}></i>
            <div>{t.message}</div>
          </div>
        ))}
      </div>

      {/* ── SIDEBAR ── */}
        <div className="sidebar">
        <div className="logo">
          <div className="logo-inner">
            <div className="logo-name">LeoInventory</div>
            <div className="logo-sub">Enterprise Manager</div>
          </div>
        </div>

        {/* Grouped navigation menu */}
        <div className="sidebar-menu">
          {arrNavGroups.map(objGroup => {
            const arrVisibleItems = objGroup.arrItems.filter(item => {
              const objPermissions = objRolePermissions[objCurrentUser.strRole] || {};
              return objPermissions[item.strLabel] === true;
            });

            if (arrVisibleItems.length === 0) return null;

            return (
              <div key={objGroup.strTitle} className="nav-group">
                <div className="nav-group-title">{objGroup.strTitle}</div>
                {arrVisibleItems.map(item => (
                  <div 
                    key={item.strLabel} 
                    className={`nav-item${strActiveNav === item.strLabel ? ' active' : ''}`}
                    onClick={() => {
                      funcSetActiveNav(item.strLabel);
                      funcSetSearchPropagation("");
                      if (item.strLabel !== 'Purchase' && item.strLabel !== 'Requisition' && item.strLabel !== 'Approval' && item.strLabel !== 'Users' && item.strLabel !== 'Roles' && item.strLabel !== 'Categories' && item.strLabel !== 'Items' && item.strLabel !== 'Suppliers' && item.strLabel !== 'Branches') {
                        funcTriggerToast(`Navigated to ${item.strLabel} view (Simulation)`);
                      }
                    }}
                  >
                    <i className={`ti ti-${item.strIcon}`}></i>
                    <span>{item.strLabel}</span>
                  </div>
                ))}
              </div>
            );
          })}


        </div>

        {/* Sidebar Profile block dynamically showing selected active user */}
        <div className="sidebar-bottom" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <div 
              className="user-profile" 
              style={{ flex: 1, marginBottom: 0, cursor: 'default' }}
            >
              <div className="avatar-sm" style={{ 
                background: objCurrentUser.strAvatarBg || '#e0e7ff', 
                color: objCurrentUser.strAvatarColor || '#4f46e5', 
                fontWeight: '700' 
              }}>
                {objCurrentUser.strInitials}
              </div>
              <div className="user-info">
                <div className="user-name-sm">
                  {objCurrentUser.strFull}
                </div>
                <div className="user-role-sm">
                  {objCurrentUser.strRole}
                </div>
              </div>
            </div>
            <button 
              type="button"
              className="user-profile-logout" 
              onClick={(e) => {
                e.stopPropagation();
                funcSetShowLogoutModal(true);
              }}
              title="Log Out"
            >
              <i className="ti ti-logout" style={{ fontSize: 16 }}></i>
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="main">

        {/* TOPBAR */}
        <div className="topbar">
          <div className="search-box" ref={refSearchBox}>
            <i className="ti ti-search"></i>
            <input 
              placeholder="Search globally across pages, users, items..." 
              value={strSearchQuery}
              onChange={(e) => funcSetSearchQuery(e.target.value)}
              onFocus={() => funcFetchGlobalSearchData()}
            />

            {/* Dynamic Global Search Results Dropdown */}
            {objSearchResults && (
              <div className="global-search-dropdown">
                {Object.keys(objSearchResults).every(k => objSearchResults[k].length === 0) ? (
                  <div className="global-search-empty">
                    <i className="ti ti-search-off"></i>
                    <span>No global matches found for "{strSearchQuery}"</span>
                  </div>
                ) : (
                  <div className="global-search-results-list">
                    {/* Render Results Grouped by Category */}
                    {Object.keys(objSearchResults).map(categoryKey => {
                      const list = objSearchResults[categoryKey];
                      if (list.length === 0) return null;

                      const strCatTitle = 
                        categoryKey === 'pages' ? 'Navigation' :
                        categoryKey === 'users' ? 'System Users' :
                        categoryKey === 'items' ? 'Inventory Catalog Items' :
                        categoryKey === 'categories' ? 'Product Categories' :
                        categoryKey === 'suppliers' ? 'Vendors & Suppliers' :
                        categoryKey === 'branches' ? 'Branches' :
                        categoryKey === 'purchases' ? 'Purchase Invoices' : 'Branch Requisitions';

                      return (
                        <div key={categoryKey} className="global-search-group">
                          <div className="global-search-group-header">{strCatTitle}</div>
                          {list.map((result, idx) => (
                            <div 
                              key={idx} 
                              className="global-search-item"
                              onClick={() => funcHandleSearchResultClick(result)}
                            >
                              <div className="global-search-item-icon">
                                <i className={`ti ti-${
                                  result.type === 'page' ? (result.icon || 'link') :
                                  result.type === 'user' ? 'user' :
                                  result.type === 'item' ? 'box' :
                                  result.type === 'category' ? 'tags' :
                                  result.type === 'supplier' ? 'truck' :
                                  result.type === 'branch' ? 'building' :
                                  result.type === 'purchase' ? 'shopping-cart' : 'file-text'
                                }`}></i>
                              </div>
                              <div className="global-search-item-content">
                                <span className="global-search-item-label">{result.label}</span>
                                {result.subtext && <span className="global-search-item-sub">{result.subtext}</span>}
                              </div>
                              <div className="global-search-item-go">
                                <i className="ti ti-arrow-right"></i>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="topbar-right">
            {/* Dark Mode Toggle */}
            <div className="icon-btn" onClick={() => {
              funcSetTheme(prev => prev === 'light' ? 'dark' : 'light');
              funcTriggerToast(`Theme set to ${strTheme === 'light' ? 'Dark' : 'Light'} Mode!`);
            }}>
              <i className={`ti ti-${strTheme === 'light' ? 'moon' : 'sun'}`} style={{ fontSize: 18 }}></i>
            </div>

          </div>
        </div>

        {/* CONTENT */}
        <div className="content">
          {!(objRolePermissions[objCurrentUser.strRole]?.[strActiveNav] ?? false) ? (
            <div className="simulated-view">
              <div className="simulated-icon" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--red)' }}>
                <i className="ti ti-lock" style={{ fontSize: 32 }}></i>
              </div>
              <h2>Access Denied</h2>
              <p>Your active role (<strong>{objCurrentUser.strRole}</strong>) does not have permission to view the <strong>{strActiveNav}</strong> panel.</p>
              <button 
                type="button" 
                className="btn-add" 
                style={{ marginTop: '16px', background: 'var(--purple-mid)' }}
                onClick={() => {
                  const objPermissions = objRolePermissions[objCurrentUser.strRole] || {};
                  const objFirstPermitted = arrNavGroups.flatMap(g => g.arrItems).find(item => objPermissions[item.strLabel]);
                  if (objFirstPermitted) {
                    funcSetActiveNav(objFirstPermitted.strLabel);
                  } else {
                    funcSetActiveNav('Users');
                  }
                }}
              >
                Go to Permitted Panel
              </button>
            </div>
          ) : (
            <>
              {/* Dashboard view */}
              {strActiveNav === 'Dashboard' && (
                <Dashboard 
                  triggerToast={funcTriggerToast} 
                  setNotifications={funcSetNotifications} 
                  funcSetActiveNav={funcSetActiveNav}
                  objCurrentUser={objCurrentUser}
                  objRolePermissions={objRolePermissions}
                />
              )}

              {/* Purchase view */}
          {strActiveNav === 'Purchase' && (
            <Purchase 
              triggerToast={funcTriggerToast} 
              setNotifications={funcSetNotifications} 
              funcCheckLowStock={funcCheckLowStockGlobal} 
              initialSearch={strSearchPropagation}
            />
          )}

          {/* Raise a Requisition view */}
          {strActiveNav === 'Requisition' && (
            <Requisition 
              triggerToast={funcTriggerToast} 
              setNotifications={funcSetNotifications} 
              objCurrentUser={objCurrentUser} 
              initialSearch={strSearchPropagation}
            />
          )}
          {strActiveNav === 'Dispatch' && (
            <Dispatch
              triggerToast={funcTriggerToast}
              setNotifications={funcSetNotifications}
              currentUser={objCurrentUser}
              funcCheckLowStock={funcCheckLowStockGlobal}
            />
            )}

          {/* Approval view */}
          {strActiveNav === 'Approval' && (
            <Approval 
              triggerToast={funcTriggerToast} 
              setNotifications={funcSetNotifications} 
              objCurrentUser={objCurrentUser} 
              objRolePermissions={objRolePermissions}
            />
          )}

          {/* Categories view */}
          {strActiveNav === 'Categories' && (
            <Categories triggerToast={funcTriggerToast} setNotifications={funcSetNotifications} initialSearch={strSearchPropagation} />
          )}

          {/* Items view */}
          {strActiveNav === 'Items' && (
            <Items triggerToast={funcTriggerToast} setNotifications={funcSetNotifications} initialSearch={strSearchPropagation} />
          )}

          {/* Suppliers view */}
          {strActiveNav === 'Suppliers' && (
            <Suppliers triggerToast={funcTriggerToast} setNotifications={funcSetNotifications} initialSearch={strSearchPropagation} />
          )}

          {/* Branches view */}
          {strActiveNav === 'Branches' && (
            <Branches triggerToast={funcTriggerToast} setNotifications={funcSetNotifications} initialSearch={strSearchPropagation} />
          )}

          {strActiveNav === 'Users' && (
            <UsersPage 
              users={arrUsers} 
              setUsers={funcSetUsers} 
              rolesList={arrRolesList} 
              roleDescriptions={objRoleDescriptions} 
              branchesList={arrBranchesList}
              triggerToast={funcTriggerToast}
            />
          )}

          {strActiveNav === 'Stock Balance' && (
            <StockBalance triggerToast={funcTriggerToast} />
          )}

          {strActiveNav === 'Branch Receipt' && (
            <BranchReceipt triggerToast={funcTriggerToast} />
          )}

          {/* Roles Matrix view */}
          {strActiveNav === 'Roles' && (
            <>
              <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.02em' }}>
                Masters / Roles & Permissions
              </div>
              
              <div className="page-header">
                <div>
                  <div className="page-title">Roles & Permissions</div>
                  <div className="page-sub">Manage system roles, configure navbar page visibility, and view users.</div>
                </div>
                
                <div className="header-actions">
                  <button className="btn-add" onClick={() => funcSetShowAddRoleModal(true)}>
                    <i className="ti ti-plus" style={{ fontSize: 15 }}></i>Add Role
                  </button>
                </div>
              </div>

              {/* STAT CARDS */}
              <div className="stat-grid">
                {arrStats.map(objS => <StatCard key={objS.strLabel} {...objS} />)}
              </div>

              {/* ROLE ACCESS MATRIX */}
              <div className="matrix-card">
                <div className="matrix-header">
                  <div>
                    <h3 className="matrix-title">Role Permissions Matrix</h3>
                    <p className="matrix-sub">Configure which pages in the navigation bar are visible for each system role.</p>
                  </div>
                </div>
                <div className="matrix-table-wrap">
                  <table className="matrix-table">
                    <thead>
                      <tr className="matrix-group-headers">
                        <th>Role & Description</th>
                        <th colSpan="5" style={{ background: 'rgba(124, 58, 237, 0.04)', textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>Overview</th>
                        <th colSpan="5" style={{ background: 'rgba(99, 102, 241, 0.04)', textAlign: 'center', borderRight: '1px solid var(--border)' }}>Operations</th>
                        <th colSpan="1" style={{ background: 'rgba(16, 185, 129, 0.04)', textAlign: 'center', borderRight: '1px solid var(--border)' }}>Insight</th>
                        <th colSpan="3" style={{ background: 'rgba(245, 158, 11, 0.04)', textAlign: 'center' }}>Management</th>
                      </tr>
                      <tr className="matrix-page-headers">
                        <th>Role Name & Description</th>
                        
                        <th style={{ borderLeft: '1px solid var(--border)' }} title="Dashboard"><div className="header-page"><i className="ti ti-layout-dashboard"></i><span>Dash</span></div></th>
                        <th title="Items"><div className="header-page"><i className="ti ti-box"></i><span>Items</span></div></th>
                        <th title="Categories"><div className="header-page"><i className="ti ti-tags"></i><span>Cat</span></div></th>
                        <th title="Suppliers"><div className="header-page"><i className="ti ti-truck"></i><span>Supp</span></div></th>
                        <th style={{ borderRight: '1px solid var(--border)' }} title="Branches"><div className="header-page"><i className="ti ti-building"></i><span>Branch</span></div></th>
                        
                        <th title="Purchase"><div className="header-page"><i className="ti ti-shopping-cart"></i><span>Purch</span></div></th>
                        <th title="Requisition"><div className="header-page"><i className="ti ti-file-text"></i><span>Req</span></div></th>
                        <th title="Approval"><div className="header-page"><i className="ti ti-circle-check"></i><span>Appr</span></div></th>
                        <th title="Dispatch"><div className="header-page"><i className="ti ti-send"></i><span>Disp</span></div></th>
                        <th style={{ borderRight: '1px solid var(--border)' }} title="Branch Receipt"><div className="header-page"><i className="ti ti-building-warehouse"></i><span>Receipt</span></div></th>
                        
                        <th style={{ borderRight: '1px solid var(--border)' }} title="Stock Balance"><div className="header-page"><i className="ti ti-database"></i><span>Stock</span></div></th>
                        
                        <th title="Users"><div className="header-page"><i className="ti ti-users"></i><span>Users</span></div></th>
                        <th title="Roles"><div className="header-page"><i className="ti ti-key"></i><span>Roles</span></div></th>
                        <th title="Settings"><div className="header-page"><i className="ti ti-settings"></i><span>Settings</span></div></th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrRolesList.map(strR => (
                        <tr key={strR}>
                          <td className="role-cell-info">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div>
                                <div className="role-name-bold">{strR}</div>
                                <div className="role-desc-soft">{objRoleDescriptions[strR] || "Custom defined user role"}</div>
                              </div>
                              {strR !== 'Admin' && strR !== 'Stock Manager' && strR !== 'Branch User' && (
                                <button 
                                  type="button" 
                                  className="action-btn" 
                                  style={{ color: 'var(--red)', padding: '4px', margin: 0, height: 'auto', width: 'auto' }}
                                  onClick={() => funcHandleDeleteRole(strR)}
                                  title={`Delete Role "${strR}"`}
                                >
                                  <i className="ti ti-trash"></i>
                                </button>
                              )}
                            </div>
                          </td>
                          {arrNavGroups.flatMap(g => g.arrItems).map(item => {
                            const boolIsChecked = objRolePermissions[strR]?.[item.strLabel] ?? false;
                            const boolIsLocked = strR === 'Admin' && (item.strLabel === 'Users' || item.strLabel === 'Dashboard');
                            return (
                              <td key={item.strLabel} style={{ textAlign: 'center' }}>
                                <label className="matrix-switch">
                                  <input 
                                    type="checkbox" 
                                    checked={boolIsChecked}
                                    disabled={boolIsLocked}
                                    onChange={() => funcHandleTogglePermission(strR, item.strLabel)}
                                  />
                                  <span className="matrix-slider"></span>
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FILTERS ROW */}
              <div className="filters-row">
                <div className="search-users" style={{ flex: 1, maxWidth: '420px' }}>
                  <i className="ti ti-search" style={{ fontSize: 13, color: '#9ca3af' }}></i>
                  <input 
                    placeholder="Search username or name..." 
                    value={strUserSearchQuery}
                    onChange={(e) => funcSetUserSearchQuery(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="filter-right">
                  <div className="select-filter" ref={refRoleDropdown} onClick={() => funcSetShowRoleDropdown(!boolShowRoleDropdown)}>
                    {strRoleFilter} <i className="ti ti-chevron-down" style={{ fontSize: 12, marginLeft: 4 }}></i>
                    {boolShowRoleDropdown && (
                      <div className="dropdown-menu">
                        {["All roles", ...arrRolesList].map(r => (
                          <div 
                            key={r} 
                            className={`dropdown-item${strRoleFilter === r ? ' active' : ''}`}
                            onClick={() => funcSetRoleFilter(r)}
                          >
                            {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="select-filter" ref={refBranchDropdown} onClick={() => funcSetShowBranchDropdown(!boolShowBranchDropdown)}>
                    {strBranchFilter} <i className="ti ti-chevron-down" style={{ fontSize: 12, marginLeft: 4 }}></i>
                    {boolShowBranchDropdown && (
                      <div className="dropdown-menu">
                        {["All branches", ...arrBranchesList.map(b => b.name)].map(b => (
                          <div 
                            key={b} 
                            className={`dropdown-item${strBranchFilter === b ? ' active' : ''}`}
                            onClick={() => funcSetBranchFilter(b)}
                          >
                            {b}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TABLE */}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="sortable" onClick={() => funcHandleSort('strName')}>
                        User {strSortField === 'strName' && <i className={`ti ti-arrow-narrow-${strSortDirection === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4 }}></i>}
                      </th>
                      <th className="sortable" onClick={() => funcHandleSort('strRole')}>
                        Role {strSortField === 'strRole' && <i className={`ti ti-arrow-narrow-${strSortDirection === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4 }}></i>}
                      </th>
                      <th className="sortable" onClick={() => funcHandleSort('strBranch')}>
                        Branch {strSortField === 'strBranch' && <i className={`ti ti-arrow-narrow-${strSortDirection === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4 }}></i>}
                      </th>
                      <th className="sortable" onClick={() => funcHandleSort('strLastLogin')}>
                        Last Login {strSortField === 'strLastLogin' && <i className={`ti ti-arrow-narrow-${strSortDirection === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4 }}></i>}
                      </th>
                      <th className="sortable" onClick={() => funcHandleSort('strStatus')}>
                        Status {strSortField === 'strStatus' && <i className={`ti ti-arrow-narrow-${strSortDirection === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4 }}></i>}
                      </th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrCurrentFilteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-soft)', fontWeight: 500 }}>
                          No users match the active search and filter criteria.
                        </td>
                      </tr>
                    ) : (
                      arrCurrentFilteredUsers.map((objU, intI) => (
                        <tr key={objU.intId} style={{ animationDelay: `${0.03 + intI * 0.02}s` }}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar" style={{ background: objU.strAvatarBg, color: objU.strAvatarColor }}>
                                {objU.strInitials}
                              </div>
                              <div>
                                <div className="user-name">{objU.strUsername}</div>
                                <div className="user-sub">{objU.strName}</div>
                              </div>
                            </div>
                          </td>
                          <td><RoleBadge strRole={objU.strRole} intNum={objU.intRoleNum} /></td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{objU.strBranch}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{objU.strLastLogin}</td>
                          <td>
                            <span className={`status-dot ${objU.strStatus === 'Active' ? 'status-active' : 'status-inactive'}`}>
                              <span className={`dot ${objU.strStatus === 'Active' ? 'dot-active' : 'dot-inactive'}`}></span>
                              {objU.strStatus}
                            </span>
                          </td>
                          <td>
                            <div className="actions-cell">
                              <ActionBtn strIcon="key" strTip="Reset Password" funcOnClick={() => funcHandleOpenResetPassword(objU)} />
                              <ActionBtn strIcon="pencil" strTip="Edit" funcOnClick={() => funcOpenEditModal(objU)} />
                              <ActionBtn strIcon="trash" strTip="Delete" funcOnClick={() => funcHandleDeleteUser(objU.intId)} />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* TABLE FOOTER / PAGINATION */}
                <div className="table-footer">
                  <div className="showing-text">
                    Showing {arrFilteredUsers.length === 0 ? 0 : (intPage - 1) * intPerPage + 1} to {Math.min(intPage * intPerPage, arrFilteredUsers.length)} of {arrFilteredUsers.length} users
                  </div>
                  
                  <div className="pagination">
                    <button
                      className="pag-arrow"
                      disabled={intPage === 1}
                      onClick={() => funcSetPage(p => Math.max(1, p - 1))}
                    >
                      <i className="ti ti-chevron-left" style={{ fontSize: 15 }}></i>
                    </button>
                    <PaginationDots intCurrent={intPage} intTotal={intTotalPages} funcOnChange={funcSetPage} />
                    <button
                      className="pag-arrow"
                      disabled={intPage === intTotalPages}
                      onClick={() => funcSetPage(p => Math.min(intTotalPages, p + 1))}
                    >
                      <i className="ti ti-chevron-right" style={{ fontSize: 15 }}></i>
                    </button>
                  </div>

                  {/* Per page size selector */}
                  <div className="per-page" ref={refPerPageDropdown} onClick={() => funcSetShowPerPageDropdown(!boolShowPerPageDropdown)}>
                    {intPerPage} / page <i className="ti ti-chevron-down" style={{ fontSize: 12 }}></i>
                    {boolShowPerPageDropdown && (
                      <div className="dropdown-menu" style={{ bottom: 'calc(100% + 6px)', top: 'auto', left: '0' }}>
                        {[5, 10, 20, 40].map(sz => (
                          <div 
                            key={sz} 
                            className={`dropdown-item${intPerPage === sz ? ' active' : ''}`}
                            onClick={() => {
                              funcSetPerPage(sz);
                              funcSetPage(1);
                            }}
                          >
                            {sz} / page
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {strActiveNav !== 'Dashboard' && strActiveNav !== 'Requisition' && strActiveNav !== 'Dispatch' && strActiveNav !== 'Purchase' && strActiveNav !== 'Users' && strActiveNav !== 'Roles' && strActiveNav !== 'Categories' && strActiveNav !== 'Items' && strActiveNav !== 'Suppliers' && strActiveNav !== 'Branches' && strActiveNav !== 'Approval' && strActiveNav !== 'Stock Balance' && strActiveNav !== 'Branch Receipt' && (
            <div className="simulated-view">
              <div className="simulated-icon">
                <i className={`ti ti-${
                  strActiveNav === 'Dashboard' ? 'layout-dashboard' :
                  strActiveNav === 'Inventory' ? 'package' :
                  strActiveNav === 'Analytics' ? 'chart-bar' :
                  strActiveNav === 'Dispatch' ? 'send' :
                  strActiveNav === 'Branch Receipt' ? 'building-warehouse' :
                  strActiveNav === 'Stock Balance' ? 'database' : 'settings'
                }`}></i>
              </div>
              <h2>{strActiveNav} Section</h2>
              <p>The {strActiveNav} section is simulated in this LeoInventory Enterprise Manager demo.</p>
              <button 
                type="button" 
                className="btn-add" 
                style={{ marginTop: '16px' }}
                onClick={() => funcSetActiveNav('Requisition')}
              >
                Go to Raise a Requisition
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>


      {/* ── MODAL: VIEW USER DETAIL ── */}
      {objSelectedUserForView && (
        <div className="modal-overlay" onClick={() => funcSetSelectedUserForView(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">User Details</h3>
              <button className="modal-close" onClick={() => funcSetSelectedUserForView(null)}>
                <i className="ti ti-x"></i>
              </button>
            </div>
            
            <div className="view-avatar-large" style={{ background: objSelectedUserForView.strAvatarBg, color: objSelectedUserForView.strAvatarColor }}>
              {objSelectedUserForView.strInitials}
            </div>
            <h4 className="view-name">{objSelectedUserForView.strFull}</h4>
            <div className="view-sub">@{objSelectedUserForView.strName}</div>
            
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Role</span>
                <span className="detail-value">{objSelectedUserForView.strRole}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Branch</span>
                <span className="detail-value">{objSelectedUserForView.strBranch}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value" style={{ wordBreak: 'break-all' }}>{objSelectedUserForView.strEmail || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone Number</span>
                <span className="detail-value">{objSelectedUserForView.strPhone || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Session Login</span>
                <span className="detail-value">{objSelectedUserForView.strLastLogin}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">User Access Status</span>
                <span className="detail-value">
                  <span className={`status-dot ${objSelectedUserForView.strStatus === 'Active' ? 'status-active' : 'status-inactive'}`}>
                    <span className={`dot ${objSelectedUserForView.strStatus === 'Active' ? 'dot-active' : 'dot-inactive'}`}></span>
                    {objSelectedUserForView.strStatus}
                  </span>
                </span>
              </div>
              <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                <span className="detail-label">Date Added To System</span>
                <span className="detail-value">{objSelectedUserForView.strJoinedDate || "N/A"}</span>
              </div>
            </div>
            
            <div className="privileges-list">
              <span className="detail-label" style={{ marginBottom: '8px', display: 'block' }}>Role Privileges</span>
              {funcGetPrivilegesForRole(objSelectedUserForView.strRole).map((p, intIdx) => (
                <div key={intIdx} className="privilege-item">
                  <i className="ti ti-circle-check"></i>
                  {p}
                </div>
              ))}
            </div>
            
            <div className="modal-actions" style={{ border: 'none', marginTop: '16px', paddingTop: 0 }}>
              <button className="btn-cancel" onClick={() => funcSetSelectedUserForView(null)}>Close Profile</button>
              <button className="btn-save" onClick={() => {
                funcOpenEditModal(objSelectedUserForView);
                funcSetSelectedUserForView(null);
              }}>
                <i className="ti ti-pencil" style={{ marginRight: 6 }}></i> Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD USER ── */}
      {boolShowAddModal && (
        <div className="modal-overlay" onClick={() => funcSetShowAddModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New User</h3>
              <button className="modal-close" onClick={() => funcSetShowAddModal(false)}>
                <i className="ti ti-x"></i>
              </button>
            </div>
            
            <form onSubmit={funcHandleAddUser}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  className="form-input" 
                  placeholder="e.g. jared.cooper" 
                  value={strFormName}
                  onChange={(e) => funcSetFormName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  className="form-input" 
                  placeholder="e.g. Jared Cooper" 
                  value={strFormFull}
                  onChange={(e) => funcSetFormFull(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select className="form-select" value={strFormRole} onChange={(e) => {
                    const newRole = e.target.value;
                    funcSetFormRole(newRole);
                    if (['stock manager', 'manager', 'stock manager(branch)', 'stock manager (branch)'].includes(newRole.toLowerCase())) {
                      funcSetFormBranch('Central Office');
                    }
                  }}>
                    {arrRolesList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {!['stock manager', 'manager', 'stock manager(branch)', 'stock manager (branch)'].includes((strFormRole || '').toLowerCase()) && (
                  <div className="form-group">
                    <label className="form-label">Assigned Branch</label>
                    <select className="form-select" value={strFormBranch} onChange={(e) => funcSetFormBranch(e.target.value)}>
                      {arrBranchesList.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Email Address (Optional)</label>
                  <input 
                    className="form-input" 
                    type="email" 
                    placeholder="name@leoinventory.com" 
                    value={strFormEmail}
                    onChange={(e) => funcSetFormEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input 
                    className="form-input" 
                    placeholder="+91 XXXXX XXXXX" 
                    value={strFormPhone}
                    onChange={(e) => funcSetFormPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">User Password</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    className="form-input" 
                    type="text"
                    placeholder="Enter password or click Generate"
                    value={strFormPassword}
                    onChange={(e) => funcSetFormPassword(e.target.value)}
                    required
                    style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                  />
                  <button 
                    type="button" 
                    className="btn-export" 
                    style={{ padding: '0 12px', whiteSpace: 'nowrap', borderRadius: '10px' }}
                    onClick={() => funcSetFormPassword(funcGenerateRandomPassword())}
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Avatar Colors</label>
                <div className="avatar-bg-selector">
                  {arrPresetAvatars.map(p => (
                    <div 
                      key={p.strName}
                      className={`color-swatch${objSelectedAvatarPreset.strName === p.strName ? ' selected' : ''}`}
                      style={{ background: p.strBg }}
                      onClick={() => funcSetSelectedAvatarPreset(p)}
                      title={p.strName}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Access Status</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="add_status" 
                      value="Active" 
                      checked={strFormStatus === "Active"}
                      onChange={() => funcSetFormStatus("Active")}
                    />
                    Active
                  </label>
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="add_status" 
                      value="Inactive" 
                      checked={strFormStatus === "Inactive"}
                      onChange={() => funcSetFormStatus("Inactive")}
                    />
                    Inactive
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => funcSetShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-save">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT USER ── */}
      {objSelectedUserForEdit && (
        <div className="modal-overlay" onClick={() => funcSetSelectedUserForEdit(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit User Details</h3>
              <button className="modal-close" onClick={() => funcSetSelectedUserForEdit(null)}>
                <i className="ti ti-x"></i>
              </button>
            </div>
            
            <form onSubmit={funcHandleEditUser}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  className="form-input" 
                  value={strFormName}
                  onChange={(e) => funcSetFormName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  className="form-input" 
                  value={strFormFull}
                  onChange={(e) => funcSetFormFull(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select className="form-select" value={strFormRole} onChange={(e) => {
                    const newRole = e.target.value;
                    funcSetFormRole(newRole);
                    if (['stock manager', 'manager', 'stock manager(branch)', 'stock manager (branch)'].includes(newRole.toLowerCase())) {
                      funcSetFormBranch('Central Office');
                    }
                  }}>
                    {arrRolesList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {!['stock manager', 'manager', 'stock manager(branch)', 'stock manager (branch)'].includes((strFormRole || '').toLowerCase()) && (
                  <div className="form-group">
                    <label className="form-label">Assigned Branch</label>
                    <select className="form-select" value={strFormBranch} onChange={(e) => funcSetFormBranch(e.target.value)}>
                      {arrBranchesList.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    className="form-input" 
                    type="email" 
                    value={strFormEmail}
                    onChange={(e) => funcSetFormEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    className="form-input" 
                    value={strFormPhone}
                    onChange={(e) => funcSetFormPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Avatar Colors</label>
                <div className="avatar-bg-selector">
                  {arrPresetAvatars.map(p => (
                    <div 
                      key={p.strName}
                      className={`color-swatch${objSelectedAvatarPreset.strName === p.strName ? ' selected' : ''}`}
                      style={{ background: p.strBg }}
                      onClick={() => funcSetSelectedAvatarPreset(p)}
                      title={p.strName}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Access Status</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="edit_status" 
                      value="Active" 
                      checked={strFormStatus === "Active"}
                      onChange={() => funcSetFormStatus("Active")}
                    />
                    Active
                  </label>
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="edit_status" 
                      value="Inactive" 
                      checked={strFormStatus === "Inactive"}
                      onChange={() => funcSetFormStatus("Inactive")}
                    />
                    Inactive
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => funcSetSelectedUserForEdit(null)}>Cancel</button>
                <button type="submit" className="btn-save">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LOGOUT CONFIRMATION ── */}
      {boolShowLogoutModal && (
        <div className="modal-overlay logout-blur" onClick={() => funcSetShowLogoutModal(false)}>
          <div className="modal-container logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-icon-large">
              <i className="ti ti-logout"></i>
            </div>
            <h3 className="logout-title">Confirm Exit</h3>
            <p className="logout-desc">Are you sure you want to log out of LeoInventory? Any unsaved edits will be discarded.</p>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button 
                type="button"
                className="btn-cancel" 
                style={{ flex: 1 }}
                onClick={() => funcSetShowLogoutModal(false)}
              >
                Stay
              </button>
              <button 
                type="button"
                className="btn-save" 
                style={{ flex: 1, background: 'var(--red)', boxShadow: 'none' }}
                onClick={() => {
                  funcSetShowLogoutModal(false);
                  funcSetIsLoggedIn(false);
                  funcTriggerToast("Successfully logged out!", "warning");
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET PASSWORD ── */}
      {objSelectedUserForResetPassword && (
        <div className="modal-overlay" onClick={() => funcSetSelectedUserForResetPassword(null)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {boolResetSuccess ? "Password Reset Complete" : "Reset User Password"}
              </h3>
              <button className="modal-close" onClick={() => funcSetSelectedUserForResetPassword(null)}>
                <i className="ti ti-x"></i>
              </button>
            </div>

            {!boolResetSuccess ? (
              <form onSubmit={funcHandleConfirmResetPassword}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div className="avatar-sm" style={{ background: objSelectedUserForResetPassword.strAvatarBg, color: objSelectedUserForResetPassword.strAvatarColor }}>
                    {objSelectedUserForResetPassword.strInitials}
                  </div>
                  <div>
                    <div className="user-name" style={{ fontSize: 14 }}>{objSelectedUserForResetPassword.strFull}</div>
                    <div className="user-sub">@{objSelectedUserForResetPassword.strName}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      className="form-input" 
                      type="text" 
                      value={strResetPasswordVal}
                      onChange={(e) => funcSetResetPasswordVal(e.target.value)}
                      required
                      style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                    />
                    <button 
                      type="button" 
                      className="btn-export" 
                      style={{ padding: '0 12px', whiteSpace: 'nowrap', borderRadius: '10px' }}
                      onClick={() => funcSetResetPasswordVal(funcGenerateRandomPassword())}
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="btn-cancel" onClick={() => funcSetSelectedUserForResetPassword(null)}>Cancel</button>
                  <button type="submit" className="btn-save" style={{ background: 'var(--purple-mid)' }}>Save Password</button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 44, color: 'var(--green)', marginBottom: 12 }}>
                  <i className="ti ti-circle-check"></i>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                  Temporary password has been updated in the database for <strong>{objSelectedUserForResetPassword.strFull}</strong>.
                </p>

                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">Temporary Password</label>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: 'var(--bg-page)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '10px', 
                    padding: '10px 14px',
                    fontFamily: 'monospace',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--purple-mid)',
                    letterSpacing: '0.05em',
                    position: 'relative'
                  }}>
                    <span>{strResetPasswordVal}</span>
                    <button 
                      type="button" 
                      className="action-btn" 
                      onClick={() => {
                        navigator.clipboard.writeText(strResetPasswordVal);
                        funcTriggerToast("Password copied to clipboard!");
                      }}
                      title="Copy to Clipboard"
                      style={{ margin: 0, padding: 4 }}
                    >
                      <i className="ti ti-copy" style={{ fontSize: 16 }}></i>
                    </button>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn-save" 
                  style={{ width: '100%', marginTop: 24, justifyContent: 'center' }} 
                  onClick={() => funcSetSelectedUserForResetPassword(null)}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: ADD ROLE ── */}
      {boolShowAddRoleModal && (
        <div className="modal-overlay" onClick={() => funcSetShowAddRoleModal(false)}>
          <div className="modal-container" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Role</h3>
              <button className="modal-close" onClick={() => funcSetShowAddRoleModal(false)}>
                <i className="ti ti-x"></i>
              </button>
            </div>
            
            <form onSubmit={funcHandleAddRole}>
              <div className="form-group">
                <label className="form-label">Role Name</label>
                <input 
                  className="form-input" 
                  placeholder="e.g. Audit Inspector" 
                  value={strRoleFormName}
                  onChange={(e) => funcSetRoleFormName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Role Description</label>
                <textarea 
                  className="form-input" 
                  placeholder="Describe this role's access level and responsibilities..." 
                  value={strRoleFormDesc}
                  onChange={(e) => funcSetRoleFormDesc(e.target.value)}
                  style={{ minHeight: '80px', fontFamily: 'inherit', resize: 'vertical', padding: '10px' }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-cancel" onClick={() => funcSetShowAddRoleModal(false)}>Cancel</button>
                <button type="submit" className="btn-save">Create Role</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── GLOBAL MODAL: LOW STOCK WARNING ── */}
      {boolShowLowStockModal && arrLowStockItemsList.length > 0 && (objRolePermissions[objCurrentUser?.strRole]?.['Items'] === true || objRolePermissions[objCurrentUser?.strRole]?.['Inventory'] === true) && (
        <div className="modal-overlay" onClick={() => funcSetShowLowStockModal(false)} style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--modal-overlay)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{
            background: "var(--bg-white)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "24px",
            width: "100%",
            maxWidth: "500px",
            boxShadow: "var(--shadow-lg)",
            animation: "fadeInDown 0.2s ease-out",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyBox: "space-between", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--red)", fontSize: "18px", fontWeight: 700, margin: 0 }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: "20px" }}></i>
                Low Stock Alert
              </h3>
              <button 
                type="button" 
                onClick={() => funcSetShowLowStockModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-soft)",
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <i className="ti ti-x"></i>
              </button>
            </div>
            
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              The following active items have dropped below their designated reorder levels. Purchases should be raised for these items:
            </p>
            
            <div style={{
              maxHeight: "240px",
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "var(--sidebar-bg)",
              padding: "8px 0",
              marginBottom: "20px"
            }}>
              {arrLowStockItemsList.map((itm, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: idx < arrLowStockItemsList.length - 1 ? "1px solid var(--border)" : "none"
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{itm.name || itm.strName}</span>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--text-soft)" }}>{itm.code || itm.strCode}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "var(--red)", fontWeight: 700 }}>{itm.current_stock ?? itm.intCurrentStock} / {itm.reorder_level ?? itm.intReorderLevel} {itm.unit || itm.strUnit}s</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Stock / Reorder</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-add"
                onClick={() => funcSetShowLowStockModal(false)}
                style={{
                  background: "var(--purple-mid)",
                  border: "none",
                  borderRadius: "22px",
                  padding: "10px 24px",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)",
                }}
              >
                Got it, thanks
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
