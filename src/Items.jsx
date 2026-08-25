import { useState, useMemo, useEffect } from "react";
import { arrInventoryItems } from "./mockData";

// Mappings of categories to their designated unit of measure
const categoryUnitMap = {
  "Stationery": "Box",
  "Consumables": "Ream",
  "Hardware": "Nos",
  "Office Supplies": "Box",
  "Printer Essentials": "Nos",
  "Electronics": "Nos",
  "Furniture": "Nos"
};

// Generates the next incremented item code based on the highest existing code
const getNextItemCode = (currentItems) => {
  let maxNum = 0;
  currentItems.forEach(item => {
    const code = item[0]; // e.g. "ITM-0006" or "ITM-0249"
    const match = code.match(/ITM-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  return `ITM-${String(nextNum).padStart(4, "0")}`;
};

export default function Items({ triggerToast, setNotifications, initialSearch = "" }) {
  // --- STATE DEFINITIONS ---
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [statusFilter, setStatusFilter] = useState("Active only");
  const [purchases, setPurchases] = useState([]);
  const [changedReorders, setChangedReorders] = useState({});
  const [showAlertModal, setShowAlertModal] = useState(false);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([
    { id: 1, name: "Office Supplies" },
    { id: 2, name: "Printer Essentials" },
    { id: 3, name: "Electronics" },
    { id: 4, name: "Furniture" }
  ]);

  const fetchPurchases = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/purchases/");
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (e) {
      console.warn("Error fetching purchases for items", e);
    }
  };

  const getItemSuppliers = (itemCode) => {
    const itemPurchases = purchases.filter(p => 
      p.strStatus === 'Posted' && 
      p.arrItems?.some(it => it.strCode === itemCode)
    );
    const sups = itemPurchases.flatMap(p => 
      p.strSupplier ? p.strSupplier.split(",").map(s => s.trim()) : []
    );
    const uniqueSups = Array.from(new Set(sups)).filter(Boolean);
    return uniqueSups.length > 0 ? uniqueSups.join(", ") : "Not Purchased";
  };

  const fetchItems = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/items/");
      if (!res.ok) throw new Error("Failed to fetch items");
      const data = await res.json();
      const mapped = data.map(item => [
        item.code,
        item.name,
        item.category ? item.category.name : "Hardware",
        item.unit,
        item.reorder_level,
        item.status,
        item.description || "",
        item.current_stock
      ]);
      setItems(mapped);
      localStorage.setItem("stockflow_items", JSON.stringify(mapped));
    } catch (err) {
      console.warn("Backend items API offline, falling back to local storage.", err);
      const saved = localStorage.getItem("stockflow_items");
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        const mappedFallback = arrInventoryItems.map((item, idx) => {
          const category = item.strCode === "ITM-0004" ? "Consumables" : (item.strCode === "ITM-0002" || item.strCode === "ITM-0005" ? "Stationery" : "Hardware");
          const unit = categoryUnitMap[category] || "Nos";
          return [
            item.strCode || `ITM-02${idx}`,
            item.strName || "",
            category,
            unit,
            20,
            "Active",
            item.strDescription || "" ,
            item.intOnHand || 0
          ];
        });
        setItems(mappedFallback);
        localStorage.setItem("stockflow_items", JSON.stringify(mappedFallback));
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/categories/");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      if (data.length > 0) {
        setCategories(data);
        localStorage.setItem("stockflow_categories", JSON.stringify(data));
      }
    } catch (err) {
      console.warn("Backend categories API offline, using cached/fallback categories.", err);
      const saved = localStorage.getItem("stockflow_categories");
      if (saved) {
        setCategories(JSON.parse(saved));
      }
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchPurchases();
  }, []);

  // --- HANDLERS ---
  const handleDelete = async (itemCode, itemName) => {
    if (window.confirm(`Are you sure you want to delete ${itemName}?`)) {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/delete-item/${itemCode}/`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete item");
        
        triggerToast(`Item "${itemName}" set to Inactive (soft deleted).`, "warning");
        if (setNotifications) {
          setNotifications(prev => [
            {
              intId: Date.now(),
              strType: "user_deleted",
              strText: `Product "${itemName}" set to Inactive`,
              strTime: "Just now"
            },
            ...prev
          ]);
        }
        fetchItems();
      } catch (err) {
        console.warn("Backend offline. Simulating soft delete locally.", err);
        const updatedItems = items.map(item =>
          item[0] === itemCode
            ? [item[0], item[1], item[2], item[3], item[4], "Inactive", item[6], item[7]]
            : item
        );
        setItems(updatedItems);
        localStorage.setItem("stockflow_items", JSON.stringify(updatedItems));
        triggerToast(`Item "${itemName}" set to Inactive locally.`, "warning");
      }
    }
  };





  // --- FILTERED DATA ---
  const filteredData = useMemo(() => {
    return items.filter(r => {
      const matchesSearch = (r[0] + r[1]).toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "All categories" || r[2] === categoryFilter;
      const matchesStatus = statusFilter === "Including inactive" || 
                            (statusFilter === "Active only" && r[5] === "Active");

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const lowStockItems = useMemo(() => {
    return items.filter(r => r[7] < r[4] && r[5] === "Active");
  }, [items]);





  // DEFAULT LIST VIEW SCREEN
  return (
    <div className="items-page" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div style={{ fontSize: "12px", color: "var(--text-soft)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.02em" }}>
        Masters / Items
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Items</div>
          <div className="page-sub">Manage your central inventory catalog and SKUs.</div>
        </div>
        {lowStockItems.length > 0 && (
          <button
            type="button"
            className="action-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "var(--red)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "22px",
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              height: "auto",
              width: "auto"
            }}
            onClick={() => setShowAlertModal(true)}
          >
            <i className="ti ti-alert-triangle" style={{ fontSize: 16 }}></i>
            Low Stock Alerts ({lowStockItems.length})
          </button>
        )}
      </div>

      {/* TOOLBAR FILTERS */}
      <div className="filters-row" style={{ animationDelay: "0.1s" }}>
        <div className="search-users" style={{ flex: 1, maxWidth: "320px" }}>
          <i className="ti ti-search" style={{ fontSize: 13, color: "var(--text-soft)" }}></i>
          <input
            type="text"
            placeholder="Search code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div className="filter-right">
          {/* Category Filter */}
          <select 
            className="select-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ appearance: "auto", border: "1px solid var(--border)", background: "var(--bg-white)" }}
          >
            <option value="All categories">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            className="select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ appearance: "auto", border: "1px solid var(--border)", background: "var(--bg-white)" }}
          >
            <option value="Active only">Active only</option>
            <option value="Including inactive">Including inactive</option>
          </select>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="table-wrap" style={{ padding: "0px", marginTop: "16px" }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ paddingLeft: "24px", width: "120px" }}>Code</th>
              <th>Item name</th>
              <th>Category</th>
              <th>Supplier(s)</th>
              <th>Unit</th>
              <th style={{ width: "130px" }}>Current Stock</th>
              <th style={{ textAlign: "right", width: "130px" }}>Reorder Level</th>
              <th>Status</th>
              <th style={{ textAlign: "right", paddingRight: "24px", width: "100px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--text-soft)", fontWeight: 500 }}>
                  No items match the filters.
                </td>
              </tr>
            ) : (
              filteredData.map((r, i) => (
                <tr key={i} style={{ animationDelay: `${0.03 + i * 0.01}s` }}>
                  <td className="mono" style={{ paddingLeft: "24px", color: "var(--text-muted)", fontWeight: "600" }}>{r[0]}</td>
                  <td style={{ fontWeight: 500 }} className="item-name-cell">
                    <div style={{ color: "var(--text-main)", fontWeight: "600" }}>{r[1]}</div>
                    {r[6] && <div className="desc-tooltip">{r[6]}</div>}
                  </td>
                  <td>
                    <span className="role-badge role-branch" style={{ background: "var(--sidebar-bg)", color: "var(--purple-dark)" }}>
                      {r[2]}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", fontWeight: "600", color: "var(--purple-mid)" }}>
                    {getItemSuppliers(r[0])}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{r[3]}</td>
                  <td>
                    <span className="status-dot" style={{ color: r[7] < r[4] ? "#d97706" : ((r[7] || 0) === 0 ? "var(--red)" : "var(--green)") }}>
                      <span className="dot" style={{
                        background: r[7] < r[4] ? "#f59e0b" : ((r[7] || 0) === 0 ? "var(--red)" : "var(--green)"),
                        boxShadow: r[7] < r[4] ? "0 0 0 2.5px rgba(245, 158, 11, 0.25)" : ((r[7] || 0) === 0 ? "0 0 0 2.5px rgba(239, 68, 68, 0.25)" : "0 0 0 2.5px rgba(16, 185, 129, 0.25)")
                      }}></span>
                      {r[7]} {r[3]}(s)
                      {r[7] < r[4] && (
                        <span style={{ fontSize: "10px", marginLeft: "6px", color: "#d97706", fontWeight: 700, textTransform: "uppercase" }}>
                          (Low)
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: "600", color: "var(--text-main)" }}>
                    <input 
                      type="number" 
                      value={changedReorders[r[0]] !== undefined ? changedReorders[r[0]] : r[4]} 
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
                        const val = parseInt(e.target.value);
                        const numericVal = isNaN(val) ? 0 : val;
                        if (numericVal === r[4]) {
                          const updated = { ...changedReorders };
                          delete updated[r[0]];
                          setChangedReorders(updated);
                        } else {
                          setChangedReorders(prev => ({ ...prev, [r[0]]: numericVal }));
                        }
                      }}
                      style={{ width: "80px", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "6px", textAlign: "right", background: "var(--bg-white)", color: "var(--text-main)", outline: "none" }}
                    />
                  </td>
                  <td>
                    {r[5] === "Active" ? (
                      <span className="status-dot status-active">
                        <span className="dot dot-active"></span>Active
                      </span>
                    ) : (
                      <span className="status-dot status-inactive">
                        <span className="dot dot-inactive"></span>Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", paddingRight: "24px" }}>
                    <div className="actions-cell">
                      {changedReorders[r[0]] !== undefined && (
                        <button 
                          type="button"
                          className="action-btn"
                          onClick={async () => {
                            const val = changedReorders[r[0]];
                            try {
                              const res = await fetch(`http://127.0.0.1:8000/api/update-item/${r[0]}/`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ reorder_level: val })
                              });
                              if (!res.ok) throw new Error("Failed to update reorder level");
                              
                              // Update local list state
                              const updatedItems = items.map(item => item[0] === r[0] ? [item[0], item[1], item[2], item[3], val, item[5], item[6], item[7]] : item);
                              setItems(updatedItems);
                              localStorage.setItem("stockflow_items", JSON.stringify(updatedItems));

                              // Clear change tracker to hide save button
                              const updatedChanges = { ...changedReorders };
                              delete updatedChanges[r[0]];
                              setChangedReorders(updatedChanges);

                              triggerToast(`Reorder level updated to ${val} for ${r[1]}`, "success");
                            } catch (err) {
                              console.warn("Backend offline, updating reorder level locally", err);
                              const updatedItems = items.map(item => item[0] === r[0] ? [item[0], item[1], item[2], item[3], val, item[5], item[6], item[7]] : item);
                              setItems(updatedItems);
                              localStorage.setItem("stockflow_items", JSON.stringify(updatedItems));

                              const updatedChanges = { ...changedReorders };
                              delete updatedChanges[r[0]];
                              setChangedReorders(updatedChanges);
                              triggerToast(`Reorder level updated locally (Offline)`, "success");
                            }
                          }}
                          title="Save Reorder Level"
                          style={{
                            color: "var(--green)",
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            marginRight: "6px",
                            animation: "fadeIn 0.25s ease-out"
                          }}
                        >
                          <i className="ti ti-device-floppy" style={{ fontSize: 16 }}></i>
                        </button>
                      )}
                      <button 
                        type="button"
                        className="action-btn"
                        onClick={() => handleDelete(r[0], r[1])}
                        title="Soft Delete"
                        style={{ color: "var(--red)" }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 16 }}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: LOW STOCK WARNINGS ── */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)} style={{
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
          zIndex: 1000,
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
                onClick={() => setShowAlertModal(false)}
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
              {lowStockItems.map((itm, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: idx < lowStockItems.length - 1 ? "1px solid var(--border)" : "none"
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{itm[1]}</span>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--text-soft)" }}>{itm[0]} ({itm[2]})</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "var(--red)", fontWeight: 700 }}>{itm[7]} / {itm[4]} {itm[3]}s</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Stock / Reorder</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-add"
                onClick={() => setShowAlertModal(false)}
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
