import React, { useState, useEffect } from "react";
import {
  FaShoppingCart,
  FaMoneyBillWave,
  FaChartLine,
  FaBoxes,
  FaExclamationTriangle,
  FaSpinner,
  FaArrowRight,
} from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bills, setBills] = useState([]);
  const [stats, setStats] = useState({
    products: {
      total: 0,
      totalQuantity: 0,
      lowStock: 0,
    },
    billing: {
      lastTwoDays: {
        bills: 0,
        sales: 0,
        average: 0,
      },
    },
    lowStockProducts: [],
    paymentMethods: [],
  });

  // Check user type and load data
  useEffect(() => {
    const checkUserType = async () => {
      try {
        const storedUserType = localStorage.getItem("userType");
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        
        const userRole = storedUserType || user.user_type;

        // Redirect non-employees back to main dashboard
        if (userRole && userRole !== "Employee" && userRole !== "employee") {
          navigate("/dashboard");
          return;
        }

        // Fetch dashboard data for employees
        await fetchEmployeeDashboardData();
      } catch (err) {
        console.error("Error checking user type:", err);
        setError("Error loading employee dashboard");
        setLoading(false);
      }
    };

    checkUserType();
  }, [navigate]);

  const fetchEmployeeDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range (last 2 days)
      const today = new Date();
      const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

      const formatDate = (date) => {
        return date.toISOString().split("T")[0];
      };

      // Fetch product statistics
      const productStatsResponse = await axios.get(
        `${API_BASE_URL}/api/products/statistics`
      );

      // Fetch low stock products
      const lowStockResponse = await axios.get(
        `${API_BASE_URL}/api/products?per_page=100`
      );

      // Fetch bills for last 2 days
      let billsData = [];
      try {
        const billsResponse = await axios.get(
          `${API_BASE_URL}/api/bills?from_date=${formatDate(
            twoDaysAgo
          )}&to_date=${formatDate(today)}`,
          { withCredentials: true }
        );
        billsData = billsResponse.data.bills || billsResponse.data.data || billsResponse.data || [];
      } catch (err) {
        // Try alternative endpoint
        try {
          const billsResponse = await axios.get(
            `${API_BASE_URL}/api/billing/bills`,
            { withCredentials: true }
          );
          billsData = billsResponse.data.bills || billsResponse.data.data || billsResponse.data || [];
        } catch {
          billsData = [];
        }
      }

      // Process data
      const productStats = productStatsResponse.data;
      const allProducts = lowStockResponse.data.items || [];

      // Filter low stock products (quantity < 10)
      const lowStockProducts = allProducts
        .filter((product) => product.quantity < 10)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 10);

      // Filter bills from last 2 days
      const billsArray = Array.isArray(billsData) ? billsData : [];
      const filteredBills = billsArray.filter((bill) => {
        const billDate = new Date(bill.created_at || bill.date || bill.bill_date);
        return billDate >= twoDaysAgo && billDate <= today;
      });

      // Calculate statistics for last 2 days
      const totalSales = filteredBills.reduce(
        (sum, bill) => sum + (bill.total_amount || bill.total || Number(bill.amount) || 0),
        0
      );
      const totalBills = filteredBills.length;
      const averageBill = totalBills > 0 ? totalSales / totalBills : 0;

      setBills(filteredBills);
      setStats({
        products: {
          total: productStats.total_products || 0,
          totalQuantity: productStats.total_quantity || 0,
          lowStock: lowStockProducts.length,
        },
        billing: {
          lastTwoDays: {
            bills: totalBills,
            sales: totalSales,
            average: averageBill,
          },
        },
        lowStockProducts: lowStockProducts,
        paymentMethods: [],
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleViewAllLowStock = () => {
    navigate('/lowstock');
  };

  const styles = {
    container: {
      padding: "24px",
      backgroundColor: "#0f172a",
      minHeight: "100vh",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      color: "#e2e8f0",
    },
    header: {
      marginBottom: "32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "16px",
    },
    title: {
      margin: 0,
      color: "#ffffff",
      fontSize: "28px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    subtitle: {
      color: "#94a3b8",
      marginTop: "4px",
      fontSize: "14px",
    },
    refreshButton: {
      backgroundColor: "#2563eb",
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s",
    },
    cards: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    card: {
      backgroundColor: "#1e293b",
      padding: "24px",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      transition: "transform 0.2s, box-shadow 0.2s",
      border: "1px solid #334155",
    },
    icon: {
      fontSize: "36px",
      padding: "12px",
      borderRadius: "12px",
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    cardContent: {
      flex: 1,
    },
    cardLabel: {
      color: "#94a3b8",
      fontSize: "14px",
      marginBottom: "4px",
    },
    cardValue: {
      color: "#ffffff",
      fontSize: "24px",
      fontWeight: "600",
      margin: 0,
    },
    cardSmallValue: {
      color: "#94a3b8",
      fontSize: "13px",
      marginTop: "4px",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: "24px",
      marginBottom: "24px",
    },
    tableContainer: {
      backgroundColor: "#1e293b",
      padding: "20px",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      border: "1px solid #334155",
    },
    tableHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    },
    tableTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#ffffff",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    viewAllLink: {
      color: "#3b82f6",
      fontSize: "14px",
      cursor: "pointer",
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "6px 12px",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      borderRadius: "20px",
      transition: "all 0.2s",
      ':hover': {
        backgroundColor: "rgba(59, 130, 246, 0.2)",
      }
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "12px",
      borderBottom: "2px solid #334155",
      textAlign: "left",
      color: "#94a3b8",
      fontWeight: "500",
      fontSize: "13px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #334155",
      textAlign: "left",
      fontSize: "14px",
    },
    statusBadge: {
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "500",
      display: "inline-block",
    },
    lowStock: {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      color: "#ef4444",
    },
    criticalStock: {
      backgroundColor: "rgba(127, 29, 29, 0.4)",
      color: "#fca5a5",
      border: "1px solid #7f1d1d",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px",
      color: "#94a3b8",
    },
    loadingContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "400px",
      flexDirection: "column",
      gap: "16px",
    },
    errorContainer: {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      color: "#ef4444",
      padding: "16px",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "1px solid rgba(239, 68, 68, 0.3)",
    },
    spinner: {
      animation: "spin 1s linear infinite",
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <FaSpinner style={{ ...styles.spinner, fontSize: "40px", color: "#3b82f6" }} />
          <p>Loading employee dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
          }
          .view-all:hover {
            background-color: rgba(59, 130, 246, 0.2) !important;
          }
          .view-all-text:hover {
            color: #60a5fa !important;
          }
        `}
      </style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Employee Dashboard</h2>
          <p style={styles.subtitle}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button 
          style={styles.refreshButton}
          onClick={fetchEmployeeDashboardData}
        >
          <FaChartLine /> Refresh Data
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorContainer}>
          <FaExclamationTriangle style={{ marginRight: "8px" }} />
          {error}
        </div>
      )}

      {/* Cards */}
      <div style={styles.cards}>
        <div className="card" style={styles.card}>
          <FaBoxes style={{ ...styles.icon, color: "#3b82f6" }} />
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Total Products</div>
            <div style={styles.cardValue}>{stats.products.total}</div>
            <div style={styles.cardSmallValue}>
              {stats.products.totalQuantity} units in stock
            </div>
          </div>
        </div>

        <div className="card" style={styles.card}>
          <FaShoppingCart style={{ ...styles.icon, color: "#f59e0b" }} />
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Last 2 Days Sales</div>
            <div style={styles.cardValue}>
              {formatCurrency(stats.billing.lastTwoDays.sales)}
            </div>
            <div style={styles.cardSmallValue}>
              {stats.billing.lastTwoDays.bills} bills · Avg {formatCurrency(stats.billing.lastTwoDays.average)}
            </div>
          </div>
        </div>

        <div className="card" style={styles.card}>
          <FaMoneyBillWave style={{ ...styles.icon, color: "#10b981" }} />
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Total Bills</div>
            <div style={styles.cardValue}>
              {stats.billing.lastTwoDays.bills}
            </div>
            <div style={styles.cardSmallValue}>
              Last 2 days
            </div>
          </div>
        </div>

        <div className="card" style={styles.card}>
          <FaChartLine style={{ ...styles.icon, color: "#8b5cf6" }} />
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Average Bill</div>
            <div style={styles.cardValue}>
              {formatCurrency(stats.billing.lastTwoDays.average)}
            </div>
            <div style={styles.cardSmallValue}>
              Per transaction
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={styles.grid2}>
        {/* Recent Bills */}
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h3 style={styles.tableTitle}>
              <FaShoppingCart color="#f59e0b" />
              Recent Bills (Last 2 Days)
            </h3>
          </div>
          {bills.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Bill #</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bills.slice(0, 5).map((bill) => (
                  <tr key={bill.id || bill.bill_number}>
                    <td style={styles.td}>
                      <strong>#{bill.bill_number || bill.id}</strong>
                    </td>
                    <td style={styles.td}>
                      {formatDate(bill.created_at || bill.date || bill.bill_date).split(",")[0]}
                    </td>
                    <td style={styles.td}>
                      {bill.customer_name || bill.customer || "Walk-in"}
                    </td>
                    <td style={styles.td}>
                      <strong style={{ color: "#10b981" }}>
                        {formatCurrency(bill.total_amount || bill.total || bill.amount || 0)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={styles.emptyState}>
              <p>No bills in the last 2 days</p>
            </div>
          )}
        </div>

        {/* Low Stock Products */}
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h3 style={styles.tableTitle}>
              <FaExclamationTriangle color="#ef4444" />
              Low Stock Alert ({stats.lowStockProducts.length} items)
            </h3>
            <span 
              style={styles.viewAllLink}
              onClick={handleViewAllLowStock}
              className="view-all"
            >
              View All <FaArrowRight size={12} />
            </span>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Model</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.lowStockProducts.length > 0 ? (
                stats.lowStockProducts.slice(0, 5).map((product) => (
                  <tr key={product.id}>
                    <td style={styles.td}>{product.name}</td>
                    <td style={styles.td}>{product.model || "-"}</td>
                    <td style={styles.td}>
                      <strong>{product.quantity}</strong>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(product.quantity < 5
                            ? styles.criticalStock
                            : styles.lowStock),
                        }}
                      >
                        {product.quantity < 5 ? "Critical" : "Low"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ ...styles.td, textAlign: "center" }}>
                    No low stock items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
