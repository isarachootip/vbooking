import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, MessageSquare, Clock, User as UserIcon, Paperclip, FileText, Download, X as XIcon } from 'lucide-react';
import type { Project, User, ChatMessage } from '../types';

interface ProjectChatProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  systemSettings?: Record<string, any>;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ projects, users, currentUser, systemSettings }) => {
  const myProjects = projects.filter(p => 
    currentUser.globalRole === 'Admin' || currentUser.globalRole === 'Manager' || p.members.some(m => m.userId === currentUser.id)
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const queryProjId = params.get('projectId');
    if (queryProjId && myProjects.some(p => p.id === queryProjId)) {
      return queryProjId;
    }
    return myProjects[0]?.id || '';
  });
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
  }, [currentUser.id]);

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

  const projectMembers = selectedProject 
    ? users.filter(u => selectedProject.members.some(m => m.userId === u.id)) 
    : [];

  const filteredMentionUsers = projectMembers.filter(u => 
    u.name.toLowerCase().includes(mentionSearchQuery.toLowerCase())
  );

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
                padding: '0.1rem 0.3rem',
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
        return; // Stop if file upload fails
      }
      setUploading(false);
    }

    const tempId = 'temp_' + Date.now();
    const newMsg: ChatMessage = {
      id: tempId,
      projectId: selectedProjectId,
      userId: currentUser.id,
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
    projectMembers.forEach(u => {
      if (newMsg.text.includes(`@${u.name}`)) {
        mentionedUserIds.push(u.id);
      }
    });

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          text: newMsg.text || ' ', // Backend requires text, so if only file, send a space
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
    return users.find(u => u.id === userId) || { name: 'Unknown User', avatar: '' };
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div>
        <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Team Chat</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Collaborate and discuss with your project members.</p>
      </div>

      <div className="glass-panel" style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 0 }}>
        
        {/* Left Sidebar */}
        <div style={{ width: '280px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} color="var(--accent-primary)" />
              Your Projects
            </h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {myProjects.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
                You are not part of any projects.
              </div>
            ) : (
              myProjects.map(p => {
                const projectUnreadCount = notifications.filter(n => !n.isRead && n.projectId === p.id).length;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: selectedProjectId === p.id ? 'var(--bg-tertiary)' : 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      color: selectedProjectId === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      marginBottom: '0.25rem'
                    }}
                    className="hover-lift"
                  >
                    <Hash size={16} color={selectedProjectId === p.id ? 'var(--accent-primary)' : 'currentColor'} />
                    <span style={{ fontWeight: selectedProjectId === p.id ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'transparent' }}>
          {selectedProject ? (
            <>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                    <Hash size={20} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{selectedProject.name}</h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {selectedProject.members.length} members
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {loading && messages.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', gap: '1rem' }}>
                    <MessageSquare size={48} opacity={0.2} />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  Object.keys(groupedMessages).map(date => (
                    <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{date}</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                      </div>

                      {groupedMessages[date].map((msg, index) => {
                        const isMine = msg.userId === currentUser.id;
                        const user = getUserDetails(msg.userId);
                        const prevMsg = groupedMessages[date][index - 1];
                        const showAvatar = !prevMsg || prevMsg.userId !== msg.userId;

                        return (
                          <div key={msg.id} style={{ 
                            display: 'flex', 
                            gap: '1rem', 
                            alignItems: 'flex-start',
                            flexDirection: isMine ? 'row-reverse' : 'row',
                            marginTop: showAvatar ? '0.5rem' : '0'
                          }}>
                            <div style={{ width: '36px', height: '36px', opacity: showAvatar ? 1 : 0 }}>
                              {showAvatar && (
                                user.avatar ? (
                                  <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserIcon size={18} color="var(--text-muted)" />
                                  </div>
                                )
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                              {showAvatar && (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{isMine ? 'You' : user.name}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</span>
                                </div>
                              )}
                              <div style={{
                                padding: '0.75rem 1rem',
                                background: isMine ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                color: isMine ? '#fff' : 'var(--text-primary)',
                                borderRadius: isMine ? '1rem 0.2rem 1rem 1rem' : '0.2rem 1rem 1rem 1rem',
                                fontSize: '0.9rem',
                                lineHeight: '1.5',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {msg.text.trim() ? renderMessageText(msg.text, isMine) : ''}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div style={{ marginTop: msg.text.trim() ? '0.75rem' : '0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {msg.attachments.map((att, i) => {
                                      const isImage = att.type.startsWith('image/');
                                      if (isImage) {
                                        return (
                                          <a key={i} href={att.url} download={att.name} style={{ display: 'block' }}>
                                            <img src={att.url} alt={att.name} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '0.5rem' }} />
                                          </a>
                                        );
                                      } else {
                                        return (
                                          <a key={i} href={att.url} download={att.name} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '0.5rem',
                                            color: 'inherit', textDecoration: 'none'
                                          }}>
                                            <FileText size={20} />
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                            <Download size={16} />
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

              <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                {showMentionsDropdown && filteredMentionUsers.length > 0 && (
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '1.25rem',
                      width: '260px',
                      background: 'rgba(20, 20, 25, 0.95)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
                      zIndex: 100,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginBottom: '0.5rem',
                      padding: '0.25rem 0'
                    }}
                  >
                    {filteredMentionUsers.map((user, idx) => (
                      <div
                        key={user.id}
                        onClick={() => selectMentionUser(user)}
                        onMouseEnter={() => setSelectedMentionUserIndex(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          background: idx === selectedMentionUserIndex ? 'var(--accent-primary)' : 'transparent',
                          color: idx === selectedMentionUserIndex ? 'white' : 'var(--text-primary)',
                          transition: 'background 0.1s'
                        }}
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedFile && (
                  <div style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'inline-flex' }}>
                    <FileText size={16} />
                    <span style={{ fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                    <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}><XIcon size={16} /></button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const maxMb = parseFloat(systemSettings?.max_upload_mb || '1');
                        if (file.size > maxMb * 1024 * 1024) {
                          alert(`File size cannot exceed ${maxMb}MB`);
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
                  >
                    <Paperclip size={20} />
                  </button>
                  <div style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', transition: 'all 0.2s' }} className="focus-within-ring">
                    <input
                      type="text"
                      ref={inputRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message #${selectedProject.name}...`}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        outline: 'none',
                        padding: '0.5rem 0'
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
                      width: '46px',
                      height: '46px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: (inputValue.trim() || selectedFile) && !uploading ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: uploading ? 0.7 : 1
                    }}
                    className={(inputValue.trim() || selectedFile) && !uploading ? "hover-lift" : ""}
                  >
                    {uploading ? <Clock size={18} className="spin" /> : <Send size={18} />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <MessageSquare size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
              <h3>Select a project</h3>
              <p>Choose a project from the sidebar to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};