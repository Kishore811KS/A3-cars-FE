// LowStockPage.jsx
import React, { useEffect, useState } from "react";
import { 
  Download, RefreshCw, ArrowLeft, AlertTriangle, Truck,
  ChevronLeft, ChevronRight, Plus, Save, Search
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:5000/api/products";
const SUPPLIER_API_URL = "http://127.0.0.1:5000/api";

export default function LowStockPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [lowStockThreshold] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [orderQuantities, setOrderQuantities] = useState({});
  const [processingOrder, setProcessingOrder] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter items based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredItems(items);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = items.filter(item => 
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.model && item.model.toLowerCase().includes(term)) ||
        (item.type && item.type.toLowerCase().includes(term))
      );
      setFilteredItems(filtered);
      setCurrentPage(1); // Reset to first page when searching
    }
  }, [searchTerm, items]);

  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      // Handle different response formats
      let productsArray = [];
      if (Array.isArray(data)) {
        productsArray = data;
      } else if (data && Array.isArray(data.items)) {
        productsArray = data.items;
      } else if (data && data.data && Array.isArray(data.data)) {
        productsArray = data.data;
      } else {
        console.warn('Unexpected API response format:', data);
        productsArray = [];
      }
      
      // Calculate values and filter low stock items
      const processedItems = productsArray
        .map(item => calculateValues({ ...item, id: item.id }))
        .filter(item => item.quantity < lowStockThreshold && item.quantity > 0);
      
      setItems(processedItems);
      setFilteredItems(processedItems);
      
      if (processedItems.length === 0) {
        showMessage("info", "No low stock items found");
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      showMessage("error", "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const calculateValues = (item) => {
    const buy = parseFloat(item.buyPrice) || 0;
    const sell = parseFloat(item.sellPrice) || 0;
    const qty = parseInt(item.quantity) || 0;

    const profitPercent = buy > 0 ? (((sell - buy) / buy) * 100).toFixed(2) : "0.00";
    const amount = (sell * qty).toFixed(2);

    return { 
      ...item, 
      profitPercent, 
      amount,
      buyPrice: buy,
      sellPrice: sell,
      quantity: qty
    };
  };

  // ================= ORDER FUNCTIONS =================
  const handleOpenOrderModal = () => {
    setOrderItems(filteredItems);
    // Initialize order quantities with 0
    const initialQuantities = {};
    filteredItems.forEach(item => {
      initialQuantities[item.id] = 0;
    });
    setOrderQuantities(initialQuantities);
    setShowOrderModal(true);
  };

  const handleQuantityChange = (itemId, value) => {
    const newValue = parseInt(value) || 0;
    setOrderQuantities(prev => ({
      ...prev,
      [itemId]: newValue
    }));
  };

  const calculateOrderTotal = () => {
    let total = 0;
    Object.entries(orderQuantities).forEach(([itemId, qty]) => {
      const item = filteredItems.find(i => i.id === parseInt(itemId));
      if (item && qty > 0) {
        total += item.buyPrice * qty;
      }
    });
    return total;
  };

  const handlePlaceOrder = async () => {
    const selectedItems = Object.entries(orderQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        id: parseInt(itemId),
        quantity: qty
      }));

    if (selectedItems.length === 0) {
      showMessage("error", "Please select at least one item to order");
      return;
    }

    setProcessingOrder(true);
    try {
      // Here you would integrate with your supplier API
      // For now, we'll just update the inventory
      let updatedItems = [...items];
      
      for (const orderItem of selectedItems) {
        const item = items.find(i => i.id === orderItem.id);
        const newQty = item.quantity + orderItem.quantity;
        
        // Update in backend
        const res = await fetch(`${API_URL}/${orderItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            model: item.model || "",
            type: item.type || "",
            watts: item.watts || "",
            buyPrice: item.buyPrice || 0,
            sellPrice: item.sellPrice || 0,
            quantity: newQty,
          }),
        });

        if (!res.ok) throw new Error(`Failed to update ${item.name}`);

        // Update local state
        updatedItems = updatedItems.map(i =>
          i.id === orderItem.id ? { ...i, quantity: newQty } : i
        );
      }

      // Re-filter low stock items
      const newLowStockItems = updatedItems.filter(i => i.quantity < lowStockThreshold && i.quantity > 0);
      setItems(newLowStockItems);
      setFilteredItems(newLowStockItems);
      
      setShowOrderModal(false);
      showMessage("success", `Order placed successfully for ${selectedItems.length} items!`);
      
      // Refresh products
      await loadProducts();
      
    } catch (err) {
      console.error("Error placing order:", err);
      showMessage("error", `Failed to place order: ${err.message}`);
    } finally {
      setProcessingOrder(false);
    }
  };

  // ================= EXPORT TO EXCEL =================
  const handleExport = () => {
    try {
      // Prepare data for export (use filtered items for export)
      const exportData = filteredItems.map(item => ({
        'Name': item.name || '',
        'Model': item.model || '',
        'Type': item.type || '',
        'Watts': item.watts || '',
        'Current Stock': item.quantity || 0,
        'Recommended Order': (lowStockThreshold - item.quantity) || 0,
        'Buy Price': item.buyPrice || 0,
        'Sell Price': item.sellPrice || 0,
        'Profit %': item.profitPercent || '0.00',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Low Stock Items");

      // Auto-size columns
      const wscols = [
        { wch: 20 }, // Name
        { wch: 15 }, // Model
        { wch: 15 }, // Type
        { wch: 10 }, // Watts
        { wch: 12 }, // Current Stock
        { wch: 15 }, // Recommended Order
        { wch: 12 }, // Buy Price
        { wch: 12 }, // Sell Price
        { wch: 10 }, // Profit %
      ];
      worksheet['!cols'] = wscols;

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      const date = new Date().toISOString().split('T')[0];
      saveAs(file, `Low_Stock_Alert_${date}.xlsx`);
      
      showMessage("success", "Export successful!");
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "Failed to export");
    }
  };

  // ================= PAGINATION FUNCTIONS =================
  const getCurrentPageItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  };

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = getCurrentPageItems();

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  // ================= STYLES =================
  const styles = {
    container: {
      padding: "60px",
      backgroundColor: "#111827",
      minHeight: "100vh",
      color: "#f9fafb",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "25px",
    },
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "600",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    backButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
    },
    refreshButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
    },
    buttonGroup: {
      display: "flex",
      gap: "10px",
    },
    button: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 14px",
      borderRadius: "6px",
      backgroundColor: "#1f2937",
      color: "#f9fafb",
      border: "1px solid #374151",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s",
    },
    primaryButton: {
      backgroundColor: "#dc2626",
      color: "#fff",
      border: "none",
    },
    searchContainer: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "20px",
      backgroundColor: "#1f2937",
      padding: "10px 15px",
      borderRadius: "8px",
      border: "1px solid #374151",
    },
    searchIcon: {
      color: "#9ca3af",
    },
    searchInput: {
      flex: 1,
      backgroundColor: "transparent",
      border: "none",
      color: "#f9fafb",
      fontSize: "14px",
      outline: "none",
      padding: "5px 0",
    },
    searchStats: {
      color: "#9ca3af",
      fontSize: "13px",
    },
    message: {
      padding: "12px 20px",
      borderRadius: "6px",
      marginBottom: "20px",
      fontSize: "14px",
      fontWeight: "500",
    },
    successMessage: {
      backgroundColor: "rgba(22, 163, 74, 0.2)",
      color: "#4ade80",
      border: "1px solid #16a34a",
    },
    errorMessage: {
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      color: "#f87171",
      border: "1px solid #dc2626",
    },
    infoMessage: {
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      color: "#60a5fa",
      border: "1px solid #3b82f6",
    },
    statsContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    statCard: {
      backgroundColor: "#1f2937",
      padding: "20px",
      borderRadius: "8px",
      border: "1px solid #374151",
    },
    statLabel: {
      fontSize: "14px",
      color: "#9ca3af",
      marginBottom: "8px",
    },
    statValue: {
      fontSize: "32px",
      fontWeight: "600",
      color: "#f9fafb",
    },
    statSubtext: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "8px",
    },
    tableContainer: {
      overflowX: "auto",
      borderRadius: "8px",
      border: "1px solid #374151",
      marginBottom: "20px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#1f2937",
      minWidth: "1000px",
    },
    th: {
      backgroundColor: "#374151",
      padding: "12px",
      textAlign: "left",
      color: "#f3f4f6",
      fontWeight: "500",
      fontSize: "13px",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "12px",
      borderTop: "1px solid #374151",
    },
    lowStockIndicator: {
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      color: "#f87171",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      display: "inline-block",
    },
    quantityCell: {
      fontWeight: "600",
      color: "#f87171",
    },
    recommendedCell: {
      color: "#4ade80",
      fontWeight: "500",
    },
    loadingOverlay: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px",
      color: "#9ca3af",
    },
    emptyState: {
      textAlign: "center",
      padding: "60px",
      color: "#9ca3af",
      fontStyle: "italic",
    },
    pagination: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "8px",
      marginTop: "20px",
    },
    paginationButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px 12px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#f9fafb",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      minWidth: "40px",
      transition: "all 0.2s",
    },
    paginationButtonDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    paginationButtonActive: {
      backgroundColor: "#dc2626",
      borderColor: "#dc2626",
    },
    paginationInfo: {
      color: "#9ca3af",
      fontSize: "14px",
      marginLeft: "10px",
    },
    // Modal styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#1f2937',
      padding: '24px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '800px',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid #374151',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#f9fafb',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
    },
    modalTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '20px',
    },
    modalTh: {
      backgroundColor: '#374151',
      padding: '10px',
      textAlign: 'left',
      color: '#f3f4f6',
      fontWeight: '500',
      fontSize: '12px',
    },
    modalTd: {
      padding: '10px',
      borderBottom: '1px solid #374151',
      color: '#f9fafb',
      fontSize: '13px',
    },
    orderInput: {
      width: '80px',
      padding: '6px',
      backgroundColor: '#111827',
      border: '1px solid #374151',
      color: '#fff',
      borderRadius: '4px',
      fontSize: '13px',
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '1px solid #374151',
    },
    totalAmount: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#4ade80',
    },
  };

  // Calculate statistics (based on filtered items)
  const totalLowStock = filteredItems.length;
  const totalRecommendedOrder = filteredItems.reduce((sum, item) => sum + (lowStockThreshold - item.quantity), 0);
  const estimatedCost = filteredItems.reduce((sum, item) => sum + (item.buyPrice * (lowStockThreshold - item.quantity)), 0);

  return (
    <div style={styles.container}>
      {/* Order Modal */}
      {showOrderModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                <Truck size={20} style={{ marginRight: '8px', display: 'inline' }} />
                Place Order for Low Stock Items
              </h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowOrderModal(false)}
              >
                <ArrowLeft size={20} />
              </button>
            </div>

            <table style={styles.modalTable}>
              <thead>
                <tr>
                  <th style={styles.modalTh}>Product</th>
                  <th style={styles.modalTh}>Model</th>
                  <th style={styles.modalTh}>Current Stock</th>
                  <th style={styles.modalTh}>Recommended</th>
                  <th style={styles.modalTh}>Buy Price</th>
                  <th style={styles.modalTh}>Order Quantity</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.modalTd}>{item.name}</td>
                    <td style={styles.modalTd}>{item.model}</td>
                    <td style={styles.modalTd}>
                      <span style={{ color: '#f87171', fontWeight: '600' }}>{item.quantity}</span>
                    </td>
                    <td style={styles.modalTd}>
                      <span style={{ color: '#4ade80' }}>{lowStockThreshold - item.quantity}</span>
                    </td>
                    <td style={styles.modalTd}>₹{item.buyPrice}</td>
                    <td style={styles.modalTd}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        style={styles.orderInput}
                        value={orderQuantities[item.id] || 0}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.modalFooter}>
              <div>
                <span style={{ color: '#9ca3af', marginRight: '10px' }}>Total Order Value:</span>
                <span style={styles.totalAmount}>₹{calculateOrderTotal().toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  style={styles.button}
                  onClick={() => setShowOrderModal(false)}
                >
                  Cancel
                </button>
                <button 
                  style={{...styles.button, backgroundColor: "#059669", color: "#fff", border: "none"}}
                  onClick={handlePlaceOrder}
                  disabled={processingOrder}
                >
                  {processingOrder ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <button 
            style={styles.backButton}
            onClick={() => navigate('/items')}
            title="Back to Inventory"
          >
          </button>
          <h1 style={styles.title}>
            <AlertTriangle color="#f87171" size={28} />
            Low Stock Alert
          </h1>
          <button 
            style={styles.refreshButton}
            onClick={loadProducts}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={handleExport}>
            <Download size={16} /> Export List
          </button>
        </div>
      </div>

      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === "success" ? styles.successMessage : 
             message.type === "error" ? styles.errorMessage : 
             styles.infoMessage)
        }}>
          {message.text}
        </div>
      )}

      {/* Statistics Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Items Below Threshold</div>
          <div style={styles.statValue}>{totalLowStock}</div>
          <div style={styles.statSubtext}>Threshold: {lowStockThreshold} units</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Units to Order</div>
          <div style={styles.statValue}>{totalRecommendedOrder}</div>
          <div style={styles.statSubtext}>To reach minimum stock level</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Estimated Cost</div>
          <div style={styles.statValue}>₹{estimatedCost.toFixed(2)}</div>
          <div style={styles.statSubtext}>Based on current buy prices</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <Search size={18} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search by name, model, or type..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <span style={styles.searchStats}>
            Found {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {/* Low Stock Items Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loadingOverlay}>Loading low stock items...</div>
        ) : filteredItems.length === 0 ? (
          <div style={styles.emptyState}>
            <AlertTriangle size={48} style={{ marginBottom: '20px', opacity: 0.5 }} />
            <div>
              {searchTerm 
                ? "No items match your search" 
                : "No low stock items found"}
            </div>
            <div style={{ fontSize: '14px', marginTop: '10px', color: '#6b7280' }}>
              {searchTerm 
                ? "Try adjusting your search terms" 
                : `All items are above the minimum threshold of ${lowStockThreshold} units`}
            </div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Model</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Watts</th>
                <th style={styles.th}>Current Stock</th>
                <th style={styles.th}>Recommended Order</th>
                <th style={styles.th}>Buy Price (₹)</th>
                <th style={styles.th}>Sell Price (₹)</th>
                <th style={styles.th}>Profit %</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => {
                const recommended = lowStockThreshold - item.quantity;
                return (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.name}</td>
                    <td style={styles.td}>{item.model || '-'}</td>
                    <td style={styles.td}>{item.type || '-'}</td>
                    <td style={styles.td}>{item.watts || 0}</td>
                    <td style={{...styles.td, ...styles.quantityCell}}>{item.quantity}</td>
                    <td style={{...styles.td, ...styles.recommendedCell}}>{recommended}</td>
                    <td style={styles.td}>₹{item.buyPrice}</td>
                    <td style={styles.td}>₹{item.sellPrice}</td>
                    <td style={styles.td}>{item.profitPercent}%</td>
                    <td style={styles.td}>
                      <span style={styles.lowStockIndicator}>
                        {item.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {filteredItems.length > 0 && (
        <div style={styles.pagination}>
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
            }}
            onClick={goToPrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
          
          {getPageNumbers().map(number => (
            <button
              key={number}
              style={{
                ...styles.paginationButton,
                ...(currentPage === number ? styles.paginationButtonActive : {})
              }}
              onClick={() => goToPage(number)}
            >
              {number}
            </button>
          ))}
          
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
            }}
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
          
          <span style={styles.paginationInfo}>
            Page {currentPage} of {totalPages} (Showing {currentItems.length} of {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'})
          </span>
        </div>
      )}
    </div>
  );
}