import { useState, useEffect, Fragment } from "react";
import { arrInventoryItems } from "./mockData";

export default function Categories({ triggerToast, setNotifications, initialSearch = "" }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize expanded categories state
  const [expandedCategoryIds, setExpandedCategoryIds] = useState([]);

  const [inventoryItems, setInventoryItems] = useState([]);

  const strBackendUrl = "http://127.0.0.1:8000";

  // Initial mock categories for fallback/offline mode
  const initialMockCategories = [
    { id: 1, name: "Office Supplies", description: "Paper, pens, staplers, and daily office essentials." },
    { id: 2, name: "Printer Essentials", description: "Toners, cartridges, and replacement printer items." },
    { id: 3, name: "Electronics", description: "Monitors, keyboards, mouse, and power supplies." },
    { id: 4, name: "Furniture", description: "Office chairs, tables, and cabinets." }
  ];

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${strBackendUrl}/api/categories/`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
      // Keep localStorage in sync with server data
      localStorage.setItem("stockflow_categories", JSON.stringify(data));
    } catch (err) {
      console.warn("Backend categories API offline, falling back to local storage.", err);
      const saved = localStorage.getItem("stockflow_categories");
      if (saved) {
        setCategories(JSON.parse(saved));
      } else {
        setCategories(initialMockCategories);
        localStorage.setItem("stockflow_categories", JSON.stringify(initialMockCategories));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch(`${strBackendUrl}/api/items/`);
      if (!res.ok) throw new Error("Failed to fetch items");
      const data = await res.json();
      
      const mapped = data.map(item => ({
        strId: `item-${item.id}`,
        strCode: item.code,
        strName: item.name,
        strDescription: item.description,
        strUnit: item.unit,
        intOnHand: item.current_stock,
        floaPrice: parseFloat(item.price) || 0.0,
        intCategoryId: item.category ? item.category.id : null,
        strColor: item.color || '#e0e7ff',
        strTextColor: item.text_color || '#4f46e5',
        strIcon: item.icon || 'file-text'
      }));
      setInventoryItems(mapped);
      localStorage.setItem("stockflow_items_list", JSON.stringify(mapped));
    } catch (err) {
      console.warn("Backend items API offline, falling back to local storage.", err);
      const saved = localStorage.getItem("stockflow_items_list");
      if (saved) {
        setInventoryItems(JSON.parse(saved));
      } else {
        const mappedFallback = arrInventoryItems.map(item => {
          let intCategoryId = 1;
          if (item.strId === "item-3") {
            intCategoryId = 2;
          }
          return { ...item, intCategoryId };
        });
        setInventoryItems(mappedFallback);
        localStorage.setItem("stockflow_items_list", JSON.stringify(mappedFallback));
      }
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  const toggleExpandCategory = (categoryId) => {
    setExpandedCategoryIds(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  const openAddModal = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingId(category.id);
    setName(category.name);
    setDescription(category.description || "");
    setShowModal(true);
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerToast("Category name is required", "error");
      return;
    }

    const newCategoryData = {
      name: name.trim(),
      description: description.trim()
    };

    try {
      const res = await fetch(`${strBackendUrl}/api/add-category/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newCategoryData)
      });

      if (!res.ok) throw new Error("Failed to add category");
      
      triggerToast(`Category "${name.trim()}" added successfully!`, "success");
      
      setShowModal(false);
      setName("");
      setDescription("");
      fetchCategories();
    } catch (err) {
      console.warn("Backend offline. Simulating category addition locally.", err);
      
      const newLocalCategory = {
        id: categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1,
        name: name.trim(),
        description: description.trim()
      };

      const updatedCategories = [newLocalCategory, ...categories];
      setCategories(updatedCategories);
      localStorage.setItem("stockflow_categories", JSON.stringify(updatedCategories));
      triggerToast(`Category "${name.trim()}" added locally (Offline mode)!`, "success");
      
      if (setNotifications) {
        setNotifications(prev => [
          {
            intId: Date.now(),
            strType: "settings_changed",
            strText: `New category "${name.trim()}" added locally`,
            strTime: "Just now"
          },
          ...prev
        ]);
      }

      setShowModal(false);
      setName("");
      setDescription("");
    }
  };

  const updateCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerToast("Category name is required", "error");
      return;
    }

    const updatedData = {
      name: name.trim(),
      description: description.trim()
    };

    try {
      const res = await fetch(`${strBackendUrl}/api/update-category/${editingId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedData)
      });

      if (!res.ok) throw new Error("Failed to update category");

      triggerToast(`Category "${name.trim()}" updated successfully!`, "success");
      setShowModal(false);
      setEditingId(null);
      setName("");
      setDescription("");
      fetchCategories();
    } catch (err) {
      console.warn("Backend offline. Simulating category update locally.", err);

      const updatedCategories = categories.map(c =>
        c.id === editingId
          ? { ...c, name: name.trim(), description: description.trim() }
          : c
      );
      setCategories(updatedCategories);
      localStorage.setItem("stockflow_categories", JSON.stringify(updatedCategories));

      triggerToast(`Category "${name.trim()}" updated locally (Offline mode)!`, "success");
      setShowModal(false);
      setEditingId(null);
      setName("");
      setDescription("");
    }
  };

  const deleteCategory = async (id, catName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the category "${catName}"?`
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(`${strBackendUrl}/api/delete-category/${id}/`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to delete category");

      triggerToast(`Category "${catName}" deleted successfully!`, "warning");
      fetchCategories();
    } catch (err) {
      console.warn("Backend offline. Simulating category deletion locally.", err);

      const updatedCategories = categories.filter(c => c.id !== id);
      setCategories(updatedCategories);
      localStorage.setItem("stockflow_categories", JSON.stringify(updatedCategories));
      triggerToast(`Category "${catName}" deleted locally (Offline mode)!`, "warning");

      if (setNotifications) {
        setNotifications(prev => [
          {
            intId: Date.now(),
            strType: "status_updated",
            strText: `Category "${catName}" deleted locally`,
            strTime: "Just now"
          },
          ...prev
        ]);
      }
    }
  };

  return (
    <div className="categories-page" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div style={{ fontSize: "12px", color: "var(--text-soft)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.02em" }}>
        Overview / Categories
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Category Management</div>
          <div className="page-sub">Create, edit, and search product categories for inventory classification.</div>
        </div>
        
        <div className="header-actions">
          <button className="btn-add" onClick={openAddModal}>
            <i className="ti ti-plus" style={{ fontSize: 15 }}></i>Add Category
          </button>
        </div>
      </div>

      {/* FULL WIDTH TABLE CARD */}
      <div className="table-wrap" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)" }}>
              Inventory Categories
            </h3>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
              Total classifications available. Click the chevron to view inner items.
            </p>
          </div>
          
          {/* Search Input Box */}
          <div className="search-users" style={{ margin: 0, width: "240px" }}>
            <i className="ti ti-search" style={{ fontSize: 13, color: "var(--text-soft)" }}></i>
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "60px", textAlign: "center" }}>View</th>
              <th style={{ width: "80px" }}>ID</th>
              <th style={{ width: "220px" }}>Name</th>
              <th>Description</th>
              <th style={{ width: "150px", textAlign: "center" }}>Total Items</th>
              <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--text-soft)", fontWeight: 500 }}>
                  {loading ? "Loading categories..." : "No categories yet"}
                </td>
              </tr>
            ) : (
              categories
                .filter((category) =>
                  (category.name || "")
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                  (category.description || "")
                    .toLowerCase()
                    .includes(search.toLowerCase())
                )
                .map((category, index) => {
                  const categoryItems = inventoryItems.filter(item => item.intCategoryId === category.id);
                  const isExpanded = expandedCategoryIds.includes(category.id);

                  return (
                    <Fragment key={category.id}>
                      {/* Main Category Row */}
                      <tr 
                        onClick={() => toggleExpandCategory(category.id)}
                        style={{ 
                          cursor: "pointer",
                          borderBottom: isExpanded ? "none" : "1px solid var(--border)",
                          background: isExpanded ? "var(--row-hover)" : "transparent",
                          transition: "background 0.2s"
                        }}
                      >
                        <td style={{ textAlign: "center", padding: "14px 12px" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandCategory(category.id);
                            }}
                            style={{ 
                              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "all 0.2s ease",
                              margin: "0 auto",
                              padding: "0",
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              border: "none",
                              background: isExpanded ? "var(--purple-mid)" : "rgba(124, 58, 237, 0.08)",
                              color: isExpanded ? "#fff" : "var(--purple-mid)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              boxShadow: "0 2px 4px rgba(124, 58, 237, 0.1)",
                            }}
                            className="expand-trigger-btn"
                            title={isExpanded ? "Collapse items list" : "Expand to view stock items"}
                          >
                            <i className="ti ti-chevron-right" style={{ fontSize: 14, fontWeight: "bold" }}></i>
                          </button>
                        </td>
                        <td style={{ fontWeight: "600", color: "var(--text-muted)" }}>#{category.id}</td>
                        <td style={{ fontWeight: "600", color: "var(--text-main)" }}>
                          {category.name}
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "12px", whiteSpace: "normal", wordBreak: "break-word" }}>
                          {category.description || <span style={{ fontStyle: "italic", color: "var(--text-soft)" }}>No description provided</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span 
                            className="role-badge role-branch" 
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
                            {categoryItems.length} {categoryItems.length === 1 ? "item" : "items"}
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button 
                              type="button"
                              className="action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(category);
                              }}
                              title="Edit Category"
                              style={{ color: "var(--purple-mid)" }}
                            >
                              <i className="ti ti-pencil" style={{ fontSize: 16 }}></i>
                            </button>
                            <button 
                              type="button"
                              className="action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCategory(category.id, category.name);
                              }}
                              title="Delete Category"
                              style={{ color: "var(--red)" }}
                            >
                              <i className="ti ti-trash" style={{ fontSize: 16 }}></i>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Nested Items Table Row */}
                      {isExpanded && (
                        <tr style={{ background: "var(--bg-page)", borderBottom: "1px solid var(--border)" }}>
                          <td></td>
                          <td colSpan="5" style={{ padding: "10px 24px 20px 0" }}>
                            <div style={{
                              borderLeft: "3px solid var(--purple-mid)",
                              paddingLeft: "16px",
                              animation: "fadeInDown 0.2s ease-out"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                <h4 style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-main)" }}>
                                  Stock Items in "{category.name}"
                                </h4>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--purple-mid)" }}>
                                  Total Value: ${categoryItems.reduce((acc, item) => acc + (item.intOnHand * item.floaPrice), 0).toFixed(2)}
                                </span>
                              </div>

                              {categoryItems.length === 0 ? (
                                <div style={{ 
                                  padding: "14px 16px", 
                                  background: "var(--bg-white)", 
                                  border: "1px solid var(--border)", 
                                  borderRadius: "10px", 
                                  color: "var(--text-soft)",
                                  fontSize: "12px",
                                  fontStyle: "italic"
                                }}>
                                  No items currently cataloged in this category.
                                </div>
                              ) : (
                                <div className="table-wrap" style={{ borderRadius: "10px", overflow: "hidden", background: "var(--bg-white)", border: "1px solid var(--border)" }}>
                                  <table style={{ width: "100%", fontSize: "12px" }}>
                                    <thead>
                                      <tr style={{ background: "var(--sidebar-bg)", borderBottom: "1px solid var(--border)" }}>
                                        <th style={{ padding: "10px 12px", fontSize: "9px", width: "110px" }}>Item Code</th>
                                        <th style={{ padding: "10px 12px", fontSize: "9px", width: "200px" }}>Product Name</th>
                                        <th style={{ padding: "10px 12px", fontSize: "9px" }}>Description</th>
                                        <th style={{ padding: "10px 12px", fontSize: "9px", textAlign: "center", width: "110px" }}>Stock</th>
                                        <th style={{ padding: "10px 12px", fontSize: "9px", textAlign: "right", width: "110px" }}>Price</th>
                                        <th style={{ padding: "10px 12px", fontSize: "9px", textAlign: "right", width: "120px" }}>Total Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {categoryItems.map(item => (
                                        <tr key={item.strId} style={{ borderBottom: "1px solid var(--border)", transition: "none" }}>
                                          <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: "600", color: "var(--text-muted)" }}>
                                            {item.strCode}
                                          </td>
                                          <td style={{ padding: "10px 12px", fontWeight: "600", color: "var(--text-main)" }}>
                                            {item.strName}
                                          </td>
                                          <td style={{ padding: "10px 12px", color: "var(--text-soft)", fontSize: "11px" }}>
                                            {item.strDescription}
                                          </td>
                                          <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: "600", color: item.intOnHand === 0 ? "var(--red)" : "var(--text-main)" }}>
                                            {item.intOnHand} {item.strUnit}(s)
                                          </td>
                                          <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-muted)" }}>
                                            ${item.floaPrice.toFixed(2)}
                                          </td>
                                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "var(--text-main)" }}>
                                            ${(item.intOnHand * item.floaPrice).toFixed(2)}
                                          </td>
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

      {/* MODAL OVERLAY FOR ADD / EDIT */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? "Edit Category Details" : "Create New Category"}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="ti ti-x"></i>
              </button>
            </div>
            
            <form onSubmit={editingId ? updateCategory : addCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Office Supplies"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "24px" }}>
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of items..."
                  style={{ minHeight: "100px", fontFamily: "inherit", resize: "vertical" }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingId ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
