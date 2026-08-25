import { useState, useEffect, useMemo } from "react";
import "./Dashboard.css";

// Section: Mock datasets for offline / first-time fallback
const mockItemsFallback = [
  { code: "ITM-0001", name: "Premium A4 Paper", category: { name: "Consumables" }, unit: "Ream", reorder_level: 20, status: "Active", current_stock: 45, price: 15.50 },
  { code: "ITM-0002", name: "Blue Ballpoint Pens", category: { name: "Stationery" }, unit: "Box", reorder_level: 15, status: "Active", current_stock: 8, price: 2.20 },
  { code: "ITM-0003", name: "Ergonomic Desk Chair", category: { name: "Furniture" }, unit: "Nos", reorder_level: 5, status: "Active", current_stock: 3, price: 85.00 },
  { code: "ITM-0004", name: "Cardboard Boxes", category: { name: "Stationery" }, unit: "Box", reorder_level: 20, status: "Active", current_stock: 12, price: 4.80 },
  { code: "ITM-0005", name: "USB Flash Drive 64GB", category: { name: "Electronics" }, unit: "Nos", reorder_level: 10, status: "Active", current_stock: 25, price: 12.00 }
];

const mockCategoriesFallback = [
  { id: 1, name: "Office Supplies" },
  { id: 2, name: "Printer Essentials" },
  { id: 3, name: "Electronics" },
  { id: 4, name: "Furniture" },
  { id: 5, name: "Consumables" },
  { id: 6, name: "Stationery" }
];

const mockSuppliersFallback = [
  { id: 1, code: "SUP-001", name: "Office Mart Trading LLC" },
  { id: 2, code: "SUP-002", name: "Global Stationers Ltd" },
  { id: 3, code: "SUP-003", name: "Apex Paper Industries" },
  { id: 4, code: "SUP-004", name: "TechZone Distributors" }
];

const mockBranchesFallback = [
  { id: 1, code: "BR-001", name: "Calicut Branch" },
  { id: 2, code: "BR-002", name: "Cochin Branch" },
  { id: 3, code: "BR-003", name: "Trivandrum Branch" }
];

const mockRequisitionsFallback = [
  { id: 1, strRequisitionNo: "REQ-2026-0001", strBranchName: "Calicut Branch", strStatus: "Pending", floaTotalValue: 125.50, strRequiredByDate: "2026-06-25" },
  { id: 2, strRequisitionNo: "REQ-2026-0002", strBranchName: "Cochin Branch", strStatus: "Approved", floaTotalValue: 340.00, strRequiredByDate: "2026-06-28" },
  { id: 3, strRequisitionNo: "REQ-2026-0003", strBranchName: "Trivandrum Branch", strStatus: "Rejected", floaTotalValue: 95.00, strRequiredByDate: "2026-06-22" },
  { id: 4, strRequisitionNo: "REQ-2026-0004", strBranchName: "Calicut Branch", strStatus: "Received", floaTotalValue: 45.00, strRequiredByDate: "2026-06-18" }
];

const mockPurchasesFallback = [
  { id: 1, strPurchaseNo: "PUR-2026-0001", strSupplier: "Office Mart Trading LLC", strStatus: "Posted", floaTotal: 1250.00, strInvoiceDate: "2026-06-10" },
  { id: 2, strPurchaseNo: "PUR-2026-0002", strSupplier: "TechZone Distributors", strStatus: "Posted", floaTotal: 650.00, strInvoiceDate: "2026-06-15" },
  { id: 3, strPurchaseNo: "PUR-2026-0003", strSupplier: "Apex Paper Industries", strStatus: "Draft", floaTotal: 180.00, strInvoiceDate: "2026-06-20" }
];

export default function Dashboard({ triggerToast, setNotifications, funcSetActiveNav, objCurrentUser, objRolePermissions }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Compute permissions for the active user role
  const userPermissions = useMemo(() => {
    if (!objRolePermissions || !objCurrentUser) {
      return {
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
      };
    }
    return objRolePermissions[objCurrentUser.strRole] || {};
  }, [objRolePermissions, objCurrentUser]);

  // Sync date & time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const baseUrl = "http://127.0.0.1:8000";

    try {
      const [itemsRes, catRes, supRes, branchRes, purRes, reqRes] = await Promise.all([
        fetch(`${baseUrl}/api/items/`).catch(() => null),
        fetch(`${baseUrl}/api/categories/`).catch(() => null),
        fetch(`${baseUrl}/api/suppliers/`).catch(() => null),
        fetch(`${baseUrl}/api/branches/`).catch(() => null),
        fetch(`${baseUrl}/api/purchases/`).catch(() => null),
        fetch(`${baseUrl}/api/rbac/requisitions/`).catch(() => null),
      ]);

      // Items parse
      if (itemsRes && itemsRes.ok) {
        const data = await itemsRes.json();
        const mapped = data.map(item => ({
          code: item.code,
          name: item.name,
          category: item.category ? item.category : { name: "Hardware" },
          unit: item.unit,
          reorder_level: item.reorder_level,
          status: item.status,
          description: item.description || "",
          current_stock: item.current_stock,
          price: parseFloat(item.price) || 0.00
        }));
        setItems(mapped);
        localStorage.setItem("stockflow_items_dashboard", JSON.stringify(mapped));
      } else {
        const saved = localStorage.getItem("stockflow_items_dashboard") || localStorage.getItem("stockflow_items");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
            setItems(parsed.map(itm => ({
              code: itm[0],
              name: itm[1],
              category: { name: itm[2] },
              unit: itm[3],
              reorder_level: itm[4],
              status: itm[5],
              description: itm[6],
              current_stock: itm[7],
              price: 10.00
            })));
          } else {
            setItems(parsed);
          }
        } else {
          setItems(mockItemsFallback);
        }
      }

      // Categories parse
      if (catRes && catRes.ok) {
        const data = await catRes.json();
        setCategories(data);
        localStorage.setItem("stockflow_categories_dashboard", JSON.stringify(data));
      } else {
        const saved = localStorage.getItem("stockflow_categories_dashboard") || localStorage.getItem("stockflow_categories");
        setCategories(saved ? JSON.parse(saved) : mockCategoriesFallback);
      }

      // Suppliers parse
      if (supRes && supRes.ok) {
        const data = await supRes.json();
        setSuppliers(data);
        localStorage.setItem("stockflow_suppliers_dashboard", JSON.stringify(data));
      } else {
        const saved = localStorage.getItem("stockflow_suppliers_dashboard") || localStorage.getItem("stockflow_suppliers");
        setSuppliers(saved ? JSON.parse(saved) : mockSuppliersFallback);
      }

      // Branches parse
      if (branchRes && branchRes.ok) {
        const data = await branchRes.json();
        setBranches(data);
      } else {
        setBranches(mockBranchesFallback);
      }

      // Purchases parse
      if (purRes && purRes.ok) {
        const data = await purRes.json();
        setPurchases(data);
      } else {
        setPurchases(mockPurchasesFallback);
      }

      // Requisitions parse
      if (reqRes && reqRes.ok) {
        const data = await reqRes.json();
        setRequisitions(data);
      } else {
        setRequisitions(mockRequisitionsFallback);
      }

    } catch (e) {
      console.warn("Backend API offline or network issue. Falling back to local data.", e);
      setItems(mockItemsFallback);
      setCategories(mockCategoriesFallback);
      setSuppliers(mockSuppliersFallback);
      setBranches(mockBranchesFallback);
      setPurchases(mockPurchasesFallback);
      setRequisitions(mockRequisitionsFallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Stat Metrics
  const statsMetrics = useMemo(() => {
    const totalSKUs = items.filter(i => i.status === "Active").length;
    const lowStockCount = items.filter(i => i.status === "Active" && i.current_stock < i.reorder_level).length;
    const pendingApprovals = requisitions.filter(r => r.strStatus === "Pending" || r.status === "Pending").length;
    
    const totalSpent = purchases
      .filter(p => p.strStatus === "Posted" || p.status === "Posted")
      .reduce((sum, p) => sum + (parseFloat(p.floaTotal || p.total) || 0), 0);

    return {
      totalSKUs,
      lowStockCount,
      pendingApprovals,
      totalSpent
    };
  }, [items, requisitions, purchases]);

  // Compute Requisition Pipeline Statuses
  const pipelineMetrics = useMemo(() => {
    const total = requisitions.length || 1;
    const getCount = (status) => requisitions.filter(r => (r.strStatus || r.status) === status).length;
    
    const pending = getCount("Pending");
    const approved = getCount("Approved");
    const dispatched = getCount("Dispatched");
    const received = getCount("Received");
    const rejected = getCount("Rejected");

    return [
      { label: "Pending Review", count: pending, pct: (pending / total) * 100, color: "var(--purple-mid)" },
      { label: "Approved Requisitions", count: approved, pct: (approved / total) * 100, color: "#3b82f6" },
      { label: "Dispatched Requisitions", count: dispatched, pct: (dispatched / total) * 100, color: "#10b981" },
      { label: "Stock Confirmed (Received)", count: received, pct: (received / total) * 100, color: "var(--green)" },
      { label: "Rejected Requests", count: rejected, pct: (rejected / total) * 100, color: "var(--red)" }
    ];
  }, [requisitions]);

  // Low Stock Alerts Filtered
  const lowStockAlerts = useMemo(() => {
    return items.filter(i => i.status === "Active" && i.current_stock < i.reorder_level);
  }, [items]);

  // Category distribution
  const catDistribution = useMemo(() => {
    const dist = {};
    items.forEach(itm => {
      const name = itm.category?.name || itm.category || "General";
      dist[name] = (dist[name] || 0) + 1;
    });
    return Object.entries(dist)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4); // Limit to top 4 categories
  }, [items]);

  // Format currencies
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const handleRefresh = () => {
    fetchData();
    triggerToast("Dashboard data re-synchronized with central servers", "success");
  };

  // Check if current user is Admin
  const isAdmin = objCurrentUser?.strRole === "Admin";

  // Determine if details columns have any visible item
  const hasDetailsVisible = useMemo(() => {
    return (
      (userPermissions['Requisition'] || userPermissions['Approval']) || // Requisition Pipeline
      userPermissions['Items'] || // Low Stock Alerts
      (userPermissions['Categories'] || userPermissions['Items']) || // Top Categories
      userPermissions['Purchase'] || // Recent Procurement
      userPermissions['Requisition'] // Recent Requisitions
    );
  }, [userPermissions]);

  // Determine if stat grid has any visible card
  const hasStatsVisible = useMemo(() => {
    return (
      userPermissions['Items'] || 
      userPermissions['Approval'] || 
      userPermissions['Requisition'] || 
      userPermissions['Purchase'] || 
      userPermissions['Branches'] || 
      userPermissions['Suppliers']
    );
  }, [userPermissions]);

  // Determine if shortcuts panel has any visible shortcut
  const hasShortcutsVisible = useMemo(() => {
    return (
      userPermissions['Requisition'] ||
      userPermissions['Purchase'] ||
      userPermissions['Items'] ||
      userPermissions['Roles']
    );
  }, [userPermissions]);

  // ── NON-ADMIN SIMPLE DASHBOARD WELCOME & GUIDE BOARD ──
  if (!isAdmin) {
    return (
      <div className="non-admin-home">
        {/* welcome banner header */}
        <div className="dashboard-hero-banner">
          <div className="dashboard-hero-content">
            <div className="dashboard-hero-badge">
              <i className="ti ti-heart-handshake"></i> Welcome Portal
            </div>
            <h2>Hello, {objCurrentUser?.strFull || "User"}!</h2>
            <p>
              Your active workspace profile is configured under the <strong>{objCurrentUser?.strRole || "Staff"}</strong> authorization role. 
              Review the system introduction and section flows below, or select sidebar options to begin operations.
            </p>
          </div>

          <div className="dashboard-hero-right">
            <div className="dashboard-datetime-badge">
              <i className="ti ti-calendar-time"></i>
              <span>{currentTime.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        </div>

        {/* Introduction section */}
        <div className="homepage-intro-section" style={{ gridTemplateColumns: "1fr" }}>
          {/* About description text */}
          <div className="intro-text-card" style={{ padding: "32px", background: "var(--bg-white)", border: "1px solid var(--border)", borderRadius: "20px", boxShadow: "var(--shadow-sm)" }}>
            <h3 className="intro-title" style={{ fontSize: "20px", marginBottom: "8px" }}>About LeoInventory Enterprise</h3>
            <p className="intro-paragraph">
              LeoInventory is a unified procurement, stocking, and requisition manager. It enables a direct stock flow link between the central office warehouses and all active field branches.
            </p>
            <p className="intro-paragraph" style={{ marginTop: "12px" }}>
              To ensure data protection and clean transaction trails, all views are linked directly to your active role configurations. Under your profile, you can raise requisitions, check items list balance, and confirm branch receipts dynamically.
            </p>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              {userPermissions['Requisition'] && (
                <button className="btn-add" style={{ padding: "10px 20px" }} onClick={() => funcSetActiveNav("Requisition")}>
                  <i className="ti ti-file-text"></i> Raise Requisition
                </button>
              )}
              {userPermissions['Items'] && (
                <button className="btn-export" style={{ padding: "10px 20px" }} onClick={() => funcSetActiveNav("Items")}>
                  <i className="ti ti-box"></i> View Catalog Items
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Operational steps workflow explanation */}
        <div className="operational-flow-map">
          <div className="flow-map-header">
            <h3>
              <i className="ti ti-git-fork"></i>
              <span>LeoInventory Core Operation Cycle</span>
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Learn how inventory items move from creation to final delivery confirmation.
            </p>
          </div>

          <div className="flow-steps-grid">
            <div className="flow-step-card">
              <div className="flow-step-num">1</div>
              <span className="flow-step-title">Central SKUs Cataloging</span>
              <span className="flow-step-desc">
                Office managers create active inventory items (SKUs) and assign reorder points and categories.
              </span>
            </div>

            <div className="flow-step-card">
              <div className="flow-step-num">2</div>
              <span className="flow-step-title">Procurement Entry</span>
              <span className="flow-step-desc">
                Central managers generate supplier purchase orders to physically restock items into central inventory.
              </span>
            </div>

            <div className="flow-step-card">
              <div className="flow-step-num">3</div>
              <span className="flow-step-title">Branch Requisitions</span>
              <span className="flow-step-desc">
                Branch users request items from central office stock to fulfill local customer demands.
              </span>
            </div>

            <div className="flow-step-card">
              <div className="flow-step-num">4</div>
              <span className="flow-step-title">Logistics & Receipts</span>
              <span className="flow-step-desc">
                Central dispatches approved requests; branch users log confirming checks to intake stocks local.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN COMPREHENSIVE BOARD (DEFAULT DESIGN) ──
  return (
    <div className="dashboard-page">
      {/* ── BREADCRUMBS ── */}
      <div style={{ fontSize: "12px", color: "var(--text-soft)", fontWeight: 600, letterSpacing: "0.02em" }}>
        Overview / Dashboard
      </div>

      {/* ── HERO BANNER ── */}
      <div className="dashboard-hero-banner">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-badge">
            <i className="ti ti-activity"></i> Live System Status
          </div>
          <h2>Welcome back, {objCurrentUser?.strFull || "User"}!</h2>
          <p>
            LeoInventory Enterprise Manager is active. Your deployment coordinates <strong>{branches.length} branches</strong>, 
            facilitates tracking for <strong>{suppliers.length} vendors</strong>, and secures real-time access roles under Django RBAC controls.
          </p>
        </div>

        <div className="dashboard-hero-right">
          <div className="dashboard-datetime-badge">
            <i className="ti ti-calendar-time"></i>
            <span>{currentTime.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <button className="btn-sync-hero" onClick={handleRefresh} title="Sync Live Data">
            <i className="ti ti-refresh"></i> Sync Data
          </button>
        </div>
      </div>

      {/* ── WORKSPACE SHORTCUTS (Filtered by permission) ── */}
      {hasShortcutsVisible && (
        <div className="dashboard-shortcuts-wrapper">
          <h3 className="home-shortcuts-title">
            <i className="ti ti-apps"></i> Workspace Shortcuts
          </h3>
          <div className="home-shortcuts-grid">
            {userPermissions['Requisition'] && (
              <div className="home-shortcut-card" onClick={() => funcSetActiveNav("Requisition")}>
                <div className="home-shortcut-icon">
                  <i className="ti ti-file-text"></i>
                </div>
                <div className="home-shortcut-details">
                  <span className="home-shortcut-title">Raise Requisition</span>
                  <span className="home-shortcut-desc">Request inventory restocks from the Central Office.</span>
                </div>
              </div>
            )}

            {userPermissions['Purchase'] && (
              <div className="home-shortcut-card" onClick={() => funcSetActiveNav("Purchase")}>
                <div className="home-shortcut-icon">
                  <i className="ti ti-shopping-cart"></i>
                </div>
                <div className="home-shortcut-details">
                  <span className="home-shortcut-title">Procure Stock</span>
                  <span className="home-shortcut-desc">Log vendor invoices and restock the Central warehouse.</span>
                </div>
              </div>
            )}

            {userPermissions['Items'] && (
              <div className="home-shortcut-card" onClick={() => funcSetActiveNav("Items")}>
                <div className="home-shortcut-icon">
                  <i className="ti ti-plus"></i>
                </div>
                <div className="home-shortcut-details">
                  <span className="home-shortcut-title">Manage Central SKUs</span>
                  <span className="home-shortcut-desc">Define central items, categories, and unit rules.</span>
                </div>
              </div>
            )}

            {userPermissions['Roles'] && (
              <div className="home-shortcut-card" onClick={() => funcSetActiveNav("Roles")}>
                <div className="home-shortcut-icon">
                  <i className="ti ti-shield-lock"></i>
                </div>
                <div className="home-shortcut-details">
                  <span className="home-shortcut-title">Access Security Matrix</span>
                  <span className="home-shortcut-desc">Configure user role capabilities and permissions.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STATS METRICS GRID (Filtered by permission) ── */}
      {hasStatsVisible && (
        <div className="dashboard-stat-grid">
          {userPermissions['Items'] && (
            <div className="dashboard-stat-card purple">
              <div className="dashboard-stat-info">
                <span className="dashboard-stat-title">Central SKUs</span>
                <span className="dashboard-stat-value">{statsMetrics.totalSKUs}</span>
                <span className="dashboard-stat-sub">{statsMetrics.lowStockCount} Low stock alerts</span>
              </div>
              <div className="dashboard-stat-icon-wrapper">
                <i className="ti ti-box"></i>
              </div>
            </div>
          )}

          {(userPermissions['Approval'] || userPermissions['Requisition']) && (
            <div className="dashboard-stat-card orange">
              <div className="dashboard-stat-info">
                <span className="dashboard-stat-title">Pending Approvals</span>
                <span className="dashboard-stat-value">{statsMetrics.pendingApprovals}</span>
                <span className="dashboard-stat-sub">Requisitions to review</span>
              </div>
              <div className="dashboard-stat-icon-wrapper">
                <i className="ti ti-clock"></i>
              </div>
            </div>
          )}

          {userPermissions['Purchase'] && (
            <div className="dashboard-stat-card green">
              <div className="dashboard-stat-info">
                <span className="dashboard-stat-title">Procurement Spent</span>
                <span className="dashboard-stat-value">{formatCurrency(statsMetrics.totalSpent)}</span>
                <span className="dashboard-stat-sub">Total posted purchases</span>
              </div>
              <div className="dashboard-stat-icon-wrapper">
                <i className="ti ti-shopping-cart"></i>
              </div>
            </div>
          )}

          {(userPermissions['Branches'] || userPermissions['Suppliers']) && (
            <div className="dashboard-stat-card blue">
              <div className="dashboard-stat-info">
                <span className="dashboard-stat-title">Branches & Suppliers</span>
                <span className="dashboard-stat-value">{branches.length + suppliers.length} Active</span>
                <span className="dashboard-stat-sub">{branches.length} branches • {suppliers.length} vendors</span>
              </div>
              <div className="dashboard-stat-icon-wrapper">
                <i className="ti ti-building-warehouse"></i>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DETAILS PANEL GRID (Filtered by permission) ── */}
      {hasDetailsVisible ? (
        <div className="dashboard-layout-grid">
          {/* LEFT COLUMN */}
          <div className="dashboard-main-col">
            {/* Requisition Status Pipeline */}
            {(userPermissions['Requisition'] || userPermissions['Approval']) && (
              <div className="dashboard-panel-card">
                <div className="dashboard-panel-header">
                  <div className="dashboard-panel-title">
                    <i className="ti ti-chart-bar"></i>
                    <span>Requisition Pipeline Overview</span>
                  </div>
                  <button className="dashboard-panel-action" onClick={() => funcSetActiveNav("Requisition")}>
                    View Requisitions <i className="ti ti-arrow-right"></i>
                  </button>
                </div>

                <div className="pipeline-list">
                  {pipelineMetrics.map((pipe, idx) => (
                    <div className="pipeline-item" key={idx}>
                      <div className="pipeline-item-header">
                        <span className="pipeline-item-label">{pipe.label}</span>
                        <span className="pipeline-item-val">{pipe.count} requests ({Math.round(pipe.pct)}%)</span>
                      </div>
                      <div className="pipeline-progress-bg">
                        <div className="pipeline-progress-fill" style={{ width: `${pipe.pct}%`, background: pipe.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock Alerts */}
            {userPermissions['Items'] && (
              <div className="dashboard-panel-card">
                <div className="dashboard-panel-header">
                  <div className="dashboard-panel-title" style={{ color: lowStockAlerts.length > 0 ? "var(--red)" : "var(--text-main)" }}>
                    <i className="ti ti-alert-triangle" style={{ color: lowStockAlerts.length > 0 ? "var(--red)" : "var(--purple-mid)" }}></i>
                    <span>Critical Low Stock Alerts</span>
                  </div>
                  <button className="dashboard-panel-action" onClick={() => funcSetActiveNav("Items")}>
                    View Catalog <i className="ti ti-arrow-right"></i>
                  </button>
                </div>

                <div className="stock-alerts-list">
                  {lowStockAlerts.length === 0 ? (
                    <div className="dashboard-empty-state">
                      <i className="ti ti-circle-check" style={{ color: "var(--green)" }}></i>
                      All inventory stocks are healthy. No items are below reorder thresholds.
                    </div>
                  ) : (
                    lowStockAlerts.slice(0, 4).map((itm, idx) => (
                      <div className="stock-alert-row" key={idx}>
                        <div className="stock-alert-item-info">
                          <div className="dashboard-stat-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.08)", color: "var(--red)", width: 32, height: 32, borderRadius: 8, fontSize: 14 }}>
                            <i className="ti ti-package-off"></i>
                          </div>
                          <div className="stock-alert-item-details">
                            <span className="stock-alert-item-name">{itm.name}</span>
                            <span className="stock-alert-item-code">{itm.code} • {itm.category?.name || itm.category || "General"}</span>
                          </div>
                        </div>
                        <div className="stock-alert-status">
                          <span className="stock-alert-qty">{itm.current_stock} / {itm.reorder_level} {itm.unit}(s)</span>
                          {userPermissions['Purchase'] && (
                            <button className="stock-alert-reorder-link" onClick={() => funcSetActiveNav("Purchase")}>
                              Reorder SKU
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="dashboard-side-col">
            {/* Top Categories Distribution */}
            {(userPermissions['Categories'] || userPermissions['Items']) && (
              <div className="dashboard-panel-card">
                <div className="dashboard-panel-header">
                  <div className="dashboard-panel-title">
                    <i className="ti ti-category"></i>
                    <span>Top Categories</span>
                  </div>
                  <button className="dashboard-panel-action" onClick={() => funcSetActiveNav("Categories")}>
                    View Categories <i className="ti ti-arrow-right"></i>
                  </button>
                </div>

                <div className="cat-dist-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {catDistribution.length === 0 ? (
                    <div className="dashboard-empty-state">No categories.</div>
                  ) : (
                    catDistribution.map((cat, idx) => (
                      <div className="cat-dist-card" key={idx} style={{ padding: "10px 12px" }}>
                        <div className="cat-dist-info" style={{ marginBottom: "4px" }}>
                          <span className="cat-dist-name" style={{ fontSize: "11.5px" }}>{cat.name}</span>
                          <span className="cat-dist-count" style={{ fontSize: "10px" }}>{cat.count} SKUs</span>
                        </div>
                        <div className="pipeline-progress-bg" style={{ height: 4 }}>
                          <div className="pipeline-progress-fill" style={{ width: `${(cat.count / items.length) * 100}%`, background: "var(--purple-mid)" }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Recent Procurement Orders */}
            {userPermissions['Purchase'] && (
              <div className="dashboard-panel-card">
                <div className="dashboard-panel-header">
                  <div className="dashboard-panel-title">
                    <i className="ti ti-receipt"></i>
                    <span>Recent Procurement</span>
                  </div>
                  <button className="dashboard-panel-action" onClick={() => funcSetActiveNav("Purchase")}>
                    All Orders <i className="ti ti-arrow-right"></i>
                  </button>
                </div>

                <div className="feed-list">
                  {purchases.length === 0 ? (
                    <div className="dashboard-empty-state">No procurement orders.</div>
                  ) : (
                    purchases.slice(0, 2).map((pur, idx) => {
                      const isPosted = (pur.strStatus || pur.status) === "Posted";
                      const totalAmt = parseFloat(pur.floaTotal || pur.total || 0);
                      
                      return (
                        <div className="feed-item" key={idx}>
                          <div className="feed-icon" style={{
                            background: isPosted ? "rgba(16, 185, 129, 0.1)" : "rgba(124, 58, 237, 0.1)",
                            color: isPosted ? "var(--green)" : "var(--purple-mid)"
                          }}>
                            <i className={isPosted ? "ti ti-circle-check" : "ti ti-edit"}></i>
                          </div>
                          <div className="feed-body">
                            <span className="feed-title">{pur.strPurchaseNo || `Order #${pur.id}`}</span>
                            <span className="feed-desc">Supplier: {pur.strSupplier?.split(",")[0] || "General"}</span>
                            <span className="feed-time">{pur.strInvoiceDate || pur.invoice_date} • <strong>{formatCurrency(totalAmt)}</strong></span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Recent Requisitions */}
            {userPermissions['Requisition'] && (
              <div className="dashboard-panel-card">
                <div className="dashboard-panel-header">
                  <div className="dashboard-panel-title">
                    <i className="ti ti-send"></i>
                    <span>Recent Requisitions</span>
                  </div>
                  <button className="dashboard-panel-action" onClick={() => funcSetActiveNav("Requisition")}>
                    All Requests <i className="ti ti-arrow-right"></i>
                  </button>
                </div>

                <div className="feed-list">
                  {requisitions.length === 0 ? (
                    <div className="dashboard-empty-state">No requisitions.</div>
                  ) : (
                    requisitions.slice(0, 2).map((req, idx) => {
                      const status = req.strStatus || req.status || "Draft";
                      let bg = "rgba(124, 58, 237, 0.1)";
                      let color = "var(--purple-mid)";
                      let icon = "ti ti-file-text";
                      
                      if (status === "Approved" || status === "Received") {
                        bg = "rgba(16, 185, 129, 0.1)";
                        color = "var(--green)";
                        icon = "ti ti-circle-check";
                      } else if (status === "Rejected") {
                        bg = "rgba(239, 68, 68, 0.1)";
                        color = "var(--red)";
                        icon = "ti ti-circle-x";
                      } else if (status === "Pending") {
                        bg = "rgba(245, 158, 11, 0.1)";
                        color = "#f59e0b";
                        icon = "ti ti-clock";
                      }

                      const value = parseFloat(req.floaTotalValue || req.total_value || 0);

                      return (
                        <div className="feed-item" key={idx}>
                          <div className="feed-icon" style={{ background: bg, color: color }}>
                            <i className={icon}></i>
                          </div>
                          <div className="feed-body">
                            <span className="feed-title">{req.strRequisitionNo || `Req #${req.id}`}</span>
                            <span className="feed-desc">Branch: {req.strBranchName || req.branch_name || "Central"}</span>
                            <span className="feed-time">Status: <strong>{status}</strong> • {formatCurrency(value)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="dashboard-panel-card" style={{ textAlign: "center", padding: "40px" }}>
          <div className="dashboard-empty-state">
            <i className="ti ti-shield-alert" style={{ fontSize: "36px", color: "var(--text-soft)", marginBottom: "12px" }}></i>
            <h3>Limited Access Active</h3>
            <p style={{ marginTop: "8px", color: "var(--text-muted)", fontSize: "12.5px" }}>
              Your active role (<strong>{objCurrentUser?.strRole || "Visitor"}</strong>) has dashboard landing privileges, but no specific feature databases (Items, Purchases, Requisitions, etc.) have been checked under your permission rules.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
