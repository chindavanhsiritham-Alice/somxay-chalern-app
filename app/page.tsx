"use client";
import { useState } from "react";

const GRADES = ["Grade 1 (Specialty)", "Grade 2 (Premium)", "Grade 3 (Commercial)", "Peaberry", "Robusta"];
const STATUSES = ["Processing", "Shipped", "Delivered"];

const INIT_ORDERS = [
  { id: 1, date: "2026-01-12", buyer: "Ritual Coffee Roasters", grade: "Grade 1 (Specialty)", kgs: 2000, priceUSD: 9.5, status: "Delivered" },
  { id: 2, date: "2026-02-20", buyer: "OR (PTT)", grade: "Grade 1 (Specialty)", kgs: 5000, priceUSD: 8.8, status: "Delivered" },
  { id: 3, date: "2026-05-18", buyer: "OR (PTT)", grade: "Grade 1 (Specialty)", kgs: 4000, priceUSD: 9.0, status: "Shipped" },
  { id: 4, date: "2026-06-08", buyer: "Ritual Coffee Roasters", grade: "Grade 1 (Specialty)", kgs: 1200, priceUSD: 11.0, status: "Processing" },
];

export default function Home() {
  const [orders, setOrders] = useState(INIT_ORDERS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", buyer: "", grade: GRADES[0], kgs: "", priceUSD: "", status: "Processing" });

  const totalRevenue = orders.reduce((s, o) => s + o.kgs * o.priceUSD, 0);
  const totalKgs = orders.reduce((s, o) => s + o.kgs, 0);

  function saveOrder() {
    if (!form.date || !form.buyer || !form.kgs || !form.priceUSD) return;
    setOrders([...orders, { ...form, id: orders.length + 1, kgs: parseFloat(form.kgs), priceUSD: parseFloat(form.priceUSD) }]);
    setShowForm(false);
    setForm({ date: "", buyer: "", grade: GRADES[0], kgs: "", priceUSD: "", status: "Processing" });
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7f2", fontFamily: "sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ color: "#2d7a3a", fontSize: 24, margin: 0 }}>☕ Somxay Coffee</h1>
            <p style={{ color: "#6b8f5e", margin: 0, fontSize: 13 }}>Green Bean Sales Tracker</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ background: "#2d7a3a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>+ บันทึกออเดอร์</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "รายได้รวม (USD)", value: "$" + totalRevenue.toLocaleString() },
            { label: "ปริมาณขาย", value: totalKgs.toLocaleString() + " kg" },
            { label: "ออเดอร์ทงหมด", value: orders.length },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #d4e4d0" }}>
              <div style={{ fontSize: 12, color: "#6b8f5e", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#2d7a3a" }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #d4e4d0" }}>
          <h2 style={{ color: "#2d7a3a", fontSize: 16, marginTop: 0 }}>คสั่งซื้อทั้งหมด</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #d4e4d0" }}>
                {["วันที่", "ลกค้า", "Grade", "ปริมาณ", "ราคา/kg", "มูลค่า", "สถานะ"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#6b8f5e" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f0f4ef" }}>
                  <td style={{ padding: "10px" }}>{o.date}</td>
                  <td style={{ padding: "10px" }}>{o.buyer}</td>
                  <td style={{ padding: "10px" }}>{o.grade}</td>
                  <td style={{ padding: "10px" }}>{o.kgs.toLocaleString()} kg</td>
                  <td style={{ padding: "10px" }}>${o.priceUSD}</td>
                  <td style={{ padding: "10px", color: "#b8860b", fontWeight: 700 }}>${(o.kgs * o.priceUSD).toLocaleString()}</td>
                  <td style={{ padding: "10px" }}>
                    <span style={{ background: o.status === "Delivered" ? "#e8f5e9" : o.status === "Shipped" ? "#fff8e1" : "#e3f2fd", color: o.status === "Delivered" ? "#2d7a3a" : o.status === "Shipped" ? "#b8860b" : "#1565c0", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "#00000066", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 440 }}>
              <h2 style={{ color: "#2d7a3a", marginTop: 0 }}>บันทึกออเดอร์ใหม่</h2>
              {[["วันที่", "date", "date"], ["ลูกค้า", "buyer", "text"], ["ปริมาณ (kg)", "kgs", "number"], ["ราคา USD/kg", "priceUSD", "number"]].map(([label, key, type]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#6b8f5e", marginBottom: 4 }}>{label}</div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <input type={type} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d4e4d0", fontSize: 14, boxSizing: "border-box" as any }} />
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#6b8f5e", marginBottom: 4 }}>Grade</div>
                <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d4e4d0", fontSize: 14 }}>
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={() => setShowForm(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d4e4d0", background: "#f4f7f2", cursor: "pointer" }}>ยกเลิก</button>
                <button onClick={saveOrder} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#2d7a3a", color: "#fff", cursor: "pointer" }}>บันทึก</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}