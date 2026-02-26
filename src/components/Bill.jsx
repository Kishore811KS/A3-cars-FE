// Bill.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const Bill = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [barcode, setBarcode] = useState('');
  
  // Bill information
  const [billNumber, setBillNumber] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  // Payment information
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage');
  const [tax, setTax] = useState(0);
  const [taxType, setTaxType] = useState('percentage');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  
  // Payment details for different methods
  const [cashReceived, setCashReceived] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [billSaved, setBillSaved] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Refs
  const billPaperRef = useRef(null);

  // Create axios instance with credentials
  const api = axios.create({
    baseURL: 'http://127.0.0.1:5000/api', // Use 127.0.0.1 instead of localhost
    withCredentials: true, // This sends cookies/session with every request
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add request interceptor for debugging
  api.interceptors.request.use(request => {
    console.log('Starting Request:', request.url);
    return request;
  });

  // Add response interceptor for error handling
  api.interceptors.response.use(
    response => {
      console.log('Response:', response.status);
      return response;
    },
    error => {
      console.log('Response Error:', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        setError('Session expired. Please login again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
      return Promise.reject(error);
    }
  );

  // Base styles (without dynamic values)
  const baseStyles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '1fr 350px',
      gap: '20px',
      padding: '20px',
      minHeight: '100vh',
      background: '#f0f0f0',
      fontFamily: "'Courier New', monospace",
    },
    productPanel: {
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      overflow: 'auto',
      maxHeight: 'calc(100vh - 40px)',
    },
    productPanelTitle: {
      marginBottom: '20px',
      color: '#333',
      borderBottom: '2px solid #333',
      paddingBottom: '10px',
      fontSize: '24px',
    },
    alert: {
      padding: '12px',
      borderRadius: '5px',
      marginBottom: '20px',
      fontWeight: 'bold',
      animation: 'slideIn 0.3s ease',
    },
    alertError: {
      background: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
    },
    alertSuccess: {
      background: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
    },
    searchSection: {
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #e9ecef',
    },
    searchBox: {
      marginBottom: '15px',
      position: 'relative',
    },
    searchLabel: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold',
      color: '#333',
      fontSize: '14px',
    },
    searchInput: {
      width: '100%',
      padding: '12px',
      border: '2px solid #ddd',
      borderRadius: '5px',
      fontSize: '16px',
      fontFamily: "'Courier New', monospace",
      transition: 'border-color 0.3s, box-shadow 0.3s',
      outline: 'none',
    },
    searchLoading: {
      position: 'absolute',
      right: '10px',
      top: '40px',
      color: '#666',
      fontSize: '12px',
      background: 'white',
      padding: '2px 8px',
      borderRadius: '3px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    barcodeInput: {
      display: 'flex',
      gap: '10px',
    },
    barcodeField: {
      flex: 1,
      padding: '12px',
      border: '2px solid #ddd',
      borderRadius: '5px',
      fontSize: '16px',
      fontFamily: "'Courier New', monospace",
      outline: 'none',
    },
    barcodeButton: {
      padding: '12px 20px',
      background: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'background 0.3s, transform 0.1s',
    },
    barcodeButtonDisabled: {
      background: '#6c757d',
      cursor: 'not-allowed',
      opacity: 0.7,
    },
    searchResults: {
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '5px',
      maxHeight: '300px',
      overflowY: 'auto',
      marginTop: '10px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      position: 'absolute',
      width: 'calc(100% - 40px)',
      zIndex: 1000,
    },
    searchResultItem: {
      padding: '12px',
      borderBottom: '1px solid #eee',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'background 0.2s',
    },
    resultInfo: {
      flex: 1,
    },
    resultName: {
      fontWeight: 'bold',
      color: '#333',
    },
    resultDetails: {
      fontSize: '12px',
      color: '#666',
      marginTop: '2px',
    },
    resultPrice: {
      fontWeight: 'bold',
      color: '#28a745',
      fontSize: '16px',
    },
    selectedProducts: {
      marginTop: '20px',
    },
    selectedProductsTitle: {
      marginBottom: '15px',
      color: '#333',
      borderBottom: '1px solid #ddd',
      paddingBottom: '8px',
      fontSize: '18px',
    },
    noItems: {
      textAlign: 'center',
      color: '#999',
      padding: '30px',
      fontStyle: 'italic',
      background: '#f8f9fa',
      borderRadius: '5px',
    },
    selectedItemsList: {
      maxHeight: '400px',
      overflowY: 'auto',
    },
    selectedItem: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 80px 100px 40px',
      gap: '10px',
      padding: '12px',
      background: '#f8f9fa',
      marginBottom: '8px',
      borderRadius: '5px',
      alignItems: 'center',
      border: '1px solid #e9ecef',
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    itemInfo: {
      display: 'flex',
      flexDirection: 'column',
    },
    itemName: {
      fontWeight: 'bold',
      color: '#333',
    },
    itemModel: {
      fontSize: '11px',
      color: '#666',
    },
    itemPrice: {
      fontWeight: 'bold',
      color: '#28a745',
    },
    itemTotal: {
      fontWeight: 'bold',
      color: '#28a745',
    },
    itemQuantity: {
      width: '70px',
      padding: '5px',
      border: '1px solid #ddd',
      borderRadius: '3px',
      textAlign: 'center',
      fontFamily: "'Courier New', monospace",
    },
    removeBtn: {
      background: '#dc3545',
      color: 'white',
      border: 'none',
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.3s, transform 0.1s',
    },
    billPanel: {
      background: 'white',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: '20px',
      height: 'fit-content',
      maxHeight: 'calc(100vh - 40px)',
      overflow: 'auto',
    },
    billContainer: {
      padding: '15px',
    },
    billPaper: {
      background: 'white',
      padding: '15px 12px',
      border: '1px solid #ccc',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      position: 'relative',
      marginBottom: '15px',
      borderRadius: '3px',
      width: '280px',
      margin: '0 auto',
      fontFamily: "'Courier New', monospace",
      fontSize: '11px',
      lineHeight: '1.3',
    },
    billHeader: {
      textAlign: 'center',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px dashed #333',
    },
    billHeaderH1: {
      fontSize: '16px',
      letterSpacing: '1px',
      marginBottom: '3px',
      color: '#333',
      fontWeight: 'bold',
    },
    billHeaderP: {
      fontSize: '9px',
      color: '#666',
      margin: '1px 0',
      lineHeight: '1.2',
    },
    billInfo: {
      margin: '10px 0',
      padding: '6px 0',
      borderTop: '1px dashed #333',
      borderBottom: '1px dashed #333',
    },
    billInfoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '2px',
      fontSize: '10px',
    },
    billNumber: {
      fontWeight: 'bold',
      color: '#007bff',
    },
    customerInfo: {
      margin: '10px 0',
      padding: '8px',
      background: '#f9f9f9',
      borderRadius: '2px',
      border: '1px solid #e9ecef',
      fontSize: '10px',
    },
    customerInput: {
      width: '100%',
      padding: '4px 6px',
      marginBottom: '4px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
      transition: 'border-color 0.3s',
    },
    billItems: {
      margin: '10px 0',
    },
    billItemsHeader: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
      fontWeight: 'bold',
      padding: '4px 0',
      borderBottom: '1px solid #333',
      fontSize: '10px',
      background: '#f0f0f0',
      paddingLeft: '2px',
    },
    billItem: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
      padding: '3px 0',
      borderBottom: '1px dotted #ccc',
      fontSize: '9px',
      paddingLeft: '2px',
    },
    billItemEmpty: {
      textAlign: 'center',
      color: '#999',
      padding: '10px',
      fontStyle: 'italic',
      fontSize: '10px',
    },
    billItemName: {
      display: 'flex',
      flexDirection: 'column',
    },
    billItemSmall: {
      fontSize: '7px',
      color: '#666',
    },
    billSummary: {
      margin: '10px 0',
      padding: '8px 0',
      borderTop: '1px solid #333',
    },
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '3px',
      fontSize: '10px',
    },
    summaryRowTotal: {
      fontWeight: 'bold',
      fontSize: '12px',
      borderTop: '1px dashed #333',
      paddingTop: '6px',
      marginTop: '6px',
      color: '#333',
    },
    summaryInput: {
      width: '50px',
      padding: '2px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      textAlign: 'right',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
      marginLeft: '3px',
    },
    discountRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '3px',
      fontSize: '10px',
      alignItems: 'center',
    },
    discountControls: {
      display: 'flex',
      gap: '2px',
      alignItems: 'center',
    },
    discountType: {
      padding: '2px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      fontSize: '9px',
      fontFamily: "'Courier New', monospace",
    },
    paymentSection: {
      margin: '10px 0',
      padding: '8px',
      background: '#f0f0f0',
      borderRadius: '2px',
      border: '1px solid #ddd',
      fontSize: '10px',
    },
    paymentRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px',
      alignItems: 'center',
    },
    paymentSelect: {
      padding: '4px',
      width: '100px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
    },
    paymentInput: {
      width: '80px',
      padding: '3px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      textAlign: 'right',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
    },
    paymentDetails: {
      marginTop: '8px',
      padding: '6px',
      background: 'white',
      borderRadius: '2px',
      border: '1px solid #ccc',
    },
    paymentDetailsInput: {
      width: '100%',
      padding: '4px',
      marginBottom: '4px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
    },
    billFooter: {
      textAlign: 'center',
      marginTop: '15px',
      paddingTop: '10px',
      borderTop: '1px dashed #333',
      fontSize: '8px',
    },
    billFooterP: {
      marginBottom: '2px',
      color: '#666',
    },
    actionButtons: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
      marginTop: '15px',
    },
    btn: {
      padding: '10px',
      border: 'none',
      borderRadius: '3px',
      fontWeight: 'bold',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'all 0.3s',
      fontFamily: "'Courier New', monospace",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3px',
    },
    btnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    btnPrimary: {
      background: '#007bff',
      color: 'white',
    },
    btnSuccess: {
      background: '#28a745',
      color: 'white',
    },
    btnDanger: {
      background: '#dc3545',
      color: 'white',
    },
    btnSecondary: {
      background: '#6c757d',
      color: 'white',
    },
    btnInfo: {
      background: '#17a2b8',
      color: 'white',
    },
    btnWarning: {
      background: '#ffc107',
      color: '#333',
    },
  };

  // Check authentication on mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      setIsAuthenticated(false);
      setError('Please login first');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }, []);

  // Generate random bill number
  const generateBillNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 8; i++) {
      random += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    
    setBillNumber(`BT-${year}${month}${day}-${random}`);
  };

  // Update date and time
  const updateDateTime = () => {
    const now = new Date();
    setCurrentDate(now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }));
    setCurrentTime(now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }));
  };

  // Initialize
  useEffect(() => {
    generateBillNumber();
    updateDateTime();
    
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Search products with debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchProducts();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Update payment status when paid amount changes
  useEffect(() => {
    const total = calculateTotal();
    if (paidAmount === 0) {
      setPaymentStatus('pending');
    } else if (paidAmount < total) {
      setPaymentStatus('partial');
    } else if (paidAmount >= total) {
      setPaymentStatus('paid');
    }
  }, [paidAmount, selectedProducts, discount, tax]);

  // Add thermal print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        #billPaper, #billPaper * {
          visibility: visible;
        }
        #billPaper {
          position: absolute;
          left: 0;
          top: 0;
          width: 280px;
          margin: 0;
          padding: 12px;
          border: none;
          box-shadow: none;
          background: white;
        }
        @page {
          size: 80mm 297mm;
          margin: 0;
        }
        .no-print {
          display: none !important;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Clear payment method specific fields when method changes
  useEffect(() => {
    setShowPaymentDetails(true);
    switch(paymentMethod) {
      case 'cash':
        setCardNumber('');
        setCardHolderName('');
        setUpiId('');
        setTransactionId('');
        setBankName('');
        setChequeNumber('');
        break;
      case 'card':
        setCashReceived(0);
        setUpiId('');
        setTransactionId('');
        setBankName('');
        setChequeNumber('');
        break;
      case 'upi':
        setCashReceived(0);
        setCardNumber('');
        setCardHolderName('');
        setBankName('');
        setChequeNumber('');
        break;
      case 'cheque':
        setCashReceived(0);
        setCardNumber('');
        setCardHolderName('');
        setUpiId('');
        setTransactionId('');
        break;
      default:
        break;
    }
  }, [paymentMethod]);

  // Search products API call
  const searchProducts = async () => {
    if (!isAuthenticated) return;
    
    setSearchLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/billing/search-products?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Search error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.error || 'Failed to search products');
      }
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Get product by barcode
  const getProductByBarcode = async () => {
    if (!isAuthenticated) return;
    if (!barcode.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/billing/product/barcode/${barcode}`);
      addProductToBill(response.data);
      setBarcode('');
    } catch (err) {
      console.error('Barcode error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.error || 'Product not found');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add product to bill
  const addProductToBill = (product) => {
    const existingProduct = selectedProducts.find(p => p.id === product.id);
    
    if (existingProduct) {
      if (existingProduct.quantity < product.quantity) {
        const updatedProducts = selectedProducts.map(p =>
          p.id === product.id
            ? { 
                ...p, 
                quantity: p.quantity + 1, 
                total: (p.quantity + 1) * p.sellPrice 
              }
            : p
        );
        setSelectedProducts(updatedProducts);
        setSuccess(`Added another ${product.name}`);
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(`Insufficient stock! Max available: ${product.quantity}`);
        setTimeout(() => setError(''), 3000);
      }
    } else {
      if (product.quantity > 0) {
        setSelectedProducts([
          ...selectedProducts,
          {
            id: product.id,
            name: product.name,
            model: product.model || '',
            sellPrice: product.sellPrice,
            quantity: 1,
            total: product.sellPrice,
            maxQuantity: product.quantity
          }
        ]);
        setSuccess(`${product.name} added to bill`);
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError('Out of stock!');
        setTimeout(() => setError(''), 3000);
      }
    }
    
    setSearchQuery('');
    setSearchResults([]);
  };

  // Update quantity
  const updateQuantity = (productId, newQuantity) => {
    const product = selectedProducts.find(p => p.id === productId);
    
    if (product) {
      newQuantity = parseInt(newQuantity) || 0;
      
      if (newQuantity > 0 && newQuantity <= product.maxQuantity) {
        const updatedProducts = selectedProducts.map(p =>
          p.id === productId
            ? { ...p, quantity: newQuantity, total: newQuantity * p.sellPrice }
            : p
        );
        setSelectedProducts(updatedProducts);
      } else if (newQuantity === 0) {
        removeProduct(productId);
      } else {
        setError(`Invalid quantity! Max available: ${product.maxQuantity}`);
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Remove product
  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    setSuccess('Item removed');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    return selectedProducts.reduce((sum, p) => sum + p.total, 0);
  };

  // Calculate discount amount
  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === 'percentage') {
      return (subtotal * discount) / 100;
    }
    return discount;
  };

  // Calculate tax amount
  const calculateTaxAmount = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    const afterDiscount = subtotal - discountAmount;
    
    if (taxType === 'percentage') {
      return (afterDiscount * tax) / 100;
    }
    return tax;
  };

  // Calculate total
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    const taxAmount = calculateTaxAmount();
    return subtotal - discountAmount + taxAmount;
  };

  // Calculate change
  const calculateChange = () => {
    const total = calculateTotal();
    return Math.max(0, paidAmount - total);
  };

  // Calculate due amount
  const calculateDue = () => {
    const total = calculateTotal();
    return Math.max(0, total - paidAmount);
  };

  // Handle cash payment
  const handleCashPayment = (received) => {
    const amount = parseFloat(received) || 0;
    setCashReceived(amount);
    setPaidAmount(amount);
  };

  // Handle exact payment
  const handleExactPayment = () => {
    const total = calculateTotal();
    setPaidAmount(total);
    if (paymentMethod === 'cash') {
      setCashReceived(total);
    }
  };

  // Save bill
  const saveBill = async () => {
    if (!isAuthenticated) {
      setError('Please login first');
      return;
    }

    if (selectedProducts.length === 0) {
      setError('No items in bill!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    const taxAmount = calculateTaxAmount();
    const total = calculateTotal();
    const changeAmount = calculateChange();
    const dueAmount = calculateDue();

    // Prepare payment details based on method
    const paymentDetails = {
      method: paymentMethod,
      amount: paidAmount,
      status: paymentStatus,
      change: changeAmount,
      due: dueAmount
    };

    // Add method-specific details
    switch(paymentMethod) {
      case 'cash':
        paymentDetails.cashReceived = cashReceived;
        break;
      case 'card':
        paymentDetails.cardNumber = cardNumber;
        paymentDetails.cardHolderName = cardHolderName;
        paymentDetails.transactionId = transactionId;
        break;
      case 'upi':
        paymentDetails.upiId = upiId;
        paymentDetails.transactionId = transactionId;
        break;
      case 'cheque':
        paymentDetails.chequeNumber = chequeNumber;
        paymentDetails.bankName = bankName;
        break;
      default:
        break;
    }

    const billData = {
      customerName,
      customerPhone,
      customerEmail,
      customerGST,
      customerAddress,
      subtotal,
      discount: discountAmount,
      discountType,
      discountValue: discount,
      tax: taxAmount,
      taxType,
      taxValue: tax,
      total,
      paidAmount: parseFloat(paidAmount) || 0,
      changeAmount,
      dueAmount,
      paymentMethod,
      paymentStatus,
      paymentDetails,
      items: selectedProducts.map(p => ({
        productId: p.id,
        productName: p.name,
        productModel: p.model,
        sellPrice: p.sellPrice,
        quantity: p.quantity,
        total: p.total
      }))
    };

    try {
      const response = await api.post('/billing/bills', billData);
      
      setSuccess('Bill saved successfully!');
      setBillNumber(response.data.billNumber);
      setBillSaved(true);
      
      setTimeout(() => {
        handlePrint();
      }, 500);
      
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  // Clear bill
  const clearBill = () => {
    if (window.confirm('Clear all items?')) {
      setSelectedProducts([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerGST('');
      setCustomerAddress('');
      setDiscount(0);
      setDiscountType('percentage');
      setTax(0);
      setTaxType('percentage');
      setPaidAmount(0);
      setCashReceived(0);
      setPaymentMethod('cash');
      setPaymentStatus('pending');
      setCardNumber('');
      setCardHolderName('');
      setUpiId('');
      setTransactionId('');
      setBankName('');
      setChequeNumber('');
      setError('');
      setSuccess('');
      setBillSaved(false);
      generateBillNumber();
    }
  };

  // Handle thermal print
  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      setError('No items to print!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const billContent = billPaperRef.current.outerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Bill - ${billNumber}</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                width: 80mm;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                line-height: 1.3;
              }
              @page {
                size: 80mm auto;
                margin: 0;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
              }
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            </style>
          </head>
          <body>
            ${billContent}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  // Handle new bill
  const handleNewBill = () => {
    clearBill();
  };

  // Handle key press for barcode
  const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      getProductByBarcode();
    }
  };

  // Test API connection
  const testAPIConnection = async () => {
    try {
      const response = await api.get('/health');
      console.log('API Health:', response.data);
    } catch (err) {
      console.error('API Health Check Failed:', err);
    }
  };

  // Run API test on mount
  useEffect(() => {
    testAPIConnection();
  }, []);

  const total = calculateTotal();
  const due = calculateDue();
  const change = calculateChange();

  // Dynamic styles that depend on state
  const dynamicStyles = {
    changeAmount: {
      fontWeight: 'bold',
      color: paidAmount >= total ? '#28a745' : '#dc3545',
      fontSize: '10px',
    }
  };

  // Show login required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{...baseStyles.container, justifyContent: 'center', alignItems: 'center'}}>
        <div style={{background: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center'}}>
          <h2>🔒 Authentication Required</h2>
          <p style={{color: '#dc3545', margin: '20px 0'}}>{error || 'Please login to access billing'}</p>
          <button 
            style={{...baseStyles.btn, ...baseStyles.btnPrimary, padding: '10px 30px'}}
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={baseStyles.container}>
      {/* Left Panel - Product Selection */}
      <div style={baseStyles.productPanel}>
        <h2 style={baseStyles.productPanelTitle}>🧾 Create New Bill</h2>
        
        {error && (
          <div style={{...baseStyles.alert, ...baseStyles.alertError}}>
            ⚠️ {error}
          </div>
        )}
        
        {success && (
          <div style={{...baseStyles.alert, ...baseStyles.alertSuccess}}>
            ✅ {success}
          </div>
        )}
        
        <div style={baseStyles.searchSection}>
          <div style={baseStyles.searchBox}>
            <label style={baseStyles.searchLabel}>🔍 Search Products:</label>
            <input
              type="text"
              style={baseStyles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type product name or model..."
              autoComplete="off"
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            {searchLoading && <div style={baseStyles.searchLoading}>Searching...</div>}
          </div>
          
          <div style={baseStyles.barcodeInput}>
            <input
              type="text"
              style={baseStyles.barcodeField}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyPress={handleBarcodeKeyPress}
              placeholder="📱 Scan barcode..."
              onFocus={(e) => e.target.style.borderColor = '#28a745'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            <button
              style={{
                ...baseStyles.barcodeButton,
                ...(loading ? baseStyles.barcodeButtonDisabled : {})
              }}
              onClick={getProductByBarcode}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div style={baseStyles.searchResults}>
              {searchResults.map(product => (
                <div
                  key={product.id}
                  style={baseStyles.searchResultItem}
                  onClick={() => addProductToBill(product)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={baseStyles.resultInfo}>
                    <div style={baseStyles.resultName}>{product.name}</div>
                    <div style={baseStyles.resultDetails}>
                      {product.model || ''} | Stock: {product.quantity}
                    </div>
                  </div>
                  <div style={baseStyles.resultPrice}>₹{product.sellPrice}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={baseStyles.selectedProducts}>
          <h3 style={baseStyles.selectedProductsTitle}>🛒 Current Bill Items ({selectedProducts.length})</h3>
          <div style={baseStyles.selectedItemsList}>
            {selectedProducts.length === 0 ? (
              <p style={baseStyles.noItems}>No items added yet. Search or scan products to add.</p>
            ) : (
              selectedProducts.map(product => (
                <div key={product.id} style={baseStyles.selectedItem}>
                  <div style={baseStyles.itemInfo}>
                    <span style={baseStyles.itemName}>{product.name}</span>
                    {product.model && (
                      <span style={baseStyles.itemModel}>{product.model}</span>
                    )}
                  </div>
                  <div style={baseStyles.itemPrice}>₹{product.sellPrice}</div>
                  <input
                    type="number"
                    style={baseStyles.itemQuantity}
                    value={product.quantity}
                    min="1"
                    max={product.maxQuantity}
                    onChange={(e) => updateQuantity(product.id, e.target.value)}
                  />
                  <div style={baseStyles.itemTotal}>₹{product.total.toFixed(2)}</div>
                  <button
                    style={baseStyles.removeBtn}
                    onClick={() => removeProduct(product.id)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Right Panel - Thermal Bill */}
      <div style={baseStyles.billPanel}>
        <div style={baseStyles.billContainer}>
          <div 
            style={baseStyles.billPaper} 
            id="billPaper" 
            ref={billPaperRef}
          >
            <div style={baseStyles.billHeader}>
              <h1 style={baseStyles.billHeaderH1}>BRAIN TECH</h1>
              <p style={baseStyles.billHeaderP}>123 Main Street, City - 400001</p>
              <p style={baseStyles.billHeaderP}>Ph: +91 98765 43210</p>
              <p style={baseStyles.billHeaderP}>GST: 27ABCDE1234F1Z5</p>
            </div>
            
            <div style={baseStyles.billInfo}>
              <div style={baseStyles.billInfoRow}>
                <span>Bill No:</span>
                <span style={baseStyles.billNumber}>{billNumber}</span>
              </div>
              <div style={baseStyles.billInfoRow}>
                <span>Date:</span>
                <span>{currentDate}</span>
              </div>
              <div style={baseStyles.billInfoRow}>
                <span>Time:</span>
                <span>{currentTime}</span>
              </div>
            </div>
            
            <div style={baseStyles.customerInfo}>
              <input
                type="text"
                style={baseStyles.customerInput}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name"
              />
              <input
                type="text"
                style={baseStyles.customerInput}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone Number"
              />
              <input
                type="text"
                style={baseStyles.customerInput}
                value={customerGST}
                onChange={(e) => setCustomerGST(e.target.value)}
                placeholder="GST Number (Optional)"
              />
            </div>
            
            <div style={baseStyles.billItems}>
              <div style={baseStyles.billItemsHeader}>
                <span>Item</span>
                <span>Price</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              <div>
                {selectedProducts.length === 0 ? (
                  <div style={baseStyles.billItemEmpty}>
                    <span>--- No items in bill ---</span>
                  </div>
                ) : (
                  selectedProducts.map(product => (
                    <div key={product.id} style={baseStyles.billItem}>
                      <span style={baseStyles.billItemName}>
                        {product.name.length > 12 
                          ? product.name.substring(0, 10) + '...' 
                          : product.name
                        }
                        {product.model && (
                          <small style={baseStyles.billItemSmall}>{product.model}</small>
                        )}
                      </span>
                      <span>₹{product.sellPrice}</span>
                      <span>{product.quantity}</span>
                      <span>₹{product.total.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div style={baseStyles.billSummary}>
              <div style={baseStyles.summaryRow}>
                <span>Subtotal:</span>
                <span>₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              
              <div style={baseStyles.discountRow}>
                <span>Discount:</span>
                <span style={baseStyles.discountControls}>
                  <input
                    type="number"
                    style={baseStyles.summaryInput}
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step={discountType === 'percentage' ? '1' : '0.01'}
                  />
                  <select
                    style={baseStyles.discountType}
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                  >
                    <option value="percentage">%</option>
                    <option value="amount">₹</option>
                  </select>
                </span>
              </div>
              
              {discount > 0 && (
                <div style={baseStyles.summaryRow}>
                  <span>Discount Amt:</span>
                  <span>-₹{calculateDiscountAmount().toFixed(2)}</span>
                </div>
              )}
              
              <div style={baseStyles.discountRow}>
                <span>Tax (GST):</span>
                <span style={baseStyles.discountControls}>
                  <input
                    type="number"
                    style={baseStyles.summaryInput}
                    value={tax}
                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                    min="0"
                    step={taxType === 'percentage' ? '1' : '0.01'}
                  />
                  <select
                    style={baseStyles.discountType}
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value)}
                  >
                    <option value="percentage">%</option>
                    <option value="amount">₹</option>
                  </select>
                </span>
              </div>
              
              {tax > 0 && (
                <div style={baseStyles.summaryRow}>
                  <span>Tax Amt:</span>
                  <span>+₹{calculateTaxAmount().toFixed(2)}</span>
                </div>
              )}
              
              <div style={{...baseStyles.summaryRow, ...baseStyles.summaryRowTotal}}>
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
            
            <div style={baseStyles.paymentSection}>
              <div style={baseStyles.paymentRow}>
                <span>Payment Method:</span>
                <select
                  style={baseStyles.paymentSelect}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="upi">📱 UPI</option>
                  <option value="cheque">📝 Cheque</option>
                  <option value="mixed">🔄 Mixed</option>
                </select>
              </div>
              
              {showPaymentDetails && (
                <div style={baseStyles.paymentDetails}>
                  {paymentMethod === 'cash' && (
                    <>
                      <div style={baseStyles.paymentRow}>
                        <span>Cash Received:</span>
                        <input
                          type="number"
                          style={baseStyles.paymentInput}
                          value={cashReceived}
                          onChange={(e) => handleCashPayment(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div style={baseStyles.paymentRow}>
                        <span>Change:</span>
                        <span style={dynamicStyles.changeAmount}>₹{change.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  {paymentMethod === 'card' && (
                    <>
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="Card Number (last 4 digits)"
                        maxLength="4"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        placeholder="Card Holder Name"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID"
                      />
                    </>
                  )}
                  
                  {paymentMethod === 'upi' && (
                    <>
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="UPI ID"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID"
                      />
                    </>
                  )}
                  
                  {paymentMethod === 'cheque' && (
                    <>
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="Cheque Number"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Bank Name"
                      />
                    </>
                  )}
                  
                  {paymentMethod === 'mixed' && (
                    <div style={{fontSize: '9px', color: '#666'}}>
                      <p>Mixed payment - Please enter details in POS</p>
                    </div>
                  )}
                </div>
              )}
              
              <div style={baseStyles.paymentRow}>
                <span>Paid Amount:</span>
                <input
                  type="number"
                  style={baseStyles.paymentInput}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div style={baseStyles.paymentRow}>
                <span>Payment Status:</span>
                <span style={{
                  color: paymentStatus === 'paid' ? '#28a745' : 
                         paymentStatus === 'partial' ? '#ffc107' : '#dc3545',
                  fontWeight: 'bold'
                }}>
                  {paymentStatus.toUpperCase()}
                </span>
              </div>
              
              {due > 0 && paymentStatus !== 'pending' && (
                <div style={baseStyles.paymentRow}>
                  <span>Due Amount:</span>
                  <span>₹{due.toFixed(2)}</span>
                </div>
              )}
              
              <button
                style={{
                  ...baseStyles.btn,
                  ...baseStyles.btnSecondary,
                  width: '100%',
                  marginTop: '5px',
                  padding: '5px'
                }}
                onClick={handleExactPayment}
              >
                Exact Amount
              </button>
            </div>
            
            <div style={baseStyles.billFooter}>
              <p style={baseStyles.billFooterP}>Thank you for your purchase!</p>
              <p style={baseStyles.billFooterP}>Goods once sold not returnable</p>
              <p style={baseStyles.billFooterP}>** Computer generated bill **</p>
              {paymentMethod !== 'cash' && transactionId && (
                <p style={baseStyles.billFooterP}>
                  {paymentMethod.toUpperCase()}: {transactionId}
                </p>
              )}
            </div>
          </div>
          
          <div style={baseStyles.actionButtons}>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnPrimary,
                ...(loading || selectedProducts.length === 0 ? baseStyles.btnDisabled : {})
              }}
              onClick={handlePrint}
              disabled={loading || selectedProducts.length === 0}
            >
              🖨️ Print
            </button>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnSuccess,
                ...(loading || selectedProducts.length === 0 ? baseStyles.btnDisabled : {})
              }}
              onClick={saveBill}
              disabled={loading || selectedProducts.length === 0}
            >
              {loading ? '💾 Saving...' : '💾 Save'}
            </button>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnInfo,
                ...(loading ? baseStyles.btnDisabled : {})
              }}
              onClick={handleNewBill}
              disabled={loading}
            >
              🆕 New
            </button>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnDanger,
                ...(loading ? baseStyles.btnDisabled : {})
              }}
              onClick={clearBill}
              disabled={loading}
            >
              🗑️ Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bill;