import React, { useState } from "react";
import AccessControl from "./AccessControl";
import Employee from "./Employee";
import UserType from "./UserType";

const SettingsHub = () => {
  const [activeTab, setActiveTab] = useState("User & System");
  const [activeSubTab, setActiveSubTab] = useState("Access Control");

  const primaryTabs = ["Dashboard", "Partner Masters", "User & System"];
  
  const subTabs = {
    "Dashboard": ["Overview", "Quick Links"],
    "Partner Masters": ["Suppliers", "Vendors", "Clients"],
    "User & System": [
      "Departments", 
      "Designations", 
      "Employees", 
      "User Types", 
      "Settings", 
      "Access Control"
    ]
  };

  const styles = {
    container: {
      padding: "24px",
      maxWidth: "1400px",
      margin: "0 auto",
      color: "#f3f4f6",
    },
    header: {
      marginBottom: "32px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#4da6ff",
      marginBottom: "8px",
      letterSpacing: "-0.025em",
    },
    subtitle: {
      fontSize: "14px",
      color: "#9ca3af",
    },
    tabContainer: {
      display: "flex",
      gap: "8px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      marginBottom: "24px",
      paddingBottom: "1px",
    },
    tab: {
      padding: "12px 20px",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s ease",
      borderBottom: "2px solid transparent",
      color: "#9ca3af",
    },
    activeTab: {
      color: "#4da6ff",
      borderBottomColor: "#4da6ff",
    },
    subTabContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
      marginBottom: "32px",
    },
    subTab: {
      padding: "8px 16px",
      fontSize: "13px",
      fontWeight: "500",
      borderRadius: "20px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      color: "#9ca3af",
    },
    activeSubTab: {
      background: "rgba(77, 166, 255, 0.15)",
      borderColor: "rgba(77, 166, 255, 0.3)",
      color: "#4da6ff",
    },
    contentArea: {
      animation: "fadeIn 0.3s ease-in-out",
    }
  };

  const renderSubContent = () => {
    switch (activeSubTab) {
      case "Access Control":
        return <AccessControl />;
      case "Employees":
        return <Employee />;
      case "User Types":
        return <UserType />;
      default:
        return (
          <div style={{
            padding: "40px",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "12px",
            border: "1px dashed rgba(255, 255, 255, 0.2)",
            color: "#6b7280"
          }}>
            <h3 style={{ marginBottom: "8px" }}>{activeSubTab} Module</h3>
            <p>This module is currently being optimized for the new enterprise system.</p>
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Settings</h1>
        <p style={styles.subtitle}>Configure your role-based access control and system preferences.</p>
      </div>

      <div style={styles.tabContainer}>
        {primaryTabs.map((tab) => (
          <div
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
            onClick={() => {
              setActiveTab(tab);
              setActiveSubTab(subTabs[tab][0]);
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      <div style={styles.subTabContainer}>
        {subTabs[activeTab].map((subTab) => (
          <div
            key={subTab}
            style={{
              ...styles.subTab,
              ...(activeSubTab === subTab ? styles.activeSubTab : {}),
            }}
            onClick={() => setActiveSubTab(subTab)}
          >
            {subTab}
          </div>
        ))}
      </div>

      <div style={styles.contentArea}>
        {renderSubContent()}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SettingsHub;
