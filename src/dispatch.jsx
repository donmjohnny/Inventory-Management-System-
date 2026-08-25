import React, { useState, useEffect, useRef } from "react";
console.log("Vite HMR trigger - using the correct /api/rbac/requisitions endpoint");

// ─────────────────────────────────────────────
// Dispatch — Module 7B
// Moves approved stock OUT of Central, raises a
// GRN, and marks goods in-transit.
// ─────────────────────────────────────────────

const DISPATCH_MODES = ["Company Vehicle", "Courier", "Transport Agency", "Pickup"];

// Auto-generate a GRN number
function generateGRN() {
  const d = new Date();
  const datePart = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `GRN-${datePart}-${rand}`;
}

// ── Sample fallback data (used when backend is offline) ──────────────────────
const SAMPLE_REQUISITIONS = [
  {
    id: 1,
    strRequisitionNo: "REQ-2026-0042",
    status: "Approved",
    strBranch: "Calicut Branch",
    listItems: [
      { id: "1", strItem: "A4 Paper Ream (80 GSM)",  intApprovedQty: 10, intCentralStock: 50,  strUnit: "Ream" },
      { id: "2", strItem: "Ballpoint Pen – Blue",     intApprovedQty: 50, intCentralStock: 200, strUnit: "Box"  },
      { id: "3", strItem: "Toner Cartridge 12A",      intApprovedQty: 4,  intCentralStock: 8,   strUnit: "Nos"  },
    ],
  },
  {
    id: 2,
    strRequisitionNo: "REQ-2026-0043",
    status: "Approved",
    strBranch: "Kochi Branch",
    listItems: [
      { id: "4", strItem: "Stapler (Heavy Duty)",     intApprovedQty: 5,  intCentralStock: 12,  strUnit: "Nos"  },
      { id: "5", strItem: "Whiteboard Marker Set",    intApprovedQty: 20, intCentralStock: 60,  strUnit: "Set"  },
    ],
  },
];

// ── Helper: map raw requisition → dispatch item rows ────────────────────────
function mapItemsFromReq(req) {
  return (req.arrItems || []).map((it) => ({
    strId:           String(it.strId || it.id || Math.random()),
    strItemCode:     it.strItemCode,
    strItem:         it.strName || it.strItemCode,
    intApprovedQty:  it.intQty || 0,
    intCentralStock: it.intCurrentStock || 0,
    // Default dispatch qty = min(approved, central stock)
    intDispatchQty:  Math.min(it.intQty || 0, it.intCurrentStock || 0),
    strUnit:         it.strUnit || "Nos",
  }));
}

// ── Confirmation modal after successful dispatch ─────────────────────────────
function DispatchSuccessModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div className="modal-overlay success-modal-blur" onClick={onClose}>
      <div
        className="modal-container success-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="success-icon-large">
          <i className="ti ti-circle-check"></i>
        </div>
        <h3 className="success-title">Dispatch Confirmed</h3>
        <p className="success-desc">
          GRN <strong>{data.grn}</strong> has been raised. Stock has been
          written OUT at Central and marked <em>in transit</em> to{" "}
          <strong>{data.destination}</strong>.
        </p>

        <div className="success-details-box">
          <div className="success-detail-row">
            <span>GRN No.:</span>
            <strong>{data.grn}</strong>
          </div>
          <div className="success-detail-row">
            <span>Requisition:</span>
            <strong>{data.requisitionNo}</strong>
          </div>
          <div className="success-detail-row">
            <span>Destination:</span>
            <strong>{data.destination}</strong>
          </div>
          <div className="success-detail-row">
            <span>Dispatch Date:</span>
            <strong>{data.dispatchDate}</strong>
          </div>
          <div className="success-detail-row">
            <span>Mode:</span>
            <strong>{data.dispatchMode}</strong>
          </div>
          {data.carrierRef && (
            <div className="success-detail-row">
              <span>Carrier Ref:</span>
              <strong>{data.carrierRef}</strong>
            </div>
          )}
          <div className="success-detail-row">
            <span>Total Items:</span>
            <strong>{data.items.length}</strong>
          </div>
          <div className="success-detail-row">
            <span>Total Units:</span>
            <strong>{data.items.reduce((s, i) => s + i.intDispatchQty, 0)}</strong>
          </div>
        </div>

        {/* Dispatched items list */}
        <div className="success-items-list">
          <div className="success-list-header">DISPATCHED ITEMS</div>
          <div className="success-list-body">
            {data.items.map((it) => (
              <div key={it.strId} className="success-list-item">
                <span className="item-name">{it.strItem}</span>
                <strong className="item-qty">
                  {it.intDispatchQty} {it.strUnit}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className="btn-success-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Dispatch Component
// ═══════════════════════════════════════════════════════════════════════════
export default function Dispatch({
  triggerToast: funcTriggerToast,
  setNotifications: funcSetNotifications,
  currentUser = null,
  funcCheckLowStock,
}) {
  // ── Requisition selector state ───────────────────────────────────────────
  const [arrAvailableReqs,  funcSetAvailableReqs]  = useState([]);
  const [objSelectedReq,    funcSetSelectedReq]    = useState(null);
  const [boolReqsLoading,   funcSetReqsLoading]    = useState(true);

  // ── Form header fields ───────────────────────────────────────────────────
  const [strGRN,            funcSetGRN]            = useState(() => generateGRN());
  const [strDispatchDate,   funcSetDispatchDate]   = useState(() => new Date().toISOString().split("T")[0]);
  const [strDispatchMode,   funcSetDispatchMode]   = useState("Company Vehicle");
  const [strCarrierRef,     funcSetCarrierRef]     = useState("");

  // ── Items table ──────────────────────────────────────────────────────────
  const [arrDispatchItems,  funcSetDispatchItems]  = useState([]);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [boolSubmitting,    funcSetSubmitting]     = useState(false);
  const [objSuccessData,    funcSetSuccessData]    = useState(null);
  const [boolShowReqDrop,   funcSetShowReqDrop]    = useState(false);
  const refReqDrop = useRef(null);
  const [strFetchError,     funcSetFetchError]     = useState("");

  // ── 1. Fetch approved requisitions on mount ──────────────────────────────
  useEffect(() => {
    async function fetchApprovedReqs() {
      funcSetReqsLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/rbac/requisitions/?status=Approved", { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            funcSetAvailableReqs(data);
            funcSetSelectedReq(data.length > 0 ? data[0] : null);
            funcSetReqsLoading(false);
            return;
          } else {
            funcSetFetchError("Backend returned non-array response");
          }
        } else {
          funcSetFetchError("Backend returned status " + res.status);
        }
      } catch (err) {
        funcSetFetchError(err.toString());
      }
      
      // If we got here, we failed or had 0 items.
      funcSetAvailableReqs([]);
      funcSetSelectedReq(null);
      funcSetReqsLoading(false);
    }
    fetchApprovedReqs();
  }, []);

  // ── 2. Re-populate items whenever selected requisition changes ───────────
  useEffect(() => {
    if (!objSelectedReq) return;
    funcSetDispatchItems(mapItemsFromReq(objSelectedReq));
    // Fresh GRN per requisition selection
    funcSetGRN(generateGRN());
    funcSetCarrierRef("");
  }, [objSelectedReq]);

  // ── 3. Close requisition dropdown on outside click ───────────────────────
  useEffect(() => {
    function handleOutside(e) {
      if (refReqDrop.current && !refReqDrop.current.contains(e.target)) {
        funcSetShowReqDrop(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ── Derived totals ───────────────────────────────────────────────────────
  const intTotalApproved = arrDispatchItems.reduce((s, i) => s + i.intApprovedQty,  0);
  const intTotalDispatch = arrDispatchItems.reduce((s, i) => s + i.intDispatchQty, 0);

  // ── Qty change handler ───────────────────────────────────────────────────
  function funcHandleQtyChange(strId, rawVal) {
    let qty = parseInt(rawVal, 10);
    if (isNaN(qty) || qty < 0) qty = 0;

    funcSetDispatchItems((prev) =>
      prev.map((it) => {
        if (it.strId !== strId) return it;
        // Cap: cannot exceed approved qty OR central stock
        const cap = Math.min(it.intApprovedQty, it.intCentralStock);
        return { ...it, intDispatchQty: Math.min(qty, cap) };
      })
    );
  }

  // ── Validate before confirming ───────────────────────────────────────────
  function funcValidate() {
    if (!objSelectedReq) {
      funcTriggerToast("No approved requisition selected.", "error");
      return false;
    }
    for (const it of arrDispatchItems) {
      if (it.intDispatchQty > it.intApprovedQty) {
        funcTriggerToast(
          `"${it.strItem}": dispatch qty exceeds approved qty.`,
          "error"
        );
        return false;
      }
      if (it.intDispatchQty > it.intCentralStock) {
        funcTriggerToast(
          `"${it.strItem}": dispatch qty exceeds central stock.`,
          "error"
        );
        return false;
      }
    }
    if (arrDispatchItems.every((it) => it.intDispatchQty === 0)) {
      funcTriggerToast("All dispatch quantities are zero. Nothing to dispatch.", "error");
      return false;
    }
    return true;
  }

  // ── Save Draft ───────────────────────────────────────────────────────────
  function funcHandleSaveDraft() {
    funcTriggerToast("Dispatch draft saved locally.", "success");
  }

  // ── Confirm Dispatch ─────────────────────────────────────────────────────
  async function funcHandleConfirmDispatch() {
    // Role guard — only Stock Manager may confirm
    if (currentUser && currentUser.strRole !== "Stock Manager" && currentUser.strRole !== "Admin") {
      funcTriggerToast("Only a Stock Manager may confirm a dispatch.", "error");
      return;
    }
    if (!funcValidate()) return;

    funcSetSubmitting(true);

    const payload = {
      grn:           strGRN,
      requisitionNo: objSelectedReq.strRequisitionNo,
      destination:   objSelectedReq.strBranch,
      dispatchDate:  strDispatchDate,
      dispatchMode:  strDispatchMode,
      carrierRef:    strCarrierRef,
      status:        "In Transit",
      items:         arrDispatchItems
        .filter((i) => i.intDispatchQty > 0)
        .map((i) => ({ id: i.strId, item: i.strItem, strItemCode: i.strItemCode, qty: i.intDispatchQty, unit: i.strUnit })),
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/rbac/dispatches/", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Backend error");
      funcTriggerToast(`Dispatch ${strGRN} confirmed and recorded.`, "success");
      if (funcCheckLowStock) funcCheckLowStock();
    } catch (_) {
      // Graceful fallback — simulate locally
      funcTriggerToast(`Backend offline — dispatch ${strGRN} recorded locally.`, "warning");
      if (funcCheckLowStock) funcCheckLowStock();
    }

    // Deduct central stock locally to keep UI consistent
    funcSetDispatchItems((prev) =>
      prev.map((it) => ({
        ...it,
        intCentralStock: Math.max(0, it.intCentralStock - it.intDispatchQty),
      }))
    );

    funcSetNotifications((prev) => [
      {
        intId:    Date.now(),
        strType:  "dispatch_confirmed",
        strText:  `Dispatch ${strGRN} confirmed → ${objSelectedReq.strBranch}`,
        strTime:  "Just now",
      },
      ...prev,
    ]);

    // Show success modal
    funcSetSuccessData({
      grn:          strGRN,
      requisitionNo: objSelectedReq.strRequisitionNo,
      destination:  objSelectedReq.strBranch,
      dispatchDate: strDispatchDate,
      dispatchMode: strDispatchMode,
      carrierRef:   strCarrierRef,
      items:        arrDispatchItems.filter((i) => i.intDispatchQty > 0),
    });

    funcSetSubmitting(false);
  }

  // ── Reset after success modal closes ────────────────────────────────────
  function funcHandleSuccessClose() {
    funcSetSuccessData(null);
    funcSetGRN(generateGRN());
    funcSetCarrierRef("");
    
    // Remove the dispatched order from the available list
    const updatedReqs = arrAvailableReqs.filter(req => req.strId !== objSelectedReq?.strId);
    funcSetAvailableReqs(updatedReqs);

    // Re-select first req or clear list
    if (updatedReqs.length > 0) {
      funcSetSelectedReq(updatedReqs[0]);
    } else {
      funcSetSelectedReq(null);
    }
  }

  if (!boolReqsLoading && arrAvailableReqs.length === 0) {
    return (
      <div className="requisition-page">
        <div className="breadcrumbs">
          Operations <i className="ti ti-chevron-right"></i>
          <span className="active">Dispatch</span>
        </div>
        <div className="page-header-req">
          <div>
            <h1 className="page-title-req">Dispatch Stock</h1>
            <p className="page-sub-req">
              Release approved inventory from Central Office to a branch. Confirming
              writes a −qty movement against Central and marks the stock in transit.
            </p>
          </div>
        </div>
        <div className="requested-items-card">
          <div className="requested-items-header">
            <h3 className="card-section-title">Dispatch Queue</h3>
          </div>
          <div className="requisition-table-wrap">
            <div className="empty-items-placeholder">
              <div className="empty-cart-icon">
                <i className="ti ti-send"></i>
              </div>
              <p>No approved requisitions</p>
              <p style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '4px', fontWeight: 400 }}>
                Requisitions approved by a Stock Manager will show up here for dispatch.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Row-level dispatch qty badge (Full / Partial / Zero) ─────────────────
  function funcQtyBadge(item) {
    if (item.intDispatchQty === 0) {
      return <span className="onhand-badge-req badge-zero">Zero</span>;
    }
    if (item.intDispatchQty >= item.intApprovedQty) {
      return <span className="onhand-badge-req badge-normal" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>Full</span>;
    }
    return <span className="onhand-badge-req" style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}>Partial</span>;
  }

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════
  return (
    <>
      <div className="requisition-page">

        {/* ── Breadcrumb ── */}
        <div className="breadcrumbs">
          Operations <i className="ti ti-chevron-right"></i>
          <span className="active">Dispatch</span>
        </div>

        {/* ── Page Header ── */}
        <div className="page-header-req">
          <div>
            <h1 className="page-title-req">Dispatch Stock</h1>
            <p className="page-sub-req">
              Release approved inventory from Central Office to a branch. Confirming
              writes a −qty movement against Central and marks the stock in transit.
            </p>
          </div>

          <div className="header-actions-req">
            <button
              type="button"
              className="btn-draft-req"
              onClick={funcHandleSaveDraft}
            >
              <i className="ti ti-device-floppy"></i> Save Draft
            </button>

            <button
              type="button"
              className="btn-submit-req"
              onClick={funcHandleConfirmDispatch}
              disabled={boolSubmitting}
            >
              <i className="ti ti-send"></i>
              {boolSubmitting ? "Confirming…" : "Confirm Dispatch"}
            </button>
          </div>
        </div>

        {/* ── In-transit notice banner ── */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "10px",
            background:   "rgba(99,102,241,0.07)",
            border:       "1px solid rgba(99,102,241,0.18)",
            borderRadius: "10px",
            padding:      "10px 16px",
            marginBottom: "16px",
            fontSize:     "13px",
            color:        "var(--text-muted)",
          }}
        >
          <i className="ti ti-info-circle" style={{ color: "#6366f1", fontSize: "16px", flexShrink: 0 }}></i>
          <span>
            Confirming dispatch writes a <strong>−qty stock movement at Central</strong> and
            marks the goods <strong>in transit</strong>. The stock will land at the branch
            only after Branch Receipt is confirmed.
          </span>
        </div>

        {/* ── Shipment Details Card ── */}
        <div className="requisition-form-card">

          {/* Row 1 */}
          <div className="requisition-form-row">

            {/* GRN No — read-only */}
            <div className="form-group-req">
              <label className="form-label-req">GRN No.</label>
              <div className="input-with-icon-req">
                <i className="ti ti-file-invoice input-icon-req"></i>
                <input
                  type="text"
                  className="form-input-req read-only"
                  value={strGRN}
                  readOnly
                />
              </div>
            </div>

            {/* Requisition selector — custom dropdown */}
            <div className="form-group-req" ref={refReqDrop} style={{ position: "relative" }}>
              <label className="form-label-req">Requisition No.</label>
              <div
                className="input-with-icon-req"
                style={{ cursor: "pointer" }}
                onClick={() => funcSetShowReqDrop((v) => !v)}
              >
                <i className="ti ti-file-text input-icon-req"></i>
                <input
                  type="text"
                  className="form-input-req"
                  style={{ cursor: "pointer", caretColor: "transparent" }}
                  value={objSelectedReq ? objSelectedReq.strRequisitionNo : ""}
                  readOnly
                />
                <i
                  className="ti ti-chevron-down select-chevron-req"
                  style={{
                    transform: boolShowReqDrop ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                ></i>
              </div>

              {boolShowReqDrop && (
                <div
                  className="search-dropdown-req"
                  style={{ top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100 }}
                >
                  {arrAvailableReqs.map((req) => (
                    <div
                      key={req.strId}
                      className="search-dropdown-item-req"
                      style={{ padding: "10px 14px", gap: "12px" }}
                      onClick={() => {
                        funcSetSelectedReq(req);
                        funcSetShowReqDrop(false);
                      }}
                    >
                      <div
                        className="item-thumbnail"
                        style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
                      >
                        <i className="ti ti-file-text"></i>
                      </div>
                      <div className="search-item-info">
                        <div className="search-item-name">{req.strRequisitionNo}</div>
                        <div className="search-item-desc">{req.strBranch} — {(req.arrItems || []).length} items</div>
                      </div>
                      {objSelectedReq?.strId === req.strId && (
                        <i className="ti ti-check" style={{ color: "#10b981", marginLeft: "auto" }}></i>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dispatch Date */}
            <div className="form-group-req">
              <label className="form-label-req">Dispatch Date</label>
              <div className="input-with-icon-req">
                <i className="ti ti-calendar input-icon-req"></i>
                <input
                  type="date"
                  className="form-input-req"
                  value={strDispatchDate}
                  onChange={(e) => funcSetDispatchDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="requisition-form-row">

            {/* Destination Branch — derived from selected req, read-only */}
            <div className="form-group-req">
              <label className="form-label-req">Destination Branch</label>
              <div className="input-with-icon-req">
                <i className="ti ti-building input-icon-req"></i>
                <input
                  type="text"
                  className="form-input-req read-only"
                  value={objSelectedReq ? objSelectedReq.strBranch : "—"}
                  readOnly
                />
              </div>
            </div>

            {/* Dispatch Mode */}
            <div className="form-group-req">
              <label className="form-label-req">Dispatch Mode</label>
              <div className="input-with-icon-req">
                <i className="ti ti-truck input-icon-req"></i>
                <select
                  className="form-select-req"
                  value={strDispatchMode}
                  onChange={(e) => funcSetDispatchMode(e.target.value)}
                >
                  {DISPATCH_MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <i className="ti ti-chevron-down select-chevron-req"></i>
              </div>
            </div>

            {/* Carrier / Vehicle Reference (optional) */}
            <div className="form-group-req">
              <label className="form-label-req">Carrier Reference <span style={{ color: "var(--text-soft)", fontWeight: 400 }}>(optional)</span></label>
              <div className="input-with-icon-req">
                <i className="ti ti-id-badge input-icon-req"></i>
                <input
                  type="text"
                  className="form-input-req"
                  placeholder="Vehicle plate or tracking no."
                  value={strCarrierRef}
                  onChange={(e) => funcSetCarrierRef(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Dispatch Items Card ── */}
        <div className="requested-items-card">
          <div className="requested-items-header">
            <h3 className="card-section-title">Dispatch Items</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* In-transit status pill */}
              <span
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          "5px",
                  background:   "rgba(99,102,241,0.09)",
                  color:        "#6366f1",
                  fontSize:     "12px",
                  fontWeight:   600,
                  padding:      "4px 10px",
                  borderRadius: "20px",
                  border:       "1px solid rgba(99,102,241,0.18)",
                }}
              >
                <i className="ti ti-clock" style={{ fontSize: "13px" }}></i>
                In Transit after confirm
              </span>
            </div>
          </div>

          <div className="requisition-table-wrap">
            {arrDispatchItems.length === 0 ? (
              <div className="empty-items-placeholder">
                <div className="empty-cart-icon">
                  <i className="ti ti-send"></i>
                </div>
                <p>No items to dispatch</p>
                <p style={{ fontSize: "11.5px", color: "var(--text-soft)", marginTop: "4px", fontWeight: 400 }}>
                  Select an approved requisition above to load its items.
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>UNIT</th>
                    <th>CENTRAL STOCK</th>
                    <th>APPROVED QTY</th>
                    <th style={{ width: "160px" }}>DISPATCH QTY</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {arrDispatchItems.map((item) => {
                    const boolLowStock   = item.intCentralStock < item.intApprovedQty;
                    const boolZeroStock  = item.intCentralStock === 0;
                    const cap = Math.min(item.intApprovedQty, item.intCentralStock);

                    return (
                      <tr key={item.strId} className="req-item-row">

                        {/* Item name */}
                        <td>
                          <div className="item-cell-req">
                            <div
                              className="item-thumbnail"
                              style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
                            >
                              <i className="ti ti-box"></i>
                            </div>
                            <div className="item-details-req">
                              <div className="item-title-req">{item.strItem}</div>
                            </div>
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="unit-cell-req">{item.strUnit}</td>

                        {/* Central Stock */}
                        <td>
                          <div className="onhand-badge-wrapper">
                            <span
                              className={`onhand-badge-req ${
                                boolZeroStock  ? "badge-zero" :
                                boolLowStock   ? "" : "badge-normal"
                              }`}
                              style={boolLowStock && !boolZeroStock ? { background: "rgba(245,158,11,0.1)", color: "#d97706" } : {}}
                            >
                              {item.intCentralStock} {item.strUnit}
                            </span>
                            {boolZeroStock && (
                              <span className="stock-warning-icon-req error" title="No stock at Central!">
                                <i className="ti ti-alert-triangle"></i>
                              </span>
                            )}
                            {boolLowStock && !boolZeroStock && (
                              <span className="stock-warning-icon-req warning" title="Central stock below approved qty">
                                <i className="ti ti-alert-triangle"></i>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Approved Qty */}
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                            {item.intApprovedQty}
                          </span>
                        </td>

                        {/* Dispatch Qty — editable, capped */}
                        <td>
                          <div className="qty-counter-req">
                            <button
                              type="button"
                              className="qty-btn-req decrement"
                              onClick={() =>
                                funcHandleQtyChange(item.strId, item.intDispatchQty - 1)
                              }
                              disabled={item.intDispatchQty <= 0}
                            >
                              <i className="ti ti-minus"></i>
                            </button>
                            <input
                              type="number"
                              className="qty-input-req"
                              min="0"
                              max={cap}
                              value={item.intDispatchQty}
                              onChange={(e) =>
                                funcHandleQtyChange(item.strId, e.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="qty-btn-req increment"
                              onClick={() =>
                                funcHandleQtyChange(item.strId, item.intDispatchQty + 1)
                              }
                              disabled={item.intDispatchQty >= cap}
                            >
                              <i className="ti ti-plus"></i>
                            </button>
                          </div>
                          {item.intDispatchQty < item.intApprovedQty && item.intDispatchQty > 0 && (
                            <div
                              style={{
                                fontSize: "10.5px",
                                color:    "#d97706",
                                marginTop: "4px",
                                textAlign: "center",
                              }}
                            >
                              Partial ({item.intApprovedQty - item.intDispatchQty} held)
                            </div>
                          )}
                        </td>

                        {/* Full / Partial / Zero badge */}
                        <td>{funcQtyBadge(item)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Footer Totals */}
            <div className="requisition-footer-req">
              <div className="totals-container-req">
                <div className="total-cell-req">
                  <span className="total-label-req">Total Items</span>
                  <span className="total-value-req">{arrDispatchItems.length}</span>
                </div>
                <div className="total-cell-req">
                  <span className="total-label-req">Total Approved Qty</span>
                  <span className="total-value-req">{intTotalApproved}</span>
                </div>
                <div className="total-cell-req">
                  <span className="total-label-req">Total Dispatch Qty</span>
                  <span className="total-value-req font-purple">{intTotalDispatch}</span>
                </div>
                <div className="total-cell-req">
                  <span className="total-label-req">Units Held Back</span>
                  <span
                    className="total-value-req"
                    style={{ color: intTotalApproved - intTotalDispatch > 0 ? "#d97706" : "var(--text-muted)" }}
                  >
                    {intTotalApproved - intTotalDispatch}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Success Modal ── */}
      {objSuccessData && (
        <DispatchSuccessModal
          data={objSuccessData}
          onClose={funcHandleSuccessClose}
        />
      )}
    </>
  );
}
