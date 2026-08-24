import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, Building2, Globe, X } from 'lucide-react';
import type { Branch } from '../types';

export interface SearchableBranchSelectProps {
  branches: (Branch | any)[];
  value: string;
  onChange: (branchName: string, branch?: any) => void;
  selectedZone?: string;
  onZoneChange?: (zone: string) => void;
  showZoneSelector?: boolean;
  zoneLabel?: string;
  branchLabel?: string;
  required?: boolean;
  disabled?: boolean;
  layout?: 'grid' | 'stacked';
  style?: React.CSSProperties;
}

const DEFAULT_ZONE = '[BKK] กรุงเทพฯ & ปริมณฑล';

export const SearchableBranchSelect: React.FC<SearchableBranchSelectProps> = ({
  branches = [],
  value,
  onChange,
  selectedZone: controlledZone,
  onZoneChange,
  showZoneSelector = true,
  zoneLabel = 'โซนพื้นที่ *',
  branchLabel = 'สาขาที่ดูแล *',
  required = true,
  disabled = false,
  layout = 'grid',
  style
}) => {
  const [internalZone, setInternalZone] = useState<string>(DEFAULT_ZONE);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentZone = controlledZone !== undefined ? controlledZone : internalZone;

  // Extract all available unique zones in order
  const availableZones = useMemo(() => {
    const zoneSet = new Set<string>();
    branches.forEach(b => {
      if (b.zone && b.zone.trim()) zoneSet.add(b.zone.trim());
    });

    const standardOrder = [
      '[BKK] กรุงเทพฯ & ปริมณฑล',
      '[C] ภาคกลาง',
      '[E] ภาคตะวันออก',
      '[W] ภาคตะวันตก',
      '[N] ภาคเหนือ',
      '[NE-U] ภาคอีสานตอนบน',
      '[NE-L] ภาคอีสานตอนล่าง',
      '[S-U] ภาคใต้ตอนบน',
      '[S-L] ภาคใต้ตอนล่าง'
    ];

    const sortedZones: string[] = [];
    // First add standard zones that exist
    standardOrder.forEach(z => {
      if (zoneSet.has(z)) {
        sortedZones.push(z);
        zoneSet.delete(z);
      }
    });
    // Add any remaining custom zones
    zoneSet.forEach(z => sortedZones.push(z));

    return sortedZones;
  }, [branches]);

  // Sync zone when initial value belongs to a specific zone
  useEffect(() => {
    if (value && branches.length > 0) {
      const match = branches.find(b => b.name === value || b.code === value);
      if (match && match.zone && match.zone !== currentZone && controlledZone === undefined) {
        setInternalZone(match.zone);
        if (onZoneChange) onZoneChange(match.zone);
      }
    }
  }, [value, branches]);

  const handleZoneSelect = (newZone: string) => {
    if (controlledZone === undefined) {
      setInternalZone(newZone);
    }
    if (onZoneChange) {
      onZoneChange(newZone);
    }

    // Auto-select first branch in the newly selected zone if current branch is not in it
    if (newZone !== 'ALL') {
      const branchesInZone = branches.filter(b => b.zone === newZone);
      const isCurrentInZone = branchesInZone.some(b => b.name === value);
      if (!isCurrentInZone && branchesInZone.length > 0) {
        onChange(branchesInZone[0].name, branchesInZone[0]);
      }
    }
  };

  // Filter branches based on zone and search query
  const filteredBranches = useMemo(() => {
    let list = branches;
    if (currentZone && currentZone !== 'ALL') {
      list = list.filter(b => b.zone === currentZone);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(b => {
      const name = (b.name || '').toLowerCase();
      const code = (b.code || '').toLowerCase();
      const province = (b.province || '').toLowerCase();
      const fullName = (b.fullName || '').toLowerCase();
      return name.includes(q) || code.includes(q) || province.includes(q) || fullName.includes(q);
    });
  }, [branches, currentZone, searchQuery]);

  // Check if search matches branches in other zones
  const otherZoneMatches = useMemo(() => {
    if (!searchQuery.trim() || currentZone === 'ALL') return [];
    const q = searchQuery.toLowerCase().trim();
    return branches.filter(b => {
      if (b.zone === currentZone) return false;
      const name = (b.name || '').toLowerCase();
      const code = (b.code || '').toLowerCase();
      const province = (b.province || '').toLowerCase();
      return name.includes(q) || code.includes(q) || province.includes(q);
    });
  }, [branches, currentZone, searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  const selectedBranchObj = useMemo(() => {
    return branches.find(b => b.name === value) || (value ? { name: value } : null);
  }, [branches, value]);

  const handleSelectBranch = (b: any) => {
    onChange(b.name, b);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredBranches.length - 1 ? prev + 1 : prev));
      scrollToHighlighted(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
      scrollToHighlighted(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredBranches[highlightedIndex]) {
        handleSelectBranch(filteredBranches[highlightedIndex]);
      }
    }
  };

  const scrollToHighlighted = (index: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('.branch-item');
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  return (
    <div style={style}>
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: showZoneSelector && layout === 'grid' ? '1fr 1fr' : '1fr', 
          gap: '0.75rem',
          alignItems: 'start'
        }}
      >
        {/* ── ZONE SELECTOR ── */}
        {showZoneSelector && (
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              {zoneLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={currentZone}
                disabled={disabled}
                onChange={e => handleZoneSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 2rem 0.5rem 0.75rem',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  appearance: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="ALL">🌐 ทั้งหมด (ทุกโซน / All Zones)</option>
                {availableZones.map(z => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              <ChevronDown 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  right: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)', 
                  pointerEvents: 'none' 
                }} 
              />
            </div>
          </div>
        )}

        {/* ── BRANCH SEARCHABLE SELECT ── */}
        <div ref={containerRef} style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            {branchLabel}
          </label>

          {/* Trigger Button */}
          <div
            tabIndex={disabled ? -1 : 0}
            onKeyDown={handleKeyDown}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem',
              background: 'var(--bg-tertiary)',
              border: `1px solid ${isOpen ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-md)',
              color: value ? 'var(--text-primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              minHeight: '38px',
              boxShadow: isOpen ? '0 0 0 2px rgba(37, 99, 235, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <Building2 size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              {selectedBranchObj ? (
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedBranchObj.name}
                  {selectedBranchObj.province && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      ({selectedBranchObj.province})
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>- เลือกสาขา -</span>
              )}
            </div>

            <ChevronDown 
              size={15} 
              style={{ 
                color: 'var(--text-muted)', 
                transform: isOpen ? 'rotate(180deg)' : 'none', 
                transition: 'transform 0.2s ease', 
                flexShrink: 0 
              }} 
            />
          </div>

          {/* Floating Searchable Dropdown Menu */}
          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'var(--bg-secondary, #ffffff)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                zIndex: 1050,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out'
              }}
            >
              {/* Search Box */}
              <div 
                style={{ 
                  padding: '0.5rem', 
                  borderBottom: '1px solid var(--border-color)', 
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.25rem' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="พิมพ์ค้นหาชื่อสาขา, จังหวัด, รหัส..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    padding: '0.25rem 0'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status / Counts Bar */}
              <div 
                style={{ 
                  padding: '0.35rem 0.75rem', 
                  fontSize: '0.72rem', 
                  color: 'var(--text-muted)', 
                  background: 'var(--bg-secondary)', 
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>
                  {currentZone === 'ALL' ? '🌐 ทุกโซน' : currentZone}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {filteredBranches.length} สาขา
                </span>
              </div>

              {/* List of Branches */}
              <div 
                ref={listRef}
                style={{ 
                  maxHeight: '220px', 
                  overflowY: 'auto', 
                  padding: '0.25rem 0' 
                }}
              >
                {filteredBranches.length > 0 ? (
                  filteredBranches.map((b, index) => {
                    const isSelected = b.name === value;
                    const isHighlighted = index === highlightedIndex;

                    return (
                      <div
                        key={b.id || b.code || b.name}
                        className="branch-item"
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => handleSelectBranch(b)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          background: isHighlighted 
                            ? 'rgba(37, 99, 235, 0.08)' 
                            : isSelected 
                            ? 'rgba(37, 99, 235, 0.04)' 
                            : 'transparent',
                          transition: 'background 0.1s ease',
                          borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span 
                              style={{ 
                                fontSize: '0.82rem', 
                                fontWeight: isSelected ? 700 : 500, 
                                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' 
                              }}
                            >
                              {b.name}
                            </span>
                            {b.code && (
                              <span 
                                style={{ 
                                  fontSize: '0.68rem', 
                                  padding: '1px 4px', 
                                  background: 'var(--bg-tertiary)', 
                                  borderRadius: '3px', 
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                {b.code}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {b.province && (
                              <span>📍 {b.province}</span>
                            )}
                            {currentZone === 'ALL' && b.zone && (
                              <span style={{ opacity: 0.8 }}>• {b.zone}</span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <Check size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <div>ไม่พบสาขาที่ตรงกับคำค้นหาในโซนนี้</div>

                    {/* Hint if match found in other zones */}
                    {otherZoneMatches.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          handleZoneSelect('ALL');
                        }}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.35rem 0.6rem',
                          background: 'rgba(37, 99, 235, 0.1)',
                          border: '1px solid rgba(37, 99, 235, 0.3)',
                          borderRadius: '4px',
                          color: 'var(--accent-primary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Globe size={12} /> พบ {otherZoneMatches.length} สาขาในโซนอื่น (คลิกเพื่อค้นหาทุกโซน)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
