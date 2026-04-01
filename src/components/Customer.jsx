// CustomerDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

const CustomerDetailsPage = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerType, setSelectedCustomerType] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [vehicles, setVehicles] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalCustomers: 0,
    totalSpent: 0,
    averageSpent: 0,
    regularCustomers: 0,
    corporateCustomers: 0,
    governmentCustomers: 0
  });

  // Fetch all bills and extract unique customers
  useEffect(() => {
    fetchAllCustomers();
    fetchVehicleSummary();
  }, []);

  const fetchAllCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all bills with pagination to get all customers
      let allBills = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch(`${API_BASE_URL}/billing/bills?page=${page}&per_page=100`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bills');
        }
        
        const data = await response.json();
        allBills = [...allBills, ...data.bills];
        
        hasMore = page < data.pages;
        page++;
      }
      
      // Extract unique customers by phone number or name combination
      const customerMap = new Map();
      
      allBills.forEach(bill => {
        const customerKey = bill.customerPhone || bill.customerName;
        
        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            id: bill.id,
            customerName: bill.customerName,
            customerPhone: bill.customerPhone,
            customerEmail: bill.customerEmail,
            customerGST: bill.customerGST,
            customerAddress: bill.customerAddress,
            customerType: bill.customerType,
            vehicleName: bill.vehicleName,
            vehicleNumber: bill.vehicleNumber,
            totalSpent: bill.total,
            billCount: 1,
            lastBillDate: bill.createdAt,
            bills: [{
              billNumber: bill.billNumber,
              total: bill.total,
              date: bill.createdAt
            }]
          });
        } else {
          const existing = customerMap.get(customerKey);
          existing.totalSpent += bill.total;
          existing.billCount += 1;
          existing.bills.push({
            billNumber: bill.billNumber,
            total: bill.total,
            date: bill.createdAt
          });
          
          // Update last bill date if newer
          if (new Date(bill.createdAt) > new Date(existing.lastBillDate)) {
            existing.lastBillDate = bill.createdAt;
          }
        }
      });
      
      const customersList = Array.from(customerMap.values());
      setCustomers(customersList);
      setFilteredCustomers(customersList);
      
      // Calculate statistics
      const totalSpent = customersList.reduce((sum, c) => sum + c.totalSpent, 0);
      const regularCount = customersList.filter(c => c.customerType === 'regular').length;
      const corporateCount = customersList.filter(c => c.customerType === 'corporate').length;
      const governmentCount = customersList.filter(c => c.customerType === 'government').length;
      
      setStatistics({
        totalCustomers: customersList.length,
        totalSpent: totalSpent,
        averageSpent: customersList.length > 0 ? totalSpent / customersList.length : 0,
        regularCustomers: regularCount,
        corporateCustomers: corporateCount,
        governmentCustomers: governmentCount
      });
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchVehicleSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/billing/vehicles/summary`);
      
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  };
  
  // Filter customers based on search and filters
  useEffect(() => {
    let filtered = [...customers];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.customerPhone && customer.customerPhone.includes(searchTerm)) ||
        (customer.customerEmail && customer.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.vehicleNumber && customer.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by customer type
    if (selectedCustomerType !== 'all') {
      filtered = filtered.filter(customer => customer.customerType === selectedCustomerType);
    }
    
    // Filter by vehicle
    if (selectedVehicle) {
      filtered = filtered.filter(customer => customer.vehicleNumber === selectedVehicle);
    }
    
    setFilteredCustomers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, selectedCustomerType, selectedVehicle, customers]);
  
  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };
  
  const handleViewCustomerBills = (customer) => {
    // Navigate to customer bills page or show modal
    // For now, we'll just alert
    alert(`Viewing bills for ${customer.customerName}\nTotal Bills: ${customer.billCount}\nTotal Spent: ${formatCurrency(customer.totalSpent)}`);
  };
  
  const handleViewBillDetails = (billNumber) => {
    navigate(`/bill/${billNumber}`);
  };
  
  const getCustomerTypeBadge = (type) => {
    const styles = {
      regular: 'bg-blue-100 text-blue-800',
      corporate: 'bg-purple-100 text-purple-800',
      government: 'bg-green-100 text-green-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer details...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Customer Details</h1>
          <p className="text-gray-600 mt-1">Manage and view all customer information</p>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalCustomers}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.totalSpent)}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.averageSpent)}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Customer Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-blue-600">Regular Customers</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.regularCustomers}</p>
              </div>
              <div className="text-blue-600">
                {((statistics.regularCustomers / statistics.totalCustomers) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-purple-600">Corporate Customers</p>
                <p className="text-2xl font-bold text-purple-900">{statistics.corporateCustomers}</p>
              </div>
              <div className="text-purple-600">
                {((statistics.corporateCustomers / statistics.totalCustomers) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-green-600">Government Customers</p>
                <p className="text-2xl font-bold text-green-900">{statistics.governmentCustomers}</p>
              </div>
              <div className="text-green-600">
                {((statistics.governmentCustomers / statistics.totalCustomers) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name, phone, email, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
              <select
                value={selectedCustomerType}
                onChange={(e) => setSelectedCustomerType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="regular">Regular</option>
                <option value="corporate">Corporate</option>
                <option value="government">Government</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Vehicles</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.vehicleNumber} value={vehicle.vehicleNumber}>
                    {vehicle.vehicleNumber} - {vehicle.vehicleName} ({vehicle.billCount} bills)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Bill Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  currentCustomers.map((customer, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{customer.customerName}</div>
                        {customer.customerGST && (
                          <div className="text-xs text-gray-500">GST: {customer.customerGST}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{customer.customerPhone || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{customer.customerEmail || 'No email'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCustomerTypeBadge(customer.customerType)}`}>
                          {customer.customerType.charAt(0).toUpperCase() + customer.customerType.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{customer.vehicleNumber || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{customer.vehicleName || 'No vehicle'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">{formatCurrency(customer.totalSpent)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.billCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(customer.lastBillDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleViewCustomerBills(customer)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View Bills
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(indexOfLastItem, filteredCustomers.length)}</span> of{' '}
                      <span className="font-medium">{filteredCustomers.length}</span> customers
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNumber
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsPage;