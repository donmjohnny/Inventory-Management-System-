import React, { useState, useEffect } from 'react';

const BranchReceipt = ({ triggerToast }) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/receipts/");
      if (!res.ok) throw new Error("Failed to fetch shipments");
      const data = await res.json();
      setShipments(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      triggerToast("Error fetching receipts list", "error");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleConfirmReceipt = async (id, movementNo) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/receipts/${id}/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("Failed to confirm receipt");
      triggerToast(`Shipment ${movementNo} marked as Received`, "success");
      fetchReceipts();
    } catch (err) {
      console.error(err);
      triggerToast("Error confirming receipt", "error");
    }
  };

  return (
    <div className="items-page" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div style={{ fontSize: "12px", color: "var(--text-soft)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.02em" }}>
        Operations / Branch Receipt
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Branch Receipts</div>
          <div className="page-sub">Verify and confirm receipt of dispatched inventory shipments at branch locations.</div>
        </div>
      </div>

      <div className="table-wrap" style={{ padding: "0px", marginTop: "16px" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-soft)" }}>Loading shipments...</div>
        ) : (
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: "24px" }}>Movement No</th>
                <th>Requisition No</th>
                <th>Destination</th>
                <th>Items (Approved Qty)</th>
                <th>Dispatch Date</th>
                <th>Receive Status</th>
                <th style={{ textAlign: "right", paddingRight: "24px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--text-soft)", fontWeight: 500 }}>
                    No shipments found.
                  </td>
                </tr>
              ) : (
                shipments.map((ship, i) => {
                  const dateStr = new Date(ship.dtDispatchDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <tr key={ship.strId} style={{ animationDelay: `${0.03 + i * 0.01}s` }}>
                      <td className="mono" style={{ paddingLeft: "24px", color: "var(--text-main)", fontWeight: "600" }}>{ship.strMovementNo}</td>
                      <td className="mono" style={{ color: "var(--text-soft)" }}>{ship.strRequisitionNo}</td>
                      <td style={{ fontWeight: 500 }}>{ship.strDestination}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 0' }}>
                          {ship.arrItems && ship.arrItems.map(item => (
                            <span key={item.strId} style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                              • {item.strName} ({item.intApprovedQty} {item.strUnit})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ color: "var(--text-soft)", fontSize: '13px' }}>{dateStr}</td>
                      <td>
                        <span className={`status-dot ${ship.strReceiveStatus === 'Pending' ? 'status-inactive' : 'status-active'}`} style={{ background: ship.strReceiveStatus === 'Pending' ? '#fffbeb' : '#f0fdf4', color: ship.strReceiveStatus === 'Pending' ? '#d97706' : '#15803d' }}>
                          <span className={`dot ${ship.strReceiveStatus === 'Pending' ? 'dot-inactive' : 'dot-active'}`} style={{ background: ship.strReceiveStatus === 'Pending' ? '#d97706' : '#15803d' }}></span>
                          {ship.strReceiveStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "24px" }}>
                        <div className="actions-cell">
                          {ship.strReceiveStatus === 'Pending' && (
                            <button 
                              className="action-btn" 
                              title="Confirm Receipt"
                              onClick={() => handleConfirmReceipt(ship.strId, ship.strMovementNo)}
                              style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}
                            >
                              <i className="ti ti-check"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BranchReceipt;
