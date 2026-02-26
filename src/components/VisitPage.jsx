// VisitBillPage.jsx
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
  Printer, 
  Filter, 
  Calendar,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Smartphone,
  TrendingUp,
  Users,
  FileText,
  FileSpreadsheet,
  FileJson,
  Clock
} from 'lucide-react';

const VisitBillPage = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalBills: 0,
    totalRevenue: 0,
    averageBillValue: 0,
    cashCount: 0,
    cardCount: 0,
    upiCount: 0
  });

  const API_BASE_URL = 'http://localhost:5000/api';

  // Status color mapping for dark theme
  const statusColorMap = {
    paid: { background: '#059669', color: '#fff' },
    partial: { background: '#b45309', color: '#fff' },
    pending: { background: '#dc2626', color: '#fff' },
    default: { background: '#4b5563', color: '#fff' }
  };

  // Load bills on component mount
  useEffect(() => {
    fetchBills();
  }, []);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [bills, searchTerm, filterPaymentMethod, filterPaymentStatus, dateRange]);

  // Calculate statistics whenever bills change
  useEffect(() => {
    calculateStatistics();
  }, [bills]);

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

  const fetchBills = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/billing/bills`);
      
      // Handle different response formats
      let billsData = [];
      if (Array.isArray(response.data)) {
        billsData = response.data;
      } else if (response.data && Array.isArray(response.data.bills)) {
        billsData = response.data.bills;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        billsData = response.data.data;
      }
      
      setBills(billsData);
      setFilteredBills(billsData);
      showMessage("success", "Bills loaded successfully!");
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError('Failed to load bills. Please try again.');
      showMessage("error", "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetails = async (billId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/billing/bills/${billId}`);
      setSelectedBill(response.data);
      setShowBillModal(true);
    } catch (err) {
      console.error('Error fetching bill details:', err);
      showMessage("error", "Failed to load bill details");
    }
  };

  const applyFilters = () => {
    let filtered = [...bills];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(bill => 
        (bill.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (bill.customerPhone?.includes(searchTerm))
      );
    }

    // Payment method filter
    if (filterPaymentMethod !== 'all') {
      filtered = filtered.filter(bill => bill.paymentMethod === filterPaymentMethod);
    }

    // Payment status filter
    if (filterPaymentStatus !== 'all') {
      filtered = filtered.filter(bill => bill.paymentStatus === filterPaymentStatus);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start).setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end).setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.createdAt).getTime();
        return billDate >= start && billDate <= end;
      });
    }

    setFilteredBills(filtered);
    setCurrentPage(1);
  };

  const calculateStatistics = () => {
    const totalBills = bills.length;
    const totalRevenue = bills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;
    
    const cashCount = bills.filter(bill => bill.paymentMethod === 'cash').length;
    const cardCount = bills.filter(bill => bill.paymentMethod === 'card').length;
    const upiCount = bills.filter(bill => bill.paymentMethod === 'upi').length;

    setStatistics({
      totalBills,
      totalRevenue,
      averageBillValue,
      cashCount,
      cardCount,
      upiCount
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterPaymentMethod('all');
    setFilterPaymentStatus('all');
    setDateRange({ start: '', end: '' });
    setFilteredBills(bills);
    setCurrentPage(1);
  };

  // ================= EXPORT TO EXCEL =================
  const handleExportExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredBills.map(bill => ({
        'Bill Number': bill.billNumber || '',
        'Date': new Date(bill.createdAt).toLocaleDateString(),
        'Time': new Date(bill.createdAt).toLocaleTimeString(),
        'Customer Name': bill.customerName || '',
        'Customer Phone': bill.customerPhone || '',
        'Items Count': bill.itemCount || (bill.items?.length) || 0,
        'Subtotal (₹)': bill.subtotal || 0,
        'Discount (₹)': bill.discount || 0,
        'Tax (₹)': bill.tax || 0,
        'Total (₹)': bill.total || 0,
        'Paid (₹)': bill.paidAmount || 0,
        'Change (₹)': bill.changeAmount || 0,
        'Payment Method': bill.paymentMethod || '',
        'Payment Status': bill.paymentStatus || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bills");

      // Auto-size columns
      const wscols = [
        { wch: 15 }, // Bill Number
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 20 }, // Customer Name
        { wch: 15 }, // Customer Phone
        { wch: 10 }, // Items Count
        { wch: 12 }, // Subtotal
        { wch: 12 }, // Discount
        { wch: 10 }, // Tax
        { wch: 12 }, // Total
        { wch: 12 }, // Paid
        { wch: 12 }, // Change
        { wch: 15 }, // Payment Method
        { wch: 15 }, // Payment Status
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
      saveAs(file, `Bills_${date}.xlsx`);
      
      showMessage("success", "Excel export successful!");
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "Failed to export to Excel");
    }
  };

  // ================= EXPORT TO PDF =================
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('Bills Report', 14, 22);
      
      // Add date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      // Add summary
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Bills: ${statistics.totalBills}`, 14, 40);
      doc.text(`Total Revenue: ₹${statistics.totalRevenue.toFixed(2)}`, 14, 47);
      doc.text(`Average Bill: ₹${statistics.averageBillValue.toFixed(2)}`, 14, 54);
      doc.text(`Payment Breakdown: Cash: ${statistics.cashCount}, Card: ${statistics.cardCount}, UPI: ${statistics.upiCount}`, 14, 61);
      
      // Prepare table data
      const tableColumn = [
        'Bill No',
        'Date',
        'Customer',
        'Items',
        'Total (₹)',
        'Method',
        'Status'
      ];
      
      const tableRows = filteredBills.map(bill => [
        bill.billNumber,
        new Date(bill.createdAt).toLocaleDateString(),
        bill.customerName || 'Walk-in',
        bill.itemCount || (bill.items?.length) || 0,
        bill.total?.toFixed(2) || '0.00',
        bill.paymentMethod?.toUpperCase() || '-',
        bill.paymentStatus?.toUpperCase() || '-'
      ]);
      
      // Generate table
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 70,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });
      
      // Save PDF
      const date = new Date().toISOString().split('T')[0];
      doc.save(`Bills_${date}.pdf`);
      
      showMessage("success", "PDF export successful!");
    } catch (err) {
      console.error("PDF export error:", err);
      showMessage("error", "Failed to export to PDF");
    }
  };

  const handlePrintBill = (bill) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - ${bill.billNumber}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; background: #fff; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 24px; margin-bottom: 5px; color: #000; }
            .header p { margin: 2px 0; font-size: 12px; color: #333; }
            .info { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0; }
            .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; color: #000; }
            .items { margin: 15px 0; }
            .item-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; font-weight: bold; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 5px; color: #000; }
            .item { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; font-size: 11px; padding: 3px 0; border-bottom: 1px dotted #ccc; color: #000; }
            .summary { margin: 15px 0; border-top: 1px solid #000; padding-top: 10px; }
            .summary-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; color: #000; }
            .total { font-weight: bold; font-size: 14px; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; color: #000; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BRAIN TECH</h1>
            <p>123 Main Street, City - 400001</p>
            <p>Phone: +91 98765 43210</p>
            <p>GST: 27ABCDE1234F1Z5</p>
          </div>
          
          <div class="info">
            <div class="info-row"><span>Bill No:</span><span>${bill.billNumber}</span></div>
            <div class="info-row"><span>Date:</span><span>${new Date(bill.createdAt).toLocaleDateString()}</span></div>
            <div class="info-row"><span>Time:</span><span>${new Date(bill.createdAt).toLocaleTimeString()}</span></div>
            <div class="info-row"><span>Customer:</span><span>${bill.customerName || 'Walk-in'}</span></div>
            ${bill.customerPhone ? `<div class="info-row"><span>Phone:</span><span>${bill.customerPhone}</span></div>` : ''}
          </div>
          
          <div class="items">
            <div class="item-header">
              <span>Item</span>
              <span>Price</span>
              <span>Qty</span>
              <span>Total</span>
            </div>
            ${bill.items ? bill.items.map(item => {
              // Handle both snake_case and camelCase property names
              const productName = item.product_name || item.productName || 'Unknown';
              const productModel = item.product_model || item.productModel || '';
              const sellPrice = item.sell_price || item.sellPrice || 0;
              const quantity = item.quantity || 0;
              const total = item.total || 0;
              
              return `
                <div class="item">
                  <span>${productName} ${productModel ? `(${productModel})` : ''}</span>
                  <span>₹${sellPrice}</span>
                  <span>${quantity}</span>
                  <span>₹${total}</span>
                </div>
              `;
            }).join('') : ''}
          </div>
          
          <div class="summary">
            <div class="summary-row"><span>Subtotal:</span><span>₹${bill.subtotal?.toFixed(2)}</span></div>
            <div class="summary-row"><span>Discount:</span><span>₹${bill.discount?.toFixed(2)}</span></div>
            <div class="summary-row"><span>Tax:</span><span>₹${bill.tax?.toFixed(2)}</span></div>
            <div class="summary-row total"><span>Total:</span><span>₹${bill.total?.toFixed(2)}</span></div>
            <div class="summary-row"><span>Paid:</span><span>₹${bill.paidAmount?.toFixed(2)}</span></div>
            <div class="summary-row"><span>Change:</span><span>₹${bill.changeAmount?.toFixed(2)}</span></div>
            <div class="summary-row"><span>Payment:</span><span>${bill.paymentMethod?.toUpperCase()}</span></div>
          </div>
          
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Goods once sold will not be taken back</p>
            <p>** Computer generated bill **</p>
          </div>
          
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadBill = (bill) => {
    // Format items for display
    const itemsText = bill.items ? bill.items.map(item => {
      const productName = item.product_name || item.productName || 'Unknown';
      const productModel = item.product_model || item.productModel || '';
      const sellPrice = item.sell_price || item.sellPrice || 0;
      const quantity = item.quantity || 0;
      const total = item.total || 0;
      
      return `${productName}${productModel ? ` (${productModel})` : ''}\n   ₹${sellPrice} x ${quantity} = ₹${total}`;
    }).join('\n') : '';

    // Create a text version of the bill
    const billText = `
BRAIN TECH
123 Main Street, City - 400001
Phone: +91 98765 43210
GST: 27ABCDE1234F1Z5

Bill No: ${bill.billNumber}
Date: ${new Date(bill.createdAt).toLocaleString()}
Customer: ${bill.customerName || 'Walk-in'}
${bill.customerPhone ? `Phone: ${bill.customerPhone}` : ''}

ITEMS
----------------------------------------
${itemsText}

----------------------------------------
Subtotal: ₹${bill.subtotal?.toFixed(2)}
Discount: ₹${bill.discount?.toFixed(2)}
Tax: ₹${bill.tax?.toFixed(2)}
Total: ₹${bill.total?.toFixed(2)}
Paid: ₹${bill.paidAmount?.toFixed(2)}
Change: ₹${bill.changeAmount?.toFixed(2)}
Payment: ${bill.paymentMethod?.toUpperCase()}

Thank you for your purchase!
Goods once sold will not be taken back
** Computer generated bill **
    `;

    const blob = new Blob([billText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill-${bill.billNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBills = filteredBills.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);

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

  const getPaymentIcon = (method) => {
    switch(method) {
      case 'cash': return <DollarSign size={14} />;
      case 'card': return <CreditCard size={14} />;
      case 'upi': return <Smartphone size={14} />;
      default: return <DollarSign size={14} />;
    }
  };

  const getStatusColor = (status) => {
    return statusColorMap[status] || statusColorMap.default;
  };

  // Dark Theme Styles (matching ItemsPage)
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
      minWidth: "1200px",
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
      display: "inline-block",
    },
    actionButton: {
      padding: "6px 10px",
      margin: "0 3px",
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
    infoMessage: {
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      color: "#60a5fa",
      border: "1px solid #3b82f6",
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
      maxWidth: "600px",
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
    modalText: {
      color: "#d1d5db",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    modalTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "20px",
    },
    modalTh: {
      backgroundColor: "#374151",
      padding: "10px",
      textAlign: "left",
      color: "#f3f4f6",
      fontWeight: "500",
      fontSize: "12px",
    },
    modalTd: {
      padding: "8px",
      borderBottom: "1px solid #374151",
      color: "#f9fafb",
      fontSize: "13px",
    },
    modalFooter: {
      display: "flex",
      gap: "10px",
      marginTop: "20px",
    },
  };

  if (loading && bills.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>Loading bills...</div>
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
            <FileText size={32} color="#6366f1" />
            Visit Bills
          </h1>
          <button 
            style={styles.refreshButton}
            onClick={fetchBills}
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
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button 
            style={{...styles.button, ...styles.successButton}} 
            onClick={handleExportPDF}
          >
            <FileJson size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'rgba(99, 102, 241, 0.2)', color: '#6366f1'}}>
            <FileText size={24} />
          </div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Total Bills</div>
            <div style={styles.statValue}>{statistics.totalBills}</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'rgba(5, 150, 105, 0.2)', color: '#059669'}}>
            <TrendingUp size={24} />
          </div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Total Revenue</div>
            <div style={styles.statValue}>₹{statistics.totalRevenue.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6'}}>
            <Users size={24} />
          </div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Average Bill</div>
            <div style={styles.statValue}>₹{statistics.averageBillValue.toFixed(2)}</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6'}}>
            <CreditCard size={24} />
          </div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Payments</div>
            <div style={styles.statValue}>
              <span style={{color: '#059669'}}>C:{statistics.cashCount}</span> | 
              <span style={{color: '#3b82f6'}}>D:{statistics.cardCount}</span> | 
              <span style={{color: '#8b5cf6'}}>U:{statistics.upiCount}</span>
            </div>
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
            placeholder="Search by bill number, customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          style={styles.filterSelect}
          value={filterPaymentMethod}
          onChange={(e) => setFilterPaymentMethod(e.target.value)}
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
        </select>

        <select
          style={styles.filterSelect}
          value={filterPaymentStatus}
          onChange={(e) => setFilterPaymentStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
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

      {/* Bills Table */}
      <div style={styles.tableContainer}>
        {error && <div style={{padding: '20px', color: '#f87171', textAlign: 'center'}}>{error}</div>}
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Bill No.</th>
              <th style={styles.th}>Date & Time</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Items</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Payment</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentBills.length === 0 ? (
              <tr>
                <td colSpan="8" style={styles.noData}>
                  {searchTerm || filterPaymentMethod !== 'all' || filterPaymentStatus !== 'all' || dateRange.start 
                    ? 'No bills match your filters' 
                    : 'No bills found'}
                </td>
              </tr>
            ) : (
              currentBills.map((bill) => (
                <tr key={bill.id}>
                  <td style={styles.td}>
                    <strong>{bill.billNumber}</strong>
                  </td>
                  <td style={styles.td}>
                    {new Date(bill.createdAt).toLocaleDateString()}
                    <br />
                    <small style={{color: '#9ca3af'}}>
                      {new Date(bill.createdAt).toLocaleTimeString()}
                    </small>
                  </td>
                  <td style={styles.td}>
                    {bill.customerName || 'Walk-in'}
                    {bill.customerPhone && (
                      <br />
                    )}
                  </td>
                  <td style={styles.td}>
                    {bill.itemCount || (bill.items?.length) || 0} items
                  </td>
                  <td style={styles.td}>
                    <strong>₹{bill.total?.toFixed(2)}</strong>
                  </td>
                  <td style={styles.td}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                      {getPaymentIcon(bill.paymentMethod)}
                      <span style={{textTransform: 'capitalize'}}>{bill.paymentMethod}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(bill.paymentStatus).background,
                      color: getStatusColor(bill.paymentStatus).color
                    }}>
                      {bill.paymentStatus}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={{...styles.actionButton, backgroundColor: '#3b82f6', color: 'white', marginRight: '5px'}}
                      onClick={() => fetchBillDetails(bill.id)}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      style={{...styles.actionButton, backgroundColor: '#059669', color: 'white', marginRight: '5px'}}
                      onClick={() => handlePrintBill(bill)}
                      title="Print Bill"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      style={{...styles.actionButton, backgroundColor: '#6b7280', color: 'white'}}
                      onClick={() => handleDownloadBill(bill)}
                      title="Download Bill"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredBills.length > 0 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBills.length)} of {filteredBills.length} bills
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
                // Show only first, last, and pages around current page
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

      {/* Bill Details Modal */}
      {showBillModal && selectedBill && (
        <div style={styles.modal} onClick={() => setShowBillModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowBillModal(false)}>
              <X size={20} />
            </button>
            
            <h2 style={styles.modalTitle}>Bill Details</h2>
            
            <div style={styles.modalSection}>
              <p style={styles.modalText}><strong>Bill Number:</strong> {selectedBill.billNumber}</p>
              <p style={styles.modalText}><strong>Date:</strong> {new Date(selectedBill.createdAt).toLocaleString()}</p>
              <p style={styles.modalText}><strong>Customer:</strong> {selectedBill.customerName || 'Walk-in'}</p>
              {selectedBill.customerPhone && <p style={styles.modalText}><strong>Phone:</strong> {selectedBill.customerPhone}</p>}
              {selectedBill.customerEmail && <p style={styles.modalText}><strong>Email:</strong> {selectedBill.customerEmail}</p>}
              {selectedBill.customerGst && <p style={styles.modalText}><strong>GST:</strong> {selectedBill.customerGst}</p>}
            </div>

            <h3 style={{color: '#f9fafb', marginBottom: '10px', fontSize: '16px'}}>Items</h3>
            <table style={styles.modalTable}>
              <thead>
                <tr>
                  <th style={styles.modalTh}>Item</th>
                  <th style={styles.modalTh}>Price</th>
                  <th style={styles.modalTh}>Qty</th>
                  <th style={styles.modalTh}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedBill.items || []).map((item, index) => {
                  // Handle both snake_case and camelCase property names
                  const productName = item.product_name || item.productName || 'Unknown';
                  const productModel = item.product_model || item.productModel || '';
                  const sellPrice = item.sell_price || item.sellPrice || 0;
                  const quantity = item.quantity || 0;
                  const total = item.total || 0;
                  
                  return (
                    <tr key={index}>
                      <td style={styles.modalTd}>
                        {productName}
                        {productModel && <small style={{color: '#9ca3af'}}> ({productModel})</small>}
                      </td>
                      <td style={styles.modalTd}>₹{sellPrice}</td>
                      <td style={styles.modalTd}>{quantity}</td>
                      <td style={styles.modalTd}>₹{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{borderTop: '1px solid #374151', paddingTop: '15px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#d1d5db'}}>
                <span>Subtotal:</span>
                <span>₹{selectedBill.subtotal?.toFixed(2)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#d1d5db'}}>
                <span>Discount:</span>
                <span>₹{selectedBill.discount?.toFixed(2)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#d1d5db'}}>
                <span>Tax:</span>
                <span>₹{selectedBill.tax?.toFixed(2)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontWeight: 'bold', fontSize: '18px', color: '#f9fafb'}}>
                <span>Total:</span>
                <span>₹{selectedBill.total?.toFixed(2)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #374151', color: '#d1d5db'}}>
                <span>Paid:</span>
                <span>₹{selectedBill.paidAmount?.toFixed(2)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#d1d5db'}}>
                <span>Change:</span>
                <span>₹{selectedBill.changeAmount?.toFixed(2)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px', color: '#d1d5db'}}>
                <span>Payment Method:</span>
                <span style={{textTransform: 'capitalize'}}>{selectedBill.paymentMethod}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '5px', color: '#d1d5db'}}>
                <span>Payment Status:</span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '15px',
                  fontSize: '11px',
                  fontWeight: '500',
                  backgroundColor: getStatusColor(selectedBill.paymentStatus).background,
                  color: getStatusColor(selectedBill.paymentStatus).color
                }}>
                  {selectedBill.paymentStatus}
                </span>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={{...styles.actionButton, backgroundColor: '#059669', color: 'white', padding: '10px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}
                onClick={() => {
                  setShowBillModal(false);
                  handlePrintBill(selectedBill);
                }}
              >
                <Printer size={16} /> Print
              </button>
              <button
                style={{...styles.actionButton, backgroundColor: '#3b82f6', color: 'white', padding: '10px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}
                onClick={() => {
                  setShowBillModal(false);
                  handleDownloadBill(selectedBill);
                }}
              >
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitBillPage;