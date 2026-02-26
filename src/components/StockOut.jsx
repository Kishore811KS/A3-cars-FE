// BillItemsPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Search, 
  Eye, 
  Download, 
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Smartphone,
  TrendingUp,
  Users,
  Package,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const BillItemsPage = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalItems: 0,
    pendingItems: 0,
    completedItems: 0,
    totalValue: 0,
    uniqueBills: 0,
    averageItemValue: 0
  });

  const API_BASE_URL = 'http://localhost:5000/api';

  // Status color mapping for dark theme
  const statusColorMap = {
    completed: { background: '#059669', color: '#fff' },
    pending: { background: '#b45309', color: '#fff' },
    cancelled: { background: '#dc2626', color: '#fff' },
    default: { background: '#4b5563', color: '#fff' }
  };

  // Load items on component mount
  useEffect(() => {
    fetchAllBillItems();
  }, []);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [items, searchTerm, filterStatus, dateRange]);

  // Calculate statistics whenever items change
  useEffect(() => {
    calculateStatistics();
  }, [items]);

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

  const fetchAllBillItems = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First fetch all bills
      const response = await axios.get(`${API_BASE_URL}/billing/bills`);
      
      let billsData = [];
      if (response.data && Array.isArray(response.data.bills)) {
        billsData = response.data.bills;
      } else if (Array.isArray(response.data)) {
        billsData = response.data;
      }
      
      // Extract all items from bills with proper field mapping
      let allItems = [];
      
      // For each bill, we need to fetch detailed bill info to get items
      for (const bill of billsData) {
        try {
          // Fetch detailed bill information to get items
          const detailResponse = await axios.get(`${API_BASE_URL}/billing/bills/${bill.id}`);
          const detailedBill = detailResponse.data;
          
          if (detailedBill.items && Array.isArray(detailedBill.items)) {
            const itemsWithBillInfo = detailedBill.items.map(item => ({
              // Use snake_case field names as they come from backend
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_model: item.product_model,
              product_type: item.product_type,
              sell_price: item.sell_price,
              quantity: item.quantity,
              total: item.total,
              item_status: item.item_status,
              // Add bill information
              billNumber: detailedBill.billNumber,
              billId: detailedBill.id,
              billDate: detailedBill.createdAt,
              customerName: detailedBill.customerName || 'Walk-in',
              customerPhone: detailedBill.customerPhone,
              paymentMethod: detailedBill.paymentMethod,
              paymentStatus: detailedBill.paymentStatus
            }));
            allItems = [...allItems, ...itemsWithBillInfo];
          }
        } catch (err) {
          console.error(`Error fetching details for bill ${bill.id}:`, err);
        }
      }
      
      setItems(allItems);
      setFilteredItems(allItems);
      showMessage("success", `${allItems.length} items loaded successfully!`);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load items. Please try again.');
      showMessage("error", "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const fetchItemDetails = async (itemId, billId) => {
    try {
      // Get bill details
      const response = await axios.get(`${API_BASE_URL}/billing/bills/${billId}`);
      const bill = response.data;
      
      // Find the specific item in the bill
      const item = bill.items?.find(i => i.id === itemId);
      if (item) {
        setSelectedItem({
          ...item,
          billNumber: bill.billNumber,
          billDate: bill.createdAt,
          customerName: bill.customerName || 'Walk-in',
          customerPhone: bill.customerPhone,
          paymentMethod: bill.paymentMethod,
          paymentStatus: bill.paymentStatus
        });
        setShowItemModal(true);
      } else {
        showMessage("error", "Item not found");
      }
    } catch (err) {
      console.error('Error fetching item details:', err);
      showMessage("error", "Failed to load item details");
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => {
        const productName = item.product_name || '';
        const productModel = item.product_model || '';
        const productType = item.product_type || '';
        const billNumber = item.billNumber || '';
        const customerName = item.customerName || '';
        
        const searchLower = searchTerm.toLowerCase();
        return (
          productName.toLowerCase().includes(searchLower) ||
          productModel.toLowerCase().includes(searchLower) ||
          productType.toLowerCase().includes(searchLower) ||
          billNumber.toLowerCase().includes(searchLower) ||
          customerName.toLowerCase().includes(searchLower)
        );
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => {
        const status = item.item_status || '';
        return status === filterStatus;
      });
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start).setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end).setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.billDate || '').getTime();
        return itemDate >= start && itemDate <= end;
      });
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
  };

  const calculateStatistics = () => {
    const totalItems = items.length;
    const pendingItems = items.filter(item => item.item_status === 'pending').length;
    const completedItems = items.filter(item => item.item_status === 'completed').length;
    const totalValue = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const uniqueBills = new Set(items.map(item => item.billNumber)).size;
    const averageItemValue = totalItems > 0 ? totalValue / totalItems : 0;

    setStatistics({
      totalItems,
      pendingItems,
      completedItems,
      totalValue,
      uniqueBills,
      averageItemValue
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setDateRange({ start: '', end: '' });
    setFilteredItems(items);
    setCurrentPage(1);
  };

  // ================= EXPORT TO EXCEL =================
  const handleExportExcel = () => {
    try {
      const exportData = filteredItems.map(item => ({
        'Bill Number': item.billNumber || '',
        'Date': item.billDate ? new Date(item.billDate).toLocaleDateString() : '',
        'Customer': item.customerName || '',
        'Product Name': item.product_name || '',
        'Model': item.product_model || '',
        'Type': item.product_type || '',
        'Price (₹)': item.sell_price || 0,
        'Quantity': item.quantity || 0,
        'Total (₹)': item.total || 0,
        'Status': item.item_status || 'pending',
        'Payment Method': item.paymentMethod || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bill Items");

      const wscols = [
        { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, 
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, 
        { wch: 12 }, { wch: 12 }, { wch: 15 }
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
      saveAs(file, `Bill_Items_${date}.xlsx`);
      showMessage("success", "Excel export successful!");
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "Failed to export to Excel");
    }
  };

  // ================= EXPORT TO PDF =================
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape'
      });
      
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('Bill Items Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Items: ${statistics.totalItems}`, 14, 40);
      doc.text(`Total Value: ₹${statistics.totalValue.toFixed(2)}`, 14, 47);
      doc.text(`Pending: ${statistics.pendingItems} | Completed: ${statistics.completedItems}`, 14, 54);
      doc.text(`Unique Bills: ${statistics.uniqueBills}`, 14, 61);
      
      const tableColumn = [
        'Bill No', 'Date', 'Customer', 'Product', 'Model', 
        'Price', 'Qty', 'Total', 'Status'
      ];
      
      const tableRows = filteredItems.map(item => [
        item.billNumber || '',
        item.billDate ? new Date(item.billDate).toLocaleDateString() : '',
        item.customerName || 'Walk-in',
        item.product_name || '',
        item.product_model || '',
        `₹${item.sell_price || 0}`,
        item.quantity || 0,
        `₹${item.total || 0}`,
        (item.item_status || 'pending').toUpperCase()
      ]);
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 70,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });
      
      const date = new Date().toISOString().split('T')[0];
      doc.save(`Bill_Items_${date}.pdf`);
      showMessage("success", "PDF export successful!");
    } catch (err) {
      console.error("PDF export error:", err);
      showMessage("error", "Failed to export to PDF");
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getStatusColor = (status) => {
    return statusColorMap[status] || statusColorMap.default;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle size={14} />;
      case 'pending': return <Clock size={14} />;
      default: return <Package size={14} />;
    }
  };

  // Dark Theme Styles
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
      color: "#f9fafb",
      display: "flex",
      alignItems: "center",
      gap: "10px",
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
      flexWrap: "wrap",
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
      backgroundColor: "#6366f1",
      color: "#fff",
      border: "none",
    },
    successButton: {
      backgroundColor: "#059669",
      color: "#fff",
      border: "none",
    },
    infoButton: {
      backgroundColor: "#3b82f6",
      color: "#fff",
      border: "none",
    },
    statsContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: "20px",
      marginBottom: "25px",
    },
    statCard: {
      backgroundColor: "#1f2937",
      padding: "20px",
      borderRadius: "10px",
      border: "1px solid #374151",
      display: "flex",
      alignItems: "center",
      gap: "15px",
    },
    statIcon: {
      width: "50px",
      height: "50px",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
    },
    statInfo: {
      flex: 1,
    },
    statLabel: {
      fontSize: "14px",
      color: "#9ca3af",
      marginBottom: "5px",
    },
    statValue: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#f9fafb",
    },
    statSubValue: {
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "3px",
    },
    filterBar: {
      backgroundColor: "#1f2937",
      padding: "15px 20px",
      borderRadius: "8px",
      border: "1px solid #374151",
      marginBottom: "20px",
      display: "flex",
      flexWrap: "wrap",
      gap: "15px",
      alignItems: "center",
    },
    searchBox: {
      flex: 1,
      minWidth: "250px",
      position: "relative",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#6b7280",
    },
    searchInput: {
      width: "100%",
      padding: "10px 10px 10px 40px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
    },
    filterSelect: {
      padding: "10px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "14px",
      minWidth: "150px",
      outline: "none",
    },
    dateInput: {
      padding: "10px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
    },
    filterButton: {
      padding: "10px 15px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#f9fafb",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "5px",
      fontSize: "14px",
      transition: "all 0.2s",
    },
    tableContainer: {
      backgroundColor: "#1f2937",
      borderRadius: "8px",
      border: "1px solid #374151",
      overflow: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "1400px",
    },
    th: {
      backgroundColor: "#374151",
      padding: "15px",
      textAlign: "left",
      fontSize: "13px",
      fontWeight: "500",
      color: "#f3f4f6",
      borderBottom: "1px solid #4b5563",
    },
    td: {
      padding: "15px",
      borderBottom: "1px solid #374151",
      fontSize: "13px",
      color: "#f9fafb",
    },
    statusBadge: {
      padding: "4px 10px",
      borderRadius: "15px",
      fontSize: "11px",
      fontWeight: "500",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
    },
    actionButton: {
      padding: "6px 10px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    message: {
      padding: "12px 20px",
      borderRadius: "6px",
      marginBottom: "20px",
      fontSize: "14px",
      fontWeight: "500",
      whiteSpace: "pre-line",
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
    loadingSpinner: {
      textAlign: "center",
      padding: "40px",
      color: "#9ca3af",
    },
    noData: {
      textAlign: "center",
      padding: "40px",
      color: "#6b7280",
      fontStyle: "italic",
    },
    pagination: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "20px",
      padding: "10px 0",
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
    pageButton: {
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
      transition: "all 0.2s",
      minWidth: "40px",
    },
    activePageButton: {
      backgroundColor: "#6366f1",
      borderColor: "#6366f1",
    },
    disabledButton: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    pageNumbers: {
      display: "flex",
      gap: "4px",
    },
    modal: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: "#1f2937",
      padding: "25px",
      borderRadius: "8px",
      maxWidth: "500px",
      width: "90%",
      maxHeight: "80vh",
      overflow: "auto",
      position: "relative",
      border: "1px solid #374151",
    },
    modalClose: {
      position: "absolute",
      top: "15px",
      right: "15px",
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
    },
    modalTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#f9fafb",
      marginBottom: "20px",
    },
    modalSection: {
      marginBottom: "20px",
    },
    modalLabel: {
      color: "#9ca3af",
      fontSize: "12px",
      marginBottom: "2px",
    },
    modalValue: {
      color: "#f9fafb",
      fontSize: "16px",
      fontWeight: "500",
      marginBottom: "10px",
    },
    divider: {
      height: "1px",
      backgroundColor: "#374151",
      margin: "15px 0",
    },
  };

  if (loading && items.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>Loading bill items...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Message Display */}
      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === "success" ? styles.successMessage : 
             message.type === "error" ? styles.errorMessage : 
             styles.infoMessage)
        }}>
          {message.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <h1 style={styles.title}>
            <Package size={32} color="#6366f1" />
            Bill Items
          </h1>
          <button 
            style={styles.refreshButton}
            onClick={fetchAllBillItems}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div style={styles.buttonGroup}>
          <button 
            style={{...styles.button, ...styles.infoButton}} 
            onClick={handleExportExcel}
          >
            <Download size={16} /> Excel
          </button>
          <button 
            style={{...styles.button, ...styles.successButton}} 
            onClick={handleExportPDF}
          >
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'rgba(99, 102, 241, 0.2)', color: '#6366f1'}}>
            <Package size={24} />
          </div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Total Items</div>
            <div style={styles.statValue}>{statistics.totalItems}</div>
            <div style={styles.statSubValue}>Across {statistics.uniqueBills} bills</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'rgba(5, 150, 105, 0.2)', color: '#059669'}}>
            <CheckCircle size={24} />
          </div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Completed</div>
            <div style={styles.statValue}>{statistics.completedItems}</div>
            <div style={styles.statSubValue}>
              {statistics.totalItems > 0 
                ? `${((statistics.completedItems / statistics.totalItems) * 100).toFixed(1)}%` 
                : '0%'}
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'rgba(180, 83, 9, 0.2)', color: '#b45309'}}>
            <Clock size={24} />
          </div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Pending</div>
            <div style={styles.statValue}>{statistics.pendingItems}</div>
            <div style={styles.statSubValue}>
              {statistics.totalItems > 0 
                ? `${((statistics.pendingItems / statistics.totalItems) * 100).toFixed(1)}%` 
                : '0%'}
            </div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6'}}>
            <TrendingUp size={24} />
          </div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Total Value</div>
            <div style={styles.statValue}>₹{statistics.totalValue.toFixed(2)}</div>
            <div style={styles.statSubValue}>Avg: ₹{statistics.averageItemValue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search by product, model, bill number, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          style={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>

        <input
          type="date"
          style={styles.dateInput}
          value={dateRange.start}
          onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
          placeholder="Start Date"
        />

        <input
          type="date"
          style={styles.dateInput}
          value={dateRange.end}
          onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
          placeholder="End Date"
        />

        <button 
          style={styles.filterButton}
          onClick={resetFilters}
        >
          <X size={16} /> Clear
        </button>
      </div>

      {/* Items Table */}
      <div style={styles.tableContainer}>
        {error && <div style={{padding: '20px', color: '#f87171', textAlign: 'center'}}>{error}</div>}
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Bill No.</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Product</th>
              <th style={styles.th}>Model</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="11" style={styles.noData}>
                  {searchTerm || filterStatus !== 'all' || dateRange.start 
                    ? 'No items match your filters' 
                    : 'No items found'}
                </td>
              </tr>
            ) : (
              currentItems.map((item, index) => (
                <tr key={`${item.billId}-${item.id}-${index}`}>
                  <td style={styles.td}>
                    <strong>{item.billNumber}</strong>
                  </td>
                  <td style={styles.td}>
                    {item.billDate ? new Date(item.billDate).toLocaleDateString() : '-'}
                  </td>
                  <td style={styles.td}>
                    {item.customerName || 'Walk-in'}
                  </td>
                  <td style={styles.td}>
                    {item.product_name || '-'}
                  </td>
                  <td style={styles.td}>
                    {item.product_model || '-'}
                  </td>
                  <td style={styles.td}>
                    {item.product_type || '-'}
                  </td>
                  <td style={styles.td}>
                    ₹{item.sell_price || 0}
                  </td>
                  <td style={styles.td}>
                    {item.quantity || 0}
                  </td>
                  <td style={styles.td}>
                    <strong>₹{item.total || 0}</strong>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(item.item_status).background,
                      color: getStatusColor(item.item_status).color
                    }}>
                      {getStatusIcon(item.item_status)}
                      {item.item_status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{...styles.actionButton, backgroundColor: '#3b82f6', color: 'white'}}
                      onClick={() => fetchItemDetails(item.id, item.billId)}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredItems.length > 0 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredItems.length)} of {filteredItems.length} items
          </div>
          
          <div style={styles.paginationControls}>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              style={{
                ...styles.pageButton,
                ...(currentPage === 1 ? styles.disabledButton : {})
              }}
            >
              <ChevronLeft size={16} />
            </button>
            
            <div style={styles.pageNumbers}>
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      style={{
                        ...styles.pageButton,
                        ...(currentPage === pageNumber ? styles.activePageButton : {})
                      }}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === currentPage - 3 ||
                  pageNumber === currentPage + 3
                ) {
                  return <span key={pageNumber} style={{ color: '#9ca3af', padding: '0 4px' }}>...</span>;
                }
                return null;
              })}
            </div>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              style={{
                ...styles.pageButton,
                ...(currentPage === totalPages ? styles.disabledButton : {})
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {showItemModal && selectedItem && (
        <div style={styles.modal} onClick={() => setShowItemModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowItemModal(false)}>
              <X size={20} />
            </button>
            
            <h2 style={styles.modalTitle}>Item Details</h2>
            
            <div style={styles.modalSection}>
              <div style={styles.modalLabel}>Bill Number</div>
              <div style={styles.modalValue}>{selectedItem.billNumber}</div>
              
              <div style={styles.modalLabel}>Date</div>
              <div style={styles.modalValue}>{new Date(selectedItem.billDate).toLocaleString()}</div>
              
              <div style={styles.modalLabel}>Customer</div>
              <div style={styles.modalValue}>{selectedItem.customerName || 'Walk-in'}</div>
              
              {selectedItem.customerPhone && (
                <>
                  <div style={styles.modalLabel}>Phone</div>
                  <div style={styles.modalValue}>{selectedItem.customerPhone}</div>
                </>
              )}
            </div>

            <div style={styles.divider} />

            <div style={styles.modalSection}>
              <div style={styles.modalLabel}>Product</div>
              <div style={styles.modalValue}>{selectedItem.product_name}</div>
              
              {selectedItem.product_model && (
                <>
                  <div style={styles.modalLabel}>Model</div>
                  <div style={styles.modalValue}>{selectedItem.product_model}</div>
                </>
              )}
              
              {selectedItem.product_type && (
                <>
                  <div style={styles.modalLabel}>Type</div>
                  <div style={styles.modalValue}>{selectedItem.product_type}</div>
                </>
              )}
              
              <div style={styles.modalLabel}>Price</div>
              <div style={styles.modalValue}>₹{selectedItem.sell_price}</div>
              
              <div style={styles.modalLabel}>Quantity</div>
              <div style={styles.modalValue}>{selectedItem.quantity}</div>
              
              <div style={styles.modalLabel}>Total</div>
              <div style={styles.modalValue}><strong>₹{selectedItem.total}</strong></div>
            </div>

            <div style={styles.divider} />

            <div style={styles.modalSection}>
              <div style={styles.modalLabel}>Status</div>
              <div>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: getStatusColor(selectedItem.item_status).background,
                  color: getStatusColor(selectedItem.item_status).color,
                  display: 'inline-flex'
                }}>
                  {getStatusIcon(selectedItem.item_status)}
                  {selectedItem.item_status}
                </span>
              </div>
              
              <div style={styles.modalLabel}>Payment Method</div>
              <div style={styles.modalValue}>{selectedItem.paymentMethod || 'N/A'}</div>
              
              <div style={styles.modalLabel}>Payment Status</div>
              <div style={styles.modalValue}>{selectedItem.paymentStatus || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillItemsPage;