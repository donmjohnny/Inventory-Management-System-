import { useState, useEffect, useMemo, useRef } from "react";


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

// Helper to parse decimal values as floats from backend response
const parsePurchaseFloats = (p) => {
  return {
    ...p,
    floaSubtotal: parseFloat(p.floaSubtotal) || 0,
    floaVat: parseFloat(p.floaVat) || 0,
    floaTotal: parseFloat(p.floaTotal) || 0,
    arrItems: (p.arrItems || []).map(item => ({
      ...item,
      floaPrice: parseFloat(item.floaPrice) || 0
    }))
  };
};

// Section: Purchase Component
// Renders the purchase invoicing page to stock-in items from suppliers.
export default function Purchase({ triggerToast: funcTriggerToast, setNotifications: funcSetNotifications, funcCheckLowStock, initialSearch = "" }) {
  // --- ALL PURCHASES (DRAFTS + POSTED + REVERSED) ---
  const [arrPurchases, funcSetPurchases] = useState([]);

  // --- DYNAMIC DATA FETCHING ---
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);

  // Load database entities on mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/suppliers/");
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
          // Fallback mock suppliers
          const initialMockSuppliers = [
            {
              id: 1,
              code: "SUP-001",
              name: "Office Mart Trading LLC",
              email: "orders@officemart.com",
              phone: "+971 4 123 4567",
              items: [
                { id: 101, code: "ITM-0001", name: "Premium A4 Paper", category: { id: 1, name: "Consumables" }, price: 15.50 },
                { id: 102, code: "ITM-0002", name: "Blue Ballpoint Pens", category: { id: 2, name: "Stationery" }, price: 2.20 }
              ]
            },
            {
              id: 2,
              code: "SUP-002",
              name: "Global Stationers Ltd",
              email: "sales@globalstationers.com",
              phone: "+971 4 765 4321",
              items: [
                { id: 103, code: "ITM-0003", name: "Ergonomic Desk Chair", category: { id: 3, name: "Furniture" }, price: 85.00 }
              ]
            },
            {
              id: 3,
              code: "SUP-003",
              name: "Apex Paper Industries",
              email: "orders@apexpaper.com",
              phone: "+971 4 111 2222",
              items: [
                { id: 104, code: "ITM-0004", name: "Cardboard Boxes", category: { id: 2, name: "Stationery" }, price: 4.80 }
              ]
            },
            {
              id: 4,
              code: "SUP-004",
              name: "TechZone Distributors",
              email: "sales@techzone.com",
              phone: "+971 4 333 4444",
              items: [
                { id: 105, code: "ITM-0005", name: "USB Flash Drive 64GB", category: { id: 4, name: "Electronics" }, price: 12.00 }
              ]
            }
          ];
          setSuppliers(initialMockSuppliers);
          localStorage.setItem("stockflow_suppliers", JSON.stringify(initialMockSuppliers));
        }
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/categories/");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data);
        localStorage.setItem("stockflow_categories", JSON.stringify(data));
      } catch (err) {
        console.warn("Backend categories offline, using cached.", err);
        const saved = localStorage.getItem("stockflow_categories");
        if (saved) {
          setCategories(JSON.parse(saved));
        } else {
          setCategories([
            { id: 1, name: "Office Supplies" },
            { id: 2, name: "Printer Essentials" },
            { id: 3, name: "Electronics" },
            { id: 4, name: "Furniture" },
            { id: 5, name: "Consumables" },
            { id: 6, name: "Stationery" },
            { id: 7, name: "Hardware" }
          ]);
        }
      }
    };

    const fetchCatalogItems = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/items/");
        if (res.ok) {
          const data = await res.json();
          setCatalogItems(data);
        }
      } catch (err) {
        console.warn("Backend items offline.", err);
      }
    };

    const fetchPurchases = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/purchases/");
        if (res.ok) {
          const data = await res.json();
          const parsed = data.map(parsePurchaseFloats);
          funcSetPurchases(parsed);
          funcSetPurchaseNo(fnGenerateNextPurchaseNo(parsed));
        }
      } catch (err) {
        console.warn("Backend purchases offline.", err);
      }
    };

    fetchSuppliers();
    fetchCategories();
    fetchCatalogItems();
    fetchPurchases();
  }, []);

  // --- DYNAMIC DOC NO GENERATION ---
  const fnGenerateNextPurchaseNo = (list) => {
    const intCurrentYear = new Date().getFullYear();
    let intMaxSeq = 0;
    list.forEach(p => {
      const match = p.strPurchaseNo.match(/^PUR-(\d{4})-(\d+)$/);
      if (match) {
        const year = parseInt(match[1], 10);
        const seq = parseInt(match[2], 10);
        if (year === intCurrentYear && seq > intMaxSeq) {
          intMaxSeq = seq;
        }
      }
    });
    const strNextSeq = String(intMaxSeq + 1).padStart(4, "0");
    return `PUR-${intCurrentYear}-${strNextSeq}`;
  };

  // --- ACTIVE FORM STATE ---
  const [strPurchaseNo, funcSetPurchaseNo] = useState(() => fnGenerateNextPurchaseNo(arrPurchases));
  const [strSelectedSupplier, funcSetSelectedSupplier] = useState("Office Mart Trading LLC");
  const [strInvoiceDate, funcSetInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [strStatus, funcSetStatus] = useState("Draft"); // Draft, Posted, Reversed
  const [arrPurchaseItems, funcSetPurchaseItems] = useState([]);

  // Derived selected supplier object
  const selectedSupplierObj = useMemo(() => {
    return suppliers.find(s => s.name === strSelectedSupplier || s.strName === strSelectedSupplier);
  }, [suppliers, strSelectedSupplier]);

  const [boolShowProductDropdown, funcSetShowProductDropdown] = useState(false);
  const [strProductSearchQuery, funcSetProductSearchQuery] = useState("");
  const refProductDropdown = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (refProductDropdown.current && !refProductDropdown.current.contains(event.target)) {
        funcSetShowProductDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const arrAvailableItems = useMemo(() => {
    if (!selectedSupplierObj) return [];
    return selectedSupplierObj.items || [];
  }, [selectedSupplierObj]);

  const arrFilteredAvailableItems = useMemo(() => {
    const q = strProductSearchQuery.toLowerCase().trim();
    if (!q) return arrAvailableItems;
    return arrAvailableItems.filter(item => 
      (item.name || "").toLowerCase().includes(q) || 
      (item.code || "").toLowerCase().includes(q)
    );
  }, [arrAvailableItems, strProductSearchQuery]);

  const funcHandleSelectProduct = (selectedItm) => {
    if (boolIsLocked) return;

    // Check if item is already in purchase items list (to avoid duplicates or increment qty instead)
    const existingRowIdx = arrPurchaseItems.findIndex(item => item.strCode === selectedItm.code);
    if (existingRowIdx !== -1) {
      // If it exists, let's increment its quantity by 1
      funcSetPurchaseItems(prev => prev.map((item, idx) => {
        if (idx === existingRowIdx) {
          return { ...item, intQty: item.intQty + 1 };
        }
        return item;
      }));
      funcTriggerToast(`Incremented quantity for ${selectedItm.name}`, "info");
      funcSetShowProductDropdown(false);
      funcSetProductSearchQuery("");
      return;
    }

    // Retrieve specifications from database/catalog or supplier item
    const existing = catalogItems.find(ci => ci.code === selectedItm.code || ci.strCode === selectedItm.code);
    
    // Specifications loaded dynamically from backend/database
    const itemCat = existing?.category?.name || existing?.objCategory?.name || selectedItm.category?.name || selectedItm.category || "Office Supplies";
    const parsedPrice = parseFloat(existing?.price || existing?.floaPrice || selectedItm.price);
    const itemPrice = isNaN(parsedPrice) ? 0.00 : parsedPrice;
    const itemUnit = existing?.unit || existing?.strUnit || categoryUnitMap[itemCat] || "Box";
    const itemDesc = existing?.description || existing?.strDescription || "";

    // Design color variables
    let strColor = "#e0e7ff";
    let strTextColor = "#4f46e5";
    let strIcon = "file-text";
    if (itemCat === "Furniture") {
      strColor = "#fef3c7";
      strTextColor = "#d97706";
      strIcon = "armchair";
    } else if (itemCat === "Electronics") {
      strColor = "#d1fae5";
      strTextColor = "#059669";
      strIcon = "device-laptop";
    } else if (itemCat === "Printer Essentials") {
      strColor = "#fce7f3";
      strTextColor = "#db2777";
      strIcon = "printer";
    } else if (itemCat === "Consumables") {
      strColor = "#fee2e2";
      strTextColor = "#ef4444";
      strIcon = "trash";
    }

    const tempId = `item-${Date.now()}`;
    const newRow = {
      strId: tempId,
      supplierId: selectedSupplierObj?.id,
      supplierCode: selectedSupplierObj?.code || selectedSupplierObj?.strCode,
      supplierName: strSelectedSupplier,
      supplierItemId: selectedItm.id,
      strCode: selectedItm.code,
      strName: selectedItm.name,
      strCategory: itemCat,
      strUnit: itemUnit,
      strDescription: itemDesc,
      intQty: 1,
      floaPrice: itemPrice,
      strColor,
      strTextColor,
      strIcon,
      isNewRow: false
    };

    funcSetPurchaseItems(prev => [...prev, newRow]);
    funcTriggerToast(`Added ${selectedItm.name} to purchase list`, "success");
    funcSetShowProductDropdown(false);
    funcSetProductSearchQuery("");
  };


  // Computed Lock States
  const boolIsLocked = strStatus === "Posted" || strStatus === "Reversed";

  // Modal & Search States
  const [boolShowPurchaseSuccessModal, funcSetShowPurchaseSuccessModal] = useState(false);
  const [objPurchaseSuccessModalData, funcSetPurchaseSuccessModalData] = useState(null);
  const [strPurchaseDraftSearchQuery, funcSetSearchPurchaseDraftSearchQuery] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      funcSetSearchPurchaseDraftSearchQuery(initialSearch);
      if (initialSearch.trim() !== "") {
        funcSetActiveTab("reports");
      }
    }
  }, [initialSearch]);

  // Sub-Navigation Tab State & Table Filters
  const [strActiveTab, funcSetActiveTab] = useState("form"); // form, reports
  const [strStatusFilter, funcSetStatusFilter] = useState("All");
  const [strSupplierFilter, funcSetSupplierFilter] = useState("All");

  const arrFilteredPurchases = useMemo(() => {
    let list = arrPurchases;
    if (strPurchaseDraftSearchQuery.trim() !== "") {
      const strQ = strPurchaseDraftSearchQuery.toLowerCase();
      list = list.filter(objPur => 
        objPur.strPurchaseNo.toLowerCase().includes(strQ) ||
        objPur.strSupplier.toLowerCase().includes(strQ) ||
        objPur.arrItems.some(objItem => objItem.strName.toLowerCase().includes(strQ))
      );
    }
    if (strStatusFilter !== "All") {
      list = list.filter(objPur => objPur.strStatus === strStatusFilter);
    }
    if (strSupplierFilter !== "All") {
      list = list.filter(objPur => objPur.strSupplier === strSupplierFilter);
    }
    return list;
  }, [arrPurchases, strPurchaseDraftSearchQuery, strStatusFilter, strSupplierFilter]);

  // --- REPORTS METRICS ---
  const objReportMetrics = useMemo(() => {
    const totalOrders = arrPurchases.length;
    const activeDrafts = arrPurchases.filter(p => p.strStatus === "Draft").length;
    const reversedOrders = arrPurchases.filter(p => p.strStatus === "Reversed").length;
    const totalSpent = arrPurchases
      .filter(p => p.strStatus === "Posted")
      .reduce((sum, p) => {
        const subtotal = p.arrItems.reduce((acc, item) => acc + (item.floaPrice * item.intQty), 0);
        return sum + (subtotal * 1.05);
      }, 0);

    return {
      totalOrders,
      totalSpent,
      activeDrafts,
      reversedOrders
    };
  }, [arrPurchases]);

  // --- PURCHASE INLINE EDIT HANDLERS ---
  const funcHandlePurchaseQtyChange = (strId, intChange) => {
    if (boolIsLocked) return;
    funcSetPurchaseItems(prev => prev.map(objItem => {
      if (objItem.strId === strId) {
        return { ...objItem, intQty: Math.max(1, objItem.intQty + intChange) };
      }
      return objItem;
    }));
  };

  const funcHandlePurchaseQtyInput = (strId, strVal) => {
    if (boolIsLocked) return;
    const intQty = parseInt(strVal, 10);
    if (isNaN(intQty) || intQty < 1) return;
    funcSetPurchaseItems(prev => prev.map(objItem => {
      if (objItem.strId === strId) {
        return { ...objItem, intQty };
      }
      return objItem;
    }));
  };

  const funcHandlePurchaseCostInput = (strId, strVal) => {
    if (boolIsLocked) return;
    const floaCost = parseFloat(strVal);
    if (isNaN(floaCost) || floaCost < 0) return;
    funcSetPurchaseItems(prev => prev.map(objItem => {
      if (objItem.strId === strId) {
        return { ...objItem, floaPrice: floaCost };
      }
      return objItem;
    }));
  };

  const funcHandleDeletePurchaseItem = (strId) => {
    if (boolIsLocked) return;
    funcSetPurchaseItems(prev => prev.filter(objItem => objItem.strId !== strId));
    funcTriggerToast("Item removed from list", "info");
  };

  const funcHandleClearAllPurchase = () => {
    if (boolIsLocked || arrPurchaseItems.length === 0) return;
    if (window.confirm("Are you sure you want to clear all items from the list?")) {
      funcSetPurchaseItems([]);
      funcTriggerToast("All items cleared", "warning");
    }
  };

  // --- ADD INLINE ROW HANDLER (MULTI-SUPPLIER TRACKING) ---
  const funcHandleAddInlineRow = () => {
    if (!strSelectedSupplier) {
      funcTriggerToast("Please select an active Supplier first", "error");
      return;
    }
    const tempId = `temp-${Date.now()}`;
    funcSetPurchaseItems(prev => [
      ...prev,
      {
        strId: tempId,
        supplierId: selectedSupplierObj?.id,
        supplierCode: selectedSupplierObj?.code || selectedSupplierObj?.strCode,
        supplierName: strSelectedSupplier,
        supplierItemId: "",
        strCode: "",
        strName: "",
        strCategory: "Office Supplies",
        strUnit: "Box",
        strDescription: "",
        intQty: 1,
        floaPrice: 0.00,
        isNewRow: true
      }
    ]);
  };

  // --- SAVE DRAFT ---
  const funcHandleSavePurchaseDraft = async () => {
    if (boolIsLocked) return;
    const unselectedItem = arrPurchaseItems.find(item => !item.strCode);
    if (unselectedItem) {
      funcTriggerToast("Please select a product for all line items first.", "error");
      return;
    }

    const uniqueSupplierNames = Array.from(new Set(arrPurchaseItems.map(item => item.supplierName))).filter(Boolean);
    const strSupplierSummary = uniqueSupplierNames.join(", ") || strSelectedSupplier;

    const floaSubtotal = parseFloat(arrPurchaseItems.reduce((acc, item) => acc + (item.floaPrice * item.intQty), 0).toFixed(2));
    const floaVat = parseFloat((floaSubtotal * 0.05).toFixed(2));
    const floaTotal = parseFloat((floaSubtotal + floaVat).toFixed(2));
    const objNewDraft = {
      strPurchaseNo,
      strSupplier: strSupplierSummary,
      strInvoiceDate,
      strLocation: "Central Office",
      strStatus: "Draft",
      floaSubtotal,
      floaVat,
      floaTotal,
      arrItems: arrPurchaseItems.map(item => ({
        strCode: item.strCode,
        strName: item.strName,
        strCategory: item.strCategory,
        strUnit: item.strUnit,
        intQty: item.intQty,
        floaPrice: item.floaPrice,
        strDescription: item.strDescription || "",
        strColor: item.strColor,
        strTextColor: item.strTextColor,
        strIcon: item.strIcon
      }))
    };

    try {
      const exists = arrPurchases.some(p => p.strPurchaseNo === strPurchaseNo);
      const url = exists 
        ? `http://127.0.0.1:8000/api/purchases/${strPurchaseNo}/`
        : `http://127.0.0.1:8000/api/purchases/`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(objNewDraft)
      });
      
      if (!res.ok) throw new Error("Failed to save draft");
      const data = await res.json();
      const parsed = parsePurchaseFloats(data);
      
      // Update state
      funcSetPurchases(prev => {
        const intIdx = prev.findIndex(d => d.strPurchaseNo === strPurchaseNo);
        if (intIdx !== -1) {
          const arrUpdated = [...prev];
          arrUpdated[intIdx] = parsed;
          return arrUpdated;
        } else {
          return [parsed, ...prev];
        }
      });
      funcTriggerToast(`Draft purchase ${strPurchaseNo} saved successfully!`, "success");
    } catch (err) {
      console.error(err);
      funcTriggerToast("Error saving draft to database", "error");
    }
  };

  const funcHandleApplyPurchaseDraft = (objPur) => {
    funcSetPurchaseNo(objPur.strPurchaseNo);
    funcSetSelectedSupplier(objPur.strSupplier.split(", ")[0]); // set top select to first supplier listed
    funcSetInvoiceDate(objPur.strInvoiceDate);
    
    // Map items from database format to include supplier details from catalog
    const mappedItems = objPur.arrItems.map(item => {
      let supplierName = objPur.strSupplier.split(", ")[0];
      let supplierItemId = null;
      for (const sup of suppliers) {
        const found = sup.items?.find(it => it.code === item.strCode);
        if (found) {
          supplierName = sup.name || sup.strName;
          supplierItemId = found.id;
          break;
        }
      }
      return {
        ...item,
        supplierName,
        supplierItemId,
        strId: item.strId || `item-${Date.now()}-${item.strCode}`
      };
    });
    
    funcSetPurchaseItems(mappedItems);
    funcSetStatus(objPur.strStatus);
    funcSetActiveTab("form");
    funcTriggerToast(`Loaded transaction ${objPur.strPurchaseNo}!`, "success");
  };

  const funcHandleDeletePurchaseDraft = async (strId, event) => {
    if (event) event.stopPropagation();
    const target = arrPurchases.find(p => p.strId === strId || p.id === strId);
    if (!target) return;

    if (window.confirm("Are you sure you want to delete this purchase transaction?")) {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/purchases/${target.strPurchaseNo}/`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete draft");

        funcSetPurchases(prev => prev.filter(d => d.strPurchaseNo !== target.strPurchaseNo));
        funcTriggerToast("Transaction deleted", "warning");
        
        if (target.strPurchaseNo === strPurchaseNo) {
          funcSetPurchases(prev => {
            const nextNo = fnGenerateNextPurchaseNo(prev);
            funcSetPurchaseNo(nextNo);
            return prev;
          });
          funcSetStatus("Draft");
          if (suppliers.length > 0) {
            funcSetSelectedSupplier(suppliers[0].name || suppliers[0].strName);
          } else {
            funcSetSelectedSupplier("Office Mart Trading LLC");
          }
          funcSetInvoiceDate(new Date().toISOString().split('T')[0]);
          funcSetPurchaseItems([]);
        }
      } catch (err) {
        console.error(err);
        funcTriggerToast("Error deleting purchase draft", "error");
      }
    }
  };

  const funcHandleClearAllPurchaseDrafts = (event) => {
    if (event) event.stopPropagation();
    const draftsOnly = arrPurchases.filter(d => d.strStatus === "Draft");
    if (draftsOnly.length === 0) return;
    if (window.confirm("Are you sure you want to delete all saved drafts?")) {
      draftsOnly.forEach(async (d) => {
        try {
          await fetch(`http://127.0.0.1:8000/api/purchases/${d.strPurchaseNo}/`, {
            method: "DELETE"
          });
        } catch (err) {}
      });
      funcSetPurchases(prev => prev.filter(d => d.strStatus !== "Draft"));
      funcTriggerToast("All drafts deleted", "warning");
      if (strStatus === "Draft") {
        funcSetPurchaseItems([]);
      }
    }
  };

  // --- SUBMIT / POST TO STOCK (AND SYNC TO CATALOG) ---
  const funcHandleSubmitPurchase = async (event) => {
    event.preventDefault();
    if (boolIsLocked) return;
    if (arrPurchaseItems.length === 0) {
      funcTriggerToast("Cannot post empty purchase. Please add items.", "error");
      return;
    }
    const unselectedItem = arrPurchaseItems.find(item => !item.strCode);
    if (unselectedItem) {
      funcTriggerToast("Please select a product for all line items first.", "error");
      return;
    }
    
    const floaSubtotal = parseFloat(arrPurchaseItems.reduce((floaAcc, objItem) => floaAcc + (objItem.floaPrice * objItem.intQty), 0).toFixed(2));
    const floaVat = parseFloat((floaSubtotal * 0.05).toFixed(2));
    const floaTotal = parseFloat((floaSubtotal + floaVat).toFixed(2));

    const uniqueSupplierNames = Array.from(new Set(arrPurchaseItems.map(item => item.supplierName))).filter(Boolean);
    const strSupplierSummary = uniqueSupplierNames.join(", ") || strSelectedSupplier;
    
    const objSummary = {
      strPurchaseNo,
      strSupplier: strSupplierSummary,
      strInvoiceDate,
      strLocation: "Central Office",
      strStatus: "Posted",
      floaSubtotal,
      floaVat,
      floaTotal,
      arrItems: arrPurchaseItems.map(item => ({
        strCode: item.strCode,
        strName: item.strName,
        strCategory: item.strCategory,
        strUnit: item.strUnit,
        intQty: item.intQty,
        floaPrice: item.floaPrice,
        strDescription: item.strDescription || "",
        strColor: item.strColor,
        strTextColor: item.strTextColor,
        strIcon: item.strIcon
      }))
    };

    funcTriggerToast("Posting stock levels to inventory database...", "info");

    try {
      const exists = arrPurchases.some(p => p.strPurchaseNo === strPurchaseNo);
      const url = exists 
        ? `http://127.0.0.1:8000/api/purchases/${strPurchaseNo}/`
        : `http://127.0.0.1:8000/api/purchases/`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(objSummary)
      });
      
      if (!res.ok) throw new Error("Failed to post purchase");
      const data = await res.json();
      const parsed = parsePurchaseFloats(data);
      
      // Refresh local catalog cache
      const itemsRes = await fetch("http://127.0.0.1:8000/api/items/");
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setCatalogItems(itemsData);
      }
      
      // Update purchases history
      funcSetPurchases(prev => {
        const intIdx = prev.findIndex(p => p.strPurchaseNo === strPurchaseNo);
        if (intIdx !== -1) {
          const arrUpdated = [...prev];
          arrUpdated[intIdx] = parsed;
          return arrUpdated;
        } else {
          return [parsed, ...prev];
        }
      });

      funcSetStatus("Posted");
      const modalData = {
        ...parsed,
        intTotalItems: parsed.arrItems.length,
        intTotalQty: parsed.arrItems.reduce((acc, it) => acc + it.intQty, 0),
      };
      funcSetPurchaseSuccessModalData(modalData);
      funcSetShowPurchaseSuccessModal(true);
      
      funcSetNotifications(prev => [
        {
          intId: Date.now(),
          strType: 'purchase_posted',
          strText: `Purchase "${strPurchaseNo}" posted to stock at Central by Ramesh K`,
          strTime: 'Just now'
        },
        ...prev
      ]);
      
      funcTriggerToast(`Purchase ${strPurchaseNo} successfully posted to stock!`, "success");
      if (funcCheckLowStock) funcCheckLowStock();
    } catch (err) {
      console.error(err);
      funcTriggerToast("Error posting purchase to database", "error");
    }
  };

  // --- REVERSED VIA ADJUSTMENT (DECREMENT STOCK) ---
  const funcHandleReversePurchase = async () => {
    if (window.confirm(`Are you sure you want to reverse Purchase ${strPurchaseNo}? This will offset the inventory stock at Central location.`)) {
      funcTriggerToast("Offsetting stock levels in database...", "info");
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/purchases/${strPurchaseNo}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strStatus: "Reversed" })
        });
        
        if (!res.ok) throw new Error("Failed to reverse purchase");
        const data = await res.json();
        const parsed = parsePurchaseFloats(data);
        
        // Refresh local catalog cache
        const itemsRes = await fetch("http://127.0.0.1:8000/api/items/");
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          setCatalogItems(itemsData);
        }
        
        // Mark as Reversed in state
        funcSetPurchases(prev => prev.map(p => {
          if (p.strPurchaseNo === strPurchaseNo) {
            return parsed;
          }
          return p;
        }));
        
        funcSetStatus("Reversed");
        
        funcSetNotifications(prev => [
          {
            intId: Date.now(),
            strType: 'stock_adjusted',
            strText: `Reversal Adjustment for "${strPurchaseNo}" posted to Central Office stock by Ramesh K`,
            strTime: 'Just now'
          },
          ...prev
        ]);
        
        funcTriggerToast(`Purchase ${strPurchaseNo} successfully reversed!`, "warning");
        if (funcCheckLowStock) funcCheckLowStock();
        
        // Auto transition back to a fresh New Purchase after brief delay
        setTimeout(() => {
          funcSetPurchases(prev => {
            const strNextNo = fnGenerateNextPurchaseNo(prev);
            funcSetPurchaseNo(strNextNo);
            return prev;
          });
          funcSetStatus("Draft");
          if (suppliers.length > 0) {
            funcSetSelectedSupplier(suppliers[0].name || suppliers[0].strName);
          } else {
            funcSetSelectedSupplier("Office Mart Trading LLC");
          }
          funcSetInvoiceDate(new Date().toISOString().split('T')[0]);
          funcSetPurchaseItems([]);
        }, 1800);
      } catch (err) {
        console.error(err);
        funcTriggerToast("Error reversing purchase in database", "error");
      }
    }
  };

  // --- REVERSED VIA ADJUSTMENT BY DOCUMENT NUMBER ---
  const funcHandleReversePurchaseByNo = async (strTargetNo) => {
    if (window.confirm(`Are you sure you want to reverse Purchase ${strTargetNo}? This will offset the inventory stock at Central location.`)) {
      funcTriggerToast("Offsetting stock levels in database...", "info");
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/purchases/${strTargetNo}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strStatus: "Reversed" })
        });
        
        if (!res.ok) throw new Error("Failed to reverse purchase");
        const data = await res.json();
        const parsed = parsePurchaseFloats(data);
        
        // Refresh local catalog cache
        const itemsRes = await fetch("http://127.0.0.1:8000/api/items/");
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          setCatalogItems(itemsData);
        }
        
        // Mark as Reversed in state
        funcSetPurchases(prev => prev.map(p => {
          if (p.strPurchaseNo === strTargetNo) {
            return parsed;
          }
          return p;
        }));
        
        if (strPurchaseNo === strTargetNo) {
          funcSetStatus("Reversed");
        }
        
        funcSetNotifications(prev => [
          {
            intId: Date.now(),
            strType: 'stock_adjusted',
            strText: `Reversal Adjustment for "${strTargetNo}" posted to Central Office stock by Ramesh K`,
            strTime: 'Just now'
          },
          ...prev
        ]);
        
        funcTriggerToast(`Purchase ${strTargetNo} successfully reversed!`, "warning");
        if (funcCheckLowStock) funcCheckLowStock();
      } catch (err) {
        console.error(err);
        funcTriggerToast("Error reversing purchase in database", "error");
      }
    }
  };

  // --- START FRESH NEW TRANSACTION ---
  const funcHandleNewPurchase = () => {
    const strNextNo = fnGenerateNextPurchaseNo(arrPurchases);
    funcSetPurchaseNo(strNextNo);
    funcSetStatus("Draft");
    if (suppliers.length > 0) {
      funcSetSelectedSupplier(suppliers[0].name || suppliers[0].strName);
    } else {
      funcSetSelectedSupplier("Office Mart Trading LLC");
    }
    funcSetInvoiceDate(new Date().toISOString().split('T')[0]);
    funcSetPurchaseItems([]);
    funcTriggerToast("Started new purchase transaction", "info");
  };

  const funcHandleResetPurchase = () => {
    funcSetShowPurchaseSuccessModal(false);
    funcSetPurchaseSuccessModalData(null);
    funcSetPurchases(prev => {
      const strNextNo = fnGenerateNextPurchaseNo(prev);
      funcSetPurchaseNo(strNextNo);
      return prev;
    });
    funcSetStatus("Draft");
    if (suppliers.length > 0) {
      funcSetSelectedSupplier(suppliers[0].name || suppliers[0].strName);
    } else {
      funcSetSelectedSupplier("Office Mart Trading LLC");
    }
    funcSetInvoiceDate(new Date().toISOString().split('T')[0]);
    funcSetPurchaseItems([]);
  };

  const funcFormatDate = (strDateStr) => {
    if (!strDateStr) return "";
    const arrParts = strDateStr.split("-");
    if (arrParts.length === 3) {
      return `${arrParts[2]}/${arrParts[1]}/${arrParts[0]}`;
    }
    return strDateStr;
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
      <div className="purchase-page">
        {/* Breadcrumbs */}
        <div className="breadcrumbs">
          Operations <i className="ti ti-chevron-right"></i> <span className="active">Purchase</span>
        </div>
        
        {/* Page Header */}
        <div className="page-header-req">
          <div>
            <h1 className="page-title-req">Central Stock Purchase</h1>
            <p className="page-sub-req">
              Stock-in first entering the system. Automatically posts to the Central Office location inventory.
            </p>
          </div>
          <div className="header-actions-req">
            {strActiveTab === 'form' ? (
              <>
                {boolIsLocked ? (
                  <>
                    {strStatus === "Posted" && (
                      <button type="button" className="btn-post-pur" onClick={funcHandleReversePurchase} style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' }}>
                        <i className="ti ti-rotate-clockwise"></i> Reverse via Adjustment
                      </button>
                    )}
                    <button type="button" className="btn-draft-req" onClick={funcHandleNewPurchase} style={{ backgroundColor: 'var(--purple-mid)', color: 'white' }}>
                      <i className="ti ti-plus"></i> New Purchase
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-draft-req" onClick={funcHandleSavePurchaseDraft}>
                      <i className="ti ti-device-floppy"></i> Save draft
                    </button>

                    <button type="button" className="btn-post-pur" onClick={funcHandleSubmitPurchase}>
                      <i className="ti ti-circle-check"></i> Post to stock
                    </button>
                  </>
                )}
              </>
            ) : (
              <button 
                type="button" 
                className="btn-add" 
                onClick={() => {
                  funcHandleNewPurchase();
                  funcSetActiveTab('form');
                }}
              >
                <i className="ti ti-plus"></i> New Purchase
              </button>
            )}
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="purchase-tabs-nav">
          <button 
            type="button" 
            className={`purchase-tab-btn ${strActiveTab === 'form' ? 'active' : ''}`}
            onClick={() => funcSetActiveTab('form')}
          >
            <i className="ti ti-file-plus"></i> Purchase Form ({strStatus === 'Draft' ? 'Draft' : strStatus})
          </button>
          <button 
            type="button" 
            className={`purchase-tab-btn ${strActiveTab === 'reports' ? 'active' : ''}`}
            onClick={() => funcSetActiveTab('reports')}
          >
            <i className="ti ti-file-analytics"></i> Purchase Reports & History
          </button>
        </div>

        {strActiveTab === 'form' ? (
          <>
            {/* Locked Document Alert Banner */}
            {boolIsLocked && (
              <div className="posted-lock-banner" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                backgroundColor: strStatus === 'Reversed' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                borderLeft: strStatus === 'Reversed' ? '4px solid #ef4444' : '4px solid #10b981',
                borderRadius: '12px',
                color: 'var(--text-main)',
                marginBottom: '20px',
                fontSize: '13.5px',
                fontWeight: '500',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <i className={`ti ti-${strStatus === 'Reversed' ? 'rotate-clockwise' : 'lock'}`} style={{ fontSize: '18px', color: strStatus === 'Reversed' ? '#ef4444' : '#10b981' }}></i>
                <div>
                  {strStatus === 'Reversed' ? (
                    <span>
                      <strong>REVERSED DOCUMENT:</strong> This purchase document ({strPurchaseNo}) has been <strong>reversed via stock adjustment</strong>. Central stock balance has been offset.
                    </span>
                  ) : (
                    <span>
                      <strong>POSTED & LOCKED:</strong> This purchase document ({strPurchaseNo}) was successfully <strong>posted to Central stock</strong>. Editing is locked. To correct stock, use the <strong>Reverse via Adjustment</strong> action.
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Purchase Fields Card */}
            <div className="purchase-form-card">
              <div className="purchase-form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {/* Purchase No */}
                <div className="form-group-pur">
                  <label className="form-label-pur">Purchase No.</label>
                  <div className="input-with-icon-pur">
                    <i className="ti ti-file-text input-icon-pur"></i>
                    <input 
                      type="text" 
                      className="form-input-pur read-only" 
                      value={strPurchaseNo} 
                      readOnly 
                    />
                  </div>
                </div>

                {/* Destination Location */}
                <div className="form-group-pur">
                  <label className="form-label-pur">Destination Location</label>
                  <div className="input-with-icon-pur">
                    <i className="ti ti-map-pin input-icon-pur"></i>
                    <input 
                      type="text" 
                      className="form-input-pur read-only" 
                      value="Central Office" 
                      readOnly 
                      disabled
                    />
                  </div>
                </div>

                {/* Invoice Date */}
                <div className="form-group-pur">
                  <label className="form-label-pur">Invoice Date</label>
                  <div className="input-with-icon-pur">
                    <i className="ti ti-calendar input-icon-pur"></i>
                    <input 
                      type="date" 
                      className="form-input-pur" 
                      value={strInvoiceDate} 
                      onChange={(e) => funcSetInvoiceDate(e.target.value)}
                      disabled={boolIsLocked}
                    />
                  </div>
                </div>
              </div>

              <div className="purchase-form-row" style={{ gridTemplateColumns: '1fr 2fr', marginTop: '16px' }}>
                {/* Supplier select */}
                <div className="form-group-pur">
                  <label className="form-label-pur">Active Supplier</label>
                  <div className="input-with-icon-pur">
                    <i className="ti ti-building input-icon-pur"></i>
                    <select 
                      className="form-select-pur" 
                      value={strSelectedSupplier} 
                      onChange={(e) => {
                        funcSetSelectedSupplier(e.target.value);
                      }}
                      disabled={boolIsLocked}
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.name || sup.strName}>{sup.name || sup.strName}</option>
                      ))}
                    </select>
                    <i className="ti ti-chevron-down select-chevron-pur"></i>
                  </div>
                </div>

                {/* Custom Product dropdown selector */}
                <div className="form-group-pur" ref={refProductDropdown}>
                  <label className="form-label-pur">Select Product to Add</label>
                  <div className="custom-product-select-container">
                    <div 
                      className={`custom-product-select-trigger ${boolIsLocked || !strSelectedSupplier ? 'disabled' : ''}`}
                      onClick={() => {
                        if (boolIsLocked || !strSelectedSupplier) return;
                        funcSetShowProductDropdown(prev => !prev);
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="ti ti-package" style={{ color: 'var(--purple-mid)' }}></i>
                        {strSelectedSupplier ? "Choose a product..." : "Please select a supplier first"}
                      </span>
                      <i className={`ti ti-chevron-${boolShowProductDropdown ? 'up' : 'down'}`} style={{ color: 'var(--text-soft)' }}></i>
                    </div>

                    {boolShowProductDropdown && (
                      <div className="custom-product-select-dropdown">
                        <div className="custom-product-search-wrapper">
                          <i className="ti ti-search"></i>
                          <input 
                            type="text" 
                            className="custom-product-search-input"
                            placeholder="Type to search product name or code..."
                            value={strProductSearchQuery}
                            onChange={(e) => funcSetProductSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // don't close when clicking input
                            autoFocus
                          />
                        </div>
                        <div className="custom-product-options-list">
                          {arrFilteredAvailableItems.length === 0 ? (
                            <div className="custom-product-select-no-results">
                              {!strSelectedSupplier 
                                ? "Please select a supplier first" 
                                : "No matching products found"}
                            </div>
                          ) : (
                            arrFilteredAvailableItems.map(itm => {
                              const itmCat = itm.category?.name || itm.category || "Office Supplies";
                              let bg = "#e0e7ff";
                              let tc = "#4f46e5";
                              let ic = "ti-file-text";
                              if (itmCat === "Furniture") { bg = "#fef3c7"; tc = "#d97706"; ic = "ti-armchair"; }
                              else if (itmCat === "Electronics") { bg = "#d1fae5"; tc = "#059669"; ic = "ti-device-laptop"; }
                              else if (itmCat === "Printer Essentials") { bg = "#fce7f3"; tc = "#db2777"; ic = "ti-printer"; }
                              else if (itmCat === "Consumables") { bg = "#fee2e2"; tc = "#ef4444"; ic = "ti-trash"; }

                              return (
                                <div 
                                  key={itm.id} 
                                  className="custom-product-option-item"
                                  onClick={() => funcHandleSelectProduct(itm)}
                                >
                                  <div className="custom-product-option-item-left">
                                    <div className="custom-product-option-thumbnail" style={{ background: bg, color: tc }}>
                                      <i className={`ti ${ic}`}></i>
                                    </div>
                                    <div className="custom-product-option-info">
                                      <span className="custom-product-option-name">{itm.name}</span>
                                      <span className="custom-product-option-code">Code: {itm.code}</span>
                                    </div>
                                  </div>
                                  <div className="custom-product-option-right">
                                    <span className="custom-product-option-price">${parseFloat(itm.price || 0).toFixed(2)}</span>
                                    <span className="custom-product-option-badge" style={{ background: bg, color: tc }}>{itmCat}</span>
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
              </div>
            </div>

            {/* Purchase Items List Card */}
            <div className="purchase-items-card">
              <div className="purchase-items-header">
                <h3 className="card-section-title">Line Items</h3>
                {!boolIsLocked && (
                  <div className="purchase-add-line-container" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Select items from the catalog above to add to your purchase list.
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="purchase-table-wrap">
                {arrPurchaseItems.length === 0 ? (
                  <div className="empty-items-placeholder">
                    <div className="empty-cart-icon">
                      <i className="ti ti-shopping-cart"></i>
                    </div>
                    <p>Your purchase list is empty</p>
                    {!boolIsLocked && (
                      <p style={{ fontSize: '11.5px', color: 'var(--text-soft)', marginTop: '4px', fontWeight: '400' }}>
                        Choose a product from the dropdown above to add it to your purchase.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>#</th>
                          <th>ITEM</th>
                          <th>CATEGORY & UNIT</th>
                          <th style={{ width: '120px' }}>QTY</th>
                          <th style={{ width: '140px' }}>UNIT COST</th>
                          <th>LINE TOTAL</th>
                          {!boolIsLocked && <th style={{ textAlign: 'right', width: '80px' }}>ACTIONS</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {arrPurchaseItems.map((objItem, intIndex) => {
                          return (
                            <tr key={objItem.strId} className="req-item-row">
                              <td style={{ fontWeight: '600', color: 'var(--text-soft)' }}>{intIndex + 1}</td>
                              
                              {/* 1. ITEM DETAILS */}
                              <td>
                                <div className="item-cell-req" style={{ width: '100%' }}>
                                  {funcRenderItemThumbnail(objItem)}
                                  <div className="item-details-req" style={{ flex: 1 }}>
                                    <div className="item-title-req">{objItem.strName}</div>
                                    <div className="item-desc-req" style={{ fontSize: '10.5px' }}>
                                      Item No: {objItem.strCode}
                                      {objItem.supplierItemId && ` • Supp ID: ${objItem.supplierItemId}`}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--purple-mid)', fontWeight: '600', marginTop: '2px' }}>
                                      Supplier: {objItem.supplierName}
                                    </div>
                                    
                                    {/* Inline Description/Remarks Field */}
                                    <div style={{ marginTop: '6px', width: '100%' }}>
                                      {boolIsLocked ? (
                                        objItem.strDescription && (
                                          <div style={{ fontSize: '11px', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                                            "{objItem.strDescription}"
                                          </div>
                                        )
                                      ) : (
                                        <input
                                          type="text"
                                          placeholder="Remarks/Description notes..."
                                          value={objItem.strDescription || ""}
                                          onChange={(e) => {
                                            const desc = e.target.value;
                                            funcSetPurchaseItems(prev => prev.map(item => 
                                              item.strId === objItem.strId ? { ...item, strDescription: desc } : item
                                            ));
                                          }}
                                          style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', outline: 'none', background: 'var(--bg-white)', color: 'var(--text-main)' }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. CATEGORY & UNIT */}
                              <td>
                                <span className="role-badge role-branch" style={{ background: "var(--sidebar-bg)", color: "var(--purple-dark)" }}>
                                  {objItem.strCategory || "Office Supplies"}
                                </span>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  Unit: {objItem.strUnit || "Box"}
                                </div>
                              </td>

                              {/* 4. QUANTITY */}
                              <td>
                                {boolIsLocked ? (
                                  <span style={{ fontWeight: '600', fontSize: '13.5px', paddingLeft: '8px' }}>{objItem.intQty} {objItem.strUnit}</span>
                                ) : (
                                  <div className="qty-counter-req">
                                    <button 
                                      type="button" 
                                      className="qty-btn-req decrement"
                                      onClick={() => funcHandlePurchaseQtyChange(objItem.strId, -1)}
                                    >
                                      <i className="ti ti-minus"></i>
                                    </button>
                                    <input 
                                      type="number" 
                                      className="qty-input-req" 
                                      value={objItem.intQty}
                                      onChange={(e) => {
                                        e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
                                        funcHandlePurchaseQtyInput(objItem.strId, e.target.value);
                                      }}
                                      min="1"
                                    />
                                    <button 
                                      type="button" 
                                      className="qty-btn-req increment"
                                      onClick={() => funcHandlePurchaseQtyChange(objItem.strId, 1)}
                                    >
                                      <i className="ti ti-plus"></i>
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* 5. UNIT COST */}
                              <td>
                                <span style={{ fontWeight: '600', fontSize: '13.5px', paddingLeft: '4px' }}>${parseFloat(objItem.floaPrice || 0).toFixed(2)}</span>
                              </td>


                              {/* 6. LINE TOTAL */}
                              <td className="total-cell-val-req" style={{ fontWeight: '700' }}>
                                ${(objItem.floaPrice * objItem.intQty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* 7. ACTIONS (DELETE) */}
                              {!boolIsLocked && (
                                <td>
                                  <div className="actions-cell-req" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button 
                                      type="button" 
                                      className="btn-delete-req" 
                                      onClick={() => funcHandleDeletePurchaseItem(objItem.strId)}
                                      title="Delete item"
                                    >
                                      <i className="ti ti-trash"></i>
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Purchase totals block at bottom */}
                    <div className="purchase-totals-container">
                      <div className="purchase-totals-table">
                        <div className="purchase-total-row">
                          <span className="label">Subtotal</span>
                          <span className="value">
                            ${arrPurchaseItems.reduce((floaAcc, objItem) => floaAcc + (objItem.floaPrice * objItem.intQty), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="purchase-total-row">
                          <span className="label">VAT (5%)</span>
                          <span className="value">
                            ${(arrPurchaseItems.reduce((floaAcc, objItem) => floaAcc + (objItem.floaPrice * objItem.intQty), 0) * 0.05).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="purchase-total-row grand-total">
                          <span className="label">Total</span>
                          <span className="value">
                            ${(arrPurchaseItems.reduce((floaAcc, objItem) => floaAcc + (objItem.floaPrice * objItem.intQty), 0) * 1.05).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      
                      {!boolIsLocked && (
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                          <button 
                            type="button" 
                            className="btn-clear-all-req"
                            onClick={funcHandleClearAllPurchase}
                            disabled={arrPurchaseItems.length === 0}
                          >
                            <i className="ti ti-trash"></i> Clear all
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="purchase-reports-container">
            {/* Stats Summary Grid */}
            <div className="purchase-stats-grid">
              <div className="purchase-stat-card">
                <div className="stat-card-left">
                  <div className="stat-icon" style={{ background: 'rgba(124, 58, 237, 0.12)', color: 'var(--purple-mid)' }}>
                    <i className="ti ti-receipt"></i>
                  </div>
                  <div className="stat-num">{objReportMetrics.totalOrders}</div>
                  <div className="stat-label">Total Transactions</div>
                </div>
              </div>
              
              <div className="purchase-stat-card">
                <div className="stat-card-left">
                  <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--green)' }}>
                    <i className="ti ti-currency-dollar"></i>
                  </div>
                  <div className="stat-num">
                    ${objReportMetrics.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="stat-label">Total Posted Spent</div>
                </div>
              </div>

              <div className="purchase-stat-card">
                <div className="stat-card-left">
                  <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#b45309' }}>
                    <i className="ti ti-folder-open"></i>
                  </div>
                  <div className="stat-num">{objReportMetrics.activeDrafts}</div>
                  <div className="stat-label">Active Drafts</div>
                </div>
              </div>

              <div className="purchase-stat-card">
                <div className="stat-card-left">
                  <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--red)' }}>
                    <i className="ti ti-rotate-clockwise-2"></i>
                  </div>
                  <div className="stat-num">{objReportMetrics.reversedOrders}</div>
                  <div className="stat-label">Reversed Documents</div>
                </div>
              </div>
            </div>

            {/* Reports List Card */}
            <div className="purchase-items-card">
              <div className="purchase-items-header">
                <h3 className="card-section-title">Transactions Report</h3>
                
                {/* Filters Row */}
                <div className="purchase-filters-bar">
                  {/* Text search */}
                  <div className="purchase-search-input-wrap">
                    <i className="ti ti-search search-icon"></i>
                    <input 
                      type="text" 
                      placeholder="Search by doc no, supplier, items..." 
                      value={strPurchaseDraftSearchQuery}
                      onChange={(e) => funcSetSearchPurchaseDraftSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Status filter select */}
                  <div className="filter-select-group">
                    <label className="filter-select-label">Status</label>
                    <select
                      className="filter-select-dropdown"
                      value={strStatusFilter}
                      onChange={(e) => funcSetStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Draft">Draft</option>
                      <option value="Posted">Posted</option>
                      <option value="Reversed">Reversed</option>
                    </select>
                  </div>

                  {/* Supplier filter select */}
                  <div className="filter-select-group">
                    <label className="filter-select-label">Supplier</label>
                    <select
                      className="filter-select-dropdown"
                      value={strSupplierFilter}
                      onChange={(e) => funcSetSupplierFilter(e.target.value)}
                    >
                      <option value="All">All Suppliers</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.name || sup.strName}>{sup.name || sup.strName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Reports Table Grid */}
              <div className="purchase-table-wrap">
                {arrFilteredPurchases.length === 0 ? (
                  <div className="empty-items-placeholder">
                    <div className="empty-cart-icon" style={{ color: 'var(--text-soft)' }}>
                      <i className="ti ti-file-search"></i>
                    </div>
                    <p>No transactions match your search filter criteria</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Doc No</th>
                        <th>Invoice Date</th>
                        <th>Supplier(s)</th>
                        <th>Items Summary</th>
                        <th style={{ textAlign: 'center' }}>Total Qty</th>
                        <th style={{ textAlign: 'right' }}>Total Value</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrFilteredPurchases.map(objPur => {
                        const subtotal = objPur.arrItems.reduce((sum, item) => sum + (item.floaPrice * item.intQty), 0);
                        const grandTotal = subtotal * 1.05;
                        const totalQty = objPur.arrItems.reduce((acc, item) => acc + item.intQty, 0);
                        
                        return (
                          <tr key={objPur.strId} className="req-item-row">
                            <td style={{ fontWeight: '700', color: 'var(--purple-mid)' }}>
                              {objPur.strPurchaseNo}
                            </td>
                            <td>{funcFormatDate(objPur.strInvoiceDate)}</td>
                            <td style={{ fontWeight: '600', fontSize: '12px' }}>{objPur.strSupplier}</td>
                            <td>
                              <div className="items-summary-preview" title={objPur.arrItems.map(it => `${it.strName} (x${it.intQty})`).join(', ')}>
                                {objPur.arrItems.map(it => `${it.strName} (x${it.intQty})`).join(', ')}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: '500' }}>
                              {totalQty}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
                              ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {objPur.strStatus === "Draft" ? (
                                <span className="purchase-badge badge-draft">DRAFT</span>
                              ) : objPur.strStatus === "Posted" ? (
                                <span className="purchase-badge badge-posted">POSTED</span>
                              ) : (
                                <span className="purchase-badge badge-reversed">REVERSED</span>
                              )}
                            </td>
                            <td>
                              <div className="actions-cell-req" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                                <button 
                                  type="button" 
                                  className="action-btn" 
                                  style={{ background: 'rgba(124, 58, 237, 0.08)', color: 'var(--purple-mid)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                  onClick={() => funcHandleApplyPurchaseDraft(objPur)}
                                  title="Load & View Document"
                                >
                                  <i className="ti ti-eye"></i>
                                </button>
                                
                                {objPur.strStatus === "Posted" && (
                                  <button 
                                    type="button" 
                                    className="action-btn" 
                                    style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--red)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                    onClick={() => funcHandleReversePurchaseByNo(objPur.strPurchaseNo)}
                                    title="Reverse via Adjustment"
                                  >
                                    <i className="ti ti-rotate-clockwise"></i>
                                  </button>
                                )}
                                
                                {objPur.strStatus === "Draft" && (
                                  <button 
                                    type="button" 
                                    className="action-btn" 
                                    style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--red)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                    onClick={(e) => funcHandleDeletePurchaseDraft(objPur.strId, e)}
                                    title="Delete Draft"
                                  >
                                    <i className="ti ti-trash"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: PURCHASE POST SUCCESS ── */}
      {boolShowPurchaseSuccessModal && objPurchaseSuccessModalData && (
        <div className="modal-overlay success-modal-blur" onClick={() => funcSetShowPurchaseSuccessModal(false)}>
          <div className="modal-container success-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon-large" style={{ color: 'var(--green)' }}>
              <i className="ti ti-circle-check"></i>
            </div>
            <h3 className="success-title">Purchase Posted to Central Stock</h3>
            <p className="success-desc">
              Purchase invoice <strong>{objPurchaseSuccessModalData.strPurchaseNo}</strong> has been successfully posted. Central stock balance has been updated (+IN).
            </p>
            
            <div className="success-details-box">
              <div className="success-detail-row" style={{ gridColumn: 'span 2' }}>
                <span>Supplier(s):</span>
                <strong style={{ fontSize: '13px' }}>
                  {objPurchaseSuccessModalData.strSupplier}
                </strong>
              </div>
              <div className="success-detail-row">
                <span>Invoice Date:</span>
                <strong>{funcFormatDate(objPurchaseSuccessModalData.strInvoiceDate)}</strong>
              </div>
              <div className="success-detail-row">
                <span>Destination:</span>
                <strong>Central Office</strong>
              </div>
              <div className="success-detail-row">
                <span>Total Items:</span>
                <strong>{objPurchaseSuccessModalData.intTotalItems}</strong>
              </div>
              <div className="success-detail-row">
                <span>Total Qty:</span>
                <strong>{objPurchaseSuccessModalData.intTotalQty}</strong>
              </div>
              <div className="success-detail-row">
                <span>Subtotal:</span>
                <strong>${objPurchaseSuccessModalData.floaSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div className="success-detail-row">
                <span>VAT (5%):</span>
                <strong>${objPurchaseSuccessModalData.floaVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div className="success-detail-row" style={{ gridColumn: 'span 2' }}>
                <span>Total Value:</span>
                <strong className="text-purple" style={{ fontSize: '16px', color: 'var(--green)' }}>
                  ${objPurchaseSuccessModalData.floaTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div className="success-items-list">
              <div className="success-list-header">POSTED STOCK ITEMS DETAIL</div>
              <div className="success-list-body">
                {objPurchaseSuccessModalData.arrItems.map(objItem => (
                  <div key={objItem.strId} className="success-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontWeight: '600' }}>
                      <span className="item-name" style={{ fontSize: '12.5px', color: 'var(--text-main)' }}>
                        {objItem.strName}{" "}
                        <span className="mono" style={{ color: 'var(--text-soft)', fontSize: '11px' }}>({objItem.strCode})</span>
                      </span>
                      <strong className="item-qty" style={{ color: 'var(--purple-mid)', fontSize: '12.5px' }}>
                        {objItem.intQty} {objItem.strUnit}s
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>Cat: {objItem.strCategory} • Supplier: {objItem.supplierName}</span>
                      <span>Cost: ${parseFloat(objItem.floaPrice || 0).toFixed(2)} — Line Total: ${(objItem.floaPrice * objItem.intQty).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {objItem.strDescription && (
                      <div style={{ fontSize: '10.5px', color: 'var(--text-soft)', fontStyle: 'italic', marginTop: '4px' }}>
                        Remarks: "{objItem.strDescription}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="button" 
              className="btn-success-done"
              onClick={funcHandleResetPurchase}
              style={{ backgroundColor: 'var(--green)' }}
            >
              Post New Purchase
            </button>
          </div>
        </div>
      )}
    </>
  );
}
