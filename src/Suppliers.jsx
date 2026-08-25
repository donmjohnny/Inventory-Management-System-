import { useState, useEffect, Fragment } from "react";

export default function Suppliers({ triggerToast, setNotifications, initialSearch = "" }) {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);
  const [loading, setLoading] = useState(false);
  const [expandedSupplierIds, setExpandedSupplierIds] = useState([]);
  const [purchases, setPurchases] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    items: []
  });

  const strBackendUrl = "http://127.0.0.1:8000";

  const initialMockSuppliers = [
    {
      id: 1,
      code: "SUP-001",
      name: "Global Tech Supplies",
      email: "orders@globaltech.com",
      phone: "+91 98765 11111",
      items: [
        { code: "ITM-01", name: "Keyboard" },
        { code: "ITM-02", name: "Mouse" }
      ]
    },
    {
      id: 2,
      code: "SUP-002",
      name: "Office Essentials Ltd",
      email: "sales@officeessentials.com",
      phone: "+91 98765 22222",
      items: []
    }
  ];

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${strBackendUrl}/api/suppliers/`);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      const data = await res.json();
      setSuppliers(data);
      localStorage.setItem("stockflow_suppliers", JSON.stringify(data));
    } catch (err) {
      console.warn("Backend suppliers API offline, falling back to local storage.", err);
      const saved = localStorage.getItem("stockflow_suppliers");
      if (saved) {
        setSuppliers(JSON.parse(saved));
      } else {
        setSuppliers(initialMockSuppliers);
        localStorage.setItem("stockflow_suppliers", JSON.stringify(initialMockSuppliers));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${strBackendUrl}/api/categories/`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
      localStorage.setItem("stockflow_categories", JSON.stringify(data));
    } catch (err) {
      console.warn("Backend categories API offline in suppliers, falling back to cached categories.", err);
      const saved = localStorage.getItem("stockflow_categories");
      if (saved) {
        setCategories(JSON.parse(saved));
      } else {
        const fallbackCats = [
          { id: 1, name: "Office Supplies" },
          { id: 2, name: "Printer Essentials" },
          { id: 3, name: "Electronics" },
          { id: 4, name: "Furniture" }
        ];
        setCategories(fallbackCats);
        localStorage.setItem("stockflow_categories", JSON.stringify(fallbackCats));
      }
    }
  };

  const fetchPurchases = async () => {
    try {
      const res = await fetch(`${strBackendUrl}/api/purchases/`);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (e) {
      console.warn("Error fetching purchases in suppliers component", e);
    }
  };

  const getSupplierPurchasedItems = (supplierName) => {
    // Filter purchases from this supplier that are Posted
    const supplierPurchases = purchases.filter(
      (p) => p.strSupplier === supplierName && p.strStatus === "Posted"
    );

    const itemMap = {};
    supplierPurchases.forEach(p => {
      (p.arrItems || []).forEach(itm => {
        if (!itemMap[itm.strCode]) {
          itemMap[itm.strCode] = {
            code: itm.strCode,
            name: itm.strName,
            category: itm.strCategory || "Office Supplies",
            unit: itm.strUnit || "Box",
            qty: 0,
            lastPrice: parseFloat(itm.floaPrice) || 0,
            lastDate: p.strInvoiceDate,
            purchaseNo: p.strPurchaseNo
          };
        }
        itemMap[itm.strCode].qty += itm.intQty;
        if (p.strInvoiceDate > itemMap[itm.strCode].lastDate) {
          itemMap[itm.strCode].lastDate = p.strInvoiceDate;
          itemMap[itm.strCode].lastPrice = parseFloat(itm.floaPrice) || 0;
          itemMap[itm.strCode].purchaseNo = p.strPurchaseNo;
        }
      });
    });
    return Object.values(itemMap);
  };

  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
    fetchPurchases();
  }, []);

  const toggleExpandSupplier = (id) => {
    setExpandedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormError("");
    setFormData({
      code: "",
      name: "",
      email: "",
      phone: "",
      items: []
    });
    setIsModalOpen(true);
  };

  const handleEdit = (supplier) => {
    setEditingId(supplier.id);
    setFormError("");
    setFormData({
      code: supplier.code || "",
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      items: supplier.items ? supplier.items.map(itm => ({
        code: itm.code || "",
        name: itm.name || "",
        category_id: itm.category ? itm.category.id : "",
        price: itm.price || 0.00
      })) : []
    });
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { code: "", name: "", category_id: "", price: 0.00 }]
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = field === "code" ? value.toUpperCase() : value;
    setFormData((prev) => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleRemoveItemRow = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== indexToRemove)
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Name and Email are required.");
      return;
    }

    // Assign dynamic code if not specified or empty (offline fallback)
    let finalCode = formData.code ? formData.code.trim() : "";
    if (!finalCode) {
      const nextId = suppliers.length > 0 ? Math.max(...suppliers.map((s) => s.id)) + 1 : 1;
      finalCode = `SUP-${String(nextId).padStart(3, "0")}`;
    }

    // Process items for saving:
    // Generate unique sequential codes for new supplier items in offline fallback/payload
    let nextItemNum = 1;
    suppliers.forEach(s => {
      if (s.items) {
        s.items.forEach(itm => {
          const match = (itm.code || "").match(/ITM-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= nextItemNum) {
              nextItemNum = num + 1;
            }
          }
        });
      }
    });

    const finalItems = formData.items
      .filter((itm) => itm.name.trim())
      .map((itm) => {
        const catIdVal = itm.category_id ? parseInt(itm.category_id, 10) : null;
        const catObj = categories.find(c => String(c.id) === String(itm.category_id)) || null;
        const priceVal = parseFloat(itm.price) || 0.00;
        if (itm.code && itm.code.startsWith("ITM-")) {
          return { ...itm, category_id: catIdVal, category: catObj, price: priceVal };
        }
        const generatedCode = `ITM-${String(nextItemNum++).padStart(4, "0")}`;
        return { ...itm, code: generatedCode, category_id: catIdVal, category: catObj, price: priceVal };
      });

    const payload = {
      code: finalCode,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      items: finalItems
    };

    try {
      let res;
      if (editingId !== null) {
        res = await fetch(`${strBackendUrl}/api/update-supplier/${editingId}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${strBackendUrl}/api/add-supplier/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error("Failed to save supplier");
      triggerToast(`Supplier "${payload.name}" saved successfully!`, "success");
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      console.warn("Backend offline. Simulating supplier save locally.", err);

      let updatedSuppliers;
      if (editingId !== null) {
        updatedSuppliers = suppliers.map((s) =>
          s.id === editingId ? { ...s, ...payload } : s
        );
      } else {
        const newId = suppliers.length > 0 ? Math.max(...suppliers.map((s) => s.id)) + 1 : 1;
        updatedSuppliers = [...suppliers, { id: newId, ...payload }];
      }

      setSuppliers(updatedSuppliers);
      localStorage.setItem("stockflow_suppliers", JSON.stringify(updatedSuppliers));
      triggerToast(`Supplier "${payload.name}" saved locally (Offline mode)!`, "success");

      if (setNotifications) {
        setNotifications((prev) => [
          {
            intId: Date.now(),
            strType: "settings_changed",
            strText: `Supplier "${payload.name}" saved locally`,
            strTime: "Just now"
          },
          ...prev
        ]);
      }

      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id, sName) => {
    const confirmDelete = window.confirm(`Are you sure you want to remove supplier "${sName}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${strBackendUrl}/api/delete-supplier/${id}/`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete supplier");
      triggerToast(`Supplier "${sName}" removed successfully!`, "warning");
      fetchSuppliers();
    } catch (err) {
      console.warn("Backend offline. Simulating supplier deletion locally.", err);
      const updatedSuppliers = suppliers.filter((s) => s.id !== id);
      setSuppliers(updatedSuppliers);
      localStorage.setItem("stockflow_suppliers", JSON.stringify(updatedSuppliers));
      triggerToast(`Supplier "${sName}" deleted locally (Offline mode)!`, "warning");

      if (setNotifications) {
        setNotifications((prev) => [
          {
            intId: Date.now(),
            strType: "status_updated",
            strText: `Supplier "${sName}" deleted locally`,
            strTime: "Just now"
          },
          ...prev
        ]);
      }
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.code || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="suppliers-page" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div style={{ fontSize: "12px", color: "var(--text-soft)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.02em" }}>
        Overview / Suppliers
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Supplier Directory</div>
          <div className="page-sub">Manage your product vendors, catalogs, and purchase details.</div>
        </div>

        <div className="header-actions">
          <button className="btn-add" onClick={handleAddNew}>
            <i className="ti ti-plus" style={{ fontSize: 15 }}></i>Add Supplier
          </button>
        </div>
      </div>

      {/* Main Table Box */}
      <div className="table-wrap" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)" }}>
              Active Vendors
            </h3>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
              Lists all system vendors. Expand each row to see supplied items catalog.
            </p>
          </div>

          <div className="search-users" style={{ margin: 0, width: "240px" }}>
            <i className="ti ti-search" style={{ fontSize: 13, color: "var(--text-soft)" }}></i>
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "100px", paddingLeft: "14px" }}>Supplier ID</th>
              <th style={{ width: "180px" }}>Supplier Code</th>
              <th>Supplier Name</th>
              <th>Contact Details</th>
              <th style={{ width: "150px", textAlign: "center" }}>Catalog Items</th>
              <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--text-soft)", fontWeight: 500 }}>
                  {loading ? "Loading suppliers..." : "No suppliers found"}
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier) => {
                const isExpanded = expandedSupplierIds.includes(supplier.id);
                return (
                  <Fragment key={supplier.id}>
                    <tr
                      onClick={() => toggleExpandSupplier(supplier.id)}
                      style={{
                        cursor: "pointer",
                        borderBottom: isExpanded ? "none" : "1px solid var(--border)",
                        background: isExpanded ? "var(--row-hover)" : "transparent",
                        transition: "background 0.2s"
                      }}
                    >
                      <td style={{ padding: "16px 14px" }}>
                        <span style={{ 
                          background: "rgba(124, 58, 237, 0.15)", 
                          color: "var(--purple-dark)", 
                          fontWeight: "bold", 
                          fontSize: "12px",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          display: "inline-block",
                          border: "1px solid rgba(124, 58, 237, 0.3)"
                        }}>
                          #{supplier.id}
                        </span>
                      </td>
                      <td style={{ fontWeight: "700", color: "var(--text-main)" }}>
                        {supplier.code}
                      </td>
                      <td style={{ fontWeight: "600", color: "var(--text-main)" }}>
                        {supplier.name}
                      </td>
                      <td>
                        <div style={{ color: "var(--text-main)", fontWeight: "500" }}>{supplier.email}</div>
                        {supplier.phone && (
                          <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "2px" }}>
                            {supplier.phone}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandSupplier(supplier.id);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: "600",
                            background: isExpanded ? "var(--purple-mid)" : "var(--sidebar-bg)",
                            color: isExpanded ? "#fff" : "var(--purple-dark)",
                            border: "1.5px solid",
                            borderColor: isExpanded ? "var(--purple-mid)" : "var(--border)",
                            cursor: "pointer",
                            userSelect: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <i className={`ti ti-${isExpanded ? "folder-open" : "folder"}`}></i>
                          {supplier.items?.length || 0} Items
                        </button>
                      </td>
                      <td>
                        <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleEdit(supplier)}
                            title="Edit Supplier"
                            style={{ color: "var(--purple-mid)" }}
                          >
                            <i className="ti ti-pencil" style={{ fontSize: 16 }}></i>
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => handleDelete(supplier.id, supplier.name)}
                            title="Delete Supplier"
                            style={{ color: "var(--red)" }}
                          >
                            <i className="ti ti-trash" style={{ fontSize: 16 }}></i>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable items section */}
                    {isExpanded && (
                      <tr style={{ background: "var(--bg-page)", borderBottom: "1px solid var(--border)" }}>
                        <td></td>
                        <td colSpan="5" style={{ padding: "10px 24px 20px 0" }}>
                          <div
                            style={{
                              borderLeft: "3px solid var(--purple-mid)",
                              paddingLeft: "16px",
                              animation: "fadeInDown 0.2s ease-out"
                            }}
                          >
                            <h4 style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)", marginBottom: "12px" }}>
                              Supplied Items Catalog
                            </h4>
                            {!supplier.items || supplier.items.length === 0 ? (
                              <div
                                style={{
                                  padding: "14px 16px",
                                  background: "var(--bg-white)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "10px",
                                  color: "var(--text-soft)",
                                  fontSize: "12px",
                                  fontStyle: "italic"
                                }}
                              >
                                No items listed for this supplier.
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                                  gap: "12px"
                                }}
                              >
                                {supplier.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                      padding: "12px",
                                      background: "var(--bg-white)",
                                      border: "1px solid var(--border)",
                                      borderRadius: "10px",
                                      boxShadow: "var(--shadow-sm)"
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                                      <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--purple-mid)", fontFamily: "monospace" }}>
                                        {item.code || "NO CODE"}
                                      </div>
                                      {item.category && (
                                        <span style={{
                                          fontSize: "9px",
                                          padding: "2px 8px",
                                          borderRadius: "12px",
                                          background: "rgba(124, 58, 237, 0.08)",
                                          color: "var(--purple-dark)",
                                          fontWeight: "600"
                                        }}>
                                          {item.category.name}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                                      <div style={{ fontSize: "12px", color: "var(--text-main)", fontWeight: "500" }}>
                                        {item.name || "Unnamed Item"}
                                      </div>
                                      <div style={{ fontSize: "11px", color: "var(--green)", fontWeight: "700" }}>
                                        ${parseFloat(item.price || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Items Purchased from Supplier Section */}
                            <h4 style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)", marginTop: "20px", marginBottom: "12px" }}>
                              Items Purchased from Supplier
                            </h4>
                            {getSupplierPurchasedItems(supplier.name).length === 0 ? (
                              <div
                                style={{
                                  padding: "14px 16px",
                                  background: "var(--bg-white)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "10px",
                                  color: "var(--text-soft)",
                                  fontSize: "12px",
                                  fontStyle: "italic"
                                }}
                              >
                                No items have been purchased from this supplier yet.
                              </div>
                            ) : (
                              <div className="table-wrap" style={{ padding: "0px", background: "var(--bg-white)", border: "1px solid var(--border)", borderRadius: "10px", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", margin: 0 }}>
                                  <thead>
                                    <tr style={{ background: "var(--sidebar-bg)" }}>
                                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: "700", textAlign: "left", borderBottom: "1px solid var(--border)", width: "100px" }}>Item Code</th>
                                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: "700", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Item Name</th>
                                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: "700", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Category</th>
                                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: "700", textAlign: "right", borderBottom: "1px solid var(--border)", width: "100px" }}>Total Qty</th>
                                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: "700", textAlign: "right", borderBottom: "1px solid var(--border)", width: "110px" }}>Last Unit Price</th>
                                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: "700", textAlign: "left", borderBottom: "1px solid var(--border)", width: "130px" }}>Last Purchase Date</th>
                                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: "700", textAlign: "left", borderBottom: "1px solid var(--border)", width: "120px" }}>Invoice No</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {getSupplierPurchasedItems(supplier.name).map((itm, idx) => (
                                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td className="mono" style={{ padding: "10px 16px", fontSize: "11px", fontWeight: "600", color: "var(--text-muted)" }}>{itm.code}</td>
                                        <td style={{ padding: "10px 16px", fontSize: "12px", fontWeight: "600", color: "var(--text-main)" }}>{itm.name}</td>
                                        <td style={{ padding: "10px 16px", fontSize: "11px" }}>
                                          <span className="role-badge role-branch" style={{ background: "var(--sidebar-bg)", color: "var(--purple-dark)", padding: "2px 8px" }}>
                                            {itm.category}
                                          </span>
                                        </td>
                                        <td style={{ padding: "10px 16px", fontSize: "12px", fontWeight: "700", color: "var(--text-main)", textAlign: "right" }}>
                                          {itm.qty} {itm.unit}(s)
                                        </td>
                                        <td style={{ padding: "10px 16px", fontSize: "12px", fontWeight: "700", color: "var(--green)", textAlign: "right" }}>
                                          ${itm.lastPrice.toFixed(2)}
                                        </td>
                                        <td style={{ padding: "10px 16px", fontSize: "12px", color: "var(--text-muted)" }}>{itm.lastDate}</td>
                                        <td className="mono" style={{ padding: "10px 16px", fontSize: "11px", fontWeight: "600", color: "var(--purple-dark)" }}>{itm.purchaseNo}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal overlays matching standard style */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: "650px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? "Edit Supplier Details" : "Create New Supplier"}
              </h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <i className="ti ti-x"></i>
              </button>
            </div>

            <form onSubmit={handleSave}>
              {formError && (
                <div style={{ color: "var(--red)", fontSize: "12px", marginBottom: "14px", fontWeight: "600" }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: "16px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Supplier Code</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={formData.code || "Auto-assigned"}
                    readOnly
                    style={{ cursor: "not-allowed", opacity: 0.8 }}
                  />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Supplier Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </div>

              {/* Supplied Items Inline Catalog Setup */}
              <div
                style={{
                  background: "var(--sidebar-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "20px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)" }}>Supplied Items Catalog</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--purple-mid)",
                      fontWeight: "700",
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    + Add Item Row
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
                  {formData.items.length === 0 && (
                    <div style={{ fontSize: "11px", color: "var(--text-soft)", fontStyle: "italic", textAlign: "center", padding: "12px" }}>
                      No items cataloged. Click "+ Add Item Row".
                    </div>
                  )}
                  {formData.items.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-input mono"
                        value={item.code || "Auto"}
                        readOnly
                        style={{ width: "15%", marginBottom: 0, cursor: "not-allowed", opacity: 0.8, textAlign: "center" }}
                      />
                      <input
                        type="text"
                        placeholder="Item Name"
                        className="form-input"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                        style={{ flex: 2, marginBottom: 0 }}
                        required
                      />
                      <select
                        className="form-input"
                        value={item.category_id || ""}
                        onChange={(e) => handleItemChange(idx, "category_id", e.target.value)}
                        style={{ width: "25%", marginBottom: 0, height: "38px", background: "var(--bg-white)", border: "1px solid var(--border)" }}
                        required
                      >
                        <option value="">-- Category --</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        className="form-input mono"
                        value={item.price || ""}
                        onChange={(e) => {
                          e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
                          handleItemChange(idx, "price", e.target.value);
                        }}
                        style={{ width: "15%", marginBottom: 0 }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--red)",
                          cursor: "pointer",
                          padding: "6px"
                        }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 14 }}></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingId ? "Save Changes" : "Create Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
