import { useState, useEffect, useCallback } from "react";
import { Plus, X, ChevronDown, ChevronRight, ClipboardList, Calendar, RefreshCw, CheckCircle2, Clock, Wrench, ExternalLink, Search, UserCheck, MapPin } from "lucide-react";
import { useRef } from "react";
import type { User } from "../types";
import { useNavigate } from "react-router-dom";
import { CustomDateInput } from "./CustomDateInput";
import { formatToDDMMYYYY } from "../utils";

interface MAContractsProps {
  currentUser: User | null;
}

const getUserId = () => {
  try { const u = JSON.parse(localStorage.getItem("nt_current_user") || "{}"); return u?.id || ""; } catch { return ""; }
};
const authHeaders = () => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const uid = getUserId();
  if (uid) headers["x-user-id"] = uid;
  return headers;
};

const addMonths = (dateStr: string, months: number): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
};

const formatDate = (s?: string) => {
  if (!s) return "—";
  try { return formatToDDMMYYYY(s) || s; } catch { return s; }
};

const iStyle = { background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0.55rem 0.75rem", color: "var(--text-primary)", outline: "none", fontSize: "0.875rem", width: "100%", boxSizing: "border-box" as const };

export const MAContracts = ({ currentUser }: MAContractsProps) => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailContract, setDetailContract] = useState<any | null>(null);
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formSiteName, setFormSiteName] = useState("");
  const [formSiteAddress, setFormSiteAddress] = useState("");
  const [formServiceType, setFormServiceType] = useState("ล้างแอร์");
  const [formFrequency, setFormFrequency] = useState(3);
  const [formTotalRounds, setFormTotalRounds] = useState(4);
  const [formStartDate, setFormStartDate] = useState("");
  const [formContractValue, setFormContractValue] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<any[]>([{ id: "si_1", name: "เครื่องที่ 1", brand: "", btu: "", location: "" }]);
  const [saving, setSaving] = useState(false);

  // Customer Master Auto-fill & Search states
  const [customersMaster, setCustomersMaster] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSites, setCustomerSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCustomerDropdownOpen(false);
    };
    if (isCustomerDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCustomerDropdownOpen]);

  const fetchCustomersMaster = async () => {
    try {
      const res = await fetch("/api/customers", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCustomersMaster(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Notice: fetch customers master:", err);
    }
  };

  const fetchCustomerSites = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/sites`, { headers: authHeaders() });
      if (res.ok) {
        const sites = await res.json();
        setCustomerSites(Array.isArray(sites) ? sites : []);
        return sites;
      }
    } catch (err) {
      console.warn("Notice: fetch customer sites:", err);
    }
    return [];
  };

  const handleSelectCustomerFromMaster = (cust: any) => {
    setIsCustomerDropdownOpen(false);
    setSelectedCustomerId(cust.id || "");

    let fName = cust.firstName || cust.first_name || "";
    let lName = cust.lastName || cust.last_name || "";
    if (!fName && (cust.companyName || cust.company_name)) {
      fName = cust.companyName || cust.company_name;
    } else if (!fName && (cust.customerName || cust.customer_name)) {
      const parts = (cust.customerName || cust.customer_name).split(" ");
      fName = parts[0];
      if (!lName && parts.length > 1) lName = parts.slice(1).join(" ");
    }
    const fullName = (cust.customerName || cust.customer_name || `${fName} ${lName}`).trim() || "ลูกค้า";

    setFormCustomerName(fullName);

    const rawPhone = cust.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
    setFormCustomerPhone(cleanPhone);

    const displayName = (cust.companyName || cust.company_name) || fullName;
    setCustomerSearchQuery(displayName);

    const siteAddr = cust.defaultSiteAddress || cust.default_site_address || cust.address || "";
    if (siteAddr) setFormSiteAddress(siteAddr);

    const sName = cust.defaultSiteName || cust.default_site_name || cust.siteName || "สถานที่หลัก";
    setFormSiteName(sName);

    if (cust.id) {
      fetchCustomerSites(cust.id).then(sites => {
        if (sites && sites.length > 0) {
          const defaultSite = sites.find((s: any) => s.isDefault || s.is_default) || sites[0];
          setSelectedSiteId(defaultSite.id);
          if (defaultSite.address) setFormSiteAddress(defaultSite.address);
          if (defaultSite.siteName || defaultSite.site_name) setFormSiteName(defaultSite.siteName || defaultSite.site_name);
        }
      }).catch(() => {});
    }
  };

  const handleSelectSite = (site: any) => {
    setSelectedSiteId(site.id);
    if (site.siteName || site.site_name) setFormSiteName(site.siteName || site.site_name);
    if (site.address) setFormSiteAddress(site.address);
  };

  const SERVICE_TYPES = ["ล้างแอร์", "ตรวจระบบไฟฟ้า", "ตรวจระบบประปา", "ตรวจ CCTV", "PM ลิฟต์", "อื่นๆ"];

  const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    Scheduled:  { label: "🗓 กำหนดการ", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
    InProgress: { label: "🔧 กำลังทำ",  color: "#f97316", bg: "rgba(249,115,22,0.12)" },
    Completed:  { label: "✅ เสร็จสิ้น", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    Rescheduled:{ label: "🔁 เลื่อนนัด", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    Skipped:    { label: "⏭ ข้าม",       color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, tr] = await Promise.all([
        fetch("/api/ma-contracts", { headers: authHeaders() }).then(r => r.json()),
        fetch("/api/ma-checklist-templates", { headers: authHeaders() }).then(r => r.json()),
      ]);
      setContracts(cr);
      setChecklistTemplates(tr.map((t: any) => ({
        ...t,
        checklist_items: typeof t.checklist_items === "string" ? JSON.parse(t.checklist_items) : t.checklist_items,
      })));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const d = await fetch(`/api/ma-contracts/${id}`, { headers: authHeaders() }).then(r => r.json());
      setDetailContract({ ...d, service_items: typeof d.service_items === "string" ? JSON.parse(d.service_items) : (d.service_items || []) });
    } catch(e) { console.error(e); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggle = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setDetailContract(null); }
    else { setExpandedId(id); await fetchDetail(id); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStartDate) return alert("กรุณาระบุวันเริ่มต้น");
    setSaving(true);
    try {
      const body = {
        service_type: formServiceType,
        service_items: formItems.filter(i => i.name.trim()),
        frequency_months: formFrequency,
        total_rounds: formTotalRounds,
        contract_start_date: formStartDate,
        contract_end_date: addMonths(formStartDate, formFrequency * formTotalRounds),
        contract_value: parseFloat(formContractValue.replace(/,/g, "")) || 0,
        notes: [formCustomerName && `ลูกค้า: ${formCustomerName}`, formCustomerPhone && `โทร: ${formCustomerPhone}`, formSiteName && `ไซต์: ${formSiteName}`, formSiteAddress && `ที่อยู่: ${formSiteAddress}`, formNotes].filter(Boolean).join("\n"),
        status: "Active",
        created_by: currentUser?.id,
      };
      const saved = await fetch("/api/ma-contracts", { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(r => r.json());
      for (let r = 1; r <= formTotalRounds; r++) {
        await fetch("/api/ma-rounds", { method: "POST", headers: authHeaders(), body: JSON.stringify({ contract_id: saved.id, round_number: r, scheduled_date: addMonths(formStartDate, formFrequency * (r - 1)), status: "Scheduled" }) });
      }
      setShowModal(false);
      setSelectedCustomerId(""); setCustomerSites([]); setSelectedSiteId(""); setCustomerSearchQuery(""); setFormCustomerName(""); setFormCustomerPhone(""); setFormSiteName(""); setFormSiteAddress(""); setFormServiceType("ล้างแอร์"); setFormFrequency(3); setFormTotalRounds(4); setFormStartDate(""); setFormContractValue(""); setFormNotes("");
      setFormItems([{ id: "si_1", name: "เครื่องที่ 1", brand: "", btu: "", location: "" }]);
      await fetchAll();
    } catch(e) { console.error(e); alert("เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  };

  const handleComplete = async (round: any) => {
    if (!confirm(`ยืนยันปิดรอบที่ ${round.round_number} เป็น "เสร็จสิ้น"?`)) return;
    await fetch(`/api/ma-rounds/${round.id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: "Completed", actual_date: new Date().toISOString().split("T")[0] }) });
    if (detailContract) await fetchDetail(detailContract.id);
    await fetchAll();
  };

  const handleReschedule = async (round: any) => {
    const nd = prompt(`วันใหม่สำหรับรอบที่ ${round.round_number} (YYYY-MM-DD):`, round.scheduled_date || "");
    if (!nd) return;
    await fetch(`/api/ma-rounds/${round.id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: "Rescheduled", scheduled_date: nd }) });
    if (detailContract) await fetchDetail(detailContract.id);
  };

  const handleChecklist = (serviceType: string) => {
    const tpl = checklistTemplates.find(t => t.service_type === serviceType);
    if (!tpl) { alert(`ไม่พบ Checklist สำหรับ "${serviceType}"`); return; }
    setSelectedTemplate(tpl);
    setShowChecklistModal(true);
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-muted)" }}>กำลังโหลดข้อมูล...</div>;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>📋 สัญญา MA — Recurring Maintenance</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.875rem" }}>สัญญาบำรุงรักษาแบบวนซ้ำ พร้อม Checklist และตารางรอบบริการ</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--accent-primary)", color: "white", border: "none", borderRadius: 10, padding: "0.65rem 1.25rem", cursor: "pointer", fontWeight: 700 }}>
          <Plus size={18} /> สร้างสัญญา MA
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "สัญญาทั้งหมด", value: contracts.length, color: "#3b82f6", icon: "📋" },
          { label: "Active", value: contracts.filter(c => c.status === "Active").length, color: "#10b981", icon: "✅" },
          { label: "รอบทั้งหมด", value: contracts.reduce((s: number, c: any) => s + (parseInt(c.total_rounds_count) || 0), 0), color: "#6366f1", icon: "🔄" },
          { label: "รอบเสร็จแล้ว", value: contracts.reduce((s: number, c: any) => s + (parseInt(c.completed_rounds) || 0), 0), color: "#f59e0b", icon: "🏆" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "1.5rem" }}>{s.icon}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {contracts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3rem" }}>📋</div>
          <div style={{ fontWeight: 600 }}>ยังไม่มีสัญญา MA — กด "สร้างสัญญา MA" เพื่อเริ่มต้น</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {contracts.map((c: any) => {
            const isExp = expandedId === c.id;
            const total = parseInt(c.total_rounds_count) || c.total_rounds || 0;
            const done = parseInt(c.completed_rounds) || 0;
            const pct = total ? Math.round(done / total * 100) : 0;
            const cStatusColor = c.status === "Active" ? "#10b981" : c.status === "Completed" ? "#3b82f6" : "#ef4444";
            const notes = c.notes || "";
            const custName = c.customer_name || notes.split("\n").find((l: string) => l.startsWith("ลูกค้า:"))?.replace("ลูกค้า: ", "") || "ไม่ระบุชื่อ";
            const siteName = c.site_name || notes.split("\n").find((l: string) => l.startsWith("ไซต์:"))?.replace("ไซต์: ", "");
            return (
              <div key={c.id} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.25rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem" }} onClick={() => handleToggle(c.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 800, fontSize: "1rem" }}>{c.contract_no || c.id}</span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: cStatusColor, background: `${cStatusColor}20`, padding: "0.12rem 0.55rem", borderRadius: 999 }}>{c.status}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "0.12rem 0.55rem", borderRadius: 999 }}>🔧 {c.service_type}</span>
                    </div>
                    <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <span>👤 {custName}{siteName ? ` · 📍 ${siteName}` : ""}</span>
                      <span>📅 ทุก {c.frequency_months} เดือน · {c.total_rounds} รอบ</span>
                      {c.contract_value > 0 && <span style={{ color: "#10b981", fontWeight: 600 }}>฿{Number(c.contract_value).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 80 }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: pct === 100 ? "#10b981" : "var(--text-primary)" }}>{done}/{total}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>รอบที่เสร็จ</div>
                    <div style={{ height: 6, background: "var(--bg-tertiary)", borderRadius: 999, width: 80, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10b981" : "var(--accent-primary)", borderRadius: 999 }} />
                    </div>
                  </div>
                  {isExp ? <ChevronDown size={20} color="var(--text-muted)" /> : <ChevronRight size={20} color="var(--text-muted)" />}
                </div>
                {isExp && (
                  <div style={{ borderTop: "1px solid var(--border-color)", padding: "1.25rem" }}>
                    {detailContract?.id === c.id ? (
                      <>
                        {(detailContract.service_items || []).length > 0 && (
                          <div style={{ marginBottom: "1rem" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase" }}>อุปกรณ์ในสัญญา</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                              {detailContract.service_items.map((it: any, idx: number) => (
                                <span key={it.id || idx} style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 7, padding: "0.2rem 0.55rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                                  {idx + 1}. {it.name}{it.brand ? ` (${it.brand}${it.btu ? ` ${it.btu} BTU` : ""})` : ""}{it.location ? ` — ${it.location}` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ marginBottom: "1rem" }}>
                          <button onClick={() => handleChecklist(detailContract.service_type || "")} style={{ display: "flex", alignItems: "center", gap: "0.45rem", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", borderRadius: 8, padding: "0.4rem 0.85rem", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                            <ClipboardList size={14} /> ดู QC Checklist — {detailContract.service_type}
                          </button>
                        </div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.6rem", textTransform: "uppercase" }}>ตารางรอบบริการ</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                          {(detailContract.rounds || []).map((r: any) => {
                            const badge = STATUS_BADGE[r.status] || STATUS_BADGE.Scheduled;
                            return (
                              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.85rem", background: "var(--bg-tertiary)", borderRadius: 9, padding: "0.65rem 0.85rem", flexWrap: "wrap" }}>
                                <div style={{ minWidth: 55, fontWeight: 800, fontSize: "0.9rem" }}>รอบ {r.round_number}</div>
                                <span style={{ fontSize: "0.73rem", fontWeight: 700, color: badge.color, background: badge.bg, padding: "0.15rem 0.55rem", borderRadius: 999 }}>{badge.label}</span>
                                <div style={{ flex: 1, fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                                  <Calendar size={12} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                  นัด: <strong>{formatDate(r.scheduled_date)}</strong>
                                  {r.actual_date ? <> · จริง: <strong>{formatDate(r.actual_date)}</strong></> : ""}
                                </div>
                                {r.proj_name && (
                                  <button onClick={() => navigate(`/projects/${r.proj_id || r.project_id}`)} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", borderRadius: 7, padding: "0.2rem 0.55rem", cursor: "pointer", fontSize: "0.75rem" }}>
                                    <ExternalLink size={11} /> {r.proj_name}
                                  </button>
                                )}
                                {(r.status === "Scheduled" || r.status === "InProgress") && (
                                  <div style={{ display: "flex", gap: "0.35rem" }}>
                                    <button onClick={() => handleComplete(r)} style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", borderRadius: 7, padding: "0.2rem 0.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.75rem" }}>
                                      <CheckCircle2 size={12} /> เสร็จ
                                    </button>
                                    <button onClick={() => handleReschedule(r)} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", borderRadius: 7, padding: "0.2rem 0.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.75rem" }}>
                                      <RefreshCw size={12} /> เลื่อน
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)" }}><Clock size={18} /> กำลังโหลด...</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem", overflowY: "auto" }}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 680, border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>📋 สร้างสัญญา MA ใหม่</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={22} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: "0.85rem", padding: "0.85rem", background: "var(--bg-tertiary)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <UserCheck size={14} color="#3b82f6" /> ข้อมูลลูกค้า (Customer & Site)
                  </div>
                  {selectedCustomerId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId("");
                        setCustomerSites([]);
                        setSelectedSiteId("");
                        setCustomerSearchQuery("");
                        setFormCustomerName("");
                        setFormCustomerPhone("");
                        setFormSiteName("");
                        setFormSiteAddress("");
                      }}
                      style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.72rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontWeight: 600 }}
                    >
                      <X size={12} /> ล้างการเลือก Master
                    </button>
                  )}
                </div>

                {/* ── Search & Auto-Fill from Customer Master ── */}
                <div ref={customerDropdownRef} style={{ position: "relative", marginBottom: "0.75rem" }}>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="🔍 ค้นหาชื่อลูกค้า, บริษัท, เบอร์โทร เพื่อดึงข้อมูลเดิมอัตโนมัติ..."
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => {
                        fetchCustomersMaster();
                        setIsCustomerDropdownOpen(true);
                      }}
                      style={{
                        ...iStyle,
                        paddingLeft: "2.2rem",
                        borderColor: isCustomerDropdownOpen ? "#3b82f6" : "var(--border-color)",
                        background: "var(--bg-secondary)"
                      }}
                    />
                    <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    {isCustomerDropdownOpen && (
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(false)}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "4px",
                          color: "#ef4444",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.45rem",
                          cursor: "pointer"
                        }}
                      >
                        ✕ หุบรายการ
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {isCustomerDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                        maxHeight: "220px",
                        overflowY: "auto",
                        zIndex: 100
                      }}
                    >
                      {(() => {
                        const q = customerSearchQuery.trim().toLowerCase();
                        const filtered = customersMaster.filter((c: any) => {
                          if (!q) return true;
                          const cName = (c.customerName || c.customer_name || "").toLowerCase();
                          const fName = (c.firstName || c.first_name || "").toLowerCase();
                          const lName = (c.lastName || c.last_name || "").toLowerCase();
                          const compName = (c.companyName || c.company_name || "").toLowerCase();
                          const phone = (c.phone || "").toLowerCase();
                          const code = (c.customerCode || c.customer_code || "").toLowerCase();
                          return cName.includes(q) || fName.includes(q) || lName.includes(q) || compName.includes(q) || phone.includes(q) || code.includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              {q ? `ไม่พบข้อมูลลูกค้าที่ตรงกับ "${customerSearchQuery}"` : "ยังไม่มีข้อมูลลูกค้าใน Master"}
                            </div>
                          );
                        }

                        return filtered.slice(0, 10).map((c: any) => {
                          const displayName = ((c.customerType === "corporate" || c.customer_type === "corporate") && (c.companyName || c.company_name))
                            ? (c.companyName || c.company_name)
                            : (c.customerName || c.customer_name || `${c.firstName || c.first_name || ""} ${c.lastName || c.last_name || ""}`.trim());
                          const displayCode = c.customerCode || c.customer_code || "CUST";
                          return (
                            <div
                              key={c.id}
                              onClick={() => handleSelectCustomerFromMaster(c)}
                              style={{
                                padding: "0.6rem 0.75rem",
                                borderBottom: "1px solid var(--border-color)",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "0.5rem"
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <div>
                                <strong style={{ color: "var(--text-primary)" }}>{displayName}</strong>
                                <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", color: "#3b82f6", background: "rgba(59,130,246,0.1)", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                                  {displayCode}
                                </span>
                                {c.phone && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>📞 {c.phone}</div>}
                              </div>
                              <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700 }}>เลือก ➔</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Multiple Sites Selector if Customer has > 1 site */}
                {customerSites.length > 1 && (
                  <div style={{ marginBottom: "0.6rem", padding: "0.5rem 0.65rem", background: "rgba(59,130,246,0.08)", borderRadius: "6px", border: "1px solid rgba(59,130,246,0.2)" }}>
                    <label style={{ fontSize: "0.74rem", fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.25rem" }}>
                      <MapPin size={12} /> เลือกลงสัญญาที่ Site งานของลูกค้า ({customerSites.length} ไซต์):
                    </label>
                    <select
                      value={selectedSiteId}
                      onChange={(e) => {
                        const site = customerSites.find((s: any) => s.id === e.target.value);
                        if (site) handleSelectSite(site);
                      }}
                      style={{ ...iStyle, fontSize: "0.8rem", padding: "0.35rem 0.6rem", background: "var(--bg-secondary)" }}
                    >
                      {customerSites.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.siteName || s.site_name || "สถานที่"} — {s.address || "ไม่ระบุที่อยู่"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>ชื่อลูกค้า *</label><input value={formCustomerName} onChange={e => setFormCustomerName(e.target.value)} placeholder="เช่น คุณสมชาย" style={iStyle} required /></div>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>เบอร์โทร</label><input value={formCustomerPhone} onChange={e => setFormCustomerPhone(e.target.value)} placeholder="08X-XXX-XXXX" style={iStyle} /></div>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>ชื่อ Site</label><input value={formSiteName} onChange={e => setFormSiteName(e.target.value)} placeholder="เช่น บ้านพักซอย 5" style={iStyle} /></div>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>ที่อยู่</label><input value={formSiteAddress} onChange={e => setFormSiteAddress(e.target.value)} placeholder="ที่อยู่ Site" style={iStyle} /></div>
                </div>
              </div>
              <div style={{ marginBottom: "0.85rem", padding: "0.85rem", background: "var(--bg-tertiary)", borderRadius: 10 }}>
                <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase" }}>เงื่อนไขสัญญา</div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.5rem" }}>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>ประเภทงาน *</label><select value={formServiceType} onChange={e => setFormServiceType(e.target.value)} style={iStyle} required>{SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>ทุกกี่เดือน</label><input type="number" min={1} max={24} value={formFrequency} onChange={e => setFormFrequency(parseInt(e.target.value))} style={iStyle} /></div>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>จำนวนรอบ</label><input type="number" min={1} max={52} value={formTotalRounds} onChange={e => setFormTotalRounds(parseInt(e.target.value))} style={iStyle} /></div>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>วันเริ่มต้น *</label><CustomDateInput value={formStartDate} onChange={e => setFormStartDate(e.target.value)} style={iStyle} required /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>วันสิ้นสุด (คำนวณอัตโนมัติ)</label><input value={formStartDate ? formatDate(addMonths(formStartDate, formFrequency * formTotalRounds)) : "—"} readOnly style={{ ...iStyle, color: "var(--text-muted)", background: "var(--bg-secondary)" }} /></div>
                  <div><label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>มูลค่าสัญญารวม (บาท)</label><input value={formContractValue} onChange={e => setFormContractValue(e.target.value)} placeholder="เช่น 12000" style={iStyle} /></div>
                </div>
                {formStartDate && formTotalRounds > 0 && (
                  <div style={{ marginTop: "0.6rem", padding: "0.55rem 0.8rem", background: "rgba(99,102,241,0.08)", borderRadius: 8, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    🗓 จะสร้าง <strong>{formTotalRounds} รอบ</strong> อัตโนมัติ:&nbsp;
                    {Array.from({ length: formTotalRounds }, (_, i) => <span key={i} style={{ marginRight: "0.4rem", background: "var(--bg-tertiary)", padding: "0.08rem 0.35rem", borderRadius: 4, whiteSpace: "nowrap" }}>รอบ {i + 1}: {formatDate(addMonths(formStartDate, formFrequency * i))}</span>)}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: "0.85rem", padding: "0.85rem", background: "var(--bg-tertiary)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>อุปกรณ์ในสัญญา ({formItems.length} รายการ)</div>
                  <button type="button" onClick={() => setFormItems(prev => [...prev, { id: `si_${Date.now()}`, name: `เครื่องที่ ${prev.length + 1}`, brand: "", btu: "", location: "" }])} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", borderRadius: 7, padding: "0.22rem 0.6rem", cursor: "pointer", fontSize: "0.78rem" }}><Plus size={12} /> เพิ่ม</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: 200, overflowY: "auto" }}>
                  {formItems.map((it, idx) => (
                    <div key={it.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 0.8fr 1.5fr auto", gap: "0.35rem", alignItems: "center" }}>
                      <input value={it.name} onChange={e => setFormItems(prev => prev.map(i => i.id === it.id ? { ...i, name: e.target.value } : i))} placeholder={`รายการ ${idx + 1}`} style={{ ...iStyle, fontSize: "0.78rem", padding: "0.35rem 0.55rem" }} />
                      <input value={it.brand || ""} onChange={e => setFormItems(prev => prev.map(i => i.id === it.id ? { ...i, brand: e.target.value } : i))} placeholder="ยี่ห้อ" style={{ ...iStyle, fontSize: "0.78rem", padding: "0.35rem 0.55rem" }} />
                      <input value={it.btu || ""} onChange={e => setFormItems(prev => prev.map(i => i.id === it.id ? { ...i, btu: e.target.value } : i))} placeholder="BTU" style={{ ...iStyle, fontSize: "0.78rem", padding: "0.35rem 0.55rem" }} />
                      <input value={it.location || ""} onChange={e => setFormItems(prev => prev.map(i => i.id === it.id ? { ...i, location: e.target.value } : i))} placeholder="ห้อง/ตำแหน่ง" style={{ ...iStyle, fontSize: "0.78rem", padding: "0.35rem 0.55rem" }} />
                      <button type="button" onClick={() => setFormItems(prev => prev.filter(i => i.id !== it.id))} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#f87171", borderRadius: 6, padding: "0.35rem", cursor: "pointer", display: "flex" }}><X size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: "1.1rem" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>หมายเหตุ</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="ข้อตกลงพิเศษ..." rows={2} style={{ ...iStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "0.7rem", borderRadius: 10, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>ยกเลิก</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "0.7rem", borderRadius: 10, border: "none", background: saving ? "#6b7280" : "var(--accent-primary)", color: "white", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.9rem" }}>
                  {saving ? "⏳ กำลังบันทึก..." : `✅ สร้างสัญญา + ${formTotalRounds} รอบอัตโนมัติ`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChecklistModal && selectedTemplate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 520, border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}><ClipboardList size={17} style={{ marginRight: 6, verticalAlign: "middle" }} />{selectedTemplate.template_name || selectedTemplate.service_type}</h2>
              <button onClick={() => setShowChecklistModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={22} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {(selectedTemplate.checklist_items || []).map((item: any, idx: number) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.65rem", background: "var(--bg-tertiary)", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
                  <div style={{ width: 20, height: 20, border: "2px solid var(--border-color)", borderRadius: 4, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: "0.865rem" }}>{idx + 1}. {item.label}</span>
                  {item.required && <span style={{ fontSize: "0.68rem", color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "0.08rem 0.4rem", borderRadius: 4, fontWeight: 700, whiteSpace: "nowrap" }}>จำเป็น</span>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: "0.85rem", padding: "0.55rem 0.8rem", background: "rgba(16,185,129,0.08)", borderRadius: 8, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              <Wrench size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Checklist นี้ใช้ในขั้นตอน QC ของแต่ละรอบบริการ ช่างต้องทำครบทุกข้อ "จำเป็น"
            </div>
            <button onClick={() => setShowChecklistModal(false)} style={{ width: "100%", marginTop: "1rem", padding: "0.65rem", borderRadius: 10, border: "none", background: "var(--accent-primary)", color: "white", cursor: "pointer", fontWeight: 700 }}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MAContracts;