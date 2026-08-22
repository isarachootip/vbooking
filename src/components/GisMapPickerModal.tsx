import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Compass, Check, X, Navigation } from 'lucide-react';

interface GisMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: string | number | null;
  initialLng?: string | number | null;
  initialAddress?: string;
  onSelectLocation: (lat: string, lng: string, address?: string) => void;
}

export function formatToDMS(val: number | string, isLat: boolean): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  const abs = Math.abs(num);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  const dir = isLat ? (num >= 0 ? 'N' : 'S') : (num >= 0 ? 'E' : 'W');
  return `${deg}°${min}'${sec}"${dir}`;
}

export const GisMapPickerModal: React.FC<GisMapPickerModalProps> = ({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  initialAddress,
  onSelectLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const defaultLat = 13.7563;
  const defaultLng = 100.5018;

  const [currentLat, setCurrentLat] = useState<number>(
    initialLat && !isNaN(Number(initialLat)) ? Number(initialLat) : defaultLat
  );
  const [currentLng, setCurrentLng] = useState<number>(
    initialLng && !isNaN(Number(initialLng)) ? Number(initialLng) : defaultLng
  );
  const [currentAddress, setCurrentAddress] = useState<string>(initialAddress || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Custom Pin Icon using SVG to avoid missing asset paths
  const customPinIcon = L.divIcon({
    className: 'gis-marker-pin',
    html: `
      <div style="position: relative; width: 36px; height: 46px; transform: translate(-50%, -100%); cursor: grab;">
        <svg viewBox="0 0 24 24" width="36" height="46" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.45));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
          <circle cx="12" cy="9" r="3" fill="#ffffff" stroke="none"></circle>
        </svg>
        <div style="position: absolute; bottom: 0; left: 50%; width: 10px; height: 5px; background: rgba(0,0,0,0.3); border-radius: 50%; transform: translateX(-50%); filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  });

  // Reverse geocode lat/lng
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&accept-language=th`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setCurrentAddress(data.display_name);
        }
      }
    } catch (e) {
      console.error('Reverse geocoding error:', e);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Initialize and update map
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const lat = initialLat && !isNaN(Number(initialLat)) ? Number(initialLat) : defaultLat;
    const lng = initialLng && !isNaN(Number(initialLng)) ? Number(initialLng) : defaultLng;
    const hasInitialCoords = Boolean(initialLat && initialLng && !isNaN(Number(initialLat)) && !isNaN(Number(initialLng)));

    setCurrentLat(lat);
    setCurrentLng(lng);
    setCurrentAddress(initialAddress || '');
    setSearchResults([]);
    setSearchQuery('');

    // Wait for DOM to render modal
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error(e);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: hasInitialCoords ? 16 : 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        icon: customPinIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCurrentLat(pos.lat);
        setCurrentLng(pos.lng);
        reverseGeocode(pos.lat, pos.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        setCurrentLat(clickLat);
        setCurrentLng(clickLng);
        reverseGeocode(clickLat, clickLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Force recalculation of container size at multiple intervals
      map.invalidateSize();
      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 150);
      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 400);

      if (hasInitialCoords && !initialAddress) {
        reverseGeocode(lat, lng);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error(e);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error(e);
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&countrycodes=th&accept-language=th&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch (err) {
      console.error('Search location error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setCurrentLat(lat);
    setCurrentLng(lng);
    setCurrentAddress(result.display_name);
    setSearchResults([]);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17);
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  const handleCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับ Geolocation');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        setIsLocating(false);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
          markerRef.current.setLatLng([lat, lng]);
        }
        reverseGeocode(lat, lng);
      },
      (err) => {
        console.error(err);
        alert('ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาอนุญาตสิทธิ์ Location ในเบราว์เซอร์');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = async () => {
    let finalAddress = currentAddress;
    if (!finalAddress) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat.toFixed(6)}&lon=${currentLng.toFixed(6)}&accept-language=th`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            finalAddress = data.display_name;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    onSelectLocation(currentLat.toFixed(6), currentLng.toFixed(6), finalAddress);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary, #ffffff)',
          color: 'var(--text-primary, #1e293b)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          height: '88vh',
          maxHeight: '750px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-primary, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                background: '#eab308',
                color: 'white',
                padding: '0.4rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                📍 ปักหมุดพิกัดสถานที่ติดตั้ง (OpenStreetMap Free GIS)
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, #64748b)',
              padding: '0.4rem',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* SEARCH & ACTION TOOLBAR */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            background: 'var(--bg-secondary, #ffffff)',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <form
            onSubmit={handleSearch}
            style={{ flex: 1, display: 'flex', gap: '0.5rem', position: 'relative' }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="พิมพ์ชื่อสถานที่/หมู่บ้าน/ถนนค้นหา เช่น สุขุมวิท 101, หางดง เชียงใหม่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem 0.55rem 2.2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--bg-tertiary, #f1f5f9)',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94a3b8)',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              style={{
                background: '#eab308',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(234, 179, 8, 0.3)',
              }}
            >
              <Search size={15} /> {isSearching ? 'กำลังค้นหา...' : 'ค้นหาฟรี'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleCurrentGPS}
            disabled={isLocating}
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
            }}
          >
            <Compass size={16} /> {isLocating ? 'กำลังดึง GPS...' : 'พิกัดปัจจุบัน'}
          </button>

          {/* SEARCH RESULTS DROPDOWN */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '1.25rem',
                right: '1.25rem',
                background: 'var(--bg-secondary, #ffffff)',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '8px',
                marginTop: '4px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                maxHeight: '220px',
                overflowY: 'auto',
                zIndex: 20,
              }}
            >
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(res)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderBottom: idx < searchResults.length - 1 ? '1px solid var(--border-color, #f1f5f9)' : 'none',
                    cursor: 'pointer',
                    fontSize: '0.825rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary, #f8fafc)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <MapPin size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {res.display_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MAP CONTAINER */}
        <div style={{ flex: 1, position: 'relative', minHeight: '350px', width: '100%', overflow: 'hidden' }}>
          <style>{`
            .leaflet-container img {
              max-width: none !important;
              max-height: none !important;
            }
          `}</style>
          {/* FLOATING MAP INSTRUCTION PILL */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.85)',
              color: '#ffffff',
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
              backdropFilter: 'blur(4px)',
            }}
          >
            <span>👉 ลากหมุดหมุดสีแดง 📍 หรือคลิกบนแผนที่ เพื่อระบุตำแหน่งบ้านลูกค้า</span>
          </div>

          <div
            ref={mapContainerRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              zIndex: 1,
              background: '#f8fafc',
            }}
          />
        </div>

        {/* BOTTOM COORDINATES & ADDRESS INFO BAR */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--bg-primary, #f8fafc)',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
                  ละติจูด (Lat)
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{currentLat.toFixed(6)}</strong>
                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                    {formatToDMS(currentLat, true)}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
                  ลองจิจูด (Lng)
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{currentLng.toFixed(6)}</strong>
                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                    {formatToDMS(currentLng, false)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'var(--bg-secondary, #ffffff)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  color: 'var(--text-primary, #334155)',
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  background: '#0f172a',
                  color: '#facc15',
                  border: '1px solid #334155',
                  padding: '0.45rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
                }}
              >
                <Check size={16} /> ยืนยันพิกัดนี้
              </button>
            </div>
          </div>

          {/* RESOLVED ADDRESS TEXT */}
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary, #475569)',
              background: 'var(--bg-secondary, #ffffff)',
              padding: '0.4rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <Navigation size={13} color="#2563eb" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600, flexShrink: 0 }}>ที่อยู่ที่ตรวจพบ:</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isReverseGeocoding ? 'กำลังค้นหาชื่อสถานที่/ที่อยู่...' : currentAddress || 'ยังไม่ระบุที่อยู่'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
