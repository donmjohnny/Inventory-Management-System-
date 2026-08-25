import { useState, useEffect } from "react";

export default function Branches({ triggerToast, setNotifications, initialSearch = "" }) {
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    location: "",
    contact: "",
    manager_name: "",
    manager_email: "",
    manager_phone: ""
  });

  const strBackendUrl = "http://127.0.0.1:8000";

  const initialMockBranches = [];

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${strBackendUrl}/api/branches/`);
      if (!res.ok) throw new Error("Failed to fetch branches");
      const data = await res.json();
      setBranches(data);
      localStorage.setItem("stockflow_branches", JSON.stringify(data));
    } catch (err) {
      console.warn("Backend branches API offline, falling back to local storage.", err);
      const saved = localStorage.getItem("stockflow_branches");
      if (saved) {
        setBranches(JSON.parse(saved));
      } else {
        setBranches(initialMockBranches);
        localStorage.setItem("stockflow_branches", JSON.stringify(initialMockBranches));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleAddNew = () => {
    setEditingId(null);
    setFormError("");
    setFormData({
      code: "",
      name: "",
      location: "",
      contact: "",
      manager_name: "",
      manager_email: "",
      manager_phone: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (branch) => {
    setEditingId(branch.id);
    setFormError("");
    setFormData({
      code: branch.code || "",
      name: branch.name || "",
      location: branch.location || "",
      contact: branch.contact || "",
      manager_name: branch.manager_name || "",
      manager_email: branch.manager_email || "",
      manager_phone: branch.manager_phone || ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!formData.name.trim() || !formData.location.trim() || !formData.contact.trim()) {
      setFormError("All fields (Name, Location, and Contact) are required.");
      return;
    }

    // Assign dynamic code if not specified or empty (offline fallback)
    let finalCode = formData.code ? formData.code.trim() : "";
    if (!finalCode) {
      const nextId = branches.length > 0 ? Math.max(...branches.map((b) => b.id)) + 1 : 1;
      finalCode = `BR-${String(nextId).padStart(3, "0")}`;
    }

    const payload = {
      code: finalCode,
      name: formData.name.trim(),
      location: formData.location.trim(),
      contact: formData.contact.trim(),
      manager_name: (formData.manager_name || "").trim(),
      manager_email: (formData.manager_email || "").trim(),
      manager_phone: (formData.manager_phone || "").trim()
    };

    try {
      let res;
      if (editingId !== null) {
        res = await fetch(`${strBackendUrl}/api/update-branch/${editingId}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${strBackendUrl}/api/add-branch/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error("Failed to save branch");
      triggerToast(`Branch "${payload.name}" saved successfully!`, "success");
      setIsModalOpen(false);
      fetchBranches();
    } catch (err) {
      console.warn("Backend offline. Simulating branch save locally.", err);

      let updatedBranches;
      if (editingId !== null) {
        updatedBranches = branches.map((b) =>
          b.id === editingId ? { ...b, ...payload } : b
        );
      } else {
        const newId = branches.length > 0 ? Math.max(...branches.map((b) => b.id)) + 1 : 1;
        updatedBranches = [...branches, { id: newId, ...payload }];
      }

      setBranches(updatedBranches);
      localStorage.setItem("stockflow_branches", JSON.stringify(updatedBranches));
      triggerToast(`Branch "${payload.name}" saved locally (Offline mode)!`, "success");

      if (setNotifications) {
        setNotifications((prev) => [
          {
            intId: Date.now(),
            strType: "settings_changed",
            strText: `Branch "${payload.name}" saved locally`,
            strTime: "Just now"
          },
          ...prev
        ]);
      }

      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id, bName) => {
    const confirmDelete = window.confirm(`Are you sure you want to remove branch "${bName}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${strBackendUrl}/api/delete-branch/${id}/`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete branch");
      triggerToast(`Branch "${bName}" removed successfully!`, "warning");
      fetchBranches();
    } catch (err) {
      console.warn("Backend offline. Simulating branch deletion locally.", err);
      const updatedBranches = branches.filter((b) => b.id !== id);
      setBranches(updatedBranches);
      localStorage.setItem("stockflow_branches", JSON.stringify(updatedBranches));
      triggerToast(`Branch "${bName}" deleted locally (Offline mode)!`, "warning");

      if (setNotifications) {
        setNotifications((prev) => [
          {
            intId: Date.now(),
            strType: "status_updated",
            strText: `Branch "${bName}" deleted locally`,
            strTime: "Just now"
          },
          ...prev
        ]);
      }
    }
  };

  const filteredBranches = branches.filter((b) =>
    (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.code || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.location || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="branches-page" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div style={{ fontSize: "12px", color: "var(--text-soft)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.02em" }}>
        Overview / Branches
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Branch Directory</div>
          <div className="page-sub">Manage your organization's branch locations, physical addresses, and contact numbers.</div>
        </div>

        <div className="header-actions">
          <button className="btn-add" onClick={handleAddNew}>
            <i className="ti ti-plus" style={{ fontSize: 15 }}></i>Add Branch
          </button>
        </div>
      </div>

      {/* Main Table Box */}
      <div className="table-wrap" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)" }}>
              Active Branches
            </h3>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
              Lists all system branch storefronts and warehouses.
            </p>
          </div>

          <div className="search-users" style={{ margin: 0, width: "240px" }}>
            <i className="ti ti-search" style={{ fontSize: 13, color: "var(--text-soft)" }}></i>
            <input
              type="text"
              placeholder="Search branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "100px", paddingLeft: "14px" }}>Branch ID</th>
              <th style={{ width: "150px" }}>Branch Code</th>
              <th>Branch Name</th>
              <th>Location</th>
              <th>Branch Contact</th>
              <th>Manager Name</th>
              <th>Manager Contact</th>
              <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBranches.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--text-soft)", fontWeight: 500 }}>
                  {loading ? "Loading branches..." : "No branches found"}
                </td>
              </tr>
            ) : (
              filteredBranches.map((branch) => {
                return (
                  <tr key={branch.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}>
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
                        #{branch.id}
                      </span>
                    </td>
                    <td style={{ fontWeight: "700", color: "var(--text-main)" }}>
                      {branch.code}
                    </td>
                    <td style={{ fontWeight: "600", color: "var(--text-main)" }}>
                      {branch.name}
                    </td>
                    <td style={{ fontWeight: "500", color: "var(--text-main)" }}>
                      {branch.location}
                    </td>
                    <td style={{ fontWeight: "500", color: "var(--text-main)" }}>
                      {branch.contact}
                    </td>
                    <td style={{ fontWeight: "600", color: "var(--text-main)" }}>
                      {branch.manager_name || "N/A"}
                    </td>
                    <td style={{ fontWeight: "500", color: "var(--text-soft)", fontSize: "13px" }}>
                      {branch.manager_email && <div>{branch.manager_email}</div>}
                      {branch.manager_phone && <div>{branch.manager_phone}</div>}
                      {!branch.manager_email && !branch.manager_phone && "N/A"}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => handleEdit(branch)}
                          title="Edit Branch"
                          style={{ color: "var(--purple-mid)" }}
                        >
                          <i className="ti ti-pencil" style={{ fontSize: 16 }}></i>
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => handleDelete(branch.id, branch.name)}
                          title="Delete Branch"
                          style={{ color: "var(--red)" }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 16 }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? "Edit Branch Details" : "Create New Branch"}
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

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Branch Code</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={formData.code || "Auto-assigned"}
                    readOnly
                    style={{ cursor: "not-allowed", opacity: 0.8 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Branch Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Details *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="e.g. 9876543210"
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Manager Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Manager Mobile (Phone)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.manager_phone}
                    onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Manager Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.manager_email}
                  onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                  placeholder="e.g. manager@company.com"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: "20px" }}>
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingId ? "Save Changes" : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
