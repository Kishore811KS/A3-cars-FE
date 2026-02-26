import React, { useState, useEffect } from 'react';

const SupplierDuplicatePage = () => {
  // State for suppliers list
  const [suppliers, setSuppliers] = useState([]);
  const [groupedSuppliers, setGroupedSuppliers] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  
  // State for items
  const [items, setItems] = useState([]);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // State for popup
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Base URL for API
  const BASE_URL = 'http://127.0.0.1:5000';

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Filter groups when search term changes
  useEffect(() => {
    filterGroups();
  }, [searchTerm, searchField, groupedSuppliers]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchField]);

  // Check if user is authenticated
  const checkAuth = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/check-session`, {
        credentials: 'include',
        mode: 'cors'
      });
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
      
      if (data.authenticated) {
        fetchSuppliers();
      } else {
        // Redirect to login if not authenticated
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Error checking auth:', err);
    }
  };

  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/suppliers`, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch suppliers');
      }
      
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.suppliers);
        
        // Also fetch all items for these suppliers
        const allItems = [];
        data.suppliers.forEach(supplier => {
          if (supplier.items) {
            allItems.push(...supplier.items);
          }
        });
        setItems(allItems);
        
        // Group suppliers by name, company, address, phone
        groupSuppliers(data.suppliers);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group suppliers by name, company, address, phone
  const groupSuppliers = (suppliersList) => {
    const groups = {};
    
    suppliersList.forEach(supplier => {
      // Create a unique key based on name, company, address, phone
      // Using empty string for null/undefined values
      const name = supplier.name || '';
      const company = supplier.company || '';
      const address = supplier.address || '';
      const phone = supplier.phone || '';
      
      const key = `${name}|${company}|${address}|${phone}`.toLowerCase();
      
      if (!groups[key]) {
        groups[key] = {
          id: `group-${key}`,
          name: supplier.name,
          company: supplier.company,
          address: supplier.address,
          phone: supplier.phone,
          count: 0,
          suppliers: [],
          totalItems: 0
        };
      }
      
      groups[key].count++;
      groups[key].suppliers.push(supplier);
      
      // Count total items for this supplier
      const supplierItems = items.filter(item => item.supplier_id === supplier.id);
      groups[key].totalItems += supplierItems.length;
    });
    
    // Convert to array and sort by count (highest first)
    const groupedArray = Object.values(groups).sort((a, b) => b.count - a.count);
    setGroupedSuppliers(groupedArray);
    setFilteredGroups(groupedArray);
  };

  // Filter groups based on search term
  const filterGroups = () => {
    if (!searchTerm.trim()) {
      setFilteredGroups(groupedSuppliers);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = groupedSuppliers.filter(group => {
      switch (searchField) {
        case 'name':
          return group.name?.toLowerCase().includes(term);
        case 'company':
          return group.company?.toLowerCase().includes(term);
        case 'address':
          return group.address?.toLowerCase().includes(term);
        case 'phone':
          return group.phone?.toLowerCase().includes(term);
        case 'all':
        default:
          return (
            (group.name?.toLowerCase().includes(term)) ||
            (group.company?.toLowerCase().includes(term)) ||
            (group.address?.toLowerCase().includes(term)) ||
            (group.phone?.toLowerCase().includes(term))
          );
      }
    });

    setFilteredGroups(filtered);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchField('all');
  };

  // View group details
  const viewGroupDetails = (group) => {
    setSelectedGroup(group);
    setShowSupplierDetails(true);
  };

  // Close popup
  const closePopup = () => {
    setShowSupplierDetails(false);
    setSelectedGroup(null);
  };

  // Get item count for a specific supplier
  const getItemCountForSupplier = (supplierId) => {
    return items.filter(item => item.supplier_id === supplierId).length;
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroups = filteredGroups.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Styles
  const styles = {
    container: {
      padding: "40px",
      backgroundColor: "#0a0c10",
      minHeight: "100vh",
      color: "#e5e7eb",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "30px",
      paddingBottom: "15px",
      borderBottom: "1px solid #2d2d2d",
    },
    title: {
      fontSize: "28px",
      fontWeight: "700",
      margin: 0,
      color: "#ffffff",
      letterSpacing: "-0.5px",
      background: "linear-gradient(135deg, #fff 0%, #a5b4fc 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    subtitle: {
      fontSize: "16px",
      color: "#9ca3af",
      marginTop: "5px",
    },
    statsContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    statCard: {
      backgroundColor: "#1a1d24",
      padding: "20px",
      borderRadius: "12px",
      border: "1px solid #2d313a",
    },
    statLabel: {
      fontSize: "14px",
      color: "#9ca3af",
      marginBottom: "8px",
    },
    statValue: {
      fontSize: "32px",
      fontWeight: "700",
      color: "#fff",
    },
    statSubtext: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "5px",
    },
    searchContainer: {
      display: "flex",
      gap: "12px",
      marginBottom: "25px",
      flexWrap: "wrap",
    },
    searchInputWrapper: {
      flex: "1",
      minWidth: "300px",
      display: "flex",
      gap: "8px",
    },
    searchInput: {
      flex: "1",
      padding: "12px 16px",
      backgroundColor: "#1a1d24",
      border: "1px solid #2d313a",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "14px",
      outline: "none",
      transition: "all 0.2s",
    },
    searchSelect: {
      padding: "12px 16px",
      backgroundColor: "#1a1d24",
      border: "1px solid #2d313a",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "14px",
      outline: "none",
      cursor: "pointer",
      minWidth: "120px",
    },
    searchButton: {
      padding: "12px 24px",
      backgroundColor: "#4f46e5",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    clearButton: {
      padding: "12px 24px",
      backgroundColor: "#2d313a",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    tableContainer: {
      overflowX: "auto",
      borderRadius: "12px",
      border: "1px solid #2d313a",
      marginTop: "20px",
      backgroundColor: "#1a1d24",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#1a1d24",
      minWidth: "1000px",
    },
    th: {
      backgroundColor: "#0f1217",
      padding: "16px",
      textAlign: "left",
      color: "#e5e7eb",
      fontWeight: "600",
      fontSize: "13px",
      letterSpacing: "0.3px",
      textTransform: "uppercase",
      borderBottom: "2px solid #2d313a",
    },
    td: {
      padding: "14px 16px",
      borderBottom: "1px solid #2d313a",
      color: "#d1d5db",
      fontSize: "14px",
    },
    badge: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
    },
    repeatBadge: {
      backgroundColor: "#f59e0b",
      color: "#fff",
    },
    countBadge: {
      backgroundColor: "#4f46e5",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "600",
      marginLeft: "5px",
    },
    viewButton: {
      background: "#4f46e5",
      border: "none",
      color: "#fff",
      padding: "6px 12px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "600",
      transition: "all 0.2s",
    },
    emptyState: {
      textAlign: "center",
      padding: "50px",
      color: "#6b7280",
      fontStyle: "italic",
      fontSize: "15px",
    },
    // Pagination Styles
    paginationContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "25px",
      padding: "15px 0",
    },
    paginationInfo: {
      color: "#9ca3af",
      fontSize: "14px",
    },
    paginationControls: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    paginationButton: {
      padding: "8px 14px",
      backgroundColor: "#1a1d24",
      border: "1px solid #2d313a",
      borderRadius: "6px",
      color: "#e5e7eb",
      fontSize: "13px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s",
      minWidth: "40px",
    },
    activePageButton: {
      backgroundColor: "#4f46e5",
      borderColor: "#4f46e5",
      color: "#fff",
    },
    disabledButton: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    // Popup Styles
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      backdropFilter: "blur(8px)",
    },
    popup: {
      backgroundColor: "#1a1d24",
      padding: "35px",
      borderRadius: "16px",
      width: "800px",
      maxWidth: "90%",
      maxHeight: "85vh",
      overflowY: "auto",
      border: "1px solid #2d313a",
      position: "relative",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    },
    popupHeader: {
      marginBottom: "30px",
      borderBottom: "2px solid #2d313a",
      paddingBottom: "20px",
    },
    popupTitle: {
      color: "#fff",
      fontSize: "24px",
      fontWeight: "700",
      margin: 0,
      letterSpacing: "-0.5px",
    },
    popupSubtitle: {
      color: "#9ca3af",
      fontSize: "13px",
      marginTop: "5px",
    },
    closeButton: {
      position: "absolute",
      top: "25px",
      right: "25px",
      background: "#2d313a",
      border: "none",
      color: "#9ca3af",
      fontSize: "20px",
      cursor: "pointer",
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
    },
    popupButtonGroup: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      marginTop: "30px",
      paddingTop: "20px",
      borderTop: "1px solid #2d313a",
    },
    submitButton: {
      padding: "12px 28px",
      borderRadius: "10px",
      backgroundColor: "#4f46e5",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600",
      transition: "all 0.2s",
      boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      marginBottom: "20px",
      padding: "20px",
      backgroundColor: "#0f1217",
      borderRadius: "12px",
    },
    infoItem: {
      marginBottom: "10px",
    },
    infoLabel: {
      color: "#9ca3af",
      fontSize: "12px",
      textTransform: "uppercase",
      marginBottom: "4px",
    },
    infoValue: {
      color: "#fff",
      fontSize: "16px",
      fontWeight: "500",
    },
    loadingOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    },
    loadingSpinner: {
      border: "4px solid #2d313a",
      borderTop: "4px solid #4f46e5",
      borderRadius: "50%",
      width: "40px",
      height: "40px",
      animation: "spin 1s linear infinite",
    },
    refreshButton: {
      padding: "10px 20px",
      backgroundColor: "#1a1d24",
      color: "#e5e7eb",
      border: "1px solid #2d313a",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600",
      transition: "all 0.2s",
    },
  };

  // Add keyframe animation for spinner
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Calculate statistics
  const totalSuppliers = suppliers.length;
  const repeatGroups = filteredGroups.filter(g => g.count > 1).length;
  const uniqueSuppliers = filteredGroups.filter(g => g.count === 1).length;
  const totalRepeats = totalSuppliers - uniqueSuppliers;
  const showingResults = filteredGroups.length;

  // Render popup for group details
  const renderGroupDetailsPopup = () => {
    if (!showSupplierDetails || !selectedGroup) return null;

    return (
      <div style={styles.overlay} onClick={closePopup}>
        <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
          <button 
            style={styles.closeButton}
            onClick={closePopup}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#4f46e5';
              e.target.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2d313a';
              e.target.style.color = '#9ca3af';
            }}
          >
            ✕
          </button>
          
          <div style={styles.popupHeader}>
            <h2 style={styles.popupTitle}>Supplier Group Details</h2>
            <div style={styles.popupSubtitle}>
              Found {selectedGroup.count} suppliers with matching details
            </div>
          </div>
          
          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Name</div>
                <div style={styles.infoValue}>{selectedGroup.name || '—'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Company</div>
                <div style={styles.infoValue}>{selectedGroup.company || '—'}</div>
              </div>
            </div>
            <div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Phone</div>
                <div style={styles.infoValue}>{selectedGroup.phone || '—'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Address</div>
                <div style={styles.infoValue}>{selectedGroup.address || '—'}</div>
              </div>
            </div>
          </div>
          
          <h3 style={{ color: '#fff', margin: '20px 0 15px', fontSize: '18px' }}>Individual Entries</h3>
          
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Items Count</th>
                  <th style={styles.th}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {selectedGroup.suppliers.map((supplier, index) => (
                  <tr key={supplier.id}>
                    <td style={styles.td}>
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>#{index + 1}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '500', color: '#fff' }}>{supplier.name}</span>
                    </td>
                    <td style={styles.td}>{supplier.email || '—'}</td>
                    <td style={styles.td}>
                      <span style={styles.countBadge}>
                        {getItemCountForSupplier(supplier.id)} items
                      </span>
                    </td>
                    <td style={styles.td}>
                      {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.popupButtonGroup}>
            <button 
              onClick={closePopup}
              style={styles.submitButton}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#4338ca';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#4f46e5';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Loading Overlay */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingSpinner}></div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Supplier Analysis</h1>
          <div style={styles.subtitle}>View and manage supplier entries</div>
        </div>
        <button 
          style={styles.refreshButton}
          onClick={fetchSuppliers}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#2d313a';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#1a1d24';
          }}
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Suppliers</div>
          <div style={styles.statValue}>{totalSuppliers}</div>
          <div style={styles.statSubtext}>All supplier entries</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Unique Entries</div>
          <div style={styles.statValue}>{uniqueSuppliers}</div>
          <div style={styles.statSubtext}>Single entries only</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Repeat Groups</div>
          <div style={styles.statValue}>{repeatGroups}</div>
          <div style={styles.statSubtext}>Groups with multiple entries</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Repeats</div>
          <div style={styles.statValue}>{totalRepeats}</div>
          <div style={styles.statSubtext}>Suppliers in repeat groups</div>
        </div>
      </div>

      {/* Search Section */}
      <div style={styles.searchContainer}>
        <div style={styles.searchInputWrapper}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            style={styles.searchSelect}
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <option value="all">All Fields</option>
            <option value="name">Name</option>
            <option value="company">Company</option>
            <option value="address">Address</option>
            <option value="phone">Phone</option>
          </select>
        </div>
        <button
          style={styles.searchButton}
          onClick={filterGroups}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#4338ca';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#4f46e5';
          }}
        >
          🔍 Search
        </button>
        {searchTerm && (
          <button
            style={styles.clearButton}
            onClick={clearSearch}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#3f444e';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2d313a';
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Main Table */}
      <div style={{ backgroundColor: "#1a1d24", padding: "30px", borderRadius: "16px", border: "1px solid #2d313a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: "600" }}>
            Suppliers Grouped by Name, Company, Address & Phone
          </h2>
          {searchTerm && (
            <span style={{ color: "#9ca3af", fontSize: "14px" }}>
              Found {showingResults} result{showingResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {loading && filteredGroups.length === 0 ? (
          <div style={styles.emptyState}>Loading suppliers...</div>
        ) : filteredGroups.length > 0 ? (
          <>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Company</th>
                    <th style={styles.th}>Address</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Count</th>
                    <th style={styles.th}>Total Items</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentGroups.map(group => (
                    <tr 
                      key={group.id}
                      style={group.count > 1 ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } : {}}
                    >
                      <td style={styles.td}>
                        <span style={{ fontWeight: '500', color: '#fff' }}>{group.name || '—'}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ background: '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                          {group.company || '—'}
                        </span>
                      </td>
                      <td style={styles.td}>{group.address || '—'}</td>
                      <td style={styles.td}>{group.phone || '—'}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          ...(group.count > 1 ? styles.repeatBadge : { backgroundColor: '#10b981', color: '#fff' })
                        }}>
                          {group.count} {group.count === 1 ? 'entry' : 'entries'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.countBadge}>
                          {group.totalItems} items
                        </span>
                      </td>
                      <td style={styles.td}>
                        {group.count > 1 ? (
                          <span style={{ ...styles.badge, ...styles.repeatBadge }}>🔄 Repeats</span>
                        ) : (
                          <span style={{ ...styles.badge, backgroundColor: '#10b981', color: '#fff' }}>✓ Single</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {group.count > 1 && (
                          <button
                            style={styles.viewButton}
                            onClick={() => viewGroupDetails(group)}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#4338ca';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#4f46e5';
                            }}
                          >
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredGroups.length > itemsPerPage && (
              <div style={styles.paginationContainer}>
                <div style={styles.paginationInfo}>
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredGroups.length)} of {filteredGroups.length} entries
                </div>
                <div style={styles.paginationControls}>
                  <button
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === 1 ? styles.disabledButton : {})
                    }}
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    onMouseEnter={(e) => {
                      if (currentPage !== 1) e.target.style.backgroundColor = '#2d313a';
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== 1) e.target.style.backgroundColor = '#1a1d24';
                    }}
                  >
                    ←
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        style={{
                          ...styles.paginationButton,
                          ...(currentPage === pageNum ? styles.activePageButton : {})
                        }}
                        onClick={() => paginate(pageNum)}
                        onMouseEnter={(e) => {
                          if (currentPage !== pageNum) {
                            e.target.style.backgroundColor = '#2d313a';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== pageNum) {
                            e.target.style.backgroundColor = '#1a1d24';
                          }
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === totalPages ? styles.disabledButton : {})
                    }}
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    onMouseEnter={(e) => {
                      if (currentPage !== totalPages) e.target.style.backgroundColor = '#2d313a';
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== totalPages) e.target.style.backgroundColor = '#1a1d24';
                    }}
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={styles.emptyState}>
            {searchTerm ? 'No suppliers match your search criteria.' : 'No suppliers found.'}
          </div>
        )}
      </div>

      {/* Popups */}
      {renderGroupDetailsPopup()}
    </div>
  );
};

export default SupplierDuplicatePage;