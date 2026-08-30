import React, { useState, useEffect, useRef } from 'react';
import type { User, QCDailyPlan, QCPlanItem, Project } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Navigation, Calendar, CheckCircle2, Clock, 
  Phone, User as UserIcon, ShieldCheck, ChevronRight, AlertTriangle, 
  RefreshCw, Sparkles, Plus, Trash2, Edit3, ExternalLink, 
  Home, Check, ArrowRight, Car, Compass, Layers, CheckSquare, X,
  LayoutGrid, Lock
} from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';
import { CustomDateInput } from './CustomDateInput';
import { GisMapPickerModal } from './GisMapPickerModal';
import { SiteVisitResultModal } from './SiteVisitResultModal';
import { QCHandoverModal } from './QCHandoverModal';
import { QcBookingModal } from './QcBookingModal';

interface QCDailyPlanProps {
  currentUser: User | null;
  users: User[];
  projects?: Project[];
  branches?: any[];
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

export const QCDailyPlanComponent: React.FC<QCDailyPlanProps> = ({
  currentUser,
  users = [],
  projects = [],
  branches = []
}) => {
  const isMobile = useIsMobile();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedQcId, setSelectedQcId] = useState<string>(() => {
    // If current user is QC or Tech, default to their ID, otherwise find first QC/Tech or first user
    const qcUser = users.find(u => u.globalRole === 'QC' || (u.jobTypes && u.jobTypes.includes('QC')));
    return qcUser ? qcUser.id : (currentUser?.id || (users[0]?.id || ''));
  });

  const [currentPlan, setCurrentPlan] = useState<QCDailyPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Map container & Leaflet instance
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);

  // Modals state
  const [isAddStopModalOpen, setIsAddStopModalOpen] = useState<boolean>(false);
  const [isGisPickerOpen, setIsGisPickerOpen] = useState<boolean>(false);
  const [isOriginPickerOpen, setIsOriginPickerOpen] = useState<boolean>(false);

  // Add Stop Form State
  const [newSiteName, setNewSiteName] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteLat, setNewSiteLat] = useState<number | string>(13.7563);
  const [newSiteLng, setNewSiteLng] = useState<number | string>(100.5018);
  const [newTimeSlot, setNewTimeSlot] = useState('09:00 - 11:00 น.');
  const [newNotes, setNewNotes] = useState('');

  // Selected lead/project for inspection result modals
  const [selectedLeadForVisit, setSelectedLeadForVisit] = useState<any | null>(null);
  const [selectedProjectForHandover, setSelectedProjectForHandover] = useState<Project | null>(null);

  // Check-in status tracking
  const [checkingInItemId, setCheckingInItemId] = useState<string | null>(null);

  // View Mode: 'route_map' (Route TSP map) | 'monitor_dashboard' (QC Team Monitor Grid)
  const [viewMode, setViewMode] = useState<'route_map' | 'monitor_dashboard'>('route_map');
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');
  const [teamSchedule, setTeamSchedule] = useState<any[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);

  // Invalidate map size on mobile tab switch
  useEffect(() => {
    if (mobileTab === 'map' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 150);
    }
  }, [mobileTab]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Filter QC Users
  const qcUsers = users.filter(u => 
    u.globalRole === 'QC' || 
    u.globalRole === 'Employee' || 
    u.globalRole === 'Manager' || 
    (u.jobTypes && u.jobTypes.some(j => j.toLowerCase().includes('qc') || j.toLowerCase().includes('survey')))
  );

  const selectedUserObj = users.find(u => u.id === selectedQcId) || currentUser;

  // Fetch Team Schedule Overview
  const fetchTeamSchedule = async () => {
    setIsScheduleLoading(true);
    try {
      const res = await fetch(`/api/qc-plans/team-schedule?date=${selectedDate}`, {
        headers: { 'X-User-Id': currentUser?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setTeamSchedule(data.teamSchedule || []);
      }
    } catch (err) {
      console.error('Error fetching QC team schedule:', err);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  // Fetch Daily Plan for selected QC and Date
  const fetchPlan = async () => {
    if (!selectedQcId || !selectedDate) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/qc-plans/daily?qcId=${selectedQcId}&date=${selectedDate}`, {
        headers: { 'X-User-Id': currentUser?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCurrentPlan(data[0]);
        } else {
          setCurrentPlan(null);
        }
      }
    } catch (err) {
      console.error('Error fetching QC plan:', err);
      showToast('ไม่สามารถดึงข้อมูลแผนงาน QC ได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
    if (viewMode === 'monitor_dashboard') {
      fetchTeamSchedule();
    }
  }, [selectedQcId, selectedDate, viewMode]);

  // Auto Generate & Optimize Route from Home Origin
  const handleAutoGenerate = async () => {
    if (!selectedQcId || !selectedDate) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/qc-plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({
          qc_id: selectedQcId,
          plan_date: selectedDate,
          auto_fetch_approved: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data);
        showToast(`⚡ จัด Route อัตโนมัติสำเร็จ (${data.items?.length || 0} จุดตรวจ, รวม ${data.totalEstimatedKm} กม.)`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'เกิดข้อผิดพลาดในการคำนวณ Route', 'error');
      }
    } catch (err) {
      console.error('Error generating plan:', err);
      showToast('ไม่สามารถจัดเส้นทางได้', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Check-in on Site with live GPS
  const handleGpsCheckIn = async (item: QCPlanItem) => {
    setCheckingInItemId(item.id);
    if (!navigator.geolocation) {
      alert('อุปกรณ์ของคุณไม่รองรับ Geolocation API');
      setCheckingInItemId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const actualLat = pos.coords.latitude;
        const actualLng = pos.coords.longitude;

        try {
          if (!currentPlan) return;
          const res = await fetch(`/api/qc-plans/${currentPlan.id}/items/${item.id}/check-in`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': currentUser?.id || ''
            },
            body: JSON.stringify({
              actual_lat: actualLat,
              actual_lng: actualLng
            })
          });

          if (res.ok) {
            const data = await res.json();
            const distMsg = data.distanceToSiteMeters ? `(ห่างจากจุดเป้าหมาย ${data.distanceToSiteMeters} ม.)` : '';
            showToast(`✅ เช็คอินสำเร็จ ${distMsg}`, 'success');
            fetchPlan();
          } else {
            showToast('เกิดข้อผิดพลาดในการบันทึก Check-in', 'error');
          }
        } catch (err) {
          console.error('Check-in error:', err);
          showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        } finally {
          setCheckingInItemId(null);
        }
      },
      (err) => {
        console.error('GPS error:', err);
        alert('ไม่สามารถอ่านพิกัด GPS ได้ กรุณาเปิด Location Service: ' + err.message);
        setCheckingInItemId(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Change Item Status (Travelling, Checked In, Completed, Skipped)
  const handleUpdateStatus = async (item: QCPlanItem, newStatus: string) => {
    if (!currentPlan) return;
    try {
      const res = await fetch(`/api/qc-plans/${currentPlan.id}/items/${item.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`ปรับสถานะเป็น "${newStatus}" เรียบร้อย`, 'success');
        fetchPlan();
      }
    } catch (err) {
      console.error('Status update error:', err);
      showToast('ไม่สามารถปรับสถานะได้', 'error');
    }
  };

  // Add Manual Stop
  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan) {
      // Create draft plan first
      await handleAutoGenerate();
    }
    if (!newSiteName.trim()) {
      showToast('กรุณากรอกชื่อสถานที่/ลูกค้า', 'error');
      return;
    }

    try {
      if (!currentPlan) return;
      const res = await fetch(`/api/qc-plans/${currentPlan.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({
          site_name: newSiteName,
          customer_name: newCustomerName,
          customer_phone: newCustomerPhone,
          site_address: newSiteAddress,
          site_latitude: parseFloat(String(newSiteLat)) || 13.7563,
          site_longitude: parseFloat(String(newSiteLng)) || 100.5018,
          time_slot: newTimeSlot,
          notes: newNotes
        })
      });

      if (res.ok) {
        showToast('เพิ่มจุดตรวจเรียบร้อยแล้ว', 'success');
        setIsAddStopModalOpen(false);
        setNewSiteName('');
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewSiteAddress('');
        setNewNotes('');
        fetchPlan();
      }
    } catch (err) {
      console.error('Error adding stop:', err);
      showToast('ไม่สามารถเพิ่มจุดตรวจได้', 'error');
    }
  };

  // Delete Stop
  const handleDeleteStop = async (itemId: string) => {
    if (!currentPlan || !confirm('คุณต้องการลบจุดตรวจนี้ออกจากแผนงานใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/qc-plans/${currentPlan.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser?.id || '' }
      });
      if (res.ok) {
        showToast('ลบจุดตรวจเรียบร้อยแล้ว', 'success');
        fetchPlan();
      }
    } catch (err) {
      console.error('Delete stop error:', err);
      showToast('ไม่สามารถลบจุดตรวจได้', 'error');
    }
  };

  // Open Google Maps Navigation Deep Link
  const openGoogleMapsDirections = (item: QCPlanItem, index: number) => {
    let startLat = currentPlan?.originLatitude || 13.7563;
    let startLng = currentPlan?.originLongitude || 100.5018;

    // If not first item, use previous item coords
    if (index > 0 && currentPlan?.items && currentPlan.items[index - 1]) {
      startLat = currentPlan.items[index - 1].siteLatitude;
      startLng = currentPlan.items[index - 1].siteLongitude;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${item.siteLatitude},${item.siteLongitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Open Full Day Route in Google Maps
  const openFullDayRouteGoogleMaps = () => {
    if (!currentPlan || !currentPlan.items || currentPlan.items.length === 0) return;
    const origin = `${currentPlan.originLatitude},${currentPlan.originLongitude}`;
    const destination = `${currentPlan.items[currentPlan.items.length - 1].siteLatitude},${currentPlan.items[currentPlan.items.length - 1].siteLongitude}`;
    
    // Waypoints for intermediate stops
    const waypoints = currentPlan.items
      .slice(0, -1)
      .map(it => `${it.siteLatitude},${it.siteLongitude}`)
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    window.open(url, '_blank');
  };

  // Initialize and Update Leaflet Route Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([13.7563, 100.5018], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }

    const bounds: [number, number][] = [];

    // 1. Origin Marker (Home 🏠)
    const originLat = currentPlan?.originLatitude || selectedUserObj?.homeLatitude || 13.7563;
    const originLng = currentPlan?.originLongitude || selectedUserObj?.homeLongitude || 100.5018;
    const originAddress = currentPlan?.originAddress || selectedUserObj?.homeAddress || 'บ้านพนักงาน (Origin)';

    const homeIcon = L.divIcon({
      className: 'qc-origin-icon',
      html: `
        <div style="background: #10b981; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); font-weight: bold; font-size: 16px;">
          🏠
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });

    const originMarker = L.marker([Number(originLat), Number(originLng)], { icon: homeIcon })
      .bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #059669; font-size: 14px;">🏠 จุดเริ่มต้น (Origin Point)</strong>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">${originAddress}</p>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">(${Number(originLat).toFixed(4)}, ${Number(originLng).toFixed(4)})</div>
        </div>
      `);
    markersLayer.addLayer(originMarker);
    bounds.push([Number(originLat), Number(originLng)]);

    // 2. Site Markers (1, 2, 3...)
    const routeCoords: [number, number][] = [[Number(originLat), Number(originLng)]];

    if (currentPlan && currentPlan.items && currentPlan.items.length > 0) {
      currentPlan.items.forEach((item, idx) => {
        const lat = Number(item.siteLatitude);
        const lng = Number(item.siteLongitude);
        if (isNaN(lat) || isNaN(lng)) return;

        routeCoords.push([lat, lng]);
        bounds.push([lat, lng]);

        const statusBg = 
          item.status === 'Completed' ? '#10b981' :
          item.status === 'Checked In' ? '#06b6d4' :
          item.status === 'Travelling' ? '#f59e0b' : '#3b82f6';

        const pinIcon = L.divIcon({
          className: 'qc-site-icon',
          html: `
            <div style="background: ${statusBg}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); font-weight: 800; font-size: 13px;">
              ${item.sequenceOrder}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        const marker = L.marker([lat, lng], { icon: pinIcon })
          .bindPopup(`
            <div style="font-family: sans-serif; min-width: 180px;">
              <div style="font-size: 11px; font-weight: 700; color: ${statusBg};">ลำดับที่ ${item.sequenceOrder} (${item.timeSlot || '-'})</div>
              <strong style="font-size: 13px; color: #1e293b; display: block; margin: 2px 0;">${item.siteName}</strong>
              <p style="margin: 2px 0; font-size: 11px; color: #64748b;">${item.siteAddress || 'ไม่มีที่อยู่'}</p>
              ${item.customerPhone ? `<div style="font-size: 11px; margin-top: 4px;">📞 ${item.customerPhone}</div>` : ''}
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #0f766e; font-weight: 600;">
                🚗 ${item.estimatedDistanceFromPrevKm || 0} กม. จากจุดก่อนหน้า
              </div>
            </div>
          `);
        markersLayer.addLayer(marker);
      });

      // 3. Draw Polyline Route
      if (routeCoords.length > 1) {
        polylineLayerRef.current = L.polyline(routeCoords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8,
          dashArray: '6, 8',
          lineCap: 'round'
        }).addTo(map);
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 });
    }
  }, [currentPlan, selectedUserObj]);

  return (
    <div style={{ padding: '1.25rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          background: toast.type === 'success' ? '#059669' : '#dc2626',
          color: 'white',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* 📱 MOBILE FIELD OPS HEADER (Only on mobile screens) */}
      {isMobile ? (
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #e5e7eb)',
          padding: '0.85rem',
          marginBottom: '0.85rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          {/* Top Line: Date Navigation Strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Navigation size={15} />
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                แผนตรวจ QC
              </span>
            </div>

            {/* Date Pills */}
            <div style={{ display: 'flex', background: 'var(--bg-tertiary, #f1f5f9)', padding: '2px', borderRadius: '8px', gap: '2px' }}>
              <button
                type="button"
                onClick={() => {
                  const yest = new Date(selectedDate);
                  yest.setDate(yest.getDate() - 1);
                  setSelectedDate(yest.toISOString().split('T')[0]);
                }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'transparent', fontSize: '0.72rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedDate === todayStr ? '#2563eb' : 'transparent',
                  color: selectedDate === todayStr ? 'white' : 'var(--text-primary)',
                  fontWeight: selectedDate === todayStr ? 700 : 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {selectedDate === todayStr ? 'วันนี้' : formatToDDMMYYYY(selectedDate)}
              </button>
              <button
                type="button"
                onClick={() => {
                  const tom = new Date(selectedDate);
                  tom.setDate(tom.getDate() + 1);
                  setSelectedDate(tom.toISOString().split('T')[0]);
                }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'transparent', fontSize: '0.72rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ▶
              </button>
            </div>
          </div>

          {/* QC Selector & Quick Stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: 'var(--bg-tertiary, #f8fafc)', padding: '0.4rem 0.65rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
              <UserIcon size={15} color="#2563eb" style={{ flexShrink: 0 }} />
              <select
                value={selectedQcId}
                onChange={e => setSelectedQcId(e.target.value)}
                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
              >
                {qcUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0d9488', whiteSpace: 'nowrap' }}>
              🚗 {currentPlan?.items?.length || 0} จุด ({Number(currentPlan?.totalEstimatedKm || 0).toFixed(1)} กม.)
            </div>
          </div>

          {/* Quick Action Bar for Mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.45rem' }}>
            <button
              type="button"
              disabled={isGenerating || isLoading}
              onClick={handleAutoGenerate}
              style={{
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: 'white',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
              }}
            >
              {isGenerating ? <RefreshCw size={13} className="spin" /> : <Sparkles size={13} />}
              {isGenerating ? 'จัดเส้นทาง...' : '⚡ จัด Route อัตโนมัติ'}
            </button>
            <button
              type="button"
              onClick={() => setIsAddStopModalOpen(true)}
              style={{
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                background: 'var(--bg-tertiary, #f1f5f9)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Plus size={13} /> เพิ่มจุดตรวจ
            </button>
          </div>
        </div>
      ) : (
        /* 🖥️ DESKTOP HEADER & FILTER BAR */
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #e5e7eb)',
          padding: '1.25rem',
          marginBottom: '1.25rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Navigation size={20} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    แผนงานและเส้นทาง QC ประจำวัน (Daily QC Plan)
                  </h1>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    เริ่มเดินทางจากบ้านพนักงาน (Origin) สู่หน้างานตามลำดับเส้นทางที่ประหยัดเวลาที่สุด
                  </p>
                </div>
              </div>
            </div>

            {/* CONTROLS: DATE & QC SELECTOR */}
            <div className="qc-toolbar-controls" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
              {/* ROW 1: VIEW MODE SWITCHER */}
              <div className="qc-full-mobile" style={{ display: 'flex', background: 'var(--bg-tertiary, #f1f5f9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('route_map')}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'route_map' ? '#2563eb' : 'transparent',
                    color: viewMode === 'route_map' ? 'white' : 'var(--text-secondary)',
                    fontWeight: viewMode === 'route_map' ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <Navigation size={13} /> 🗺️ แผนที่เส้นทาง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('monitor_dashboard');
                    fetchTeamSchedule();
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'monitor_dashboard' ? '#059669' : 'transparent',
                    color: viewMode === 'monitor_dashboard' ? 'white' : 'var(--text-secondary)',
                    fontWeight: viewMode === 'monitor_dashboard' ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <LayoutGrid size={13} /> 📊 Monitor ตารางงาน QC
                </button>
              </div>

              {/* ROW 2: DATE PILLS & DATE PICKER */}
              <div className="qc-full-mobile" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                {/* Quick Date Pills */}
                <div style={{ display: 'flex', background: 'var(--bg-tertiary, #f1f5f9)', padding: '3px', borderRadius: '8px', flex: 1, minWidth: '180px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const yest = new Date();
                      yest.setDate(yest.getDate() - 1);
                      setSelectedDate(yest.toISOString().split('T')[0]);
                    }}
                    style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'transparent', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    เมื่อวาน
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    style={{
                      flex: 1,
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: selectedDate === todayStr ? '#2563eb' : 'transparent',
                      color: selectedDate === todayStr ? 'white' : 'var(--text-secondary)',
                      fontWeight: selectedDate === todayStr ? 700 : 400,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    วันนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tom = new Date();
                      tom.setDate(tom.getDate() + 1);
                      setSelectedDate(tom.toISOString().split('T')[0]);
                    }}
                    style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'transparent', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    พรุ่งนี้
                  </button>
                </div>

                {/* Date Picker Input (DD/MM/YYYY) */}
                <div style={{ flex: 1, minWidth: '130px' }}>
                  <CustomDateInput
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      background: 'var(--bg-tertiary, #f8fafc)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* ROW 3: QC SELECTOR */}
              <div className="qc-full-mobile" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary, #f8fafc)', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <UserIcon size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <select
                  value={selectedQcId}
                  onChange={e => setSelectedQcId(e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                >
                  {qcUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.globalRole || 'QC'})
                    </option>
                  ))}
                </select>
              </div>

              {/* ROW 4: BOOK QC BUTTON */}
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(true)}
                className="qc-full-mobile"
                style={{
                  padding: '0.6rem 0.95rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                <Sparkles size={15} /> 🔍 จองคิว QC / ล็อกสล็อต
              </button>

              {/* ROW 5: ROUTE ACTIONS GRID */}
              {viewMode === 'route_map' && (
                <div className="qc-grid-2-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                  <button
                    type="button"
                    disabled={isGenerating || isLoading}
                    onClick={handleAutoGenerate}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                      color: 'white',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                      opacity: isGenerating ? 0.7 : 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isGenerating ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                    {isGenerating ? 'กำลังจัดเส้นทาง...' : '⚡ จัด Route อัตโนมัติ'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddStopModalOpen(true)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary, #f1f5f9)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={14} /> เพิ่มจุดตรวจ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'monitor_dashboard' ? (
        /* QC TEAM SCHEDULE MONITOR DASHBOARD VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPI Workload Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserIcon size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>เจ้าหน้าที่ QC ทั้งหมด</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{teamSchedule.length} ท่าน</div>
              </div>
            </div>

            <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>คิวงานที่จองแล้ว ({formatToDDMMYYYY(selectedDate)})</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ea580c' }}>
                  {teamSchedule.reduce((acc, u) => acc + (u.totalBooked || 0), 0)} คิว
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>คิวว่างพร้อมรับงาน</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669' }}>
                  {teamSchedule.reduce((acc, u) => acc + ((u.totalSlots || 4) - (u.totalBooked || 0)), 0)} คิว
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>เจ้าหน้าที่คิวเต็ม</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626' }}>
                  {teamSchedule.filter(u => u.isFullyBooked).length} ท่าน
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Matrix Table */}
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.25rem', overflowX: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LayoutGrid size={18} color="#059669" /> ตารางมอนิเตอร์ตารางงานทีม QC ประจำวันที่ {formatToDDMMYYYY(selectedDate)}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  แสดงสถานะคิวงานแบบแบ่งรอบเวลา (Slot) เพื่อให้ผู้จัดการและทีมขายตรวจสอบความพร้อมก่อนจองคิว
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={fetchTeamSchedule}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <RefreshCw size={12} className={isScheduleLoading ? 'spin' : ''} /> รีเฟรชตาราง
                </button>
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(true)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Sparkles size={12} /> + จองคิว QC
                </button>
              </div>
            </div>

            {isScheduleLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                กำลังโหลดตารางงานทีม QC...
              </div>
            ) : teamSchedule.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                ไม่พบข้อมูลเจ้าหน้าที่ QC
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '950px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', width: '200px' }}>
                      เจ้าหน้าที่ QC
                    </th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#1e40af', width: '20%' }}>
                      ☀️ ช่วงเช้า 1 (09:00 - 11:00)
                    </th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#0284c7', width: '20%' }}>
                      🍲 ช่วงเที่ยง (11:30 - 13:30)
                    </th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#ea580c', width: '20%' }}>
                      🌤️ ช่วงบ่าย (14:00 - 16:00)
                    </th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: '#7c3aed', width: '20%' }}>
                      🌆 ช่วงเย็น (16:30 - 18:30)
                    </th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', width: '120px' }}>
                      แผนที่ / จัด Route
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamSchedule.map((userSchedule, rowIdx) => (
                    <tr key={userSchedule.qcId} style={{ borderBottom: '1px solid var(--border-color)', background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: '#2563eb',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {userSchedule.qcName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                              {userSchedule.qcName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              แผนก {userSchedule.department || 'QC'} • {userSchedule.globalRole || 'Employee'}
                            </div>
                            <div style={{ marginTop: '0.2rem' }}>
                              {userSchedule.isFullyBooked ? (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', background: 'rgba(239, 68, 68, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                  🔒 คิวเต็ม (4/4)
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#059669', background: 'rgba(16, 185, 129, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                  ว่าง {userSchedule.totalSlots - userSchedule.totalBooked} คิว
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4 Time Slots */}
                      {userSchedule.slots.map((s: any) => (
                        <td key={s.slot} style={{ padding: '0.6rem', verticalAlign: 'top' }}>
                          {s.isBooked ? (
                            <div style={{
                              background: 'rgba(234, 88, 12, 0.07)',
                              border: '1px solid rgba(234, 88, 12, 0.25)',
                              borderRadius: '8px',
                              padding: '0.6rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <Lock size={11} /> ติดงาน
                                </span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                                  {s.booking?.status || 'นัดหมาย'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.booking?.customerName || s.booking?.title}
                              </div>
                              {s.booking?.customerPhone && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                  📞 {s.booking.customerPhone}
                                </div>
                              )}
                              {s.booking?.siteAddress && (
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.booking.siteAddress}>
                                  📍 {s.booking.siteAddress}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setSelectedQcId(userSchedule.qcId);
                                setIsBookingModalOpen(true);
                              }}
                              style={{
                                border: '1px dashed rgba(16, 185, 129, 0.4)',
                                background: 'rgba(16, 185, 129, 0.03)',
                                borderRadius: '8px',
                                padding: '0.85rem 0.5rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              className="hover-card"
                              title="คลิกเพื่อจองคิวนี้"
                            >
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                🟢 ว่าง
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                + คลิกจองคิว
                              </div>
                            </div>
                          )}
                        </td>
                      ))}

                      {/* Action: Open Map / TSP for this QC */}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQcId(userSchedule.qcId);
                            setViewMode('route_map');
                          }}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            background: 'rgba(37, 99, 235, 0.1)',
                            border: '1px solid rgba(37, 99, 235, 0.3)',
                            color: '#2563eb',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Navigation size={12} /> ดูแผนที่ Route
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* ROUTE MAP VIEW (ORIGINAL CONTENT) */
        <>
          {/* ORIGIN BANNER & SUMMARY METRICS */}
          <div className="qc-summary-grid">
        {/* 🏠 Origin Home Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.15))',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '14px',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#10b981',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.35)'
          }}>
            🏠
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                จุดเริ่มต้นประจำวัน (ORIGIN)
              </span>
              <button
                onClick={() => setIsOriginPickerOpen(true)}
                style={{ border: 'none', background: 'transparent', color: '#047857', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                ปรับเปลี่ยนจุด
              </button>
            </div>
            <div style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {selectedUserObj?.name || 'QC Inspector'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.3' }}>
              {currentPlan?.originAddress || selectedUserObj?.homeAddress || 'ยังไม่ได้ระบุที่อยู่บ้าน (ใช้พิกัดเริ่มต้นศูนย์กลาง กทม.)'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.725rem', color: '#065f46', marginTop: '6px', fontWeight: 600 }}>
              <MapPin size={11} /> พิกัด: {Number(currentPlan?.originLatitude || selectedUserObj?.homeLatitude || 13.7563).toFixed(4)}, {Number(currentPlan?.originLongitude || selectedUserObj?.homeLongitude || 100.5018).toFixed(4)}
            </div>
          </div>
        </div>

        {/* 📊 Summary Metrics Card */}
        <div style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: '14px',
          padding: '0.85rem 0.5rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{ padding: '0 0.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>จำนวนจุดตรวจ</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
              {currentPlan?.items?.length || 0} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>จุด</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>
              สำเร็จ {currentPlan?.items?.filter(i => i.status === 'Completed').length || 0} / {currentPlan?.items?.length || 0}
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-color, #e5e7eb)', borderRight: '1px solid var(--border-color, #e5e7eb)', padding: '0 0.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ระยะทางรวม</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d9488', marginTop: '2px' }}>
              {Number(currentPlan?.totalEstimatedKm || 0).toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>กม.</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>จาก Origin</div>
          </div>

          <div style={{ padding: '0 0.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>เวลาประเมินรวม</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              {currentPlan?.totalEstimatedDurationMin ? `~${Math.round(currentPlan.totalEstimatedDurationMin / 60)} ชม.` : '0 ชม.'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>เดินทาง+ตรวจ</div>
          </div>
        </div>

        {/* 🗺️ Global Navigation Button Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
          borderRadius: '14px',
          padding: '0.85rem 1rem',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>นำทางทั้งวันแบบ Turn-by-Turn</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '2px 0 6px 0' }}>เปิด Google Maps ทั้ง Route</div>
          <button
            type="button"
            onClick={openFullDayRouteGoogleMaps}
            disabled={!currentPlan?.items || currentPlan.items.length === 0}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              background: 'white',
              color: '#1e40af',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: currentPlan?.items?.length ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: currentPlan?.items?.length ? 1 : 0.6
            }}
          >
            <Compass size={15} /> นำทางทั้งวัน (Google Maps)
          </button>
        </div>
      </div>

      {/* MOBILE SEGMENTED VIEW SWITCHER (Only visible on mobile screens) */}
      <div className="qc-mobile-view-tabs" style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'var(--bg-tertiary, #e2e8f0)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #cbd5e1)'
        }}>
          <button
            type="button"
            onClick={() => setMobileTab('list')}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: mobileTab === 'list' ? 'var(--card-bg, #ffffff)' : 'transparent',
              color: mobileTab === 'list' ? '#2563eb' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: mobileTab === 'list' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <CheckSquare size={16} /> 📋 รายการตรวจ ({currentPlan?.items?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('map')}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: mobileTab === 'map' ? 'var(--card-bg, #ffffff)' : 'transparent',
              color: mobileTab === 'map' ? '#2563eb' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: mobileTab === 'map' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Navigation size={16} /> 🗺️ แผนที่เส้นทาง
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN VIEW: MAP ON LEFT/TOP, TIMELINE CARDS ON RIGHT */}
      <div className="qc-main-grid">
        {/* LEFT COLUMN: INTERACTIVE ROUTE MAP */}
        <div 
          className={`qc-map-column ${mobileTab === 'list' ? 'qc-column-hide-mobile' : ''}`}
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e5e7eb)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            height: '620px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Layers size={17} color="#2563eb" /> แผนที่เส้นทางการเดินทาง (Route GIS Map)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              🟢 บ้าน $\to$ 🔵 Site 1, 2, 3...
            </div>
          </div>

          <div
            ref={mapContainerRef}
            style={{
              flex: 1,
              width: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border-color, #e2e8f0)',
              zIndex: 1
            }}
          />
        </div>

        {/* RIGHT COLUMN: SITE STOPS TIMELINE & ACTION CARDS */}
        <div 
          className={`qc-list-column ${mobileTab === 'map' ? 'qc-column-hide-mobile' : ''}`}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              ลำดับการเข้าตรวจประจำวัน ({currentPlan?.items?.length || 0} รายการ)
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {selectedDate ? formatToDDMMYYYY(selectedDate) : ''}
            </span>
          </div>

          {/* Empty State */}
          {(!currentPlan || !currentPlan.items || currentPlan.items.length === 0) && (
            <div style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '16px',
              border: '2px dashed var(--border-color, #cbd5e1)',
              padding: '3rem 1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <Navigation size={28} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>ยังไม่มีรายการแผนงานในวันนี้</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', maxWidth: '360px', margin: '0 auto 1.25rem auto' }}>
                กดปุ่ม "จัด Route อัตโนมัติ" เพื่อดึงนัดหมายที่ GM อนุมัติแล้วมาคำนวณเส้นทางจากบ้าน หรือกด "เพิ่มจุดตรวจ" ด้วยตนเอง
              </p>
              <button
                type="button"
                onClick={handleAutoGenerate}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={15} /> ดึงนัดหมาย GM Approve & จัด Route
              </button>
            </div>
          )}

          {/* List of Site Cards */}
          {currentPlan?.items?.map((item, index) => {
            const nextActiveStopId = currentPlan?.items?.find(it => it.status !== 'Completed')?.id;
            const isNextActive = item.id === nextActiveStopId && item.status !== 'Completed';
            const isFirst = index === 0;
            const isCompleted = item.status === 'Completed';
            const isCheckedIn = item.status === 'Checked In';
            const isTravelling = item.status === 'Travelling';

            const statusColor = 
              isCompleted ? '#059669' :
              isCheckedIn ? '#0891b2' :
              isTravelling ? '#d97706' : '#2563eb';

            const statusBg = 
              isCompleted ? 'rgba(16, 185, 129, 0.1)' :
              isCheckedIn ? 'rgba(6, 182, 212, 0.1)' :
              isTravelling ? 'rgba(245, 158, 11, 0.1)' : 'rgba(37, 99, 235, 0.1)';

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  borderRadius: '14px',
                  border: isNextActive 
                    ? '2px solid #2563eb' 
                    : isCheckedIn 
                      ? '2px solid #06b6d4' 
                      : '1px solid var(--border-color, #e5e7eb)',
                  padding: '1.15rem',
                  boxShadow: isNextActive ? '0 4px 20px rgba(37, 99, 235, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                  position: 'relative',
                  marginTop: isNextActive ? '0.75rem' : '0',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* NEXT STOP ACTIVE BADGE */}
                {isNextActive && (
                  <div style={{
                    position: 'absolute',
                    top: '-11px',
                    left: '14px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: 'white',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.3px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 2
                  }}>
                    <Sparkles size={11} /> 🎯 จุดตรวจถัดไป (NEXT STOP)
                  </div>
                )}
                {/* TOP BAR: ORDER BADGE, TIME SLOT, STATUS, DELETE */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: statusColor,
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.sequenceOrder}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      <Clock size={13} /> {item.timeSlot || '09:00 - 11:00 น.'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      background: statusBg,
                      color: statusColor,
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {item.status}
                    </span>
                    <button
                      onClick={() => handleDeleteStop(item.id)}
                      title="ลบจุดตรวจ"
                      style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* SITE / CUSTOMER TITLE */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {item.siteName}
                  </div>
                  {item.customerName && item.customerName !== item.siteName && (
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                      ลูกค้า: <strong>{item.customerName}</strong>
                    </div>
                  )}
                </div>

                {/* ADDRESS & DISTANCE BADGE */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <MapPin size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{item.siteAddress || 'ไม่ระบุที่อยู่ละเอียด (ใช้พิกัดแผนที่)'}</span>
                </div>

                {/* DISTANCE FROM PREVIOUS STOP */}
                <div style={{
                  background: 'var(--bg-tertiary, #f8fafc)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem',
                  fontSize: '0.775rem'
                }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Car size={14} color="#0d9488" /> 
                    {isFirst ? 'ระยะทางจากบ้าน (Origin):' : `ระยะทางจากจุดที่ ${index}:`}
                  </span>
                  <strong style={{ color: '#0d9488', fontWeight: 700 }}>
                    🚗 {item.estimatedDistanceFromPrevKm || 0} กม. (~{item.estimatedDurationMin || 15} นาที)
                  </strong>
                </div>

                {/* ACTION BUTTONS BAR (MOBILE-OPTIMIZED) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  {/* 1. GOOGLE MAPS NAVIGATION */}
                  <button
                    type="button"
                    onClick={() => openGoogleMapsDirections(item, index)}
                    style={{
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: 'white',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Compass size={14} /> นำทาง (Map)
                  </button>

                  {/* 2. GPS CHECK-IN BUTTON */}
                  <button
                    type="button"
                    disabled={checkingInItemId === item.id || isCompleted}
                    onClick={() => handleGpsCheckIn(item)}
                    style={{
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      background: isCheckedIn ? '#0891b2' : 'linear-gradient(135deg, #0d9488, #059669)',
                      color: 'white',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    {checkingInItemId === item.id ? (
                      <RefreshCw size={14} className="spin" />
                    ) : (
                      <MapPin size={14} />
                    )}
                    {isCheckedIn ? 'เช็คอินแล้ว ✓' : 'Check-in (GPS)'}
                  </button>

                  {/* 3. QC INSPECTION / STATUS ACTION */}
                  <button
                    type="button"
                    onClick={() => {
                      if (item.leadId) {
                        setSelectedLeadForVisit({
                          id: item.leadId,
                          customer_name: item.customerName || item.siteName,
                          customer_phone: item.customerPhone,
                          customer_address: item.siteAddress
                        });
                      } else if (item.projectId) {
                        const pr = projects.find(p => p.id === item.projectId) || {
                          id: item.projectId,
                          name: item.siteName,
                          customerName: item.customerName,
                          status: 'QC'
                        } as any;
                        setSelectedProjectForHandover(pr);
                      } else {
                        handleUpdateStatus(item, item.status === 'Completed' ? 'Pending' : 'Completed');
                      }
                    }}
                    style={{
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      background: isCompleted ? '#e2e8f0' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                      color: isCompleted ? '#475569' : 'white',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckSquare size={14} /> {isCompleted ? 'ผล QC ✓' : 'ตรวจ QC'}
                  </button>
                </div>

                {/* PHONE CALL SHORTCUT IF AVAILABLE */}
                {item.customerPhone && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color, #f1f5f9)', paddingTop: '0.5rem' }}>
                    <a
                      href={`tel:${item.customerPhone}`}
                      style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                    >
                      <Phone size={13} /> โทรหาลูกค้า: {item.customerPhone}
                    </a>
                    {item.checkInTime && (
                      <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                        เช็คอินเวลา: {new Date(item.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {/* MODAL 1: ADD MANUAL STOP */}
      {isAddStopModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-color, #e5e7eb)', width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                ➕ เพิ่มจุดตรวจ / Site งานในแผนประจำวัน
              </h3>
              <button onClick={() => setIsAddStopModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddStop}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>ชื่อโครงการ / ชื่อสถานที่ *</label>
                <input
                  type="text"
                  required
                  value={newSiteName}
                  onChange={e => setNewSiteName(e.target.value)}
                  placeholder="เช่น ตรวจสอบบ้านคุณสมชาย (บางนา)"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>ชื่อลูกค้า</label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    placeholder="เช่น คุณสมชาย"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>เบอร์โทรติดต่อ</label>
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={e => setNewCustomerPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>ที่อยู่หน้างาน</label>
                <input
                  type="text"
                  value={newSiteAddress}
                  onChange={e => setNewSiteAddress(e.target.value)}
                  placeholder="เช่น 88/12 ซ.สุขุมวิท 105 แขวงบางนา กทม."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              {/* GIS LAT LNG PICKER */}
              <div style={{ marginBottom: '0.85rem', background: 'var(--bg-tertiary, #f8fafc)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>พิกัด GPS หน้างาน</span>
                  <button
                    type="button"
                    onClick={() => setIsGisPickerOpen(true)}
                    style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#0284c7', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <MapPin size={12} /> ปักหมุดแผนที่
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="any"
                    value={newSiteLat}
                    onChange={e => setNewSiteLat(e.target.value)}
                    placeholder="Lat"
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    step="any"
                    value={newSiteLng}
                    onChange={e => setNewSiteLng(e.target.value)}
                    placeholder="Lng"
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddStopModalOpen(false)}
                  style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.3rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  บันทึกจุดตรวจ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GIS PICKER FOR NEW STOP */}
      <GisMapPickerModal
        isOpen={isGisPickerOpen}
        onClose={() => setIsGisPickerOpen(false)}
        initialLat={newSiteLat || 13.7563}
        initialLng={newSiteLng || 100.5018}
        initialAddress={newSiteAddress}
        onSelectLocation={(lat, lng, address) => {
          setNewSiteLat(lat);
          setNewSiteLng(lng);
          if (address) setNewSiteAddress(address);
          setIsGisPickerOpen(false);
          showToast('ปักหมุดสำเร็จ', 'success');
        }}
      />

      {/* MODAL 3: GIS PICKER FOR OVERRIDING ORIGIN */}
      <GisMapPickerModal
        isOpen={isOriginPickerOpen}
        onClose={() => setIsOriginPickerOpen(false)}
        initialLat={currentPlan?.originLatitude || selectedUserObj?.homeLatitude || 13.7563}
        initialLng={currentPlan?.originLongitude || selectedUserObj?.homeLongitude || 100.5018}
        initialAddress={currentPlan?.originAddress || selectedUserObj?.homeAddress}
        onSelectLocation={async (lat, lng, address) => {
          setIsOriginPickerOpen(false);
          if (currentPlan) {
            try {
              await fetch(`/api/qc-plans/${currentPlan.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
                body: JSON.stringify({
                  origin_latitude: parseFloat(lat),
                  origin_longitude: parseFloat(lng),
                  origin_address: address || 'จุดเริ่มต้นที่กำหนดเอง'
                })
              });
              showToast('ปรับจุด Origin เรียบร้อยแล้ว (กำลังคำนวณ Route ใหม่...)', 'success');
              handleAutoGenerate();
            } catch (err) {
              console.error('Origin override error:', err);
            }
          }
        }}
      />

      {/* MODAL 4: SITE VISIT RESULT MODAL */}
      {selectedLeadForVisit && (
        <SiteVisitResultModal
          isOpen={Boolean(selectedLeadForVisit)}
          onClose={() => {
            setSelectedLeadForVisit(null);
            fetchPlan();
          }}
          lead={selectedLeadForVisit}
          currentUser={currentUser}
          users={users}
          onSaved={() => {
            setSelectedLeadForVisit(null);
            fetchPlan();
          }}
        />
      )}

      {/* MODAL 5: QC HANDOVER / INSPECTION MODAL */}
      {selectedProjectForHandover && (
        <QCHandoverModal
          isOpen={Boolean(selectedProjectForHandover)}
          onClose={() => {
            setSelectedProjectForHandover(null);
            fetchPlan();
          }}
          project={selectedProjectForHandover}
          currentUser={currentUser}
          users={users}
        />
      )}

      {/* MODAL 6: QC BOOKING & SLOT LOCK MODAL */}
      <QcBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          fetchTeamSchedule();
          fetchPlan();
        }}
        initialDate={selectedDate}
        currentAssigneeName={selectedUserObj?.name}
        onSelectBooking={async ({ qcId, date, timeSlot }) => {
          setSelectedDate(date);
          setSelectedQcId(qcId);
          setIsBookingModalOpen(false);
          showToast(`✅ จองคิว QC เรียบร้อย: ${date} (${timeSlot})`, 'success');
          fetchTeamSchedule();
          fetchPlan();
        }}
      />
    </div>
  );
};
