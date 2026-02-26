// ItemsPage.jsx
import React, { useEffect, useState } from "react";
import { 
  Plus, Download, Upload, Trash2, Save, Search, RefreshCw, 
  Truck, FileText, X, CheckCircle, Clock, ChevronLeft, ChevronRight 
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const API_URL = "http://127.0.0.1:5000/api/products";
const SUPPLIER_API_URL = "http://127.0.0.1:5000/api";
const BILLING_API_URL = "http://127.0.0.1:5000/api/billing";

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Supply modal state
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [supplyItems, setSupplyItems] = useState([]);
  const [loadingSupply, setLoadingSupply] = useState(false);
  const [selectedSupplyItems, setSelectedSupplyItems] = useState(new Set());

  // Pending bills modal state
  const [showPendingBillsModal, setShowPendingBillsModal] = useState(false);
  const [pendingBills, setPendingBills] = useState([]);
  const [loadingPendingBills, setLoadingPendingBills] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [processingBill, setProcessingBill] = useState(false);

  // ================= LOAD FROM BACKEND =================
  useEffect(() => {
    loadProducts();
  }, []);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
      
      // Calculate values for each product
      const processedItems = productsArray.map(item => 
        calculateValues({ ...item, id: item.id })
      );
      
      setItems(processedItems);
      setCurrentPage(1); // Reset to first page on new load
      showMessage("success", "Products loaded successfully!");
    } catch (err) {
      console.error("Error fetching products:", err);
      showMessage("error", "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // ================= LOAD SUPPLY ITEMS (PENDING STATUS) =================
  const loadSupplyItems = async () => {
    setLoadingSupply(true);
    try {
      // Fetch all suppliers with their items
      const res = await fetch(`${SUPPLIER_API_URL}/suppliers-with-items`, {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      if (data.success && data.suppliers) {
        // Extract all items with status "Pending" from all suppliers
        const pendingItems = [];
        
        data.suppliers.forEach(supplier => {
          if (supplier.items && supplier.items.length > 0) {
            supplier.items.forEach(item => {
              if (item.status === "Pending") {
                pendingItems.push({
                  ...item,
                  supplierName: supplier.name,
                  supplierCompany: supplier.company,
                  supplierId: supplier.id,
                  // Add a unique key for selection
                  selectionKey: `${item.id}-${supplier.id}`
                });
              }
            });
          }
        });
        
        setSupplyItems(pendingItems);
        setSelectedSupplyItems(new Set());
        
        if (pendingItems.length === 0) {
          showMessage("info", "No pending supply items found");
        }
      }
    } catch (err) {
      console.error("Error loading supply items:", err);
      showMessage("error", "Failed to load supply items");
    } finally {
      setLoadingSupply(false);
    }
  };

  // ================= LOAD PENDING BILLS =================
  const loadPendingBills = async () => {
    setLoadingPendingBills(true);
    try {
      // Fetch bills with pending items
      const res = await fetch(`${BILLING_API_URL}/bills/pending-items`, {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      if (data.success && data.bills) {
        setPendingBills(data.bills);
      }
    } catch (err) {
      console.error("Error loading pending bills:", err);
      showMessage("error", "Failed to load pending bills");
    } finally {
      setLoadingPendingBills(false);
    }
  };

  // ================= LOAD BILL ITEMS =================
  const loadBillItems = async (billId) => {
    try {
      const res = await fetch(`${BILLING_API_URL}/bills/${billId}/items/pending`, {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      if (data.success && data.items) {
        setBillItems(data.items);
      }
    } catch (err) {
      console.error("Error loading bill items:", err);
      showMessage("error", "Failed to load bill items");
    }
  };

  // ================= PROCESS BILL ITEM (COMPLETE) =================
  const handleProcessBillItem = async (itemId, billId) => {
    try {
      const res = await fetch(`${BILLING_API_URL}/bills/${billId}/items/${itemId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include'
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();

      if (data.success) {
        showMessage("success", "Item completed successfully!");
        
        // Update the item status in the local state
        setBillItems(prevItems =>
          prevItems.map(item =>
            item.id === itemId ? { ...item, item_status: 'completed' } : item
          )
        );

        // Reload products to get updated quantities
        await loadProducts();
        
        // Check if all items in the bill are completed
        const updatedItems = billItems.map(item =>
          item.id === itemId ? { ...item, item_status: 'completed' } : item
        );
        
        const allCompleted = updatedItems.every(item => item.item_status === 'completed');
        
        if (allCompleted) {
          // Refresh pending bills list
          await loadPendingBills();
          setSelectedBill(null);
          setBillItems([]);
        }
      }
    } catch (err) {
      console.error("Error processing bill item:", err);
      showMessage("error", `Failed to process item: ${err.message}`);
    }
  };

  // ================= PROCESS ENTIRE BILL =================
  const handleProcessBill = async (billId) => {
    if (!window.confirm("Are you sure you want to complete all pending items in this bill?")) return;

    setProcessingBill(true);
    try {
      const res = await fetch(`${BILLING_API_URL}/bills/${billId}/complete-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include'
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();

      if (data.success) {
        showMessage("success", `Successfully completed ${data.completedCount} items!`);
        
        // Refresh data
        await loadProducts();
        await loadPendingBills();
        setSelectedBill(null);
        setBillItems([]);
      }
    } catch (err) {
      console.error("Error processing bill:", err);
      showMessage("error", `Failed to process bill: ${err.message}`);
    } finally {
      setProcessingBill(false);
    }
  };

  // ================= AUTO CALCULATION =================
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

  // ================= DUPLICATE CHECK =================
  const isSameProduct = (a, b) => {
    // Handle both naming conventions (buyPrice vs buy_price)
    const aBuyPrice = parseFloat(a.buyPrice || a.buy_price || 0);
    const bBuyPrice = parseFloat(b.buyPrice || b.buy_price || 0);
    
    return (
      a.name?.toLowerCase() === b.name?.toLowerCase() &&
      a.model?.toLowerCase() === (b.model || '').toLowerCase() &&
      a.type?.toLowerCase() === (b.type || '').toLowerCase() &&
      parseFloat(a.watts || 0) === parseFloat(b.watts || 0) &&
      aBuyPrice === bBuyPrice
    );
  };

  // ================= ADD SUPPLY ITEMS TO INVENTORY =================
  const handleAddSupplyItems = async () => {
    if (selectedSupplyItems.size === 0) {
      showMessage("error", "Please select at least one item");
      return;
    }

    setSaving(true);
    
    try {
      const selectedItems = Array.from(selectedSupplyItems).map(key => 
        supplyItems.find(item => item.selectionKey === key)
      );

      let updatedItems = [...items];
      const processedItems = [];

      for (const supplyItem of selectedItems) {
        // Check if product already exists in inventory
        const existingItem = updatedItems.find(item => 
          isSameProduct(item, supplyItem)
        );

        if (existingItem) {
          // Update quantity of existing item
          const supplyQty = parseInt(supplyItem.quantity) || 1;
          const currentQty = parseInt(existingItem.quantity) || 0;
          const newQty = currentQty + supplyQty;
          
          console.log(`Updating ${existingItem.name}: ${currentQty} + ${supplyQty} = ${newQty}`);
          
          // Update in backend
          const updatedProduct = calculateValues({
            ...existingItem,
            quantity: newQty
          });

          const res = await fetch(`${API_URL}/${existingItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: updatedProduct.name,
              model: updatedProduct.model || "",
              type: updatedProduct.type || "",
              watts: updatedProduct.watts || "",
              buyPrice: updatedProduct.buyPrice || 0,
              sellPrice: updatedProduct.sellPrice || 0,
              quantity: updatedProduct.quantity || 0,
            }),
          });

          if (!res.ok) throw new Error(`Failed to update product ${existingItem.name}`);

          // Update in local array
          updatedItems = updatedItems.map(item =>
            item.id === existingItem.id ? updatedProduct : item
          );

          processedItems.push({
            ...supplyItem,
            action: 'updated',
            oldQuantity: currentQty,
            addedQuantity: supplyQty,
            newQuantity: newQty
          });
        } else {
          // Create new product
          const supplyQty = parseInt(supplyItem.quantity) || 1;
          
          const newItem = {
            name: supplyItem.name,
            model: supplyItem.model || "",
            type: supplyItem.type || "",
            watts: supplyItem.watts || "",
            buyPrice: parseFloat(supplyItem.buy_price || supplyItem.buyPrice || 0),
            sellPrice: parseFloat(supplyItem.sell_price || supplyItem.sellPrice || 0),
            quantity: supplyQty,
          };

          console.log('Creating new product:', newItem);

          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newItem),
          });

          if (!res.ok) throw new Error(`Failed to create product ${supplyItem.name}`);

          const savedItem = await res.json();
          const processedItem = calculateValues({ ...savedItem, isNew: false });
          
          updatedItems.push(processedItem);
          
          processedItems.push({
            ...supplyItem,
            action: 'created',
            quantity: supplyQty,
            newId: savedItem.id
          });
        }

        // Update the supply item status to "In Inventory"
        await updateSupplyItemStatus(supplyItem.id, "In Inventory");
      }

      setItems(updatedItems);
      setCurrentPage(1); // Reset to first page after adding items
      setShowSupplyModal(false);
      
      // Show success message with summary
      const summary = processedItems.map(item => {
        if (item.action === 'updated') {
          return `${item.name}: Added ${item.addedQuantity} to existing stock (was ${item.oldQuantity}, now ${item.newQuantity})`;
        } else {
          return `${item.name}: Added as new product with quantity ${item.quantity}`;
        }
      }).join('\n');
      
      showMessage("success", `Successfully added ${processedItems.length} item(s) to inventory!\n${summary}`);
      
      // Refresh products to get latest data
      await loadProducts();
      
    } catch (err) {
      console.error("Error adding supply items:", err);
      showMessage("error", `Failed to add items: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ================= UPDATE SUPPLY ITEM STATUS =================
  const updateSupplyItemStatus = async (itemId, newStatus) => {
    try {
      const res = await fetch(`${SUPPLIER_API_URL}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        console.warn(`Failed to update status for item ${itemId}`);
      }
    } catch (err) {
      console.error(`Error updating status for item ${itemId}:`, err);
    }
  };

  // ================= TOGGLE SUPPLY ITEM SELECTION =================
  const toggleSupplyItem = (selectionKey) => {
    setSelectedSupplyItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(selectionKey)) {
        newSet.delete(selectionKey);
      } else {
        newSet.add(selectionKey);
      }
      return newSet;
    });
  };

  // ================= SELECT ALL SUPPLY ITEMS =================
  const toggleSelectAllSupply = () => {
    if (selectedSupplyItems.size === supplyItems.length) {
      setSelectedSupplyItems(new Set());
    } else {
      setSelectedSupplyItems(new Set(supplyItems.map(item => item.selectionKey)));
    }
  };

  // ================= OPEN SUPPLY MODAL =================
  const handleOpenSupplyModal = () => {
    setShowSupplyModal(true);
    loadSupplyItems();
  };

  // ================= OPEN PENDING BILLS MODAL =================
  const handleOpenPendingBillsModal = () => {
    setShowPendingBillsModal(true);
    loadPendingBills();
  };

  // ================= SELECT BILL TO VIEW ITEMS =================
  const handleSelectBill = (bill) => {
    setSelectedBill(bill);
    loadBillItems(bill.id);
  };

  // ================= ADD EMPTY ROW =================
  const handleAddRows = () => {
    const input = prompt("How many rows you want to add?", "1");
    if (!input) return;
    
    const count = parseInt(input) || 0;
    if (count <= 0) return;

    const newRows = Array.from({ length: count }, (_, i) => {
      const newId = `new-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
      return calculateValues({
        id: newId,
        name: "",
        model: "",
        type: "",
        watts: "",
        buyPrice: "",
        sellPrice: "",
        quantity: "",
        profitPercent: "0.00",
        amount: "0.00",
        isNew: true,
      });
    });

    setItems((prev) => [...prev, ...newRows]);
    // Go to last page to show new rows
    const newTotalItems = items.length + newRows.length;
    const lastPage = Math.ceil(newTotalItems / itemsPerPage);
    setCurrentPage(lastPage);
    showMessage("success", `${count} row(s) added`);
  };

  // ================= HANDLE INPUT CHANGE =================
  const handleChange = (id, field, value) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id
          ? calculateValues({ ...item, [field]: value })
          : item
      )
    );
  };

  // ================= VALIDATE ITEM =================
  const validateItem = (item) => {
    const errors = [];
    
    if (!item.name?.trim()) errors.push("Name is required");
    if (item.sellPrice <= 0) errors.push("Sell price must be greater than 0");
    if (item.quantity < 0) errors.push("Quantity cannot be negative");
    
    return errors;
  };

  // ================= SAVE TO BACKEND =================
  const handleSave = async () => {
    setSaving(true);
    
    try {
      let updatedItems = [...items];
      const errors = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Skip empty rows
        if (!item.name?.trim()) continue;

        // Validate item
        const itemErrors = validateItem(item);
        if (itemErrors.length > 0) {
          errors.push(`Row ${i + 1}: ${itemErrors.join(", ")}`);
          continue;
        }

        if (item.isNew) {
          // Check if duplicate exists in database (not in new items)
          const existingInDB = updatedItems.find(
            (dbItem) => !dbItem.isNew && isSameProduct(dbItem, item)
          );

          if (existingInDB) {
            // Update quantity of existing product
            const newQty = (existingInDB.quantity || 0) + (item.quantity || 0);
            
            const updatedProduct = calculateValues({
              ...existingInDB,
              quantity: newQty,
            });

            // Update in backend
            const res = await fetch(`${API_URL}/${existingInDB.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: updatedProduct.name,
                model: updatedProduct.model || "",
                type: updatedProduct.type || "",
                watts: updatedProduct.watts || "",
                buyPrice: updatedProduct.buyPrice || 0,
                sellPrice: updatedProduct.sellPrice || 0,
                quantity: updatedProduct.quantity || 0,
              }),
            });

            if (!res.ok) throw new Error(`Failed to update product ${existingInDB.name}`);

            // Remove the new row
            updatedItems = updatedItems.filter((itm) => itm.id !== item.id);
            
            // Update the existing row
            updatedItems = updatedItems.map((itm) =>
              itm.id === existingInDB.id ? updatedProduct : itm
            );
          } else {
            // Create new product
            const productData = {
              name: item.name,
              model: item.model || "",
              type: item.type || "",
              watts: item.watts || "",
              buyPrice: item.buyPrice || 0,
              sellPrice: item.sellPrice || 0,
              quantity: item.quantity || 0,
            };

            const res = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(productData),
            });

            if (!res.ok) throw new Error(`Failed to create product ${item.name}`);

            const savedItem = await res.json();
            
            // Replace new item with saved item
            updatedItems = updatedItems.map((itm) =>
              itm.id === item.id 
                ? calculateValues({ ...savedItem, isNew: false })
                : itm
            );
          }
        } else {
          // Update existing item
          const productData = {
            name: item.name,
            model: item.model || "",
            type: item.type || "",
            watts: item.watts || "",
            buyPrice: item.buyPrice || 0,
            sellPrice: item.sellPrice || 0,
            quantity: item.quantity || 0,
          };

          const res = await fetch(`${API_URL}/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData),
          });

          if (!res.ok) throw new Error(`Failed to update product ${item.name}`);
        }
      }

      if (errors.length > 0) {
        showMessage("error", errors.join("\n"));
      } else {
        setItems(updatedItems);
        showMessage("success", "Saved Successfully!");
        // Refresh to get latest data
        loadProducts();
      }
    } catch (err) {
      console.error("Save error:", err);
      showMessage("error", `Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      if (!String(id).startsWith("new-")) {
        const res = await fetch(`${API_URL}/${id}`, {
          method: "DELETE",
        });
        
        if (!res.ok) throw new Error("Failed to delete product");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      // Adjust current page if needed
      const filteredTotal = filteredItems.length - 1;
      const maxPage = Math.ceil(filteredTotal / itemsPerPage);
      if (currentPage > maxPage && currentPage > 1) {
        setCurrentPage(maxPage);
      }
      showMessage("success", "Item deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      showMessage("error", "Failed to delete item");
    }
  };

  // ================= EXPORT TO EXCEL =================
  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = items.map(item => ({
        'Name': item.name || '',
        'Model': item.model || '',
        'Type': item.type || '',
        'Watts': item.watts || '',
        'Buy Price': item.buyPrice || 0,
        'Sell Price': item.sellPrice || 0,
        'Quantity': item.quantity || 0,
        'Profit %': item.profitPercent || '0.00',
        'Amount': item.amount || '0.00'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

      // Auto-size columns
      const wscols = [
        { wch: 20 }, // Name
        { wch: 15 }, // Model
        { wch: 15 }, // Type
        { wch: 10 }, // Watts
        { wch: 12 }, // Buy Price
        { wch: 12 }, // Sell Price
        { wch: 10 }, // Quantity
        { wch: 10 }, // Profit %
        { wch: 12 }, // Amount
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
      saveAs(file, `Products_${date}.xlsx`);
      
      showMessage("success", "Export successful!");
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "Failed to export");
    }
  };

  // ================= IMPORT FROM EXCEL =================
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const newItems = jsonData.map((row, index) => {
          // Map Excel columns to our fields
          const item = {
            name: row['Name'] || row['name'] || '',
            model: row['Model'] || row['model'] || '',
            type: row['Type'] || row['type'] || '',
            watts: row['Watts'] || row['watts'] || '',
            buyPrice: parseFloat(row['Buy Price'] || row['buyPrice'] || 0),
            sellPrice: parseFloat(row['Sell Price'] || row['sellPrice'] || 0),
            quantity: parseInt(row['Quantity'] || row['quantity'] || 0),
          };

          return calculateValues({
            id: `new-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            ...item,
            isNew: true,
          });
        });

        // Filter out completely empty rows
        const validNewItems = newItems.filter(item => 
          item.name?.trim() || 
          item.model?.trim() || 
          item.type?.trim() || 
          item.watts ||
          item.buyPrice > 0 ||
          item.sellPrice > 0 ||
          item.quantity > 0
        );

        setItems((prev) => [...prev, ...validNewItems]);
        // Go to last page to show imported items
        const newTotalItems = items.length + validNewItems.length;
        const lastPage = Math.ceil(newTotalItems / itemsPerPage);
        setCurrentPage(lastPage);
        showMessage("success", `Imported ${validNewItems.length} items`);
        
        // Clear input
        e.target.value = '';
      } catch (err) {
        console.error("Import error:", err);
        showMessage("error", "Failed to import file");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // ================= PAGINATION FUNCTIONS =================
  const getCurrentPageItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  };

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= Math.ceil(filteredItems.length / itemsPerPage)) {
      setCurrentPage(pageNumber);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < Math.ceil(filteredItems.length / itemsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  // ================= SEARCH =================
  const filteredItems = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.model?.toLowerCase().includes(search.toLowerCase()) ||
      item.type?.toLowerCase().includes(search.toLowerCase())
  );

  // Get current page items
  const currentItems = getCurrentPageItems();
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // ================= MODAL STYLES =================
  const modalStyles = {
    overlay: {
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
    content: {
      backgroundColor: '#1f2937',
      padding: '24px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '1000px',
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
      position: 'sticky',
      top: 0,
    },
    modalTd: {
      padding: '10px',
      borderBottom: '1px solid #374151',
      color: '#f9fafb',
      fontSize: '13px',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: '#6366f1',
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '1px solid #374151',
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500',
    },
    pendingBadge: {
      backgroundColor: '#b45309',
      color: '#fff',
    },
    completedBadge: {
      backgroundColor: '#059669',
      color: '#fff',
    },
    processButton: {
      backgroundColor: '#6366f1',
      color: '#fff',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
    },
    billCard: {
      backgroundColor: '#374151',
      padding: '15px',
      borderRadius: '6px',
      marginBottom: '10px',
      cursor: 'pointer',
      border: '1px solid transparent',
      transition: 'all 0.2s',
    },
    selectedBillCard: {
      border: '2px solid #6366f1',
      backgroundColor: '#4b5563',
    },
  };

  // ================= PAGINATION STYLES =================
  const paginationStyles = {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '20px',
      padding: '10px 0',
    },
    info: {
      color: '#9ca3af',
      fontSize: '14px',
    },
    controls: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 12px',
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      color: '#f9fafb',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s',
      minWidth: '40px',
    },
    activeButton: {
      backgroundColor: '#6366f1',
      borderColor: '#6366f1',
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    pageNumbers: {
      display: 'flex',
      gap: '4px',
    },
  };

  // ================= DARK STYLES =================
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
    supplyButton: {
      backgroundColor: "#b45309",
      color: "#fff",
      border: "none",
    },
    billButton: {
      backgroundColor: "#059669",
      color: "#fff",
      border: "none",
    },
    pendingBillButton: {
      backgroundColor: "#7c3aed",
      color: "#fff",
      border: "none",
    },
    primaryButton: {
      backgroundColor: "#6366f1",
      color: "#fff",
      border: "none",
    },
    saveButton: {
      backgroundColor: "#16a34a",
      color: "#fff",
      border: "none",
    },
    searchContainer: {
      marginBottom: "20px",
      display: "flex",
      gap: "15px",
      alignItems: "center",
    },
    searchWrapper: {
      position: "relative",
      flex: 1,
      maxWidth: "400px",
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
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "14px",
    },
    tableContainer: {
      overflowX: "auto",
      borderRadius: "8px",
      border: "1px solid #374151",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#1f2937",
      minWidth: "1200px",
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
      padding: "10px",
      borderTop: "1px solid #374151",
    },
    input: {
      width: "100%",
      padding: "8px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "4px",
      fontSize: "13px",
      transition: "border-color 0.2s",
    },
    readonlyField: {
      backgroundColor: "#1f2937",
      color: "#9ca3af",
      padding: "8px",
      borderRadius: "4px",
      fontSize: "13px",
      textAlign: "right",
    },
    deleteButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "6px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background 0.2s",
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
    loadingOverlay: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px",
      color: "#9ca3af",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px",
      color: "#9ca3af",
      fontStyle: "italic",
    },
    badge: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "500",
      marginLeft: "8px",
    },
    newBadge: {
      backgroundColor: "#6366f1",
      color: "#fff",
    },
  };

  return (
    <div style={styles.container}>
      {/* Supply Items Modal */}
      {showSupplyModal && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.content}>
            <div style={modalStyles.modalHeader}>
              <h2 style={modalStyles.modalTitle}>
                <Truck size={20} style={{ marginRight: '8px', display: 'inline' }} />
                Pending Supply Items
              </h2>
              <button 
                style={modalStyles.closeButton}
                onClick={() => setShowSupplyModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {loadingSupply ? (
              <div style={styles.loadingOverlay}>Loading supply items...</div>
            ) : supplyItems.length === 0 ? (
              <div style={styles.emptyState}>No pending supply items found</div>
            ) : (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={modalStyles.checkbox}
                      checked={selectedSupplyItems.size === supplyItems.length}
                      onChange={toggleSelectAllSupply}
                    />
                    <span style={{ color: '#f9fafb' }}>Select All ({supplyItems.length} items)</span>
                  </label>
                </div>

                <table style={modalStyles.modalTable}>
                  <thead>
                    <tr>
                      <th style={modalStyles.modalTh}>Select</th>
                      <th style={modalStyles.modalTh}>Supplier</th>
                      <th style={modalStyles.modalTh}>Name</th>
                      <th style={modalStyles.modalTh}>Model</th>
                      <th style={modalStyles.modalTh}>Type</th>
                      <th style={modalStyles.modalTh}>Watts</th>
                      <th style={modalStyles.modalTh}>Buy Price</th>
                      <th style={modalStyles.modalTh}>Quantity</th>
                      <th style={modalStyles.modalTh}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplyItems.map((item) => (
                      <tr key={item.selectionKey}>
                        <td style={modalStyles.modalTd}>
                          <input
                            type="checkbox"
                            style={modalStyles.checkbox}
                            checked={selectedSupplyItems.has(item.selectionKey)}
                            onChange={() => toggleSupplyItem(item.selectionKey)}
                          />
                        </td>
                        <td style={modalStyles.modalTd}>
                          <div>{item.supplierName}</div>
                          <small style={{ color: '#9ca3af' }}>{item.supplierCompany}</small>
                        </td>
                        <td style={modalStyles.modalTd}>{item.name}</td>
                        <td style={modalStyles.modalTd}>{item.model}</td>
                        <td style={modalStyles.modalTd}>{item.type || '-'}</td>
                        <td style={modalStyles.modalTd}>{item.watts || 0}</td>
                        <td style={modalStyles.modalTd}>₹{item.buy_price || 0}</td>
                        <td style={modalStyles.modalTd}>{item.quantity || 1}</td>
                        <td style={modalStyles.modalTd}>
                          <span style={{...modalStyles.statusBadge, ...modalStyles.pendingBadge}}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={modalStyles.modalFooter}>
                  <button 
                    style={{...styles.button}}
                    onClick={() => setShowSupplyModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    style={{...styles.button, ...styles.primaryButton}}
                    onClick={handleAddSupplyItems}
                    disabled={saving || selectedSupplyItems.size === 0}
                  >
                    {saving ? 'Adding...' : `Add Selected (${selectedSupplyItems.size})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pending Bills Modal */}
      {showPendingBillsModal && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.content}>
            <div style={modalStyles.modalHeader}>
              <h2 style={modalStyles.modalTitle}>
                <Clock size={20} style={{ marginRight: '8px', display: 'inline' }} />
                Pending Bills & Items
              </h2>
              <button 
                style={modalStyles.closeButton}
                onClick={() => {
                  setShowPendingBillsModal(false);
                  setSelectedBill(null);
                  setBillItems([]);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingPendingBills ? (
              <div style={styles.loadingOverlay}>Loading pending bills...</div>
            ) : pendingBills.length === 0 ? (
              <div style={styles.emptyState}>No pending bills found</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                {/* Bills List */}
                <div style={{ borderRight: '1px solid #374151', paddingRight: '15px' }}>
                  <h3 style={{ color: '#f9fafb', fontSize: '14px', marginBottom: '10px' }}>
                    Bills with Pending Items ({pendingBills.length})
                  </h3>
                  {pendingBills.map((bill) => (
                    <div
                      key={bill.id}
                      style={{
                        ...modalStyles.billCard,
                        ...(selectedBill?.id === bill.id ? modalStyles.selectedBillCard : {})
                      }}
                      onClick={() => handleSelectBill(bill)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: '600', color: '#f9fafb' }}>{bill.billNumber}</span>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Customer: {bill.customerName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '5px' }}>
                        Pending Items: {bill.pendingItems}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Items */}
                <div>
                  {selectedBill ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: '#f9fafb', fontSize: '14px', margin: 0 }}>
                          Items for Bill: {selectedBill.billNumber}
                        </h3>
                        <button
                          style={modalStyles.processButton}
                          onClick={() => handleProcessBill(selectedBill.id)}
                          disabled={processingBill}
                        >
                          {processingBill ? 'Processing...' : 'Complete All Items'}
                        </button>
                      </div>

                      <table style={modalStyles.modalTable}>
                        <thead>
                          <tr>
                            <th style={modalStyles.modalTh}>Product</th>
                            <th style={modalStyles.modalTh}>Model</th>
                            <th style={modalStyles.modalTh}>Quantity</th>
                            <th style={modalStyles.modalTh}>Price</th>
                            <th style={modalStyles.modalTh}>Total</th>
                            <th style={modalStyles.modalTh}>Status</th>
                            <th style={modalStyles.modalTh}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billItems.map((item) => (
                            <tr key={item.id}>
                              <td style={modalStyles.modalTd}>{item.product_name}</td>
                              <td style={modalStyles.modalTd}>{item.product_model}</td>
                              <td style={modalStyles.modalTd}>{item.quantity}</td>
                              <td style={modalStyles.modalTd}>₹{item.sell_price}</td>
                              <td style={modalStyles.modalTd}>₹{item.total}</td>
                              <td style={modalStyles.modalTd}>
                                <span style={{
                                  ...modalStyles.statusBadge,
                                  ...(item.item_status === 'pending' ? modalStyles.pendingBadge : modalStyles.completedBadge)
                                }}>
                                  {item.item_status}
                                </span>
                              </td>
                              <td style={modalStyles.modalTd}>
                                {item.item_status === 'pending' && (
                                  <button
                                    style={modalStyles.processButton}
                                    onClick={() => handleProcessBillItem(item.id, selectedBill.id)}
                                  >
                                    <CheckCircle size={14} style={{ marginRight: '4px' }} />
                                    Complete
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <div style={styles.emptyState}>Select a bill to view items</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <h1 style={styles.title}>📦 Products Inventory</h1>
          <button 
            style={styles.refreshButton}
            onClick={loadProducts}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div style={styles.buttonGroup}>
          <button 
            style={{...styles.button, ...styles.pendingBillButton}} 
            onClick={handleOpenPendingBillsModal}
          >
            <Clock size={16} /> Pending Items
          </button>

          <button 
            style={{...styles.button, ...styles.supplyButton}} 
            onClick={handleOpenSupplyModal}
          >
            <Truck size={16} /> Supply
          </button>

          <button style={styles.button} onClick={handleExport}>
            <Download size={16} /> Export
          </button>

          <label style={styles.button}>
            <Upload size={16} /> Import
            <input 
              type="file" 
              hidden 
              onChange={handleImport}
              accept=".xlsx,.xls,.csv"
            />
          </label>

          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={handleAddRows}
          >
            <Plus size={16} /> Add Rows
          </button>

          <button
            style={{ ...styles.button, ...styles.saveButton }}
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} /> {saving ? "Saving..." : "Save"}
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
          {message.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <div style={styles.searchContainer}>
        <div style={styles.searchWrapper}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <span style={{ color: "#9ca3af", fontSize: "13px" }}>
          {filteredItems.length} item(s)
        </span>
      </div>

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loadingOverlay}>Loading products...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Model</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Watts</th>
                <th style={styles.th}>Buy Price (₹)</th>
                <th style={styles.th}>Sell Price (₹)</th>
                <th style={styles.th}>Quantity</th>
                <th style={styles.th}>Profit %</th>
                <th style={styles.th}>Amount (₹)</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="10" style={styles.emptyState}>
                    {search ? "No products match your search" : "No products found. Click 'Add Rows' to get started."}
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      <input
                        style={styles.input}
                        value={item.name || ""}
                        onChange={(e) =>
                          handleChange(item.id, "name", e.target.value)
                        }
                        placeholder="Product name"
                      />
                    </td>
                    
                    <td style={styles.td}>
                      <input
                        style={styles.input}
                        value={item.model || ""}
                        onChange={(e) =>
                          handleChange(item.id, "model", e.target.value)
                        }
                        placeholder="Model"
                      />
                    </td>
                    
                    <td style={styles.td}>
                      <input
                        style={styles.input}
                        value={item.type || ""}
                        onChange={(e) =>
                          handleChange(item.id, "type", e.target.value)
                        }
                        placeholder="Type"
                      />
                    </td>
                    
                    <td style={styles.td}>
                      <input
                        style={styles.input}
                        value={item.watts || ""}
                        onChange={(e) =>
                          handleChange(item.id, "watts", e.target.value)
                        }
                        placeholder="Watts"
                      />
                    </td>
                    
                    <td style={styles.td}>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.buyPrice || ""}
                        onChange={(e) =>
                          handleChange(item.id, "buyPrice", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </td>
                    
                    <td style={styles.td}>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.sellPrice || ""}
                        onChange={(e) =>
                          handleChange(item.id, "sellPrice", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </td>
                    
                    <td style={styles.td}>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          handleChange(item.id, "quantity", e.target.value)
                        }
                        placeholder="0"
                      />
                    </td>
                    
                    <td style={styles.td}>
                      <div style={styles.readonlyField}>
                        {item.profitPercent}%
                        {item.isNew && <span style={{...styles.badge, ...styles.newBadge}}>NEW</span>}
                      </div>
                    </td>
                    
                    <td style={styles.td}>
                      <div style={styles.readonlyField}>
                        ₹{parseFloat(item.amount || 0).toFixed(2)}
                      </div>
                    </td>
                    
                    <td style={styles.td}>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {filteredItems.length > 0 && (
        <div style={paginationStyles.container}>
          <div style={paginationStyles.info}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
          </div>
          
          <div style={paginationStyles.controls}>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              style={{
                ...paginationStyles.button,
                ...(currentPage === 1 ? paginationStyles.disabledButton : {})
              }}
            >
              <ChevronLeft size={16} />
            </button>
            
            <div style={paginationStyles.pageNumbers}>
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
                        ...paginationStyles.button,
                        ...(currentPage === pageNumber ? paginationStyles.activeButton : {})
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
                ...paginationStyles.button,
                ...(currentPage === totalPages ? paginationStyles.disabledButton : {})
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}