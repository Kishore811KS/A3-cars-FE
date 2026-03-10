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
  Printer, 
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Smartphone,
  FileText,
  FileSpreadsheet,
  FileJson,
  Filter,
  Download,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Hash,
  Tag,
  Package,
  IndianRupee,
  Receipt,
  Copy,
  CheckCircle,
  AlertCircle,
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
  const [copiedBillNo, setCopiedBillNo] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest, lowest

  const API_BASE_URL = 'http://localhost:5000/api';

  // Status color mapping
  const statusColorMap = {
    paid: { background: '#059669', color: '#fff', icon: <CheckCircle size={12} /> },
    partial: { background: '#b45309', color: '#fff', icon: <AlertCircle size={12} /> },
    pending: { background: '#dc2626', color: '#fff', icon: <Clock size={12} /> },
    default: { background: '#4b5563', color: '#fff', icon: <AlertCircle size={12} /> }
  };

  // Payment method icons and colors
  const paymentMethodMap = {
    cash: { icon: <DollarSign size={14} />, color: '#059669', label: 'Cash' },
    card: { icon: <CreditCard size={14} />, color: '#3b82f6', label: 'Card' },
    upi: { icon: <Smartphone size={14} />, color: '#8b5cf6', label: 'UPI' },
    cheque: { icon: <FileText size={14} />, color: '#f59e0b', label: 'Cheque' },
    mixed: { icon: <Filter size={14} />, color: '#6b7280', label: 'Mixed' }
  };

  // Load bills on component mount
  useEffect(() => {
    fetchBills();
  }, []);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [bills, searchTerm, filterPaymentMethod, filterPaymentStatus, dateRange, sortBy]);

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
      
      // Process bills to ensure all numeric fields are properly formatted
      const processedBills = billsData.map(bill => ({
        ...bill,
        subtotal: parseFloat(bill.subtotal) || 0,
        discount: parseFloat(bill.discount) || 0,
        tax: parseFloat(bill.tax) || 0,
        total: parseFloat(bill.total) || 0,
        paidAmount: parseFloat(bill.paidAmount) || 0,
        changeAmount: parseFloat(bill.changeAmount) || 0,
        itemCount: bill.items ? bill.items.length : (bill.itemCount || 0)
      }));
      
      setBills(processedBills);
      setFilteredBills(processedBills);
      showMessage("success", `✅ Loaded ${processedBills.length} bills successfully!`);
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError('Failed to load bills. Please try again.');
      showMessage("error", "❌ Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetails = async (billId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/billing/bills/${billId}`);
      
      // Process the bill data to ensure proper numeric formatting
      const processedBill = {
        ...response.data,
        subtotal: parseFloat(response.data.subtotal) || 0,
        discount: parseFloat(response.data.discount) || 0,
        tax: parseFloat(response.data.tax) || 0,
        total: parseFloat(response.data.total) || 0,
        paidAmount: parseFloat(response.data.paidAmount) || 0,
        changeAmount: parseFloat(response.data.changeAmount) || 0
      };
      
      setSelectedBill(processedBill);
      setShowBillModal(true);
    } catch (err) {
      console.error('Error fetching bill details:', err);
      showMessage("error", "❌ Failed to load bill details");
    }
  };

  const applyFilters = () => {
    let filtered = [...bills];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(bill => 
        (bill.customerName?.toLowerCase().includes(term)) ||
        (bill.billNumber?.toLowerCase().includes(term)) ||
        (bill.customerPhone?.includes(term)) ||
        (bill.customerEmail?.toLowerCase().includes(term))
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

    // Sorting
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'highest':
          return (b.total || 0) - (a.total || 0);
        case 'lowest':
          return (a.total || 0) - (b.total || 0);
        default:
          return 0;
      }
    });

    setFilteredBills(filtered);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterPaymentMethod('all');
    setFilterPaymentStatus('all');
    setDateRange({ start: '', end: '' });
    setSortBy('newest');
    setFilteredBills(bills);
    setCurrentPage(1);
    showMessage("info", "🔍 Filters cleared");
  };

  // ================= EXPORT TO EXCEL =================
  const handleExportExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredBills.map(bill => ({
        'Bill Number': bill.billNumber || '',
        'Date': new Date(bill.createdAt).toLocaleDateString(),
        'Time': new Date(bill.createdAt).toLocaleTimeString(),
        'Customer Name': bill.customerName || 'Walk-in Customer',
        'Customer Phone': bill.customerPhone || '',
        'Customer Email': bill.customerEmail || '',
        'Customer Type': bill.customerType || 'external',
        'Items Count': bill.itemCount || 0,
        'Subtotal (₹)': (bill.subtotal || 0).toFixed(2),
        'Discount (₹)': (bill.discount || 0).toFixed(2),
        'Tax (₹)': (bill.tax || 0).toFixed(2),
        'Total (₹)': (bill.total || 0).toFixed(2),
        'Paid (₹)': (bill.paidAmount || 0).toFixed(2),
        'Change (₹)': (bill.changeAmount || 0).toFixed(2),
        'Due (₹)': ((bill.total || 0) - (bill.paidAmount || 0)).toFixed(2),
        'Payment Method': bill.paymentMethod ? bill.paymentMethod.toUpperCase() : '',
        'Payment Status': bill.paymentStatus ? bill.paymentStatus.toUpperCase() : ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bills");

      // Auto-size columns
      const wscols = [
        { wch: 15 }, // Bill Number
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 25 }, // Customer Name
        { wch: 15 }, // Customer Phone
        { wch: 25 }, // Customer Email
        { wch: 12 }, // Customer Type
        { wch: 10 }, // Items Count
        { wch: 12 }, // Subtotal
        { wch: 12 }, // Discount
        { wch: 10 }, // Tax
        { wch: 12 }, // Total
        { wch: 12 }, // Paid
        { wch: 12 }, // Change
        { wch: 12 }, // Due
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
      
      showMessage("success", `✅ Exported ${filteredBills.length} bills to Excel`);
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "❌ Failed to export to Excel");
    }
  };

  // ================= EXPORT TO PDF =================
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(99, 102, 241);
      doc.text('Bills Report', 14, 22);
      
      // Add date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      // Add filter info
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      let filterY = 37;
      if (searchTerm) {
        doc.text(`Search: "${searchTerm}"`, 14, filterY);
        filterY += 5;
      }
      if (filterPaymentMethod !== 'all') {
        doc.text(`Payment Method: ${filterPaymentMethod}`, 14, filterY);
        filterY += 5;
      }
      if (filterPaymentStatus !== 'all') {
        doc.text(`Payment Status: ${filterPaymentStatus}`, 14, filterY);
        filterY += 5;
      }
      if (dateRange.start && dateRange.end) {
        doc.text(`Date Range: ${dateRange.start} to ${dateRange.end}`, 14, filterY);
        filterY += 5;
      }
      
      // Add summary
      const totalAmount = filteredBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
      const totalPaid = filteredBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
      const totalDue = totalAmount - totalPaid;
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Bills: ${filteredBills.length}`, 14, filterY + 5);
      doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 14, filterY + 12);
      doc.text(`Total Paid: ₹${totalPaid.toFixed(2)}`, 14, filterY + 19);
      doc.text(`Total Due: ₹${totalDue.toFixed(2)}`, 14, filterY + 26);
      
      // Prepare table data
      const tableColumn = [
        'Bill No',
        'Date',
        'Customer',
        'Items',
        'Total (₹)',
        'Paid (₹)',
        'Due (₹)',
        'Method',
        'Status'
      ];
      
      const tableRows = filteredBills.map(bill => [
        bill.billNumber || '',
        new Date(bill.createdAt).toLocaleDateString(),
        (bill.customerName || 'Walk-in').substring(0, 20),
        bill.itemCount || 0,
        (bill.total || 0).toFixed(2),
        (bill.paidAmount || 0).toFixed(2),
        ((bill.total || 0) - (bill.paidAmount || 0)).toFixed(2),
        (bill.paymentMethod || '').toUpperCase(),
        (bill.paymentStatus || '').toUpperCase()
      ]);
      
      // Calculate start Y based on content
      const startY = filterY + 35;
      
      // Generate table
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });
      
      // Save PDF
      const date = new Date().toISOString().split('T')[0];
      doc.save(`Bills_Report_${date}.pdf`);
      
      showMessage("success", `✅ Exported ${filteredBills.length} bills to PDF`);
    } catch (err) {
      console.error("PDF export error:", err);
      showMessage("error", "❌ Failed to export to PDF");
    }
  };

  const handlePrintBill = (bill) => {
    const printWindow = window.open('', '_blank');
    
    // Process bill items to ensure proper display
    const processedBill = {
      ...bill,
      subtotal: parseFloat(bill.subtotal) || 0,
      discount: parseFloat(bill.discount) || 0,
      tax: parseFloat(bill.tax) || 0,
      total: parseFloat(bill.total) || 0,
      paidAmount: parseFloat(bill.paidAmount) || 0,
      changeAmount: parseFloat(bill.changeAmount) || 0
    };
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - ${processedBill.billNumber}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              padding: 20px; 
              max-width: 300px; 
              margin: 0 auto; 
              background: #fff; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .header h1 { 
              font-size: 24px; 
              margin-bottom: 5px; 
              color: #000; 
            }
            .header p { 
              margin: 2px 0; 
              font-size: 12px; 
              color: #333; 
            }
            .info { 
              border-top: 1px dashed #000; 
              border-bottom: 1px dashed #000; 
              padding: 10px 0; 
              margin: 15px 0; 
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              font-size: 12px; 
              margin-bottom: 3px; 
              color: #000; 
            }
            .customer-section {
              margin: 10px 0;
              padding: 8px;
              background: #f9f9f9;
              border: 1px solid #ddd;
            }
            .customer-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 3px;
            }
            .customer-type {
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: bold;
              background: ${processedBill.customerType === 'internal' ? '#cce5ff' : '#fff3cd'};
              color: ${processedBill.customerType === 'internal' ? '#004085' : '#856404'};
            }
            .items { 
              margin: 15px 0; 
            }
            .item-header { 
              display: grid; 
              grid-template-columns: 2fr 1fr 1fr 1fr; 
              font-weight: bold; 
              font-size: 11px; 
              border-bottom: 1px solid #000; 
              padding-bottom: 5px; 
              color: #000; 
            }
            .item { 
              display: grid; 
              grid-template-columns: 2fr 1fr 1fr 1fr; 
              font-size: 11px; 
              padding: 3px 0; 
              border-bottom: 1px dotted #ccc; 
              color: #000; 
            }
            .summary { 
              margin: 15px 0; 
              border-top: 1px solid #000; 
              padding-top: 10px; 
            }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              font-size: 12px; 
              margin-bottom: 3px; 
              color: #000; 
            }
            .total { 
              font-weight: bold; 
              font-size: 14px; 
              border-top: 1px dashed #000; 
              padding-top: 5px; 
              margin-top: 5px; 
              color: #000; 
            }
            .payment-status {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: bold;
              background: ${processedBill.paymentStatus === 'paid' ? '#059669' : 
                          processedBill.paymentStatus === 'partial' ? '#b45309' : '#dc2626'};
              color: white;
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 10px; 
              border-top: 1px dashed #000; 
              padding-top: 10px; 
              color: #666; 
            }
            .amount-due {
              font-weight: bold;
              color: ${(processedBill.total - processedBill.paidAmount) > 0 ? '#dc2626' : '#059669'};
            }
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
            <div class="info-row"><span>Bill No:</span><span>${processedBill.billNumber}</span></div>
            <div class="info-row"><span>Date:</span><span>${new Date(processedBill.createdAt).toLocaleDateString()}</span></div>
            <div class="info-row"><span>Time:</span><span>${new Date(processedBill.createdAt).toLocaleTimeString()}</span></div>
          </div>
          
          <div class="customer-section">
            <div class="customer-row">
              <span><strong>Customer Type:</strong></span>
              <span class="customer-type">${processedBill.customerType === 'internal' ? 'INTERNAL' : 'EXTERNAL'}</span>
            </div>
            <div class="customer-row">
              <span><strong>Name:</strong></span>
              <span>${processedBill.customerName || 'Walk-in Customer'}</span>
            </div>
            ${processedBill.customerPhone ? `
            <div class="customer-row">
              <span><strong>Phone:</strong></span>
              <span>${processedBill.customerPhone}</span>
            </div>` : ''}
            ${processedBill.customerEmail ? `
            <div class="customer-row">
              <span><strong>Email:</strong></span>
              <span>${processedBill.customerEmail}</span>
            </div>` : ''}
            ${processedBill.customerAddress ? `
            <div class="customer-row">
              <span><strong>Address:</strong></span>
              <span>${processedBill.customerAddress}</span>
            </div>` : ''}
            ${processedBill.customerGst ? `
            <div class="customer-row">
              <span><strong>GST:</strong></span>
              <span>${processedBill.customerGst}</span>
            </div>` : ''}
          </div>
          
          <div class="items">
            <div class="item-header">
              <span>Item</span>
              <span>Price</span>
              <span>Qty</span>
              <span>Total</span>
            </div>
            ${processedBill.items ? processedBill.items.map(item => {
              const productName = item.product_name || item.productName || 'Unknown';
              const productModel = item.product_model || item.productModel || '';
              const sellPrice = parseFloat(item.sell_price || item.sellPrice || 0);
              const quantity = item.quantity || 0;
              const total = parseFloat(item.total || 0);
              
              return `
                <div class="item">
                  <span>${productName} ${productModel ? `(${productModel})` : ''}</span>
                  <span>₹${sellPrice.toFixed(2)}</span>
                  <span>${quantity}</span>
                  <span>₹${total.toFixed(2)}</span>
                </div>
              `;
            }).join('') : ''}
          </div>
          
          <div class="summary">
            <div class="summary-row"><span>Subtotal:</span><span>₹${processedBill.subtotal.toFixed(2)}</span></div>
            <div class="summary-row"><span>Discount:</span><span>₹${processedBill.discount.toFixed(2)}</span></div>
            <div class="summary-row"><span>Tax:</span><span>₹${processedBill.tax.toFixed(2)}</span></div>
            <div class="summary-row total"><span>Total:</span><span>₹${processedBill.total.toFixed(2)}</span></div>
            <div class="summary-row"><span>Paid:</span><span>₹${processedBill.paidAmount.toFixed(2)}</span></div>
            <div class="summary-row"><span>Change:</span><span>₹${processedBill.changeAmount.toFixed(2)}</span></div>
            <div class="summary-row"><span>Due:</span><span class="amount-due">₹${(processedBill.total - processedBill.paidAmount).toFixed(2)}</span></div>
            <div class="summary-row"><span>Payment:</span><span>${processedBill.paymentMethod?.toUpperCase()}</span></div>
            <div class="summary-row"><span>Status:</span><span class="payment-status">${processedBill.paymentStatus?.toUpperCase()}</span></div>
          </div>
          
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Goods once sold will not be taken back</p>
            <p>** Computer generated bill **</p>
          </div>
          
          <script>
            window.onload = function() { 
              setTimeout(function() {
                window.print(); 
                window.close();
              }, 200);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyBillNumber = (billNumber) => {
    navigator.clipboard.writeText(billNumber);
    setCopiedBillNo(billNumber);
    setTimeout(() => setCopiedBillNo(null), 2000);
    showMessage("success", "📋 Bill number copied!");
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
    return paymentMethodMap[method]?.icon || <DollarSign size={14} />;
  };

  const getPaymentColor = (method) => {
    return paymentMethodMap[method]?.color || '#6b7280';
  };

  const getStatusColor = (status) => {
    return statusColorMap[status] || statusColorMap.default;
  };

  const formatCurrency = (amount) => {
    return `₹${(parseFloat(amount) || 0).toFixed(2)}`;
  };

  // Dark Theme Styles
  const styles = {
    container: {
      padding: "30px 40px",
      backgroundColor: "#0a0c10",
      minHeight: "100vh",
      color: "#e5e7eb",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "25px",
      flexWrap: "wrap",
      gap: "15px",
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
    filterBar: {
      backgroundColor: "#1f2937",
      padding: "20px",
      borderRadius: "8px",
      border: "1px solid #374151",
      marginBottom: "20px",
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto",
      gap: "12px",
      alignItems: "center",
    },
    searchBox: {
      position: "relative",
      width: "100%",
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
      padding: "10px 12px 10px 38px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    filterSelect: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      outline: "none",
      cursor: "pointer",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    dateInput: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    filterButton: {
      padding: "10px 16px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#f9fafb",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "13px",
      fontWeight: "500",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
      height: "41px",
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
      padding: "14px 12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#f3f4f6",
      borderBottom: "1px solid #4b5563",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    td: {
      padding: "14px 12px",
      borderBottom: "1px solid #374151",
      fontSize: "13px",
      color: "#f9fafb",
    },
    statusBadge: {
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
    },
    paymentBadge: {
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    actionButton: {
      padding: "6px 10px",
      margin: "0 2px",
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
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    successMessage: {
      backgroundColor: "rgba(5, 150, 105, 0.2)",
      color: "#34d399",
      border: "1px solid #059669",
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
      padding: "60px",
      color: "#9ca3af",
      fontSize: "16px",
    },
    noData: {
      textAlign: "center",
      padding: "60px",
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
      fontSize: "13px",
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
      fontSize: "13px",
      transition: "all 0.2s",
      minWidth: "38px",
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
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)",
    },
    modalContent: {
      backgroundColor: "#1f2937",
      padding: "30px",
      borderRadius: "12px",
      maxWidth: "700px",
      width: "95%",
      maxHeight: "85vh",
      overflow: "auto",
      position: "relative",
      border: "1px solid #374151",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
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
      fontSize: "22px",
      fontWeight: "600",
      color: "#f9fafb",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    modalSection: {
      marginBottom: "20px",
      padding: "15px",
      backgroundColor: "#111827",
      borderRadius: "8px",
      border: "1px solid #374151",
    },
    modalText: {
      color: "#d1d5db",
      fontSize: "14px",
      lineHeight: "1.6",
      marginBottom: "6px",
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
    itemsPerPageSelect: {
      padding: "8px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      marginLeft: "10px",
    },
    copyButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "4px",
      marginLeft: "5px",
    },
  };

  if (loading && bills.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>
          <RefreshCw size={30} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
          <div>Loading bills...</div>
        </div>
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
          {message.type === "success" && <CheckCircle size={18} />}
          {message.type === "error" && <AlertCircle size={18} />}
          {message.type === "info" && <Filter size={18} />}
          {message.text.split('\n').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <h1 style={styles.title}>
            <Receipt size={32} color="#6366f1" />
            Visit Bills
          </h1>
          <button 
            style={styles.refreshButton}
            onClick={fetchBills}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <select
            style={styles.itemsPerPageSelect}
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
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

      {/* Filters - Enhanced Grid Layout */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search bill no, customer name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          style={styles.filterSelect}
          value={filterPaymentMethod}
          onChange={(e) => setFilterPaymentMethod(e.target.value)}
        >
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
          <option value="cheque">Cheque</option>
          <option value="mixed">Mixed</option>
        </select>

        <input
          type="date"
          style={styles.dateInput}
          value={dateRange.start}
          onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
          placeholder="From"
        />

        <input
          type="date"
          style={styles.dateInput}
          value={dateRange.end}
          onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
          placeholder="To"
        />

        <select
          style={styles.filterSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>

        <button 
          style={styles.filterButton}
          onClick={resetFilters}
        >
          <X size={16} /> Clear
        </button>
      </div>

      {/* Bills Table */}
      <div style={styles.tableContainer}>
        {error && <div style={{padding: '30px', color: '#f87171', textAlign: 'center'}}>{error}</div>}
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Bill No.</th>
              <th style={styles.th}>Date & Time</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Items</th>
              <th style={styles.th}>Subtotal</th>
              <th style={styles.th}>Discount</th>
              <th style={styles.th}>Tax</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Paid</th>
              <th style={styles.th}>Due</th>
              <th style={styles.th}>Payment</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentBills.length === 0 ? (
              <tr>
                <td colSpan="14" style={styles.noData}>
                  {searchTerm || filterPaymentMethod !== 'all' || filterPaymentStatus !== 'all' || dateRange.start 
                    ? <div>
                        <Filter size={30} style={{marginBottom: '10px', opacity: 0.5}} />
                        <div>No bills match your filters</div>
                        <button 
                          onClick={resetFilters}
                          style={{...styles.button, marginTop: '15px', display: 'inline-flex'}}
                        >
                          <X size={14} /> Clear Filters
                        </button>
                      </div>
                    : <div>
                        <Receipt size={30} style={{marginBottom: '10px', opacity: 0.5}} />
                        <div>No bills found</div>
                      </div>}
                </td>
              </tr>
            ) : (
              currentBills.map((bill) => {
                const dueAmount = (bill.total || 0) - (bill.paidAmount || 0);
                return (
                  <tr key={bill.id}>
                    <td style={styles.td}>
                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <strong>{bill.billNumber}</strong>
                        <button
                          style={styles.copyButton}
                          onClick={() => handleCopyBillNumber(bill.billNumber)}
                          title="Copy bill number"
                        >
                          {copiedBillNo === bill.billNumber ? <CheckCircle size={14} color="#059669" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div>{new Date(bill.createdAt).toLocaleDateString()}</div>
                      <small style={{color: '#9ca3af', fontSize: '11px'}}>
                        {new Date(bill.createdAt).toLocaleTimeString()}
                      </small>
                    </td>
                    <td style={styles.td}>
                      <div><User size={12} style={{display: 'inline', marginRight: '4px'}} /> {bill.customerName || 'Walk-in'}</div>
                      {bill.customerType && (
                        <small style={{
                          color: bill.customerType === 'internal' ? '#3b82f6' : '#f59e0b',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {bill.customerType === 'internal' ? '🏢 INTERNAL' : '👤 EXTERNAL'}
                        </small>
                      )}
                    </td>
                    <td style={styles.td}>
                      {bill.customerPhone && (
                        <div><Phone size={10} style={{display: 'inline', marginRight: '4px'}} /> {bill.customerPhone}</div>
                      )}
                      {bill.customerEmail && (
                        <small style={{color: '#9ca3af'}}>{bill.customerEmail}</small>
                      )}
                    </td>
                    <td style={styles.td}>{bill.itemCount || 0}</td>
                    <td style={styles.td}>{formatCurrency(bill.subtotal)}</td>
                    <td style={styles.td}>{formatCurrency(bill.discount)}</td>
                    <td style={styles.td}>{formatCurrency(bill.tax)}</td>
                    <td style={styles.td}><strong>{formatCurrency(bill.total)}</strong></td>
                    <td style={styles.td}>{formatCurrency(bill.paidAmount)}</td>
                    <td style={styles.td}>
                      <span style={{
                        color: dueAmount > 0 ? '#f87171' : '#34d399',
                        fontWeight: '600'
                      }}>
                        {formatCurrency(dueAmount)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{
                        ...styles.paymentBadge,
                        color: getPaymentColor(bill.paymentMethod),
                        border: `1px solid ${getPaymentColor(bill.paymentMethod)}30`
                      }}>
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
                        {getStatusColor(bill.paymentStatus).icon}
                        <span style={{textTransform: 'capitalize'}}>{bill.paymentStatus}</span>
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{...styles.actionButton, backgroundColor: '#3b82f6', color: 'white', marginRight: '4px'}}
                        onClick={() => fetchBillDetails(bill.id)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        style={{...styles.actionButton, backgroundColor: '#059669', color: 'white'}}
                        onClick={() => handlePrintBill(bill)}
                        title="Print Bill"
                      >
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
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
            
            <h2 style={styles.modalTitle}>
              <Receipt size={24} color="#6366f1" />
              Bill Details - {selectedBill.billNumber}
            </h2>
            
            <div style={styles.modalSection}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px'}}>
                <div>
                  <p style={styles.modalText}><strong>Bill Number:</strong> {selectedBill.billNumber}</p>
                  <p style={styles.modalText}><strong>Date:</strong> {new Date(selectedBill.createdAt).toLocaleDateString()}</p>
                  <p style={styles.modalText}><strong>Time:</strong> {new Date(selectedBill.createdAt).toLocaleTimeString()}</p>
                </div>
                <div>
                  <p style={styles.modalText}><strong>Customer Type:</strong> 
                    <span style={{
                      color: selectedBill.customerType === 'internal' ? '#3b82f6' : '#f59e0b',
                      marginLeft: '5px',
                      fontWeight: '600'
                    }}>
                      {selectedBill.customerType?.toUpperCase() || 'EXTERNAL'}
                    </span>
                  </p>
                  <p style={styles.modalText}><strong>Customer:</strong> {selectedBill.customerName || 'Walk-in Customer'}</p>
                  {selectedBill.customerPhone && <p style={styles.modalText}><strong>Phone:</strong> {selectedBill.customerPhone}</p>}
                </div>
              </div>
              
              {selectedBill.customerEmail && <p style={styles.modalText}><strong>Email:</strong> {selectedBill.customerEmail}</p>}
              {selectedBill.customerAddress && <p style={styles.modalText}><strong>Address:</strong> {selectedBill.customerAddress}</p>}
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
                  const productName = item.product_name || item.productName || 'Unknown';
                  const productModel = item.product_model || item.productModel || '';
                  const sellPrice = parseFloat(item.sell_price || item.sellPrice || 0);
                  const quantity = item.quantity || 0;
                  const total = parseFloat(item.total || 0);
                  
                  return (
                    <tr key={index}>
                      <td style={styles.modalTd}>
                        <div><strong>{productName}</strong></div>
                        {productModel && <small style={{color: '#9ca3af'}}>{productModel}</small>}
                      </td>
                      <td style={styles.modalTd}>₹{sellPrice.toFixed(2)}</td>
                      <td style={styles.modalTd}>{quantity}</td>
                      <td style={styles.modalTd}>₹{total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{borderTop: '1px solid #374151', paddingTop: '15px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#d1d5db'}}>
                <span>Subtotal:</span>
                <span>₹{(selectedBill.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#d1d5db'}}>
                <span>Discount:</span>
                <span>- ₹{(selectedBill.discount || 0).toFixed(2)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#d1d5db'}}>
                <span>Tax:</span>
                <span>+ ₹{(selectedBill.tax || 0).toFixed(2)}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold', fontSize: '18px', color: '#f9fafb', borderTop: '1px dashed #374151', paddingTop: '8px'}}>
                <span>Total:</span>
                <span>₹{(selectedBill.total || 0).toFixed(2)}</span>
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #374151'}}>
                <div>
                  <p style={{color: '#d1d5db', fontSize: '13px'}}>
                    <strong>Paid:</strong> ₹{(selectedBill.paidAmount || 0).toFixed(2)}
                  </p>
                  <p style={{color: '#d1d5db', fontSize: '13px'}}>
                    <strong>Change:</strong> ₹{(selectedBill.changeAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={{color: '#d1d5db', fontSize: '13px'}}>
                    <strong>Due:</strong> 
                    <span style={{
                      color: ((selectedBill.total || 0) - (selectedBill.paidAmount || 0)) > 0 ? '#f87171' : '#34d399',
                      fontWeight: '600',
                      marginLeft: '5px'
                    }}>
                      ₹{((selectedBill.total || 0) - (selectedBill.paidAmount || 0)).toFixed(2)}
                    </span>
                  </p>
                  <p style={{color: '#d1d5db', fontSize: '13px'}}>
                    <strong>Method:</strong> 
                    <span style={{textTransform: 'capitalize', marginLeft: '5px'}}>{selectedBill.paymentMethod}</span>
                  </p>
                </div>
              </div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px', alignItems: 'center'}}>
                <span style={{color: '#d1d5db', fontSize: '13px'}}><strong>Payment Status:</strong></span>
                <span style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: getStatusColor(selectedBill.paymentStatus).background,
                  color: getStatusColor(selectedBill.paymentStatus).color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  {getStatusColor(selectedBill.paymentStatus).icon}
                  {selectedBill.paymentStatus?.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={{...styles.actionButton, backgroundColor: '#059669', color: 'white', padding: '12px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500'}}
                onClick={() => {
                  setShowBillModal(false);
                  handlePrintBill(selectedBill);
                }}
              >
                <Printer size={16} /> Print Bill
              </button>
              <button
                style={{...styles.actionButton, backgroundColor: '#374151', color: 'white', padding: '12px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500'}}
                onClick={() => setShowBillModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitBillPage;