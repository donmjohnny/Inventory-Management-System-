import React, { useState, useEffect } from 'react';
import { objApi } from './api';

const Approval = ({ triggerToast }) => {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalQuantities, setApprovalQuantities] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequisitions = async () => {
    try {
      const data = await objApi.funcGetRequisitions('Pending');
      setRequisitions(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const handleOpenRejectModal = (req) => {
    setSelectedRequisition(req);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setSelectedRequisition(null);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!selectedRequisition) return;
    if (!rejectReason.trim()) {
      triggerToast("Please provide a rejection reason", "warning");
      return;
    }
    try {
      await objApi.funcRejectRequisition(selectedRequisition.strId, rejectReason, "Stock Manager");
      triggerToast(`Requisition ${selectedRequisition.strRequisitionNo} Rejected`, "warning");
      handleCloseRejectModal();
      fetchRequisitions();
    } catch (err) {
      console.error(err);
      triggerToast("Failed to reject requisition", "error");
    }
  };

  const handleOpenApproveModal = (req) => {
    setSelectedRequisition(req);
    const initialQty = {};
    if (req.arrItems) {
      req.arrItems.forEach(item => {
        initialQty[item.strId] = Math.min(item.intQty, item.intCurrentStock);
      });
    }
    setApprovalQuantities(initialQty);
    setShowApproveModal(true);
  };

  const handleCloseApproveModal = () => {
    setShowApproveModal(false);
    setSelectedRequisition(null);
    setApprovalQuantities({});
  };

  const handleQtyChange = (itemId, val) => {
    const numericVal = parseInt(val, 10);
    setApprovalQuantities(prev => ({
      ...prev,
      [itemId]: isNaN(numericVal) ? 0 : numericVal
    }));
  };

  const handleConfirmApproval = async () => {
    if (!selectedRequisition) return;
    try {
      const arrItemsPayload = selectedRequisition.arrItems.map(item => ({
        strId: item.strId,
        intQty: approvalQuantities[item.strId]
      }));

      await objApi.funcApproveRequisition(selectedRequisition.strId, 'Stock Manager', arrItemsPayload);
      
      triggerToast(`Requisition ${selectedRequisition.strRequisitionNo} Approved`, "success");
      handleCloseApproveModal();
      fetchRequisitions();
    } catch (err) {
      console.error(err);
      triggerToast("Failed to approve requisition", "error");
    }
  };

  return (
    <div className="items-page" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div style={{ fontSize: "12px", color: "var(--text-soft)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.02em" }}>
        Workflow / Approval
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Approvals</div>
          <div className="page-sub">Review and manage pending branch requisitions.</div>
        </div>
      </div>

      <div className="table-wrap" style={{ padding: "0px", marginTop: "16px" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-soft)" }}>Loading requisitions...</div>
        ) : (
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: "24px" }}>Requisition No</th>
                <th>Branch</th>
                <th>Required By</th>
                <th>Status</th>
                <th>Total Items</th>
                <th style={{ textAlign: "right", paddingRight: "24px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--text-soft)", fontWeight: 500 }}>
                    No requisitions found.
                  </td>
                </tr>
              ) : (
                requisitions.map((req, i) => (
                  <tr key={req.strRequisitionNo} style={{ animationDelay: `${0.03 + i * 0.01}s` }}>
                    <td className="mono" style={{ paddingLeft: "24px", color: "var(--text-main)", fontWeight: "600" }}>{req.strRequisitionNo}</td>
                    <td style={{ fontWeight: 500 }}>{req.strBranch}</td>
                    <td style={{ color: "var(--text-soft)" }}>{req.strRequiredByDate}</td>
                    <td>
                      <span className={`status-dot ${req.strStatus === 'Pending' ? 'status-inactive' : req.strStatus === 'Approved' ? 'status-active' : ''}`} style={{ background: req.strStatus === 'Pending' ? '#fef3c7' : req.strStatus === 'Rejected' ? '#fee2e2' : undefined, color: req.strStatus === 'Pending' ? '#d97706' : req.strStatus === 'Rejected' ? '#dc2626' : undefined }}>
                        <span className={`dot ${req.strStatus === 'Pending' ? 'dot-inactive' : req.strStatus === 'Approved' ? 'dot-active' : ''}`} style={{ background: req.strStatus === 'Pending' ? '#d97706' : req.strStatus === 'Rejected' ? '#dc2626' : undefined }}></span>
                        {req.strStatus}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{req.arrItems ? req.arrItems.length : 0} items</td>
                    <td style={{ textAlign: "right", paddingRight: "24px" }}>
                      <div className="actions-cell">
                        {req.strStatus === 'Pending' && (
                          <>
                            <button 
                              className="action-btn" 
                              title="Review & Approve"
                              onClick={() => handleOpenApproveModal(req)}
                              style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}
                            >
                              <i className="ti ti-check"></i>
                            </button>
                            <button 
                              className="action-btn" 
                              title="Reject"
                              onClick={() => handleOpenRejectModal(req)}
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                            >
                              <i className="ti ti-x"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showApproveModal && selectedRequisition && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h2>✅ Review Requisition</h2>
                <p>Adjust approved quantities based on available stock</p>
              </div>
              <button className="modal-close" onClick={handleCloseApproveModal}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '24px' }}>
                <div><strong style={{ color: 'var(--text-soft)', fontSize: '12px' }}>REQ NO</strong><br/>{selectedRequisition.strRequisitionNo}</div>
                <div><strong style={{ color: 'var(--text-soft)', fontSize: '12px' }}>BRANCH</strong><br/>{selectedRequisition.strBranch}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-soft)' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '8px 0', color: 'var(--text-soft)' }}>Req Qty</th>
                    <th style={{ textAlign: 'center', padding: '8px 0', color: 'var(--text-soft)' }}>Stock Left</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--text-soft)' }}>Approved Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRequisition.arrItems && selectedRequisition.arrItems.map(item => (
                    <tr key={item.strId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 0' }}>
                        <div style={{ fontWeight: 500 }}>{item.strName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{item.strItemCode}</div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 0', fontWeight: 500 }}>
                        {item.intQty} {item.strUnit}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 0' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px', 
                          fontWeight: 600,
                          background: item.intCurrentStock < item.intQty ? '#fee2e2' : '#e0e7ff',
                          color: item.intCurrentStock < item.intQty ? '#dc2626' : '#4f46e5'
                        }}>
                          {item.intCurrentStock}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 0' }}>
                        <input 
                          type="number" 
                          min="0" 
                          max={Math.max(item.intCurrentStock, item.intQty)} 
                          className="form-input" 
                          style={{ width: '80px', display: 'inline-block', textAlign: 'center' }}
                          value={approvalQuantities[item.strId] !== undefined ? approvalQuantities[item.strId] : item.intQty}
                          onChange={(e) => handleQtyChange(item.strId, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn-secondary" onClick={handleCloseApproveModal}>Cancel</button>
              <button className="btn-primary" onClick={handleConfirmApproval}>Confirm & Approve</button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedRequisition && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h2>❌ Reject Requisition</h2>
                <p>Provide a reason for rejecting this requisition</p>
              </div>
              <button className="modal-close" onClick={handleCloseRejectModal}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '24px' }}>
                <div><strong style={{ color: 'var(--text-soft)', fontSize: '12px' }}>REQ NO</strong><br/>{selectedRequisition.strRequisitionNo}</div>
                <div><strong style={{ color: 'var(--text-soft)', fontSize: '12px' }}>BRANCH</strong><br/>{selectedRequisition.strBranch}</div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Reason for Rejection *</label>
                <textarea
                  className="form-input"
                  rows="4"
                  placeholder="E.g., Out of stock, Incorrect items requested..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn-secondary" onClick={handleCloseRejectModal}>Cancel</button>
              <button className="btn-primary" style={{ background: '#dc2626', color: '#fff', border: 'none' }} onClick={handleConfirmReject}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approval;
