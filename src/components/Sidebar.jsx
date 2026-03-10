import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBoxOpen,
  FaFileInvoice,
  FaFileAlt,
  FaTruck,
  FaList,
  FaArrowDown,
  FaTags,
  FaExclamationTriangle,
  FaArrowUp,
} from "react-icons/fa";

const Sidebar = ({ isOpen }) => {
  const HEADER_HEIGHT = "65px";

  const styles = {
    sidebar: {
      width: isOpen ? "230px" : "60px",   // 👈 reduced collapsed width
      height: `calc(100vh - ${HEADER_HEIGHT})`,
      background: "linear-gradient(180deg, #111827, #0f172a)",
      color: "#fff",
      padding: "20px 8px",
      position: "fixed",
      top: HEADER_HEIGHT,
      left: 0,
      transition: "all 0.3s ease",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      boxShadow: "4px 0 20px rgba(0,0,0,0.4)",
    },

    logoSection: {
      marginBottom: "30px",
      fontSize: "17px",
      fontWeight: "600",
      letterSpacing: "1px",
      textAlign: "center",
      transition: "0.3s",
    },

    navContainer: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },

    link: {
      display: "flex",
      alignItems: "center",
      justifyContent: isOpen ? "flex-start" : "center",
      gap: "15px",
      padding: "12px",
      color: "#9ca3af",
      textDecoration: "none",
      borderRadius: "10px",
      transition: "all 0.3s ease",
      fontSize: "14px",
    },

    activeLink: {
      background: "rgba(77, 166, 255, 0.15)",
      color: "#4da6ff",
      boxShadow: "0 0 10px rgba(77,166,255,0.4)",
    },

    icon: {
      fontSize: "18px",
      minWidth: "20px",
    },

    text: {
      display: isOpen ? "inline" : "none",
      fontWeight: "500",
    },
  };

  const getLinkStyle = ({ isActive }) =>
    isActive
      ? { ...styles.link, ...styles.activeLink }
      : styles.link;

  return (
    <div style={styles.sidebar}>
      <div style={styles.logoSection}>
        {isOpen ? "INVENTORY PROJECT" : "INV"}
      </div>

      <div style={styles.navContainer}>
        <NavLink to="/dashboard" style={getLinkStyle}>
          <FaTachometerAlt style={styles.icon} />
          <span style={styles.text}>Dashboard</span>
        </NavLink>

        <NavLink to="/product" style={getLinkStyle}>
          <FaBoxOpen style={styles.icon} />
          <span style={styles.text}>Products</span>
        </NavLink>

        <NavLink to="/bill" style={getLinkStyle}>
          <FaFileInvoice style={styles.icon} />
          <span style={styles.text}>Bill</span>
        </NavLink>

        <NavLink to="/billreport" style={getLinkStyle}>
          <FaFileAlt style={styles.icon} />
          <span style={styles.text}>Complete Bill</span>
        </NavLink>

        <NavLink to="/supplier" style={getLinkStyle}>
          <FaTruck style={styles.icon} />
          <span style={styles.text}>Supplier</span>
        </NavLink>

        <NavLink to="/supplierList" style={getLinkStyle}>
          <FaList style={styles.icon} />
          <span style={styles.text}>Supplier Details</span>
        </NavLink>

        <NavLink to="/itemlist" style={getLinkStyle}>
          <FaArrowDown style={styles.icon} />
          <span style={styles.text}>Stock In</span>
        </NavLink>

        <NavLink to="/type" style={getLinkStyle}>
          <FaTags style={styles.icon} />
          <span style={styles.text}>Category</span>
        </NavLink>

        <NavLink to="/lowstock" style={getLinkStyle}>
          <FaExclamationTriangle style={styles.icon} />
          <span style={styles.text}>Low Stock</span>
        </NavLink>

        <NavLink to="/stockout" style={getLinkStyle}>
          <FaArrowUp style={styles.icon} />
          <span style={styles.text}>Stock Out</span>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;