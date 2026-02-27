import React from "react";
import { useNavigate } from "react-router-dom";
import { FaBars, FaBell, FaSignOutAlt, FaUserCircle } from "react-icons/fa";

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();

  // Get logged in user
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const styles = {
    header: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: "65px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 25px",
      background: "rgba(30, 30, 47, 0.95)",
      backdropFilter: "blur(10px)",
      boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
      zIndex: 2000,
      color: "#fff",
    },

    left: {
      display: "flex",
      alignItems: "center",
      gap: "18px",
    },

    toggleBtn: {
      cursor: "pointer",
      fontSize: "20px",
      color: "#4da6ff",
    },

    title: {
      margin: 0,
      fontWeight: "600",
      fontSize: "18px",
      letterSpacing: "0.5px",
    },

    right: {
      display: "flex",
      alignItems: "center",
      gap: "20px",
    },

    icon: {
      cursor: "pointer",
      fontSize: "18px",
      color: "#ccc",
    },

    userSection: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#2a2a40",
      padding: "6px 12px",
      borderRadius: "20px",
    },

    username: {
      fontSize: "14px",
      color: "#fff",
    },

    logoutBtn: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 14px",
      backgroundColor: "#ef4444",
      color: "#fff",
      border: "none",
      borderRadius: "20px",
      cursor: "pointer",
      fontWeight: "500",
      transition: "0.3s",
    },
  };

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        <FaBars style={styles.toggleBtn} onClick={toggleSidebar} />
        <h3 style={styles.title}>INVENTORY PROJECT</h3>
      </div>

      <div style={styles.right}>

        <div style={styles.userSection}>
          <FaUserCircle />
          <span style={styles.username}>
            {user?.username || "Admin"}
          </span>
        </div>

        <button style={styles.logoutBtn} onClick={handleLogout}>
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Header;