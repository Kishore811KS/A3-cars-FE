// components/BillsList.jsx (with Modal)
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BillsList = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredBills, setFilteredBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Function to check if a bill is within last 2 days (today, yesterday, day before yesterday)
  const isWithinLastTwoDays = (createdAt) => {
    if (!createdAt) return false;
    
    try {
      const billDate = new Date(createdAt);
      const currentDate = new Date();
      
      // Get today's date at 00:00:00
      const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      
      // Get date 2 days ago (including today, yesterday, and day before yesterday = 3 days total)
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);
      
      // Set time to start of day for comparison
      const startDate = new Date(twoDaysAgo);
      startDate.setHours(0, 0, 0, 0);
      
      // Set end date to end of today
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      
      const isWithinRange = billDate >= startDate && billDate <= endDate;
      
      // Debug log
      if (isWithinRange) {
        console.log(`Bill date: ${billDate.toLocaleDateString()}, Start: ${startDate.toLocaleDateString()}, End: ${endDate.toLocaleDateString()}`);
      }
      
      return isWithinRange;
    } catch (error) {
      console.error('Error parsing date:', createdAt, error);
      return false;
    }
  };

  // Filter bills to show only last 2 days (today, yesterday, day before yesterday)
  const filterLastTwoDaysBills = (allBills) => {
    if (!allBills || !Array.isArray(allBills)) return [];
    
    const filtered = allBills.filter(bill => {
      const billDate = bill.createdAt;
      return isWithinLastTwoDays(billDate);
    });
    
    // Sort by date descending (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all bills with pagination - increase limit to get more bills
      const response = await axios.get('/api/billing/bills?per_page=1000');
      
      if (response.data && response.data.bills) {
        const allBills = response.data.bills;
        setBills(allBills);
        
        // Filter bills from last 2 days (today, yesterday, day before yesterday)
        const lastTwoDaysBills = filterLastTwoDaysBills(allBills);
        setFilteredBills(lastTwoDaysBills);
        
        // Debug information
        console.log('=== Bill Filtering Debug ===');
        console.log(`Total bills in database: ${allBills.length}`);
        console.log(`Bills in last 2 days: ${lastTwoDaysBills.length}`);
        
        if (allBills.length > 0) {
          const dates = allBills.map(b => new Date(b.createdAt).toLocaleDateString());
          const uniqueDates = [...new Set(dates)];
          console.log(`Dates with bills: ${uniqueDates.join(', ')}`);
          
          const today = new Date().toLocaleDateString();
          const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
          const dayBefore = new Date(Date.now() - 172800000).toLocaleDateString();
          console.log(`Today: ${today}, Yesterday: ${yesterday}, Day before: ${dayBefore}`);
          console.log(`Bills today: ${allBills.filter(b => new Date(b.createdAt).toLocaleDateString() === today).length}`);
          console.log(`Bills yesterday: ${allBills.filter(b => new Date(b.createdAt).toLocaleDateString() === yesterday).length}`);
          console.log(`Bills day before: ${allBills.filter(b => new Date(b.createdAt).toLocaleDateString() === dayBefore).length}`);
        }
        console.log('===========================');
      } else {
        setBills([]);
        setFilteredBills([]);
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError(err.response?.data?.error || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  // Function to view bill details
  const viewBillDetails = async (billId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/billing/bills/${billId}`);
      if (response.data) {
        setSelectedBill(response.data);
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error fetching bill details:', err);
      alert(err.response?.data?.error || 'Failed to fetch bill details');
    } finally {
      setLoading(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedBill(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return '-';
    }
  };

  // Format date only (without time)
  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return '-';
    }
  };

  // Get date range text
  const getDateRangeText = () => {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    
    const startDate = formatDateOnly(twoDaysAgo);
    const endDate = formatDateOnly(today);
    
    if (startDate === endDate) {
      return startDate;
    }
    return `${startDate} to ${endDate}`;
  };

  // Refresh bills
  const refreshBills = () => {
    fetchBills();
  };

  if (loading && bills.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading bills...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={refreshBills}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Group bills by date
  const groupedBills = filteredBills.reduce((groups, bill) => {
    const date = formatDateOnly(bill.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(bill);
    return groups;
  }, {});

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Bills - Last 2 Days</h1>
              <p className="text-gray-600 mt-1">
                Showing bills from {getDateRangeText()} (Today, Yesterday, and Day Before Yesterday)
              </p>
              <div className="mt-2 flex gap-4 text-sm">
                <p className="text-blue-600">
                  <strong>Last 2 days:</strong> {filteredBills.length} bills
                </p>
                <p className="text-gray-600">
                  <strong>Total in database:</strong> {bills.length} bills
                </p>
              </div>
            </div>
            <button
              onClick={refreshBills}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {filteredBills.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            <p>No bills found in the last 2 days.</p>
            {bills.length > 0 && (
              <div className="text-sm mt-2">
                <p>Note: There are {bills.length} bills in the database, but none from the last 2 days.</p>
                <p className="mt-1">
                  Bills are available on: {
                    [...new Set(bills.map(b => formatDateOnly(b.createdAt)))].join(', ')
                  }
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Group by date */}
            {Object.entries(groupedBills).map(([date, dateBills]) => (
              <div key={date} className="mb-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-3 pb-2 border-b-2 border-gray-200">
                  {date}
                  <span className="text-sm text-gray-500 ml-2">({dateBills.length} bills)</span>
                </h2>
                
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dateBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {bill.billNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{bill.customerName}</div>
                            <div className="text-xs text-gray-400">{bill.customerType}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {bill.vehicleNumber || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            ₹{bill.total?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{bill.paidAmount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              bill.paymentStatus === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : bill.paymentStatus === 'partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {bill.paymentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(bill.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => viewBillDetails(bill.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Modal for Bill Details */}
      {showModal && selectedBill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Bill Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Bill Number</p>
                  <p className="font-semibold">{selectedBill.billNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-semibold">{formatDate(selectedBill.createdAt || selectedBill.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer Name</p>
                  <p className="font-semibold">{selectedBill.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer Type</p>
                  <p className="font-semibold">{selectedBill.customerType}</p>
                </div>
                {selectedBill.customerPhone && (
                  <div>
                    <p className="text-sm text-gray-500">Customer Phone</p>
                    <p className="font-semibold">{selectedBill.customerPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Vehicle Number</p>
                  <p className="font-semibold">{selectedBill.vehicleNumber || '-'}</p>
                </div>
                {selectedBill.vehicleName && (
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Name</p>
                    <p className="font-semibold">{selectedBill.vehicleName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-semibold">{selectedBill.paymentMethod}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm">{item.product_name}</td>
                          <td className="px-4 py-2 text-sm">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm">₹{item.sell_price}</td>
                          <td className="px-4 py-2 text-sm">₹{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Subtotal:</span>
                  <span>₹{selectedBill.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Discount:</span>
                  <span>₹{selectedBill.discount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Tax:</span>
                  <span>₹{selectedBill.tax?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-2">
                  <span>Total:</span>
                  <span>₹{selectedBill.total?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="font-semibold">Paid Amount:</span>
                  <span className="text-green-600">₹{selectedBill.paidAmount?.toFixed(2) || '0.00'}</span>
                </div>
                {selectedBill.changeAmount > 0 && (
                  <div className="flex justify-between mt-2">
                    <span className="font-semibold">Change Amount:</span>
                    <span className="text-blue-600">₹{selectedBill.changeAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {selectedBill.paymentStatus === 'partial' && (
                  <div className="flex justify-between mt-2">
                    <span className="font-semibold">Balance Due:</span>
                    <span className="text-red-600">₹{(selectedBill.total - selectedBill.paidAmount)?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BillsList;