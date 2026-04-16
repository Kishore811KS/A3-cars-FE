import React, { useState, useEffect } from 'react';
import { Search, FileText, X, AlertCircle, Calendar } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const CancelBills = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCancelledBills = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`${API_BASE_URL}/billing/bills/canceled`);
      setBills(response.data);
      setFilteredBills(response.data);
    } catch (err) {
      console.error('Error fetching cancelled bills:', err);
      setError('Failed to load cancelled bills. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancelledBills();
  }, []);

  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (!term) {
      setFilteredBills(bills);
      return;
    }
    
    const filtered = bills.filter(bill => 
      (bill.billNumber && bill.billNumber.toLowerCase().includes(term)) ||
      (bill.customerName && bill.customerName.toLowerCase().includes(term)) ||
      (bill.customerPhone && bill.customerPhone.includes(term)) ||
      (bill.cancelRemarks && bill.cancelRemarks.toLowerCase().includes(term))
    );
    setFilteredBills(filtered);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const dbDate = new Date(dateString);
      dbDate.setHours(dbDate.getHours() - 5);
      dbDate.setMinutes(dbDate.getMinutes() - 30);
      return dbDate.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff', minHeight: '80vh', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={24} /> Cancelled Bills
        </h1>
        <button 
          onClick={fetchCancelledBills}
          style={{ padding: '8px 16px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', transition: 'background-color 0.2s' }}
        >
          Refresh List
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1f2937', padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #374151' }}>
        <Search size={18} color="#9ca3af" />
        <input
          type="text"
          placeholder="Search by Bill No, Customer, Phone or Remarks..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ border: 'none', background: 'transparent', color: 'white', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '15px' }}
        />
        {searchTerm && (
          <button 
            onClick={() => { setSearchTerm(''); setFilteredBills(bills); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} color="#9ca3af" />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #374151', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : error ? (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} /> {error}
        </div>
      ) : filteredBills.length === 0 ? (
        <div style={{ backgroundColor: '#1f2937', padding: '40px', borderRadius: '8px', border: '1px solid #374151', textAlign: 'center' }}>
          <FileText size={48} color="#4b5563" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', color: '#f3f4f6', marginBottom: '8px' }}>No Cancelled Bills Found</h3>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>There are currently no cancelled bills that match your criteria.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#1f2937', borderRadius: '8px', border: '1px solid #374151', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#111827', borderBottom: '1px solid #374151' }}>
                  <th style={{ padding: '12px 16px', color: '#9ca3af', fontWeight: '500', fontSize: '13px' }}>Bill No</th>
                  <th style={{ padding: '12px 16px', color: '#9ca3af', fontWeight: '500', fontSize: '13px' }}>Customer Info</th>
                  <th style={{ padding: '12px 16px', color: '#9ca3af', fontWeight: '500', fontSize: '13px' }}>Total Amount</th>
                  <th style={{ padding: '12px 16px', color: '#9ca3af', fontWeight: '500', fontSize: '13px' }}>Cancelled On</th>
                  <th style={{ padding: '12px 16px', color: '#f87171', fontWeight: '500', fontSize: '13px' }}>Remarks / Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill.id} style={{ borderBottom: '1px solid #374151', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>#{bill.billNumber}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>{bill.customerName}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{bill.customerPhone || 'No Phone'}</div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#10b981' }}>
                      {formatCurrency(bill.total)}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#d1d5db' }}>
                      {formatDate(bill.updatedAt)}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#fca5a5', maxWidth: '300px', wordWrap: 'break-word' }}>
                      {bill.cancelRemarks || <em>No remarks provided</em>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default CancelBills;
