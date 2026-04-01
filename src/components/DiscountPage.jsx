import React, { useState, useRef, useEffect } from "react";

// API base URL - adjust to your backend
const API_BASE_URL = "http://localhost:5000/api/discounts";

const fmt = (n) => {
  if (n === null) return "∞";
  return "₹" + Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ─── EditField component ───
const EditField = ({ fieldKey, placeholder, width = 100, rowId, editVals, onEditChange, onKeyDown }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current && fieldKey === "min") {
      inputRef.current.focus();
    }
  }, [fieldKey]);

  return (
    <div className="dp-field">
      {(fieldKey === "min" || fieldKey === "max") && (
        <span className="dp-sym">₹</span>
      )}
      <input
        ref={inputRef}
        className="dp-inp"
        style={{ width }}
        type="number"
        min="0"
        max={fieldKey === "discount" ? 100 : undefined}
        step={fieldKey === "discount" ? "1" : "0.01"}
        placeholder={placeholder}
        value={editVals[fieldKey] === null || editVals[fieldKey] === undefined ? "" : editVals[fieldKey]}
        onChange={(e) => onEditChange(fieldKey, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, rowId)}
        disabled={fieldKey === "max" && editVals.isInfinite}
      />
      {fieldKey === "discount" && (
        <span className="dp-sym dp-sym-r">%</span>
      )}
      {fieldKey === "max" && (
        <button
          type="button"
          className="dp-infinity-toggle"
          onClick={(e) => {
            e.preventDefault();
            onEditChange("__toggleInfinite__", null);
          }}
          title={editVals.isInfinite ? "Set finite max" : "Set infinite max (∞)"}
        >
          {editVals.isInfinite ? "∞" : "↗"}
        </button>
      )}
    </div>
  );
};

// ─── API Service Functions ───
const api = {
  async fetchRanges() {
    const response = await fetch(`${API_BASE_URL}/`);
    if (!response.ok) throw new Error('Failed to fetch ranges');
    const data = await response.json();
    return data;
  },

  async createRange(rangeData) {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rangeData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create range');
    }
    const data = await response.json();
    return data.range;
  },

  async updateRange(id, rangeData) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rangeData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update range');
    }
    const data = await response.json();
    return data.range;
  },

  async deleteRange(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete range');
    }
    const data = await response.json();
    return data;
  },

  async calculateDiscount(amount) {
    const response = await fetch(`${API_BASE_URL}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount) })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to calculate discount');
    }
    return await response.json();
  },

  async validateRange(rangeData) {
    const response = await fetch(`${API_BASE_URL}/validate-range`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rangeData)
    });
    return await response.json();
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DiscountPage = () => {
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [calcAmt, setCalcAmt] = useState("");
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Load ranges on component mount
  useEffect(() => {
    loadRanges();
  }, []);

  const loadRanges = async () => {
    try {
      setLoading(true);
      const data = await api.fetchRanges();
      setRanges(data);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2400);
  };

  // Calculate discount when amount changes
  useEffect(() => {
    const calculate = async () => {
      if (calcAmt && !isNaN(parseFloat(calcAmt)) && parseFloat(calcAmt) >= 0) {
        setCalcLoading(true);
        try {
          const result = await api.calculateDiscount(calcAmt);
          setCalcResult(result);
        } catch (error) {
          setCalcResult(null);
        } finally {
          setCalcLoading(false);
        }
      } else {
        setCalcResult(null);
      }
    };
    calculate();
  }, [calcAmt]);

  const matched = calcResult?.matched_range;
  const calcAmtN = parseFloat(calcAmt) || 0;
  const discPct = calcResult?.discount_percent || 0;
  const discAmt = calcResult?.discount_amount || 0;
  const finalAmt = calcResult?.final_amount || calcAmtN;

  const startEdit = (row) => {
    setEditId(row.id);
    setEditVals({
      min: row.min,
      max: row.max === null ? "" : row.max,
      discount: row.discount,
      isInfinite: row.isInfinite,
    });
  };

  const saveEdit = async (id) => {
    const mn = parseFloat(editVals.min);
    const isInfinite = editVals.isInfinite;
    const mx = isInfinite
      ? null
      : (editVals.max === "" || editVals.max === undefined ? null : parseFloat(editVals.max));
    const d = parseFloat(editVals.discount);

    // Validation
    if (isNaN(mn) || mn < 0) {
      notify("Enter a valid min amount.", "error");
      return;
    }
    if (!isInfinite && (mx === null || isNaN(mx) || mx <= mn)) {
      notify("Max must be a number greater than min.", "error");
      return;
    }
    if (isNaN(d) || d < 0 || d > 100) {
      notify("Discount must be 0–100.", "error");
      return;
    }

    try {
      setLoading(true);
      
      // First validate with backend
      const validation = await api.validateRange({
        min: mn,
        max: mx,
        discount: d,
        isInfinite: isInfinite
      });
      
      if (!validation.valid) {
        notify(validation.error || "Invalid range", "error");
        return;
      }
      
      // If validation passes, update the range
      const updatedRange = await api.updateRange(id, {
        min: mn,
        max: mx,
        discount: d,
        isInfinite: isInfinite
      });
      
      // Update local state
      setRanges(prev => 
        prev.map(r => r.id === id ? updatedRange : r)
          .sort((a, b) => a.min - b.min)
      );
      
      setEditId(null);
      notify("Range saved successfully!");
    } catch (error) {
      console.error('Save error:', error);
      notify(error.message || "Failed to save range", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteRow = async (id) => {
    if (!window.confirm("Are you sure you want to delete this range?")) {
      return;
    }
    
    try {
      setLoading(true);
      await api.deleteRange(id);
      setRanges(prev => prev.filter(r => r.id !== id));
      if (editId === id) setEditId(null);
      notify("Range deleted successfully.", "warn");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const addRow = async () => {
    // Calculate new min amount
    const sortedRanges = [...ranges].sort((a, b) => a.min - b.min);
    let newMin = 0;
    
    for (let i = 0; i < sortedRanges.length; i++) {
      if (sortedRanges[i].isInfinite) continue;
      if (newMin < sortedRanges[i].min) {
        break;
      }
      newMin = sortedRanges[i].max + 1;
    }
    
    const newRowData = {
      min: newMin,
      max: newMin + 999,
      discount: 0,
      isInfinite: false,
    };

    try {
      setLoading(true);
      const newRow = await api.createRange(newRowData);
      setRanges(prev => [...prev, newRow].sort((a, b) => a.min - b.min));
      startEdit(newRow);
      notify("New range added! Edit the values and click Save.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm("This will delete all current ranges and reset to default values. Are you sure?")) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/reset-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to reset');
      const data = await response.json();
      setRanges(data.ranges);
      setEditId(null);
      notify("Reset to default ranges successfully!");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (fieldKey, value) => {
    if (fieldKey === "__toggleInfinite__") {
      setEditVals((v) => ({
        ...v,
        isInfinite: !v.isInfinite,
        max: !v.isInfinite ? null : (v.max ?? ""),
      }));
    } else {
      setEditVals((v) => ({ ...v, [fieldKey]: value }));
    }
  };

  const handleKeyDown = (e, rowId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(rowId);
    }
    if (e.key === "Escape") {
      setEditId(null);
    }
  };

  if (loading && ranges.length === 0) {
    return (
      <div className="dp-root">
        <div className="dp-card" style={{ padding: "50px", textAlign: "center" }}>
          Loading discount ranges...
        </div>
      </div>
    );
  }

  return (
    <div className="dp-root">
      <style>{CSS}</style>

      {toast && (
        <div className={`dp-toast dp-toast-${toast.type}`}>
          <span>
            {toast.type === "success" && "✓"}
            {toast.type === "error" && "✕"}
            {toast.type === "warn" && "⚠"}
          </span>
          {toast.msg}
        </div>
      )}

      <div className="dp-header">
        <div>
          <p className="dp-eyebrow">Pricing Rules</p>
          <h1 className="dp-title">Discount Ranges</h1>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="dp-btn-add" onClick={resetToDefaults} disabled={loading} style={{ background: "#6b8aaa" }}>
            Reset to Defaults
          </button>
          <button className="dp-btn-add" onClick={addRow} disabled={loading}>
            + Add Range
          </button>
        </div>
      </div>

      <div className="dp-layout">
        {/* ── Range Table ── */}
        <div className="dp-left">
          <div className="dp-card">
            {ranges.length === 0 ? (
              <div className="dp-empty">
                <div className="dp-empty-icon">🏷️</div>
                <p>No ranges yet. Click <strong>+ Add Range</strong> to begin.</p>
              </div>
            ) : (
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>Min Amount</th>
                    <th>Max Amount</th>
                    <th>Discount %</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ranges.map((row) => {
                    const ed = editId === row.id;
                    const isActive = matched && matched.id === row.id;
                    return (
                      <tr key={row.id} className={`${ed ? "dp-tr-ed" : ""} ${isActive ? "dp-tr-active" : ""}`}>
                        {/* Min */}
                        <td>
                          {ed ? (
                            <EditField
                              fieldKey="min"
                              placeholder="0"
                              width={110}
                              rowId={row.id}
                              editVals={editVals}
                              onEditChange={handleEditChange}
                              onKeyDown={handleKeyDown}
                            />
                          ) : (
                            <span className="dp-val">{fmt(row.min)}</span>
                          )}
                        </td>

                        {/* Max */}
                        <td>
                          {ed ? (
                            <EditField
                              fieldKey="max"
                              placeholder={editVals.isInfinite ? "∞" : "1000"}
                              width={110}
                              rowId={row.id}
                              editVals={editVals}
                              onEditChange={handleEditChange}
                              onKeyDown={handleKeyDown}
                            />
                          ) : (
                            <span className="dp-val">{row.isInfinite ? "∞" : fmt(row.max)}</span>
                          )}
                        </td>

                        {/* Discount */}
                        <td>
                          {ed ? (
                            <EditField
                              fieldKey="discount"
                              placeholder="0"
                              width={72}
                              rowId={row.id}
                              editVals={editVals}
                              onEditChange={handleEditChange}
                              onKeyDown={handleKeyDown}
                            />
                          ) : (
                            <div className="dp-disc-cell">
                              <span className={`dp-pct-badge ${row.discount > 0 ? "dp-pct-on" : ""}`}>
                                {row.discount}%
                              </span>
                              <div className="dp-bar-track">
                                <div className="dp-bar-fill" style={{ width: `${Math.min(row.discount, 100)}%` }} />
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td>
                          {ed ? (
                            <div className="dp-acts">
                              <button className="dp-btn dp-btn-save" onClick={() => saveEdit(row.id)} disabled={loading}>
                                ✓ Save
                              </button>
                              <button className="dp-btn dp-btn-cancel" onClick={() => setEditId(null)}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="dp-acts">
                              <button className="dp-btn dp-btn-edit" onClick={() => startEdit(row)}>
                                ✎ Edit
                              </button>
                              <button className="dp-btn dp-btn-del" onClick={() => deleteRow(row.id)} disabled={loading}>
                                ✕
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p className="dp-hint">
            💡 Enter any amount in the calculator → it auto-detects the matching range.
            Toggle <strong>↗</strong> on the Max field to set a range to infinity (∞).
            Ranges cannot overlap - the system will prevent overlapping ranges.
          </p>
        </div>

        {/* ── Live Calculator ── */}
        <div className="dp-right">
          <div className="dp-calc-card">
            <p className="dp-calc-title">Live Calculator</p>

            <label className="dp-calc-label">Enter Amount</label>
            <div className="dp-calc-inp-wrap">
              <span className="dp-calc-sym">₹</span>
              <input
                className="dp-calc-inp"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 2500"
                value={calcAmt}
                onChange={(e) => setCalcAmt(e.target.value)}
              />
            </div>

            {calcLoading ? (
              <div className="dp-calc-placeholder">Calculating...</div>
            ) : calcAmtN > 0 && calcResult ? (
              <div className="dp-calc-result">
                {calcResult.matched_range ? (
                  <>
                    <div className="dp-match-badge">
                      Range: {fmt(calcResult.matched_range.min)} –{" "}
                      {calcResult.matched_range.isInfinite ? "∞" : fmt(calcResult.matched_range.max)}
                    </div>
                    <div className="dp-calc-row">
                      <span>Original</span>
                      <span className="dp-cr-val">{fmt(calcAmtN)}</span>
                    </div>
                    <div className="dp-calc-row">
                      <span>Discount ({calcResult.discount_percent}%)</span>
                      <span className="dp-cr-disc">− {fmt(calcResult.discount_amount)}</span>
                    </div>
                    <div className="dp-calc-divider" />
                    <div className="dp-calc-row dp-calc-final-row">
                      <span>Final Payable</span>
                      <span className="dp-cr-final">{fmt(calcResult.final_amount)}</span>
                    </div>
                    <div className="dp-savings-pill">
                      🎉 You save {fmt(calcResult.discount_amount)} ({calcResult.discount_percent}% off)
                    </div>
                  </>
                ) : (
                  <div className="dp-no-match">
                    <span>⚠</span>
                    <p>₹{calcAmtN.toLocaleString("en-IN")} doesn't fall in any defined range.</p>
                  </div>
                )}
              </div>
            ) : calcAmtN > 0 && !calcResult ? (
              <div className="dp-calc-placeholder">No matching range found.</div>
            ) : (
              <div className="dp-calc-placeholder">
                Type an amount above to instantly see which discount applies.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// CSS Styles
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:     #090f1c;
  --surf:   #0f1826;
  --border: #1a2d44;
  --bord2:  #213550;
  --accent: #38bdf8;
  --acc2:   #7dd3fc;
  --red:    #f87171;
  --green:  #34d399;
  --muted:  #3d5570;
  --text:   #dde6f0;
  --text2:  #6b8aaa;
}

.dp-root {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  padding: 36px 28px;
  max-width: 1020px;
  margin: 0 auto;
}

.dp-toast {
  position: fixed; top: 20px; right: 24px;
  display: flex; align-items: center; gap: 10px;
  padding: 11px 18px; border-radius: 9px;
  font-size: 13px; font-weight: 600;
  box-shadow: 0 8px 30px rgba(0,0,0,0.5); z-index: 9999;
  animation: slideIn 0.22s cubic-bezier(0.22,1,0.36,1);
}
.dp-toast-success { background:#052e16; border:1px solid #14532d; color:#6ee7b7; }
.dp-toast-error   { background:#3b0000; border:1px solid #7f1d1d; color:#fca5a5; }
.dp-toast-warn    { background:#2a1800; border:1px solid #78350f; color:#fcd34d; }
@keyframes slideIn {
  from { opacity:0; transform:translateX(14px); }
  to   { opacity:1; transform:translateX(0); }
}

.dp-header {
  display:flex; justify-content:space-between; align-items:flex-end;
  margin-bottom:28px;
}
.dp-eyebrow {
  font-size:10px; font-weight:700; letter-spacing:2.5px;
  text-transform:uppercase; color:var(--accent); margin-bottom:5px;
}
.dp-title {
  font-family:'Syne',sans-serif;
  font-size:26px; font-weight:800; color:#f0f8ff; letter-spacing:-0.5px;
}
.dp-btn-add {
  background:var(--accent); border:none; color:#050d18;
  padding:10px 22px; border-radius:8px;
  font-family:'DM Sans',sans-serif; font-weight:700; font-size:13px; cursor:pointer;
  transition:background 0.15s, transform 0.1s;
}
.dp-btn-add:hover { background:var(--acc2); transform:translateY(-1px); }
.dp-btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

.dp-layout {
  display:grid; grid-template-columns:1fr 300px; gap:20px; align-items:start;
}

.dp-card {
  background:var(--surf); border:1px solid var(--border);
  border-radius:12px; overflow:auto;
}

.dp-empty { padding:50px 20px; text-align:center; color:var(--text2); font-size:14px; }
.dp-empty-icon { font-size:36px; margin-bottom:12px; }
.dp-empty strong { color:var(--accent); }

.dp-table { width:100%; border-collapse:collapse; font-size:14px; }
.dp-table thead th {
  text-align:left; font-size:10.5px; font-weight:700;
  text-transform:uppercase; letter-spacing:1px;
  color:var(--muted); padding:13px 18px;
  border-bottom:1px solid var(--border); background:#0c1622;
}
.dp-table tbody td {
  padding:12px 18px; border-bottom:1px solid #0f1d2d; vertical-align:middle;
}
.dp-table tbody tr:last-child td { border-bottom:none; }
.dp-table tbody tr:hover td { background:#101e30; }
.dp-tr-ed td     { background:#0f2038 !important; }
.dp-tr-active td { background:#061e35 !important; }
.dp-tr-active td:first-child { border-left:3px solid var(--accent); }

.dp-val { color:var(--text); font-weight:600; font-size:13.5px; }

.dp-disc-cell { display:flex; flex-direction:column; gap:5px; }
.dp-pct-badge {
  display:inline-block; padding:2px 9px; border-radius:20px;
  background:var(--border); color:var(--muted);
  font-size:12px; font-weight:700; width:fit-content;
}
.dp-pct-on { background:rgba(56,189,248,0.1); color:var(--accent); }
.dp-bar-track { width:80px; height:4px; background:var(--border); border-radius:2px; }
.dp-bar-fill  { height:100%; background:var(--accent); border-radius:2px; transition:width 0.3s; }

.dp-field {
  display:inline-flex; align-items:center;
  background:#060e1a; border:1.5px solid var(--accent);
  border-radius:7px; overflow:hidden;
  box-shadow:0 0 0 3px rgba(56,189,248,0.1);
}
.dp-sym {
  padding:0 8px; font-size:12px; font-weight:700;
  color:var(--accent); background:rgba(56,189,248,0.07);
  height:34px; display:flex; align-items:center;
  border-right:1px solid rgba(56,189,248,0.15); flex-shrink:0;
}
.dp-sym-r { border-right:none; border-left:1px solid rgba(56,189,248,0.15); }
.dp-inp {
  background:transparent; border:none; outline:none;
  color:#f0f8ff; font-size:13px; font-weight:600;
  font-family:'DM Sans',sans-serif; height:34px; padding:0 9px; min-width:0;
}
.dp-inp:disabled { color:var(--muted); cursor:not-allowed; }

.dp-infinity-toggle {
  background:rgba(56,189,248,0.1); border:none;
  color:var(--accent); width:32px; height:34px;
  cursor:pointer; font-size:15px; font-weight:700;
  transition:all 0.15s; flex-shrink:0;
}
.dp-infinity-toggle:hover { background:rgba(56,189,248,0.25); }

.dp-acts { display:flex; gap:7px; align-items:center; }
.dp-btn {
  padding:5px 12px; border-radius:6px;
  font-family:'DM Sans',sans-serif; font-size:12px; font-weight:700;
  cursor:pointer; transition:all 0.15s; white-space:nowrap;
}
.dp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dp-btn-edit   { background:var(--border); border:1px solid var(--bord2); color:var(--text2); }
.dp-btn-edit:hover:not(:disabled) { background:var(--bord2); color:var(--text); }
.dp-btn-del    { background:transparent; border:1px solid #7f1d1d55; color:var(--red); padding:5px 9px; }
.dp-btn-del:hover:not(:disabled) { background:#1a0505; border-color:var(--red); }
.dp-btn-save   { background:var(--accent); border:none; color:#050d18; }
.dp-btn-save:hover:not(:disabled) { background:var(--acc2); }
.dp-btn-cancel { background:var(--border); border:1px solid var(--bord2); color:var(--text2); }
.dp-btn-cancel:hover:not(:disabled) { background:var(--bord2); }

.dp-hint { margin-top:12px; font-size:12px; color:var(--muted); line-height:1.6; }
.dp-hint strong { color:var(--text2); }

.dp-calc-card {
  background:var(--surf); border:1px solid var(--border);
  border-radius:12px; padding:22px 20px;
  position:sticky; top:20px;
}
.dp-calc-title {
  font-size:10.5px; font-weight:700; text-transform:uppercase;
  letter-spacing:2px; color:var(--accent); margin-bottom:16px;
}
.dp-calc-label {
  display:block; font-size:11px; font-weight:700;
  text-transform:uppercase; letter-spacing:1px;
  color:var(--text2); margin-bottom:8px;
}
.dp-calc-inp-wrap {
  display:flex; align-items:center;
  background:#060e1a; border:1.5px solid var(--bord2);
  border-radius:9px; overflow:hidden; transition:border-color 0.15s;
}
.dp-calc-inp-wrap:focus-within {
  border-color:var(--accent); box-shadow:0 0 0 3px rgba(56,189,248,0.1);
}
.dp-calc-sym {
  padding:0 12px; font-size:14px; font-weight:700;
  color:var(--accent); height:42px; display:flex; align-items:center;
  background:rgba(56,189,248,0.06);
  border-right:1px solid rgba(56,189,248,0.15); flex-shrink:0;
}
.dp-calc-inp {
  background:transparent; border:none; outline:none;
  color:#f0f8ff; font-size:16px; font-weight:700;
  font-family:'DM Sans',sans-serif; height:42px; padding:0 12px; width:100%;
}

.dp-calc-result { margin-top:18px; }
.dp-match-badge {
  display:inline-block; padding:4px 11px; border-radius:20px;
  background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.2);
  color:var(--accent); font-size:11px; font-weight:700;
  margin-bottom:14px; letter-spacing:0.3px;
}
.dp-calc-row {
  display:flex; justify-content:space-between; align-items:center;
  padding:8px 0; font-size:13px;
}
.dp-calc-row span:first-child { color:var(--text2); font-weight:500; }
.dp-cr-val   { color:var(--text); font-weight:700; }
.dp-cr-disc  { color:var(--red); font-weight:700; }
.dp-calc-divider { height:1px; background:var(--border); margin:6px 0; }
.dp-calc-final-row span:first-child { color:var(--text); font-weight:700; font-size:14px; }
.dp-cr-final { color:var(--green); font-weight:800; font-size:18px; }
.dp-savings-pill {
  margin-top:14px; padding:8px 14px; border-radius:8px;
  background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.2);
  color:var(--green); font-size:12px; font-weight:700; text-align:center;
}
.dp-no-match {
  display:flex; align-items:flex-start; gap:10px;
  background:rgba(248,113,113,0.07); border:1px solid rgba(248,113,113,0.2);
  border-radius:9px; padding:14px; margin-top:14px;
  color:var(--red); font-size:13px; font-weight:600;
}
.dp-calc-placeholder {
  margin-top:18px; padding:18px 14px;
  border:1px dashed var(--bord2); border-radius:9px;
  text-align:center; color:var(--muted); font-size:13px; line-height:1.5;
}

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
input[type=number] { -moz-appearance:textfield; }

@media (max-width:680px) {
  .dp-layout { grid-template-columns:1fr; }
  .dp-calc-card { position:static; }
}
`;

export default DiscountPage;