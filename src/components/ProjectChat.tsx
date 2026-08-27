import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, Hash, MessageSquare, Clock, User as UserIcon, Paperclip, FileText, 
  Download, X as XIcon, Search, Users, Wrench, ShieldCheck, MapPin, Tag
} from 'lucide-react';
import type { Project, User, ChatMessage } from '../types';

export interface ProjectChatProps {
  projects: Project[];
  users: User[];
  currentUser?: User | null;
  systemSettings?: Record<string, any>;
  defaultProjectId?: string;
  hideSidebar?: boolean;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ 
  projects, 
  users, 
  currentUser, 
  systemSettings, 
  defaultProjectId,
  hideSidebar = false
}) => {
  // Normalize user branches for intelligent matching
  const userBranches = useMemo(() => {
    if (!currentUser) return [];
    return [
      ...(currentUser.assignedBranches || []),
      ...(currentUser.serviceZones || []),
      currentUser.department,
      currentUser.name
    ].filter(Boolean).map(s => String(s).toLowerCase());
  }, [currentUser]);

  // Check if project is relevant to current user
  const isRelevantProject = (p: Project) => {
    if (!currentUser) return true;
    if (currentUser.globalRole === 'Admin' || currentUser.globalRole === 'Manager') return true;

    // 1. Direct project member
    if (p.members && p.members.some(m => m.userId === currentUser.id || (m as any).id === currentUser.id)) {
      return true;
    }

    // 2. PIC / Surveyor / Inspector
    if (p.extraDetails?.picUser === currentUser.id || p.extraDetails?.picUser === currentUser.name) return true;
    if (p.extraDetails?.surveyInspectorId === currentUser.id) return true;

    // 3. Branch matching (e.g. บางนา, สุขาภิบาล, พระราม 2, etc.)
    const projBranch = (p.extraDetails?.branch || '').toLowerCase();
    const projAddress = (p.address || '').toLowerCase();
    const projName = (p.name || '').toLowerCase();

    for (const ub of userBranches) {
      // Remove common non-identifying prefix words
      const cleaned = ub.replace(/bnacs|\(|\)|สาขา|สำนักงาน|hq/gi, '').trim();
      if (cleaned.length >= 2) {
        if (projBranch.includes(cleaned) || projAddress.includes(cleaned) || projName.includes(cleaned)) {
          return true;
        }
      }
    }
    return false;
  };

  const relevantProjects = useMemo(() => {
    return projects.filter(isRelevantProject);
  }, [projects, currentUser, userBranches]);

  const [sidebarFilter, setSidebarFilter] = useState<'relevant' | 'all'>(() => {
    return relevantProjects.length > 0 ? 'relevant' : 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (defaultProjectId) return defaultProjectId;
    const params = new URLSearchParams(window.location.search);
    const queryProjId = params.get('projectId');
    if (queryProjId && projects.some(p => p.id === queryProjId)) {
      return queryProjId;
    }
    return relevantProjects[0]?.id || projects[0]?.id || '';
  });

  useEffect(() => {
    if (defaultProjectId) {
      setSelectedProjectId(defaultProjectId);
    }
  }, [defaultProjectId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showMentionsDropdown, setShowMentionsDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [selectedMentionUserIndex, setSelectedMentionUserIndex] = useState(0);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/chat-notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch chat notifications:', err);
    }
  };

  const markNotificationsAsRead = async (projectId: string) => {
    if (!currentUser?.id || !projectId) return;
    try {
      await fetch(`/api/users/${currentUser.id}/projects/${projectId}/chat-notifications/read`, {
        method: 'POST'
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchMessages(selectedProjectId);
      markNotificationsAsRead(selectedProjectId);

      const interval = setInterval(() => {
        fetchMessages(selectedProjectId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Find all team members and technicians in this selected project
  const projectMembers = useMemo(() => {
    if (!selectedProject) return [];
    const memberUserIds = new Set<string>();
    
    // Project members
    if (selectedProject.members) {
      selectedProject.members.forEach(m => {
        if (m.userId) memberUserIds.add(m.userId);
        if ((m as any).id) memberUserIds.add((m as any).id);
      });
    }

    // Inspector / Surveyor / PIC
    if (selectedProject.extraDetails?.surveyInspectorId) {
      memberUserIds.add(selectedProject.extraDetails.surveyInspectorId);
    }

    // Match users list
    const foundMembers = users.filter(u => memberUserIds.has(u.id));

    // Also include technicians specifically in this project's lifecycle flow if names match
    const flowTechs = selectedProject.extraDetails?.lifecycle?.technicians;
    if (Array.isArray(flowTechs) && flowTechs.length > 0) {
      users.forEach(u => {
        if (flowTechs.some((t: any) => typeof t === 'string' ? t.includes(u.name) : t.name === u.name || t.id === u.id)) {
          if (!foundMembers.some(fm => fm.id === u.id)) {
            foundMembers.push(u);
          }
        }
      });
    }

    return foundMembers;
  }, [selectedProject, users]);

  // Mentionable users: Project members first, then technicians & all other users
  const mentionableUsers = useMemo(() => {
    if (!selectedProject) return users;
    const pmSet = new Set(projectMembers.map(u => u.id));
    const technicians = users.filter(u => 
      !pmSet.has(u.id) && 
      (u.department?.toLowerCase().includes('tech') || u.globalRole === 'QC' || (u.skills && u.skills.length > 0))
    );
    const others = users.filter(u => !pmSet.has(u.id) && !technicians.some(t => t.id === u.id));
    return [...projectMembers, ...technicians, ...others];
  }, [projectMembers, users, selectedProject]);

  const filteredMentionUsers = useMemo(() => {
    if (!mentionSearchQuery.trim()) return mentionableUsers.slice(0, 10);
    return mentionableUsers.filter(u => 
      u.name.toLowerCase().includes(mentionSearchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(mentionSearchQuery.toLowerCase()))
    ).slice(0, 10);
  }, [mentionableUsers, mentionSearchQuery]);

  const selectMentionUser = (user: User) => {
    const textBeforeMention = inputValue.slice(0, mentionTriggerIndex);
    const textAfterMention = inputValue.slice(mentionTriggerIndex + 1 + mentionSearchQuery.length);
    const newText = `${textBeforeMention}@${user.name} ${textAfterMention}`;
    setInputValue(newText);
    setShowMentionsDropdown(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = mentionTriggerIndex + user.name.length + 2; // @ + name + space
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleTagUserFromChip = (user: User) => {
    const spacePrefix = inputValue.length > 0 && !inputValue.endsWith(' ') ? ' ' : '';
    const newText = `${inputValue}${spacePrefix}@${user.name} `;
    setInputValue(newText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const selectionStart = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, selectionStart);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIdx !== -1) {
      const query = textBeforeCursor.slice(lastAtIdx + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        const charBeforeAt = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : '';
        if (charBeforeAt === '' || charBeforeAt === ' ' || charBeforeAt === '\n') {
          setShowMentionsDropdown(true);
          setMentionSearchQuery(query);
          setMentionTriggerIndex(lastAtIdx);
          setSelectedMentionUserIndex(0);
          return;
        }
      }
    }
    setShowMentionsDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionsDropdown && filteredMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionUserIndex(prev => (prev + 1) % filteredMentionUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionUserIndex(prev => (prev - 1 + filteredMentionUsers.length) % filteredMentionUsers.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMentionUser(filteredMentionUsers[selectedMentionUserIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionsDropdown(false);
      }
    }
  };

  const renderMessageText = (text: string, isMine?: boolean) => {
    if (!text) return '';
    
    const sortedUsers = [...users].sort((a, b) => b.name.length - a.name.length);
    let parts: (string | React.ReactNode)[] = [text];
    
    for (const user of sortedUsers) {
      const mentionStr = `@${user.name}`;
      const newParts: (string | React.ReactNode)[] = [];
      
      for (const part of parts) {
        if (typeof part !== 'string') {
          newParts.push(part);
          continue;
        }
        
        let index = part.indexOf(mentionStr);
        let currentText = part;
        
        while (index !== -1) {
          const before = currentText.slice(0, index);
          const mention = currentText.slice(index, index + mentionStr.length);
          currentText = currentText.slice(index + mentionStr.length);
          
          if (before) newParts.push(before);
          newParts.push(
            <span 
              key={`${user.id}-${index}`} 
              style={{ 
                color: isMine ? '#ffffff' : 'var(--accent-primary, #3b82f6)', 
                fontWeight: 600, 
                background: isMine ? 'rgba(255, 255, 255, 0.22)' : 'rgba(59, 130, 246, 0.15)',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                border: isMine ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(59, 130, 246, 0.25)',
                display: 'inline-block'
              }}
            >
              {mention}
            </span>
          );
          
          index = currentText.indexOf(mentionStr);
        }
        
        if (currentText) newParts.push(currentText);
      }
      parts = newParts;
    }
    
    return parts;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && !selectedFile) || !selectedProjectId) return;

    let attachmentData = null;
    
    // Upload file first if exists
    if (selectedFile) {
      setUploading(true);
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(selectedFile);
        });
        const base64File = await base64Promise;
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64File,
            fileName: selectedFile.name,
            type: selectedFile.type || 'application/octet-stream'
          })
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          attachmentData = {
            name: uploadData.name,
            url: uploadData.url,
            type: uploadData.type
          };
        }
      } catch (err) {
        console.error('File upload failed', err);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const tempId = 'temp_' + Date.now();
    const currentUserId = currentUser?.id || 'anonymous';
    const newMsg: ChatMessage = {
      id: tempId,
      projectId: selectedProjectId,
      userId: currentUserId,
      text: inputValue,
      timestamp: new Date().toISOString(),
      attachments: attachmentData ? [attachmentData] : []
    };

    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Identify mentioned users
    const mentionedUserIds: string[] = [];
    mentionableUsers.forEach(u => {
      if (newMsg.text.includes(`@${u.name}`)) {
        mentionedUserIds.push(u.id);
      }
    });

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          text: newMsg.text || ' ',
          attachments: newMsg.attachments,
          mentionedUserIds
        })
      });
      if (res.ok) {
        const savedMsg = await res.json();
        setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const getUserDetails = (userId: string) => {
    return users.find(u => u.id === userId) || { name: 'ผู้ใช้งาน', avatar: '', department: '' };
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const groupedMessages: { [key: string]: ChatMessage[] } = {};
  messages.forEach(m => {
    const d = formatDate(m.timestamp);
    if (!groupedMessages[d]) groupedMessages[d] = [];
    groupedMessages[d].push(m);
  });

  // Filter projects in sidebar based on filter toggle & search
  const displayedProjects = useMemo(() => {
    const baseList = (sidebarFilter === 'relevant' && relevantProjects.length > 0) ? relevantProjects : projects;
    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase();
    return baseList.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.customerName?.toLowerCase().includes(q) ||
      p.extraDetails?.branch?.toLowerCase().includes(q) ||
      p.extraDetails?.surveyTicketNo?.toLowerCase().includes(q)
    );
  }, [sidebarFilter, relevantProjects, projects, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: hideSidebar ? '0' : '1rem' }}>
      {!hideSidebar && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.75rem' }}>แชทติดต่อช่าง (Team Chat)</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              สื่อสาร ประสานงาน และติดตามความคืบหน้ากับทีมช่างและทีมงานในโครงการ
            </p>
          </div>
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <UserIcon size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({currentUser.department || currentUser.globalRole})</span>
            </div>
          )}
        </div>
      )}

      <div className="glass-panel" style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 0, height: hideSidebar ? '100%' : 'auto', minHeight: '520px' }}>
        
        {/* Left Sidebar (Shown only when not in single-project mode) */}
        {!hideSidebar && (
          <div style={{ width: '310px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>
            
            {/* Header & Filter Toggle */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <MessageSquare size={17} color="var(--accent-primary)" />
                  โครงการ (Projects)
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{displayedProjects.length} รายการ</span>
              </div>

              {/* View filter buttons */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setSidebarFilter('relevant')}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: sidebarFilter === 'relevant' ? 600 : 400,
                    color: sidebarFilter === 'relevant' ? 'white' : 'var(--text-muted)',
                    background: sidebarFilter === 'relevant' ? 'var(--accent-primary)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  โครงการของฉัน ({relevantProjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarFilter('all')}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: sidebarFilter === 'all' ? 600 : 400,
                    color: sidebarFilter === 'all' ? 'white' : 'var(--text-muted)',
                    background: sidebarFilter === 'all' ? 'var(--accent-primary)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  ทั้งหมด ({projects.length})
                </button>
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อโครงการ, รหัส, สาขา..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.65rem 0.4rem 2rem',
                    fontSize: '0.8rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            
            {/* Project List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {displayedProjects.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem', padding: '0 1rem' }}>
                  {sidebarFilter === 'relevant' ? (
                    <div>
                      <p>ไม่พบโครงการที่ผูกกับสาขาหรือชื่อของคุณ</p>
                      <button
                        onClick={() => setSidebarFilter('all')}
                        style={{
                          marginTop: '0.5rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        ดูโครงการทั้งหมด
                      </button>
                    </div>
                  ) : (
                    <p>ไม่พบโครงการที่ค้นหา</p>
                  )}
                </div>
              ) : (
                displayedProjects.map(p => {
                  const projectUnreadCount = notifications.filter(n => !n.isRead && n.projectId === p.id).length;
                  const isSelected = selectedProjectId === p.id;
                  const branchName = p.extraDetails?.branch || '';

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        padding: '0.65rem 0.85rem',
                        background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        border: isSelected ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                        borderRadius: 'var(--radius-md)',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        marginBottom: '0.35rem'
                      }}
                      className="hover-lift"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                        <Hash size={15} color={isSelected ? 'var(--accent-primary)' : 'currentColor'} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: isSelected ? 600 : 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: isSelected ? 'var(--text-primary)' : 'inherit' }}>
                          {p.name}
                        </span>
                        {projectUnreadCount > 0 && (
                          <span 
                            style={{
                              background: 'var(--accent-danger, #ef4444)',
                              color: 'white',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '10px',
                              minWidth: '18px',
                              textAlign: 'center'
                            }}
                          >
                            {projectUnreadCount}
                          </span>
                        )}
                      </div>

                      {/* Sub-info: Branch, Member count, Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '1.4rem' }}>
                        <span>{branchName ? `📍 ${branchName}` : (p.id || '')}</span>
                        <span>{p.members?.length || 0} สมาชิก</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'transparent', overflow: 'hidden' }}>
          {selectedProject ? (
            <>
              {/* Chat Header & Technicians Bar */}
              <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      <Hash size={20} color="var(--accent-primary)" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>{selectedProject.name}</h2>
                        {selectedProject.extraDetails?.branch && (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-primary)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                            📍 {selectedProject.extraDetails.branch}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span>รหัส: <strong>{selectedProject.id}</strong></span>
                        {selectedProject.customerName && <span>ลูกค้า: {selectedProject.customerName}</span>}
                        <span>สมาชิก: {projectMembers.length} ท่าน</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Technician & Member Chips */}
                {projectMembers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users size={13} /> กดเพื่อแท็ก (@):
                    </span>
                    {projectMembers.map(member => {
                      const isTech = member.department?.toLowerCase().includes('tech') || member.globalRole === 'QC' || (member.skills && member.skills.length > 0);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleTagUserFromChip(member)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.55rem',
                            background: isTech ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                            border: isTech ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                            borderRadius: '12px',
                            color: isTech ? '#34d399' : 'var(--text-primary)',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          className="hover-lift"
                          title={`คลิกเพื่อแท็ก @${member.name}`}
                        >
                          {isTech ? <Wrench size={11} /> : <UserIcon size={11} />}
                          <span>@{member.name}</span>
                          <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>
                            ({member.department || member.globalRole || 'ทีม'})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Message List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {loading && messages.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    กำลังโหลดข้อความ...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', gap: '0.75rem' }}>
                    <MessageSquare size={44} opacity={0.25} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>ยังไม่มีข้อความในโครงการนี้</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.75 }}>เริ่มพิมพ์ข้อความหรือแท็ก @ช่าง เพื่อประสานงานได้เลยครับ</p>
                  </div>
                ) : (
                  Object.keys(groupedMessages).map(date => (
                    <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{date}</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                      </div>

                      {groupedMessages[date].map((msg, index) => {
                        const isMine = !!currentUser && msg.userId === currentUser.id;
                        const user = getUserDetails(msg.userId);
                        const prevMsg = groupedMessages[date][index - 1];
                        const showAvatar = !prevMsg || prevMsg.userId !== msg.userId;

                        return (
                          <div key={msg.id} style={{ 
                            display: 'flex', 
                            gap: '0.75rem', 
                            alignItems: 'flex-start',
                            flexDirection: isMine ? 'row-reverse' : 'row',
                            marginTop: showAvatar ? '0.35rem' : '0'
                          }}>
                            <div style={{ width: '34px', height: '34px', opacity: showAvatar ? 1 : 0, flexShrink: 0 }}>
                              {showAvatar && (
                                user.avatar ? (
                                  <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserIcon size={16} color="var(--text-muted)" />
                                  </div>
                                )
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                              {showAvatar && (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {isMine ? 'คุณ (You)' : user.name}
                                  </span>
                                  {user.department && (
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                      ({user.department})
                                    </span>
                                  )}
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</span>
                                </div>
                              )}
                              <div style={{
                                padding: '0.65rem 0.95rem',
                                background: isMine ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                color: isMine ? '#fff' : 'var(--text-primary)',
                                borderRadius: isMine ? '1rem 0.2rem 1rem 1rem' : '0.2rem 1rem 1rem 1rem',
                                fontSize: '0.88rem',
                                lineHeight: '1.5',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                {msg.text.trim() ? renderMessageText(msg.text, isMine) : ''}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div style={{ marginTop: msg.text.trim() ? '0.65rem' : '0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {msg.attachments.map((att, i) => {
                                      const isImage = att.type && att.type.startsWith('image/');
                                      if (isImage) {
                                        return (
                                          <a key={i} href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                            <img src={att.url} alt={att.name} style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }} />
                                          </a>
                                        );
                                      } else {
                                        return (
                                          <a key={i} href={att.url} download={att.name} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.45rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem',
                                            color: 'inherit', textDecoration: 'none', fontSize: '0.8rem'
                                          }}>
                                            <FileText size={18} />
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                            <Download size={15} />
                                          </a>
                                        );
                                      }
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input & Mentions Area */}
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                
                {/* Mentions Dropdown */}
                {showMentionsDropdown && filteredMentionUsers.length > 0 && (
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '1.25rem',
                      width: '280px',
                      background: 'rgba(20, 20, 25, 0.96)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
                      zIndex: 100,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      marginBottom: '0.5rem',
                      padding: '0.35rem 0'
                    }}
                  >
                    <div style={{ padding: '0.3rem 0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      เลือกสมาชิก / ช่างที่ต้องการแท็ก:
                    </div>
                    {filteredMentionUsers.map((user, idx) => (
                      <div
                        key={user.id}
                        onClick={() => selectMentionUser(user)}
                        onMouseEnter={() => setSelectedMentionUserIndex(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.45rem 0.85rem',
                          cursor: 'pointer',
                          background: idx === selectedMentionUserIndex ? 'var(--accent-primary)' : 'transparent',
                          color: idx === selectedMentionUserIndex ? 'white' : 'var(--text-primary)',
                          transition: 'background 0.1s'
                        }}
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{user.name}</span>
                          <span style={{ fontSize: '0.7rem', opacity: 0.75, marginLeft: '0.35rem' }}>({user.department || user.globalRole})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected File Preview */}
                {selectedFile && (
                  <div style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.4rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'inline-flex' }}>
                    <FileText size={15} />
                    <span style={{ fontSize: '0.8rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                    <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}><XIcon size={15} /></button>
                  </div>
                )}

                {/* Input Form */}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const maxMb = parseFloat(systemSettings?.max_upload_mb || '5');
                        if (file.size > maxMb * 1024 * 1024) {
                          alert(`ขนาดไฟล์ต้องไม่เกิน ${maxMb}MB`);
                          e.target.value = '';
                          return;
                        }
                        setSelectedFile(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '0.5rem'
                    }}
                    className="hover-lift"
                    title="แนบรูปภาพหรือไฟล์เอกสาร"
                  >
                    <Paperclip size={19} />
                  </button>
                  <div style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0.35rem 0.85rem', transition: 'all 0.2s' }} className="focus-within-ring">
                    <input
                      type="text"
                      ref={inputRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={`พิมพ์ข้อความถึงทีมช่าง... (พิมพ์ @ เพื่อระบุชื่อ)`}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        padding: '0.4rem 0'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={(!inputValue.trim() && !selectedFile) || uploading}
                    style={{
                      background: (inputValue.trim() || selectedFile) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      color: (inputValue.trim() || selectedFile) ? 'white' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      width: '42px',
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: (inputValue.trim() || selectedFile) && !uploading ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: uploading ? 0.7 : 1
                    }}
                    className={(inputValue.trim() || selectedFile) && !uploading ? "hover-lift" : ""}
                    title="ส่งข้อความ"
                  >
                    {uploading ? <Clock size={17} className="spin" /> : <Send size={17} />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', gap: '0.75rem', padding: '2rem' }}>
              <MessageSquare size={48} opacity={0.2} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>เลือกโครงการเพื่อเริ่มแชท</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>คลิกเลือกโครงการจากแถบด้านซ้ายเพื่อพูดคุยและประสานงานกับทีมช่าง</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};