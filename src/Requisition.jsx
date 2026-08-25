import { useState, useEffect, useMemo, useRef } from "react";
import { arrInventoryItems } from "./mockData";
import { objApi } from "./api";

// Section: Requisition Component
export default function Requisition({ triggerToast: funcTriggerToast, setNotifications: funcSetNotifications, objCurrentUser, initialSearch = "" }) {
  // --- CATALOG STATE (loaded from backend) ---
 
  const [arrBranches, funcSetBranches] = useState([]);
  const [boolLoadingCatalog, funcSetLoadingCatalog] = useState(true);

  // --- REQUISITION STATE ---
  const [strRequisitionNo, funcSetRequisitionNo] = useState("REQ-2026-0001");
  const [strSelectedBranch, funcSetSelectedBranch] = useState("");
  const [strRequiredByDate, funcSetRequiredByDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [strRemarks, funcSetRemarks] = useState("");
  const [arrRequestedItems, funcSetRequestedItems] = useState([]);
  const [strSearchItemQuery, funcSetSearchItemQuery] = useState("");
  const [boolShowItemDropdown, funcSetShowItemDropdown] = useState(false);
  const [boolShowSuccessModal, funcSetShowSuccessModal] = useState(false);
  const [objSuccessModalData, funcSetSuccessModalData] = useState(null);
  const [boolShowDraftsDropdown, funcSetShowDraftsDropdown] = useState(false);
  const [strDraftSearchQuery, funcSetDraftSearchQuery] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      funcSetDraftSearchQuery(initialSearch);
      if (initialSearch.trim() !== "") {
        funcSetShowMyRequestsModal(true);
      }
    }
  }, [initialSearch]);

  const [arrDrafts, funcSetDrafts] = useState([]);
const [arrCatalogItems, funcSetCatalogItems] = useState([]);
// intCurrentDraftId tracks the backend ID of the currently-loaded draft
const [intCurrentDraftId, funcSetCurrentDraftId] = useState(null);
const [boolSaving, funcSetSaving] = useState(false);
const [boolShowMyRequestsModal, funcSetShowMyRequestsModal] = useState(false);
const [arrMyRequests, funcSetMyRequests] = useState([]);
  // --- REFS FOR CLICK OUTSIDE ---
  const refItemSearch = useRef(null);
  const refDraftsDropdown = useRef(null);

  // --- FETCH LIVE ITEMS CATALOG AND NEXT REQ NO ---
  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/items/");
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map(item => ({
            strId: item.code,
            strName: item.name,
            strDescription: item.description || "",
            strUnit: item.unit || "Nos",
            intOnHand: item.current_stock || 0,
            strColor: item.color || "#e0e7ff",
            strTextColor: item.text_color || "#4f46e5",
            strIcon: item.icon || "file-text",
            floaPrice: parseFloat(item.price) || 0.00
          }));
          funcSetCatalogItems(mapped);
        }
      } catch (err) {
        console.warn("Failed to fetch live items for requisition:", err);
      }
    }

    async function fetchNextReqNo() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/requisitions/");
        if (res.ok) {
          const data = await res.json();
          let maxNum = 0;
          data.forEach(r => {
            const match = r.strRequisitionNo.match(/REQ-2026-(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          });
          funcSetRequisitionNo(`REQ-2026-${String(maxNum + 1).padStart(4, "0")}`);
        }
      } catch (err) {
        console.warn("Failed to fetch requisitions for next no:", err);
      }
    }

    fetchItems();
    fetchNextReqNo();
  }, []);

  // --- CLICK OUTSIDE HANDLER ---
  useEffect(() => {
    function funcHandleClickOutside(event) {
      if (refItemSearch.current && !refItemSearch.current.contains(event.target)) {
        funcSetShowItemDropdown(false);
      }
      if (refDraftsDropdown.current && !refDraftsDropdown.current.contains(event.target)) {
        funcSetShowDraftsDropdown(false);
      }
    }
    document.addEventListener("mousedown", funcHandleClickOutside);
    return () => document.removeEventListener("mousedown", funcHandleClickOutside);
  }, []);

  // --- LOAD CATALOG DATA FROM BACKEND ON MOUNT ---
  useEffect(() => {
    async function funcLoadCatalog() {
      try {
        funcSetLoadingCatalog(true);
        // Fetch items, branches, next REQ number, and existing drafts in parallel
        const [arrApiItems, arrApiBranches, objNextNo, arrApiDrafts] = await Promise.all([
          objApi.funcGetCatalogItems(),
          objApi.funcGetCatalogBranches(),
          objApi.funcGetNextRequisitionNo(),
          objApi.funcGetRequisitions('Draft'),
        ]);

        // Map ItemSerializer shape -> component item shape
        const arrMapped = arrApiItems.map(it => ({
          strId: it.code,
          strName: it.name,
          strDescription: it.description || '',
          strUnit: it.unit,
          intOnHand: it.current_stock,
          floaPrice: parseFloat(it.price),
          strColor: it.color || '#e0e7ff',
          strTextColor: it.text_color || '#4f46e5',
          strIcon: it.icon || 'file-text',
        }));
        funcSetCatalogItems(arrMapped);

        // Set branches and default selection
        funcSetBranches(arrApiBranches);
        if (objCurrentUser?.strRole === 'Branch User' && objCurrentUser.strBranch) {
          funcSetSelectedBranch(objCurrentUser.strBranch);
        } else if (arrApiBranches.length > 0) {
          funcSetSelectedBranch(arrApiBranches[0].name);
        }

        // Set next requisition number
        funcSetRequisitionNo(objNextNo.strRequisitionNo);

        // Map backend drafts -> component draft shape
        const arrMappedDrafts = arrApiDrafts.map(d => ({
          strId: String(d.strId),
          intBackendId: parseInt(d.strId),
          strRequisitionNo: d.strRequisitionNo,
          strBranch: d.strBranch,
          strRequiredByDate: d.strRequiredByDate,
          strRemarks: d.strRemarks,
          arrItems: (d.arrItems || []).map(it => ({
            strId: it.strItemCode,
            strName: it.strName,
            strDescription: it.strDescription || '',
            strUnit: it.strUnit,
            intOnHand: it.intOnHand || 0,
            floaPrice: parseFloat(it.floaPrice),
            strColor: it.strColor || '#e0e7ff',
            strTextColor: it.strTextColor || '#4f46e5',
            strIcon: it.strIcon || 'file-text',
            intQty: it.intQty,
          })),
        }));
        funcSetDrafts(arrMappedDrafts);
      } catch (err) {
        console.error('Failed to load catalog:', err);
        funcTriggerToast('Could not load catalog from server. Check backend.', 'error');
      } finally {
        funcSetLoadingCatalog(false);
      }
    }
    funcLoadCatalog();
  }, []);

  // --- REQUISITION HANDLERS & COMPUTATIONS ---
  const arrFilteredCatalogItems = useMemo(() => {
    if (strSearchItemQuery.trim() === "") return arrCatalogItems;
    const strQ = strSearchItemQuery.toLowerCase();
return arrCatalogItems.filter(objItem =>
      objItem.strName.toLowerCase().includes(strQ) ||
      (objItem.strDescription && objItem.strDescription.toLowerCase().includes(strQ))
    );
}, [strSearchItemQuery, arrCatalogItems]);
  const arrFilteredDrafts = useMemo(() => {
    if (strDraftSearchQuery.trim() === "") return arrDrafts;
    const strQ = strDraftSearchQuery.toLowerCase();
    return arrDrafts.filter(objDraft => 
      objDraft.strRequisitionNo.toLowerCase().includes(strQ) ||
      objDraft.strBranch.toLowerCase().includes(strQ) ||
      (objDraft.strRemarks && objDraft.strRemarks.toLowerCase().includes(strQ)) ||
      objDraft.arrItems.some(objItem => objItem.strName.toLowerCase().includes(strQ))
    );
  }, [arrDrafts, strDraftSearchQuery]);

  const funcHandleQtyChange = (strId, intChange) => {
    funcSetRequestedItems(prev => prev.map(objItem => {
      if (objItem.strId === strId) {
        const intNewQty = Math.max(1, objItem.intQty + intChange);
        return { ...objItem, intQty: intNewQty };
      }
      return objItem;
    }));
  };

  const funcHandleQtyInput = (strId, strVal) => {
    const intQty = parseInt(strVal, 10);
    if (isNaN(intQty) || intQty < 1) return;
    funcSetRequestedItems(prev => prev.map(objItem => {
      if (objItem.strId === strId) {
        return { ...objItem, intQty };
      }
      return objItem;
    }));
  };

  const funcHandleDeleteRequestedItem = (strId) => {
    funcSetRequestedItems(prev => prev.filter(objItem => objItem.strId !== strId));
    funcTriggerToast("Item removed from list", "info");
  };

  const funcHandleClearAllRequisition = () => {
    if (arrRequestedItems.length === 0) return;
    if (window.confirm("Are you sure you want to clear all items from the list?")) {
      funcSetRequestedItems([]);
      funcTriggerToast("All items cleared", "warning");
    }
  };

  const funcHandleAddItemFromSearch = (objItem) => {
    funcSetRequestedItems(prev => {
      const objExists = prev.find(i => i.strId === objItem.strId);
      if (objExists) {
        funcTriggerToast(`Incremented quantity for "${objItem.strName}"`);
        return prev.map(i => i.strId === objItem.strId ? { ...i, intQty: i.intQty + 1 } : i);
      }
      funcTriggerToast(`Added "${objItem.strName}" to request`);
      return [...prev, {
        strId: objItem.strId,
        strName: objItem.strName,
        strDescription: objItem.strDescription,
        strUnit: objItem.strUnit,
        intOnHand: objItem.intOnHand,
        strColor: objItem.strColor,
        strTextColor: objItem.strTextColor,
        strIcon: objItem.strIcon,
        intQty: 1,
        floaPrice: objItem.floaPrice
      }];
    });
    funcSetSearchItemQuery("");
    funcSetShowItemDropdown(false);
  };

  const funcHandleSaveDraft = async () => {
    if (boolSaving) return;
    funcSetSaving(true);
    try {
      // Build payload for the backend
      const objPayload = {
        intCreatedById: objCurrentUser?.intId,
        strBranch: strSelectedBranch,
        strRequiredByDate,
        strRemarks: strRemarks || '',
        strStatus: 'Draft',
        floaTotalValue: arrRequestedItems.reduce((s, it) => s + it.floaPrice * it.intQty, 0).toFixed(2),
        arrItems: arrRequestedItems.map(it => ({
          strItemCode: it.strId,
          strName: it.strName,
          strDescription: it.strDescription || '',
          strUnit: it.strUnit,
          floaPrice: it.floaPrice,
          intQty: it.intQty,
          intOnHand: it.intOnHand || 0,
          strColor: it.strColor || '#e0e7ff',
          strTextColor: it.strTextColor || '#4f46e5',
          strIcon: it.strIcon || 'file-text',
        })),
      };

      let objSaved;
      if (intCurrentDraftId) {
        // Update existing draft
        objSaved = await objApi.funcUpdateRequisition(intCurrentDraftId, objPayload);
      } else {
        // Create new draft
        objSaved = await objApi.funcCreateRequisition(objPayload);
        funcSetCurrentDraftId(parseInt(objSaved.strId));
        funcSetRequisitionNo(objSaved.strRequisitionNo);
      }

      // Refresh drafts list
      const arrApiDrafts = await objApi.funcGetRequisitions('Draft');
      const arrMapped = arrApiDrafts.map(d => ({
        strId: String(d.strId),
        intBackendId: parseInt(d.strId),
        strRequisitionNo: d.strRequisitionNo,
        strBranch: d.strBranch,
        strRequiredByDate: d.strRequiredByDate,
        strRemarks: d.strRemarks,
        arrItems: (d.arrItems || []).map(it => ({
          strId: it.strItemCode, strName: it.strName, strDescription: it.strDescription || '',
          strUnit: it.strUnit, intOnHand: it.intOnHand || 0, floaPrice: parseFloat(it.floaPrice),
          strColor: it.strColor || '#e0e7ff', strTextColor: it.strTextColor || '#4f46e5',
          strIcon: it.strIcon || 'file-text', intQty: it.intQty,
        })),
      }));
      funcSetDrafts(arrMapped);
      funcTriggerToast(`Draft ${objSaved.strRequisitionNo} saved!`, 'success');
    } catch (err) {
      funcTriggerToast('Failed to save draft. Try again.', 'error');
    } finally {
      funcSetSaving(false);
    }
  };

  const funcHandleApplyDraft = (objDraft) => {
    funcSetRequisitionNo(objDraft.strRequisitionNo);
    funcSetSelectedBranch(objDraft.strBranch);
    funcSetRequiredByDate(objDraft.strRequiredByDate);
    funcSetRemarks(objDraft.strRemarks === 'Draft Requisition' ? '' : objDraft.strRemarks);
    funcSetRequestedItems([...objDraft.arrItems]);
    funcSetCurrentDraftId(objDraft.intBackendId);
    funcSetShowDraftsDropdown(false);
    funcTriggerToast(`Applied draft ${objDraft.strRequisitionNo}!`, 'success');
  };

  const funcHandleDeleteDraft = async (strId, event) => {
    event.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    const objDraft = arrDrafts.find(d => d.strId === strId);
    try {
      if (objDraft?.intBackendId) {
        await objApi.funcDeleteRequisition(objDraft.intBackendId);
      }
      funcSetDrafts(prev => prev.filter(d => d.strId !== strId));
      // If the deleted draft was the currently loaded one, reset draft ID
      if (objDraft?.intBackendId === intCurrentDraftId) {
        funcSetCurrentDraftId(null);
      }
      funcTriggerToast('Draft deleted', 'warning');
    } catch (err) {
      funcTriggerToast('Failed to delete draft.', 'error');
    }
  };

  const funcHandleClearAllDrafts = async (event) => {
    event.stopPropagation();
    if (arrDrafts.length === 0) return;
    if (!window.confirm('Are you sure you want to delete all saved drafts?')) return;
    try {
      await Promise.all(arrDrafts.filter(d => d.intBackendId).map(d => objApi.funcDeleteRequisition(d.intBackendId)));
      funcSetDrafts([]);
      funcSetCurrentDraftId(null);
      funcTriggerToast('All drafts deleted', 'warning');
    } catch (err) {
      funcTriggerToast('Failed to delete all drafts.', 'error');
    }
  };

  const funcHandleSubmitRequisition = async (event) => {
    event.preventDefault();
    if (arrRequestedItems.length === 0) {
      funcTriggerToast('Cannot submit empty requisition. Please add items.', 'error');
      return;
    }
    const hasInvalidStock = arrRequestedItems.some(it => it.intOnHand === 0 || it.intQty > it.intOnHand);
    if (hasInvalidStock) {
      funcTriggerToast('Please remove out-of-stock items or adjust quantities before submitting.', 'error');
      return;
    }
    if (boolSaving) return;
    funcSetSaving(true);
    try {
      let intDraftId = intCurrentDraftId;
      // If not yet saved as draft, save first then submit
      if (!intDraftId) {
        const objPayload = {
          intCreatedById: objCurrentUser?.intId,
          strBranch: strSelectedBranch,
          strRequiredByDate,
          strRemarks: strRemarks || '',
          strStatus: 'Draft',
          floaTotalValue: arrRequestedItems.reduce((s, it) => s + it.floaPrice * it.intQty, 0).toFixed(2),
          arrItems: arrRequestedItems.map(it => ({
            strItemCode: it.strId, strName: it.strName, strDescription: it.strDescription || '',
            strUnit: it.strUnit, floaPrice: it.floaPrice, intQty: it.intQty,
            intOnHand: it.intOnHand || 0, strColor: it.strColor || '#e0e7ff',
            strTextColor: it.strTextColor || '#4f46e5', strIcon: it.strIcon || 'file-text',
          })),
        };
        const objCreated = await objApi.funcCreateRequisition(objPayload);
        intDraftId = parseInt(objCreated.strId);
        funcSetCurrentDraftId(intDraftId);
        funcSetRequisitionNo(objCreated.strRequisitionNo);
      }

      // Submit the draft
      const objSubmitted = await objApi.funcSubmitRequisition(intDraftId);

      // Show success modal
      const objSummary = {
        strRequisitionNo,
        strBranch: strSelectedBranch,
        strRequiredByDate: funcFormatDate(strRequiredByDate),
        strRemarks: strRemarks || 'Monthly stationery top-up',
        intTotalItems: arrRequestedItems.length,
        intTotalQty: arrRequestedItems.reduce((s, it) => s + it.intQty, 0),
        floaTotalValue: arrRequestedItems.reduce((s, it) => s + it.floaPrice * it.intQty, 0),
        arrItems: [...arrRequestedItems],
        strAssignedToName: objSubmitted?.strAssignedToName || '',
      };
      funcSetSuccessModalData(objSummary);
      funcSetShowSuccessModal(true);

      // Remove submitted req from drafts list
      funcSetDrafts(prev => prev.filter(d => d.intBackendId !== intDraftId));

      funcSetNotifications(prev => [{
        intId: Date.now(),
        strType: 'requisition_submitted',
        strText: `Requisition "${strRequisitionNo}" submitted for approval`,
        strTime: 'Just now',
      }, ...prev]);
      funcTriggerToast(`Requisition ${strRequisitionNo} submitted for approval!`);
    } catch (err) {
      funcTriggerToast('Failed to submit requisition. Try again.', 'error');
    } finally {
      funcSetSaving(false);
    }
  };

  const funcFormatDate = (strDateStr) => {
    if (!strDateStr) return "";
    const arrParts = strDateStr.split("-");
    if (arrParts.length === 3) {
      return `${arrParts[2]}/${arrParts[1]}/${arrParts[0]}`;
    }
    return strDateStr;
  };

  const funcResetRequisition = async () => {
    try {
      const objNextNo = await objApi.funcGetNextRequisitionNo();
      funcSetRequisitionNo(objNextNo.strRequisitionNo);
    } catch {
      // fallback: local increment
      const intCurrentNum = parseInt(strRequisitionNo.split('-')[2], 10);
      funcSetRequisitionNo(`REQ-2026-${String(intCurrentNum + 1).padStart(4, '0')}`);
    }
    funcSetRemarks('');
    funcSetRequestedItems([]);
    funcSetCurrentDraftId(null);
    funcSetShowSuccessModal(false);
    funcSetSuccessModalData(null);
  };

  const funcRenderItemThumbnail = (objItem) => {
    return (
      <div className="item-thumbnail" style={{ background: objItem.strColor, color: objItem.strTextColor }}>
        <i className={`ti ti-${objItem.strIcon}`}></i>
      </div>
    );
  };

  return (
    <>
      <div className="requisition-page">
        {/* Breadcrumbs */}
        <div className="breadcrumbs">
          Operations <i className="ti ti-chevron-right"></i> <span className="active">Requisition</span>
        </div>
        
        {/* Page Header */}
        <div className="page-header-req">
          <div>
            <h1 className="page-title-req">Raise a Requisition</h1>
            <p className="page-sub-req">
              Request stock from the Central Office. Submitted requisitions are automatically routed to the Central Office Stock Manager for approval.
            </p>
          </div>
          
          <div className="header-actions-req" style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              className="btn-draft-req" 
              style={{ background: 'var(--blue-soft)', color: 'var(--blue)', borderColor: 'var(--blue-mid)' }}
              onClick={async () => {
                if (objCurrentUser?.intId) {
                  const data = await objApi.funcGetRequisitions(null, objCurrentUser.intId);
                  funcSetMyRequests(data.filter(r => r.strStatus !== 'Draft'));
                }
                funcSetShowMyRequestsModal(true);
              }}
            >
              <i className="ti ti-history"></i> My Requests
            </button>

            <div className="drafts-dropdown-container" ref={refDraftsDropdown}>
              <button 
                type="button" 
                className="btn-draft-req" 
                onClick={() => funcSetShowDraftsDropdown(!boolShowDraftsDropdown)}
              >
                <i className="ti ti-folder"></i> View Drafts ({arrDrafts.length})
              </button>
              
              {boolShowDraftsDropdown && (
                <div className="drafts-dropdown-menu">
                  <div className="drafts-dropdown-header">
                    <h4>Saved Drafts</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {arrDrafts.length > 0 && (
                        <button 
                          type="button" 
                          className="btn-clear-drafts-all" 
                          onClick={funcHandleClearAllDrafts}
                          title="Delete all drafts"
                        >
                          <i className="ti ti-trash"></i> Clear all
                        </button>
                      )}
                      <span className="drafts-count">{arrDrafts.length} drafts</span>
                    </div>
                  </div>
                  <div className="drafts-dropdown-search">
                    <i className="ti ti-search search-icon-drafts"></i>
                    <input 
                      type="text" 
                      placeholder="Search drafts..." 
                      value={strDraftSearchQuery}
                      onChange={(e) => funcSetDraftSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="drafts-dropdown-list">
                    {arrFilteredDrafts.length === 0 ? (
                      <div className="drafts-dropdown-empty">No drafts found</div>
                    ) : (
                      arrFilteredDrafts.map(objDraft => {
                        const floaDraftTotal = objDraft.arrItems.reduce((floaSum, objItem) => floaSum + (objItem.floaPrice * objItem.intQty), 0);
                        return (
                          <div 
                            key={objDraft.strId} 
                            className="drafts-dropdown-item"
                            onClick={() => funcHandleApplyDraft(objDraft)}
                          >
                            <div className="draft-dropdown-item-header">
                              <span className="draft-dropdown-no">{objDraft.strRequisitionNo}</span>
                              <button 
                                type="button" 
                                className="btn-delete-draft-dropdown" 
                                onClick={(e) => funcHandleDeleteDraft(objDraft.strId, e)}
                                title="Delete draft"
                              >
                                <i className="ti ti-trash"></i>
                              </button>
                            </div>
                            <div className="draft-dropdown-item-meta">
                              <span>Branch: <strong>{objDraft.strBranch}</strong></span>
                              <span>Req By: <strong>{funcFormatDate(objDraft.strRequiredByDate)}</strong></span>
                            </div>
                            {objDraft.strRemarks && (
                              <div className="draft-dropdown-remarks">"{objDraft.strRemarks}"</div>
                            )}
                            <div className="draft-dropdown-items-preview">
                              {objDraft.arrItems.map(it => `${it.strName} x${it.intQty}`).join(', ')}
                            </div>
                            <div className="draft-dropdown-item-footer">
                              <span>{objDraft.arrItems.length} items • <strong>${floaDraftTotal.toFixed(2)}</strong></span>
                              <span className="apply-link">Apply <i className="ti ti-chevron-right"></i></span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="btn-draft-req" onClick={funcHandleSaveDraft}>
              <i className="ti ti-device-floppy"></i> Save draft
            </button>

            <button type="button" className="btn-submit-req" onClick={funcHandleSubmitRequisition}>
              <i className="ti ti-send"></i> Submit for approval
            </button>
          </div>
        </div>
        
        {/* Requisition Fields Card */}
        <div className="requisition-form-card">
          <div className="requisition-form-row">
            {/* Requisition No */}
            <div className="form-group-req">
              <label className="form-label-req">Requisition No.</label>
              <div className="input-with-icon-req">
                <i className="ti ti-file-text input-icon-req"></i>
                <input 
                  type="text" 
                  className="form-input-req read-only" 
                  value={strRequisitionNo} 
                  readOnly 
                />
              </div>
            </div>
            
            {/* Branch select */}
            <div className="form-group-req">
              <label className="form-label-req">Branch</label>
              <div className="input-with-icon-req">
                <i className="ti ti-building input-icon-req"></i>
                <select 
                  className={`form-select-req ${objCurrentUser?.strRole === 'Branch User' ? 'read-only' : ''}`}
                  value={strSelectedBranch} 
                  onChange={(e) => funcSetSelectedBranch(e.target.value)}
                  disabled={objCurrentUser?.strRole === 'Branch User'}
                >
                  {objCurrentUser?.strRole === 'Branch User' && objCurrentUser.strBranch ? (
                    <option value={objCurrentUser.strBranch}>{objCurrentUser.strBranch}</option>
                  ) : arrBranches.length === 0 ? (
                    <option value="">Loading branches...</option>
                  ) : (
                    arrBranches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))
                  )}
                </select>
                <i className="ti ti-chevron-down select-chevron-req"></i>
              </div>
            </div>
            
            {/* Required By Date */}
            <div className="form-group-req">
              <label className="form-label-req">Required By</label>
              <div className="input-with-icon-req">
                <i className="ti ti-calendar input-icon-req"></i>
                <input 
                  type="date" 
                  className="form-input-req" 
                  value={strRequiredByDate} 
                  onChange={(e) => funcSetRequiredByDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Remarks Optional */}
          <div className="requisition-form-row remarks-row">
            <div className="form-group-req full-width">
              <label className="form-label-req">Remarks (optional)</label>
              <div className="input-with-icon-req">
                <i className="ti ti-message-2 input-icon-req"></i>
                <input 
                  type="text" 
                  className="form-input-req" 
                  placeholder="e.g. Monthly stationery top-up" 
                  value={strRemarks}
                  onChange={(e) => funcSetRemarks(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Requested Items List Card */}
        <div className="requested-items-card">
          <div className="requested-items-header">
            <h3 className="card-section-title">Requested items</h3>
            <div className="search-add-wrapper-req" ref={refItemSearch}>
              <div className="search-input-box-req">
                <i className="ti ti-search search-icon-req"></i>
                <input 
                  type="text" 
                  placeholder="Search item to add..." 
                  value={strSearchItemQuery}
                  onChange={(e) => {
                    funcSetSearchItemQuery(e.target.value);
                    funcSetShowItemDropdown(true);
                  }}
                  onFocus={() => funcSetShowItemDropdown(true)}
                />
                {boolShowItemDropdown && (
                  <div className="search-dropdown-req">
                    {arrFilteredCatalogItems.length === 0 ? (
                      <div className="search-dropdown-empty">No items found</div>
                    ) : (
                      arrFilteredCatalogItems.map(objItem => (
                        <div 
                          key={objItem.strId} 
                          className="search-dropdown-item-req"
                          onClick={() => funcHandleAddItemFromSearch(objItem)}
                        >
                          {funcRenderItemThumbnail(objItem)}
                          <div className="search-item-info">
                            <div className="search-item-name">{objItem.strName}</div>
                            <div className="search-item-desc">{objItem.strDescription}</div>
                          </div>
                          <div className="search-item-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span className="search-item-price" style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-main)' }}>${objItem.floaPrice.toFixed(2)}</span>
                            <span className="search-item-badge">On Hand: {objItem.intOnHand}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button 
                type="button" 
                className="btn-add-item-req"
                onClick={() => {
                  funcSetShowItemDropdown(!boolShowItemDropdown);
                  setTimeout(() => {
                    const inputEl = refItemSearch.current?.querySelector('input');
                    if (inputEl) inputEl.focus();
                  }, 50);
                }}
              >
                <i className="ti ti-plus"></i> Add item
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="requisition-table-wrap">
            {arrRequestedItems.length === 0 ? (
              <div className="empty-items-placeholder">
                <div className="empty-cart-icon">
                  <i className="ti ti-shopping-cart"></i>
                </div>
                <p>Your requisition list is empty</p>
                <p style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '4px', fontWeight: '400' }}>
                  Use the search bar above to add items to your requisition.
                </p>
              </div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>ITEM</th>
                      <th>UNIT</th>
                      <th>UNIT PRICE</th>
                      <th>ON HAND (BRANCH)</th>
                      <th style={{ width: '150px' }}>REQUEST QTY</th>
                      <th>TOTAL</th>
                      <th style={{ textAlign: 'right', width: '80px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrRequestedItems.map(objItem => {
                      const boolLowStock = objItem.intOnHand === 0;
                      const boolExceeded = objItem.intQty > objItem.intOnHand;
                      return (
                        <tr key={objItem.strId} className="req-item-row">
                          <td>
                            <div className="item-cell-req">
                              {funcRenderItemThumbnail(objItem)}
                              <div className="item-details-req">
                                <div className="item-title-req">{objItem.strName}</div>
                                <div className="item-desc-req">{objItem.strDescription}</div>
                              </div>
                            </div>
                          </td>
                          <td className="unit-cell-req">{objItem.strUnit}</td>
                          <td className="price-cell-req">${objItem.floaPrice.toFixed(2)}</td>
                          <td>
                            <div className="onhand-badge-wrapper">
                              <span className={`onhand-badge-req ${boolLowStock ? 'badge-zero' : 'badge-normal'}`}>
                                {objItem.intOnHand} Units
                              </span>
                              {boolLowStock && (
                                <span className="stock-warning-icon-req error" title="No stock available at Calicut Branch!">
                                  <i className="ti ti-alert-triangle"></i>
                                </span>
                              )}
                              {!boolLowStock && boolExceeded && (
                                <span className="stock-warning-icon-req warning" title="Requested quantity exceeds stock on hand!">
                                  <i className="ti ti-alert-triangle"></i>
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="qty-counter-req">
                              <button 
                                type="button" 
                                className="qty-btn-req decrement"
                                onClick={() => funcHandleQtyChange(objItem.strId, -1)}
                              >
                                <i className="ti ti-minus"></i>
                              </button>
                              <input 
                                type="number" 
                                className="qty-input-req" 
                                value={objItem.intQty}
                                onChange={(e) => {
                                  e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
                                  funcHandleQtyInput(objItem.strId, e.target.value);
                                }}
                                min="1"
                              />
                              <button 
                                type="button" 
                                className="qty-btn-req increment"
                                onClick={() => funcHandleQtyChange(objItem.strId, 1)}
                              >
                                <i className="ti ti-plus"></i>
                              </button>
                            </div>
                          </td>
                          <td className="total-cell-val-req">${(objItem.floaPrice * objItem.intQty).toFixed(2)}</td>
                          <td>
                            <div className="actions-cell-req">
                              <button 
                                type="button" 
                                className="btn-delete-req" 
                                onClick={() => funcHandleDeleteRequestedItem(objItem.strId)}
                                title="Delete item"
                              >
                                <i className="ti ti-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* Requisition Card Footer */}
            <div className="requisition-footer-req">
              <div className="totals-container-req">
                <div className="total-cell-req">
                  <span className="total-label-req">Total Items</span>
                  <span className="total-value-req">{arrRequestedItems.length}</span>
                </div>
                <div className="total-cell-req">
                  <span className="total-label-req">Total Quantity</span>
                  <span className="total-value-req">
                    {arrRequestedItems.reduce((floaSum, objItem) => floaSum + objItem.intQty, 0)}
                  </span>
                </div>
                <div className="total-cell-req">
                  <span className="total-label-req">Total Value</span>
                  <span className="total-value-req font-purple">
                    ${arrRequestedItems.reduce((floaSum, objItem) => floaSum + (objItem.floaPrice * objItem.intQty), 0).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <button 
                type="button" 
                className="btn-clear-all-req"
                onClick={funcHandleClearAllRequisition}
                disabled={arrRequestedItems.length === 0}
              >
                <i className="ti ti-trash"></i> Clear all
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: REQUISITION SUBMISSION SUCCESS ── */}
      {boolShowSuccessModal && objSuccessModalData && (
        <div className="modal-overlay success-modal-blur" onClick={() => funcSetShowSuccessModal(false)}>
          <div className="modal-container success-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon-large">
              <i className="ti ti-circle-check"></i>
            </div>
            <h3 className="success-title">Requisition Submitted</h3>
            <p className="success-desc">
              Requisition <strong>{objSuccessModalData.strRequisitionNo}</strong> has been successfully submitted
              {objSuccessModalData.strAssignedToName
                ? <> to <strong>{objSuccessModalData.strAssignedToName}</strong> (Central Office Stock Manager)</>  
                : <> to the Central Office Stock Manager</>}
              {' '}for approval.
            </p>
            
            <div className="success-details-box">
              <div className="success-detail-row">
                <span>Branch:</span>
                <strong>{objSuccessModalData.strBranch}</strong>
              </div>
              <div className="success-details-row">
                <span>Required By:</span>
                <strong>{objSuccessModalData.strRequiredByDate}</strong>
              </div>
              <div className="success-details-row">
                <span>Total Items:</span>
                <strong>{objSuccessModalData.intTotalItems}</strong>
              </div>
              <div className="success-details-row">
                <span>Total Qty:</span>
                <strong>{objSuccessModalData.intTotalQty}</strong>
              </div>
              <div className="success-detail-row" style={{ gridColumn: 'span 2' }}>
                <span>Total Value:</span>
                <strong className="text-purple">${objSuccessModalData.floaTotalValue.toFixed(2)}</strong>
              </div>
              <div className="success-detail-row" style={{ gridColumn: 'span 2' }}>
                <span>Remarks:</span>
                <span className="remarks-text">{objSuccessModalData.strRemarks}</span>
              </div>
            </div>

            <div className="success-items-list">
              <div className="success-list-header">SUBMITTED ITEMS</div>
              <div className="success-list-body">
                {objSuccessModalData.arrItems.map(objItem => (
                  <div key={objItem.strId} className="success-list-item">
                    <span className="item-name">{objItem.strName} <span className="price-tag-soft">(${objItem.floaPrice.toFixed(2)} / {objItem.strUnit})</span></span>
                    <strong className="item-qty">{objItem.intQty} {objItem.strUnit}s — ${(objItem.floaPrice * objItem.intQty).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="button" 
              className="btn-success-done"
              onClick={funcResetRequisition}
            >
              Raise New Requisition
            </button>
          </div>
        </div>
      )}
      {/* My Requests Modal */}
      {boolShowMyRequestsModal && (
        <div className="modal-overlay" onClick={() => funcSetShowMyRequestsModal(false)}>
          <div className="modal-container" style={{ width: '800px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon"><i className="ti ti-history"></i></div>
                <div>
                  <h3 className="modal-title">My Requests History</h3>
                  <p className="modal-subtitle">Track the status of your submitted requisitions</p>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => funcSetShowMyRequestsModal(false)}>
                <i className="ti ti-x"></i>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {arrMyRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
                  <i className="ti ti-receipt" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
                  <p>You haven't submitted any requests yet.</p>
                </div>
              ) : (
                arrMyRequests.map(req => (
                  <div key={req.strId} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {req.strRequisitionNo}
                        <span style={{ 
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                          background: req.strStatus === 'Pending' ? '#fffbeb' : req.strStatus === 'Approved' ? '#f0fdf4' : '#fef2f2',
                          color: req.strStatus === 'Pending' ? '#d97706' : req.strStatus === 'Approved' ? '#15803d' : '#b91c1c'
                        }}>
                          {req.strStatus}
                        </span>
                      </h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-soft)' }}>
                        Branch: {req.strBranch} | Required: {funcFormatDate(req.strRequiredByDate)} | Value: ${parseFloat(req.floaTotalValue).toFixed(2)}
                      </p>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-soft)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span>{req.arrItems?.length} item(s)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
