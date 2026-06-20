import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function MessagingSystem() {
  const { user } = useAuth()
  const socketRef   = useRef(null)
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)

  const [open, setOpen]           = useState(false)
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [unread, setUnread]       = useState(0)
  const [adminInfo, setAdminInfo] = useState(null)  // for employees
  const [convos, setConvos]       = useState([])    // for admin
  const [activeUser, setActiveUser] = useState(null) // admin: selected employee

  const isAdmin = user?.is_superuser
  const otherId = isAdmin ? activeUser?.id : adminInfo?.id

  // ── socket ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('register', { userId: user.id })
    })

    socket.on('new-message', (msg) => {
      setMessages(prev => {
        // only add if it belongs to current open conversation
        if (
          (msg.sender_id === user.id || msg.receiver_id === user.id) &&
          (isAdmin ? msg.sender_id === activeUserRef.current?.id || msg.receiver_id === activeUserRef.current?.id : true)
        ) {
          return [...prev, msg]
        }
        return prev
      })
      if (!open) setUnread(u => u + 1)
      if (isAdmin) loadConvos()
    })

    socket.on('message-sent', (msg) => {
      setMessages(prev => [...prev, msg])
    })

    return () => socket.disconnect()
  }, [user])

  // keep a ref to activeUser so socket handler can access it
  const activeUserRef = useRef(activeUser)
  useEffect(() => { activeUserRef.current = activeUser }, [activeUser])

  // ── load admin info (employees) ───────────────────────────────
  useEffect(() => {
    if (!isAdmin) {
      api.get('/messages/admin/id').then(r => setAdminInfo(r.data)).catch(() => {})
    }
  }, [isAdmin])

  // ── load conversations (admin) ────────────────────────────────
  const loadConvos = () => {
    if (isAdmin) {
      api.get('/messages/conversations/list').then(r => setConvos(r.data)).catch(() => {})
    }
  }
  useEffect(() => { if (isAdmin && open) loadConvos() }, [isAdmin, open])

  // ── load history when otherId changes ────────────────────────
  useEffect(() => {
    if (!otherId) return
    api.get(`/messages/${otherId}`).then(r => {
      setMessages(r.data)
      // mark as read
      socketRef.current?.emit('mark-read', { fromUserId: otherId, toUserId: user.id })
    }).catch(() => {})
  }, [otherId])

  // ── scroll to bottom ─────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── focus input when open ────────────────────────────────────
  useEffect(() => {
    if (open && !isAdmin) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // ── send ─────────────────────────────────────────────────────
  const send = () => {
    const msg = input.trim()
    if (!msg || !otherId) return
    setInput('')
    socketRef.current?.emit('send-message', {
      senderId: user.id,
      receiverId: otherId,
      message: msg,
    })
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const openChat = () => {
    setOpen(true)
    setUnread(0)
  }

  const selectEmployee = (emp) => {
    setActiveUser(emp)
    setMessages([])
    loadConvos()
  }

  const fmt = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    return isToday
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (!user) return null

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={() => open ? setOpen(false) : openChat()}
        style={{
          position: 'fixed', bottom: 90, right: 24,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          cursor: 'pointer', zIndex: 9997,
          background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
          color: '#fff', fontSize: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(59,130,246,0.45)',
          transition: 'transform .2s',
        }}
        title={isAdmin ? 'Employee Messages' : 'Message Admin'}
      >
        <ion-icon name={open ? 'close' : 'chatbubbles'} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', color: '#fff',
            fontSize: 11, fontWeight: 700,
            width: 20, height: 20, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>{unread}</span>
        )}
      </button>

      {/* ── Chat Window ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 154, right: 24,
          width: isAdmin ? 420 : 360, height: 520,
          borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,0.22)', zIndex: 9997,
          display: 'flex', flexDirection: 'column',
          background: 'var(--t-card,#fff)',
          border: '1px solid var(--t-border,#e5e7eb)',
          animation: 'msgSlideUp .25s ease',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#1e40af,#2563eb)',
            padding: '14px 18px', color: '#fff',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              <ion-icon name="chatbubbles" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {isAdmin
                  ? (activeUser ? `${activeUser.first_name} ${activeUser.last_name}` : 'Messages')
                  : `Admin — ${adminInfo ? adminInfo.first_name + ' ' + adminInfo.last_name : '...'}`}
              </div>
              <div style={{ fontSize: 11, opacity: .75 }}>
                {isAdmin ? (activeUser ? 'Employee' : 'Select a conversation') : 'Direct Message'}
              </div>
            </div>
            {isAdmin && activeUser && (
              <button onClick={() => { setActiveUser(null); setMessages([]) }} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
              }}>← Back</button>
            )}
          </div>

          {/* Admin: conversation list */}
          {isAdmin && !activeUser && (
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--t-bg,#f9fafb)' }}>
              {convos.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t-text-muted,#6b7280)', fontSize: 13 }}>
                  <ion-icon name="chatbubble-outline" style={{ fontSize: 40, display: 'block', marginBottom: 10 }} />
                  No messages yet
                </div>
              ) : convos.map(emp => (
                <div key={emp.id} onClick={() => selectEmployee(emp)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--t-border,#e5e7eb)',
                  background: 'var(--t-card,#fff)',
                  transition: 'background .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--t-bg,#f3f4f6)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--t-card,#fff)'}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#1e40af,#3b82f6)',
                    color: '#fff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, fontSize: 15,
                  }}>
                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t-text,#111)' }}>
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--t-text-muted,#6b7280)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{emp.last_message || 'No messages'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--t-text-muted,#9ca3af)' }}>{fmt(emp.last_time)}</div>
                    {emp.unread > 0 && (
                      <span style={{
                        background: '#3b82f6', color: '#fff', borderRadius: '50%',
                        width: 18, height: 18, fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{emp.unread}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Messages area (employee always, admin when employee selected) */}
          {(!isAdmin || activeUser) && (
            <>
              <div style={{
                flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
                display: 'flex', flexDirection: 'column', gap: 8,
                background: 'var(--t-bg,#f9fafb)',
              }}>
                {messages.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: 'var(--t-text-muted,#9ca3af)' }}>
                      <ion-icon name="chatbubble-ellipses-outline" style={{ fontSize: 36, display: 'block', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 13 }}>Say hello!</div>
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMine = msg.sender_id === user.id
                  return (
                    <div key={msg.id || i} style={{
                      display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{
                        maxWidth: '78%', padding: '9px 13px',
                        borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        fontSize: 13, lineHeight: 1.55,
                        ...(isMine ? {
                          background: 'linear-gradient(135deg,#1e40af,#2563eb)',
                          color: '#fff',
                        } : {
                          background: 'var(--t-card,#fff)',
                          color: 'var(--t-text,#111)',
                          border: '1px solid var(--t-border,#e5e7eb)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }),
                      }}>
                        <div>{msg.message}</div>
                        <div style={{
                          fontSize: 10, marginTop: 4, textAlign: 'right',
                          opacity: isMine ? .7 : .5,
                        }}>{fmt(msg.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: '10px 12px',
                borderTop: '1px solid var(--t-border,#e5e7eb)',
                display: 'flex', gap: 8, background: 'var(--t-card,#fff)', flexShrink: 0,
              }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a message..."
                  style={{
                    flex: 1, padding: '9px 13px', borderRadius: 10, fontSize: 13,
                    border: '1px solid var(--t-border,#e5e7eb)', outline: 'none',
                    background: 'var(--t-bg,#f9fafb)', color: 'var(--t-text,#111)',
                  }}
                />
                <button onClick={send} disabled={!input.trim() || !otherId} style={{
                  width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: input.trim() && otherId ? 'linear-gradient(135deg,#1e40af,#3b82f6)' : '#e5e7eb',
                  color: input.trim() && otherId ? '#fff' : '#9ca3af',
                  fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s', flexShrink: 0,
                }}>
                  <ion-icon name="send" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes msgSlideUp {
          from { opacity:0; transform:translateY(16px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>
    </>
  )
}
