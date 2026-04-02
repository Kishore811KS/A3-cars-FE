import React, { useState, useEffect } from "react";

// ── Sidebar modules grouped by section (matches Sidebar.jsx exactly) ────────
const MODULE_GROUPS = [
  {
    section: "Main",
    modules: ["Dashboard"],
  },
  {
    section: "Inventory",
    modules: ["Products", "Category", "Stock In", "Stock Out", "Low Stock"],
  },
  {
    section: "Billing",
    modules: ["Create Bill", "Bill Reports", "Service Bill", "Service Bills", "Quotations", "Invoices"],
  },
  {
    section: "Suppliers",
    modules: ["Add Supplier", "Supplier List", "Employee"],
  },
  {
    section: "HR Management",
    modules: ["Attendance", "User Settings"],
  },
];

const MODULES = MODULE_GROUPS.flatMap(g => g.modules);

// ── Icons ─────────────────────────────────────────────────────────────────
const IconSave = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3l4 4-7 7H10v-4l7-7z" />
    <path d="M4 20h16" />
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Checkbox ──────────────────────────────────────────────────────────────
const Checkbox = ({ checked, onChange }) => (
  <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ display: "none" }} />
    <span style={{
      width: 18, height: 18, borderRadius: 5,
      border: checked ? "none" : "1.5px solid #3a3f5c",
      background: checked ? "#4f6ef7" : "#0f1430",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all .15s", flexShrink: 0,
      boxShadow: checked ? "0 1px 6px rgba(79,110,247,.45)" : "none",
    }}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  </label>
);

// ── Main Component ────────────────────────────────────────────────────────
const UserSettings = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState(null);

  // API Base URL - adjust based on your setup
  const API_BASE_URL = process.env.REACT_APP_API_URL || "";

  // Fetch user types from API
  const fetchUserTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/user-types`);
      if (!response.ok) throw new Error("Failed to fetch user types");
      const data = await response.json();
      
      // Transform API data to match the component's expected structure
      // You'll need to load permissions from somewhere (maybe localStorage or another API)
      const usersWithPermissions = data.map(user => ({
        id: user.id,
        name: user.name,
        // Load permissions from localStorage or set default permissions
        perms: loadPermissionsFromStorage(user.id) || Object.fromEntries(MODULES.map(m => [m, false]))
      }));
      
      setUsers(usersWithPermissions);
      setError(null);
    } catch (err) {
      console.error("Error fetching user types:", err);
      setError("Failed to load user types. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Load permissions from localStorage (or you can fetch from a permissions API)
  const loadPermissionsFromStorage = (userId) => {
    const stored = localStorage.getItem(`permissions_${userId}`);
    return stored ? JSON.parse(stored) : null;
  };

  // Save permissions to localStorage (or send to API)
  const savePermissionsToStorage = (userId, permissions) => {
    localStorage.setItem(`permissions_${userId}`, JSON.stringify(permissions));
  };

  useEffect(() => {
    fetchUserTypes();
  }, []);

  const toggle = (userId, module) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { 
        ...u, 
        perms: { ...u.perms, [module]: !u.perms[module] } 
      } : u
    ));
  };

  const toggleAll = (module) => {
    const allOn = users.every(u => u.perms[module]);
    setUsers(prev => prev.map(u => ({ 
      ...u, 
      perms: { ...u.perms, [module]: !allOn } 
    })));
  };

  const toggleRow = (userId) => {
    const user = users.find(u => u.id === userId);
    const allOn = MODULES.every(m => user.perms[m]);
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? { ...u, perms: Object.fromEntries(MODULES.map(m => [m, !allOn])) }
        : u
    ));
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user type?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-types/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user type");
      }
      
      // Remove from state
      setUsers(prev => prev.filter(u => u.id !== userId));
      // Remove stored permissions
      localStorage.removeItem(`permissions_${userId}`);
      
      // Show success message
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      console.error("Error deleting user type:", err);
      alert(err.message || "Failed to delete user type");
    }
  };

  const addUser = async () => {
    if (!newName.trim()) {
      alert("Please enter a user type name");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-types`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create user type");
      }
      
      const newUser = await response.json();
      
      // Add to state with default permissions
      setUsers(prev => [...prev, {
        id: newUser.id,
        name: newUser.name,
        perms: Object.fromEntries(MODULES.map(m => [m, false])),
      }]);
      
      setNewName("");
      setAdding(false);
      
      // Show success message
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      console.error("Error creating user type:", err);
      alert(err.message || "Failed to create user type");
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditName(user.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const updateUser = async (userId) => {
    if (!editName.trim()) {
      alert("Please enter a user type name");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/user-types/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editName.trim() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user type");
      }
      
      const updatedUser = await response.json();
      
      // Update state
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, name: updatedUser.name } : u
      ));
      
      setEditingId(null);
      setEditName("");
      
      // Show success message
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      console.error("Error updating user type:", err);
      alert(err.message || "Failed to update user type");
    }
  };

  const handleSavePermissions = async () => {
    try {
      // Save all permissions to localStorage (or send to a permissions API)
      users.forEach(user => {
        savePermissionsToStorage(user.id, user.perms);
      });
      
      // If you have a permissions API endpoint, you can send the data there
      // const response = await fetch(`${API_BASE_URL}/api/user-permissions`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(users.map(user => ({
      //     user_type_id: user.id,
      //     permissions: user.perms
      //   }))),
      // });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      console.error("Error saving permissions:", err);
      alert("Failed to save permissions");
    }
  };

  if (loading) {
    return (
      <div className="us-root" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: 40, height: 40, border: "3px solid var(--border)", 
            borderTopColor: "var(--accent)", borderRadius: "50%", 
            animation: "spin 1s linear infinite", margin: "0 auto 16px" 
          }} />
          <p>Loading user types...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="us-root" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "#f87171" }}>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchUserTypes} style={{ marginTop: 16 }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #0a0e27;
          --card:      #1a1f3e;
          --card-head: #141830;
          --border:    #2a2f4a;
          --border2:   #222744;
          --text:      #ffffff;
          --text2:     #a0a5c0;
          --text3:     #5a6080;
          --accent:    #4f6ef7;
          --accent-h:  #3d5ce0;
          --hover-row: #1f2448;
          --add-row:   #161b38;
        }

        .us-root {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          min-height: 100vh;
          padding: 36px 28px;
          color: var(--text);
        }

        /* ── header ── */
        .us-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 28px; }
        .us-header-left h1 { font-size: 22px; font-weight: 700; letter-spacing: -.3px; color: var(--text); }
        .us-header-left p  { font-size: 13.5px; color: var(--text2); margin-top: 3px; }
        .us-header-right   { display: flex; gap: 10px; align-items: center; }

        /* ── buttons ── */
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 9px; font-size: 13.5px; font-weight: 600;
          cursor: pointer; border: none; font-family: inherit; transition: all .14s;
        }
        .btn:active { transform: scale(.97); }
        .btn-primary { background: var(--accent); color: #fff; box-shadow: 0 2px 12px rgba(79,110,247,.35); }
        .btn-primary:hover { background: var(--accent-h); }
        .btn-ghost { background: transparent; color: var(--text2); border: 1.5px solid var(--border); }
        .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
        .btn-sm { padding: 6px 13px; font-size: 12.5px; border-radius: 7px; }
        .btn-danger { background: transparent; color: #f87171; border: 1.5px solid #3d1f1f; }
        .btn-danger:hover { background: rgba(248,113,113,.08); border-color: #f87171; }
        .btn-success { background: transparent; color: #4ade80; border: 1.5px solid #1a3a2a; }
        .btn-success:hover { background: rgba(74,222,128,.08); border-color: #4ade80; }

        /* ── card ── */
        .us-card {
          background: var(--card); border-radius: 16px;
          border: 1px solid var(--border);
          box-shadow: 0 4px 24px rgba(0,0,0,.3);
          overflow: hidden;
        }

        /* ── table ── */
        .tbl-scroll { overflow-x: auto; }
        .tbl-scroll::-webkit-scrollbar { height: 5px; }
        .tbl-scroll::-webkit-scrollbar-track { background: var(--card); }
        .tbl-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }

        table { width: 100%; border-collapse: collapse; }

        .col-sticky { position: sticky; left: 0; z-index: 2; background: var(--card); }
        thead .col-sticky { background: var(--card-head); }

        thead tr { background: var(--card-head); }
        thead th {
          padding: 13px 14px; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .7px; color: var(--text3);
          border-bottom: 1px solid var(--border); white-space: nowrap;
          text-align: center;
        }
        thead th.col-user { text-align: left; min-width: 200px; padding-left: 20px; }
        thead th.col-actions { min-width: 100px; }

        .th-all { cursor: pointer; transition: color .12s; }
        .th-all:hover { color: var(--accent) !important; }

        tbody tr { transition: background .1s; }
        tbody tr:hover td { background: var(--hover-row) !important; }
        tbody tr:hover .col-sticky { background: var(--hover-row) !important; }

        tbody td {
          padding: 13px 14px; font-size: 13.5px; color: var(--text2);
          border-bottom: 1px solid var(--border2); text-align: center;
        }
        tbody tr:last-child td { border-bottom: none; }
        tbody td.col-user {
          text-align: left; padding-left: 20px; font-weight: 600; color: var(--text);
          min-width: 200px;
        }

        .user-row-name { display: flex; align-items: center; gap: 10px; }
        .user-avatar {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
          font-family: 'DM Mono', monospace;
        }

        .col-check-all { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .col-check-all span { font-size: 9px; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }

        /* ── add row ── */
        .add-row td { padding: 12px 20px; background: var(--add-row); }
        .add-input {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px; font-weight: 600; color: var(--text);
          border: 1.5px solid var(--border); border-radius: 8px;
          padding: 7px 12px; outline: none; width: 200px;
          background: var(--bg);
        }
        .add-input::placeholder { color: var(--text3); }
        .add-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,110,247,.15); }

        /* ── edit row ── */
        .edit-input {
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px; font-weight: 600; color: var(--text);
          border: 1.5px solid var(--border); border-radius: 8px;
          padding: 6px 10px; outline: none; width: 160px;
          background: var(--bg);
        }
        .edit-input:focus { border-color: var(--accent); }

        /* ── toast ── */
        .toast {
          position: fixed; bottom: 28px; right: 28px;
          background: var(--card); color: var(--text);
          border: 1px solid var(--border);
          padding: 13px 20px; border-radius: 12px; font-size: 13px; font-weight: 600;
          box-shadow: 0 6px 28px rgba(0,0,0,.4);
          display: flex; align-items: center; gap: 9px;
          animation: toastIn .2s ease; z-index: 9999;
        }
        @keyframes toastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

        .action-buttons { display: flex; gap: 6px; justify-content: center; }
      `}</style>

      <div className="us-root">
        {/* Header */}
        <div className="us-header">
          <div className="us-header-left">
            <h1>Module Permissions by User Type</h1>
            <p>Control which modules each user type can access</p>
          </div>
          <div className="us-header-right">
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
              <IconPlus /> Add User Type
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSavePermissions}>
              <IconSave /> Save Permissions
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="us-card">
          <div className="tbl-scroll">
            <table>
              <thead>
                {/* Section group header row */}
                <tr>
                  <th className="col-user col-sticky" rowSpan={2} style={{ verticalAlign: "middle" }}>User Type</th>
                  {MODULE_GROUPS.map(g => (
                    <th
                      key={g.section}
                      colSpan={g.modules.length}
                      style={{
                        textAlign: "center", padding: "8px 6px 4px",
                        fontSize: "10px", fontWeight: 800, letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "#4f6ef7",
                        borderBottom: "1px solid #2a2f4a",
                        borderLeft: "1px solid #2a2f4a",
                      }}
                    >
                      {g.section}
                    </th>
                  ))}
                  <th rowSpan={2} className="col-actions" style={{ verticalAlign: "middle" }}>Actions</th>
                </tr>
                {/* Module name row */}
                <tr>
                  {MODULES.map((m, i) => (
                    <th
                      key={m}
                      className="th-all"
                      onClick={() => toggleAll(m)}
                      title={`Toggle all for ${m}`}
                      style={{
                        borderLeft: MODULE_GROUPS.some(g => g.modules[0] === m) ? "1px solid #2a2f4a" : undefined,
                      }}
                    >
                      <div className="col-check-all">
                        {m}
                        <span>toggle all</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => {
                  const colors = ["#1e2d5a","#1a3a2a","#2e2a14","#2e1a30","#221a3a","#2e1f14"];
                  const textColors = ["#818cf8","#4ade80","#fbbf24","#e879f9","#a78bfa","#fb923c"];
                  const ci = idx % colors.length;
                  
                  return (
                    <tr key={user.id}>
                      <td className="col-user col-sticky">
                        {editingId === user.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              className="edit-input"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") updateUser(user.id);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              autoFocus
                            />
                            <button className="btn btn-success btn-sm" onClick={() => updateUser(user.id)} style={{ padding: "5px 10px" }}>
                              Save
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={cancelEdit} style={{ padding: "5px 10px" }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="user-row-name">
                            <div className="user-avatar" style={{ background: colors[ci], color: textColors[ci] }}>
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>{user.name}</div>
                          </div>
                        )}
                      </td>
                      {MODULES.map(m => (
                        <td key={m} style={{
                          borderLeft: MODULE_GROUPS.some(g => g.modules[0] === m) ? "1px solid #222744" : undefined,
                        }}>
                          <Checkbox
                            checked={user.perms[m]}
                            onChange={() => toggle(user.id, m)}
                          />
                        </td>
                      ))}
                      <td>
                        <div className="action-buttons">
                          {!editingId && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => startEdit(user)}
                              title="Edit user type"
                              style={{ padding: "5px 10px" }}
                            >
                              <IconEdit />
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteUser(user.id)}
                            title="Remove user type"
                            style={{ padding: "5px 10px" }}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Add row */}
                {adding && (
                  <tr className="add-row">
                    <td className="col-sticky" style={{ background: "#161b38" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          className="add-input"
                          placeholder="User type name…"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addUser(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
                          autoFocus
                        />
                        <button className="btn btn-primary btn-sm" onClick={addUser}>Add</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setNewName(""); }}>Cancel</button>
                      </div>
                    </td>
                    <td colSpan={MODULES.length + 1} style={{ background: "#161b38", color: "#5a6080", fontSize: 13, textAlign: "left", paddingLeft: 8 }}>
                      All permissions off by default — toggle after adding
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {saved && (
        <div className="toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Changes saved successfully
        </div>
      )}
    </>
  );
};

export default UserSettings;