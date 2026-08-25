import React, { useState, useEffect, useMemo } from 'react';

const StockBalance = ({ triggerToast }) => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [expandedLocs, setExpandedLocs] = useState({ 'Central Office': true });

  const fetchStockBalance = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/stock-balance/");
      if (!res.ok) throw new Error("Failed to fetch stock balance");
      const data = await res.json();
      setStock(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      triggerToast("Error fetching stock balance", "error");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockBalance();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(stock.map(item => item.strCategory));
    return Array.from(cats).filter(Boolean);
  }, [stock]);

  const locationGroups = useMemo(() => {
    const groups = {};
    
    // Ensure Central Office is initialized
    groups['Central Office'] = {
      location: 'Central Office',
      items: [],
      totalQty: 0,
      totalValuation: 0,
      totalSKUs: 0
    };

    stock.forEach(item => {
      const loc = item.strLocation || 'Central Office';
      if (!groups[loc]) {
        groups[loc] = {
          location: loc,
          items: [],
          totalQty: 0,
          totalValuation: 0,
          totalSKUs: 0
        };
      }
      
      const qty = item.intCurrentStock || 0;
      const val = qty * (item.floaPrice || 0);
      
      groups[loc].items.push(item);
      groups[loc].totalQty += qty;
      groups[loc].totalValuation += val;
      groups[loc].totalSKUs += 1;
    });

    const keys = Object.keys(groups);

    return keys.map(k => groups[k]);
  }, [stock]);

  const filteredLocationGroups = useMemo(() => {
    return locationGroups.map(group => {
      const filteredItems = group.items.filter(item => {
        const matchesSearch = (item.strCode + item.strName).toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'All categories' || item.strCategory === categoryFilter;
        
        let matchesStatus = true;
        if (statusFilter === 'Low Stock') {
          matchesStatus = item.intCurrentStock < item.intReorderLevel && item.intCurrentStock > 0;
        } else if (statusFilter === 'Out of Stock') {
          matchesStatus = item.intCurrentStock === 0;
        } else if (statusFilter === 'Healthy Stock') {
          matchesStatus = item.intCurrentStock >= item.intReorderLevel;
        }

        return matchesSearch && matchesCategory && matchesStatus;
      });

      const totalQty = filteredItems.reduce((sum, item) => sum + (item.intCurrentStock || 0), 0);
      const totalValuation = filteredItems.reduce((sum, item) => sum + (item.intCurrentStock || 0) * (item.floaPrice || 0), 0);

      return {
        ...group,
        items: filteredItems,
        totalQty,
        totalValuation,
        totalSKUs: filteredItems.length
      };
    }).filter(group => group.items.length > 0 || search === '');
  }, [locationGroups, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const uniqueSKUs = new Set(stock.map(item => item.strCode)).size;
    const totalStockQty = stock.reduce((sum, item) => sum + (item.intCurrentStock || 0), 0);
    const totalValuation = stock.reduce((sum, item) => sum + (item.intCurrentStock || 0) * (item.floaPrice || 0), 0);
    const lowStockCount = stock.filter(item => item.strLocation === 'Central Office' && item.intCurrentStock < item.intReorderLevel).length;

    return { totalSKUs: uniqueSKUs, totalStockQty, totalValuation, lowStockCount };
  }, [stock]);

  const toggleLocation = (locName) => {
    setExpandedLocs(prev => ({
      ...prev,
      [locName]: !prev[locName]
    }));
  };

  return (
    <div className="items-page" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div style={{ fontSize: "12px", color: "var(--text-soft)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.02em" }}>
        Insight / Stock Balance
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Stock Balance</div>
          <div className="page-sub">View inventory balances segregated by location (Central and Branches).</div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="stat-grid" style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Total SKUs</span>
          <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>{stats.totalSKUs}</span>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Total Stock Qty</span>
          <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-main)' }}>{stats.totalStockQty}</span>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Total Valuation</span>
          <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--purple-mid)' }}>${stats.totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Low Stock (Central)</span>
          <span style={{ fontSize: '28px', fontWeight: '700', color: stats.lowStockCount > 0 ? 'var(--red)' : 'var(--green)' }}>{stats.lowStockCount}</span>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filters-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
        <div className="search-users">
          <i className="ti ti-search"></i>
          <input
            type="text"
            placeholder="Search code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-right" style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
          <select 
            className="select-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ appearance: "auto", border: "1px solid var(--border)", background: "var(--bg-white)", height: '40px', borderRadius: '8px', padding: '0 12px', color: 'var(--text-main)' }}
          >
            <option value="All categories">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select 
            className="select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ appearance: "auto", border: "1px solid var(--border)", background: "var(--bg-white)", height: '40px', borderRadius: '8px', padding: '0 12px', color: 'var(--text-main)' }}
          >
            <option value="All statuses">All statuses (Central)</option>
            <option value="Healthy Stock">Healthy Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* COLLAPSIBLE LOCATION GROUPS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-soft)" }}>Loading stock balances...</div>
        ) : (
          filteredLocationGroups.map((group) => {
            const isExpanded = !!expandedLocs[group.location];
            
            return (
              <div 
                key={group.location} 
                className="matrix-card" 
                style={{ 
                  background: 'var(--bg-white)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Location Header Section */}
                <div 
                  onClick={() => toggleLocation(group.location)}
                  style={{ 
                    padding: '16px 24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    cursor: 'pointer',
                    background: group.location === 'Central Office' ? 'rgba(124, 58, 237, 0.02)' : 'transparent',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i 
                      className={`ti ti-${group.location === 'Central Office' ? 'building' : 'building-warehouse'}`} 
                      style={{ 
                        fontSize: '20px', 
                        color: group.location === 'Central Office' ? 'var(--purple-mid)' : 'var(--text-soft)' 
                      }}
                    ></i>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                        {group.location === 'Central Office' ? 'Central Office Inventory' : `${group.location} Branch Stock`}
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-soft)', margin: '2px 0 0 0' }}>
                        {group.totalSKUs} SKU(s) cataloged
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Total Qty</span>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {group.totalQty} units
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-soft)', textTransform: 'uppercase' }}>Valuation</span>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--purple-mid)' }}>
                        ${group.totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <i 
                      className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} 
                      style={{ fontSize: '18px', color: 'var(--text-soft)', marginLeft: '8px' }}
                    ></i>
                  </div>
                </div>

                {/* Collapsible item details table */}
                {isExpanded && (
                  <div style={{ animation: "fadeIn 0.2s ease-out" }}>
                    {group.items.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-soft)', fontSize: '13px' }}>
                        No items in this location match current search/filters.
                      </div>
                    ) : (
                      <div className="table-wrap" style={{ border: 'none', borderRadius: 0, marginTop: 0 }}>
                        <table style={{ width: '100%' }}>
                          <thead>
                            <tr style={{ background: 'var(--sidebar-bg)' }}>
                              <th style={{ paddingLeft: '24px', width: '120px' }}>Item Code</th>
                              <th>Item Name</th>
                              <th>Category</th>
                              <th style={{ textAlign: 'right' }}>Unit Price</th>
                              <th style={{ textAlign: 'right' }}>On Hand Stock</th>
                              <th style={{ textAlign: 'right' }}>Reorder Level</th>
                              <th style={{ textAlign: 'right', paddingRight: '24px' }}>Stock Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((item) => {
                              const isLow = item.intCurrentStock < item.intReorderLevel;
                              const isOut = item.intCurrentStock === 0;
                              const totalVal = (item.intCurrentStock || 0) * (item.floaPrice || 0);

                              return (
                                <tr key={item.strCode}>
                                  <td className="mono" style={{ paddingLeft: '24px', color: 'var(--text-main)', fontWeight: '600' }}>
                                    {item.strCode}
                                  </td>
                                  <td style={{ fontWeight: 500 }}>
                                    {item.strName}
                                  </td>
                                  <td>
                                    <span className="role-badge role-branch" style={{ background: 'var(--sidebar-bg)', color: 'var(--purple-dark)' }}>
                                      {item.strCategory}
                                    </span>
                                  </td>
                                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-soft)' }}>
                                    ${item.floaPrice.toFixed(2)}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <span className="status-dot" style={{ display: 'inline-flex', alignItems: 'center', color: isOut ? 'var(--red)' : isLow ? '#d97706' : 'var(--green)' }}>
                                      <span className="dot" style={{
                                        background: isOut ? 'var(--red)' : isLow ? '#f59e0b' : 'var(--green)',
                                        boxShadow: isOut ? '0 0 0 2.5px rgba(239, 68, 68, 0.25)' : isLow ? '0 0 0 2.5px rgba(245, 158, 11, 0.25)' : '0 0 0 2.5px rgba(16, 185, 129, 0.25)'
                                      }}></span>
                                      {item.intCurrentStock} {item.strUnit}(s)
                                      {isOut && (
                                        <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase' }}>
                                          (Out)
                                        </span>
                                      )}
                                      {!isOut && isLow && (
                                        <span style={{ fontSize: '10px', marginLeft: '6px', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>
                                          (Low)
                                        </span>
                                      )}
                                    </span>
                                  </td>
                                  <td className="mono" style={{ textAlign: 'right' }}>
                                    {item.intReorderLevel}
                                  </td>
                                  <td className="mono" style={{ textAlign: 'right', paddingRight: '24px', fontWeight: '700', color: 'var(--text-main)' }}>
                                    ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StockBalance;
