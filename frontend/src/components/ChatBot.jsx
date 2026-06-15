import { useState, useRef, useEffect } from 'react'
import { useLang } from '../context/LanguageContext'
import api from '../api/client'

const QUICK_ACTIONS = {
  en: [
    { label: 'Leave Balance', msg: 'What is my leave balance?' },
    { label: 'My Salary', msg: 'Show my salary' },
    { label: 'Attendance', msg: 'My attendance today' },
    { label: 'My Goals', msg: 'Show my goals' },
    { label: 'Leave Policy', msg: 'Leave policy' },
    { label: 'Holidays', msg: 'Upcoming holidays' },
  ],
  ar: [
    { label: 'رصيد إجازاتي', msg: 'كم إجازة باقيلي؟' },
    { label: 'راتبي', msg: 'راتبي' },
    { label: 'حضوري', msg: 'حضوري اليوم' },
    { label: 'أهدافي', msg: 'أهدافي' },
    { label: 'سياسة الإجازات', msg: 'سياسة الإجازات' },
    { label: 'العطل', msg: 'العطل القادمة' },
  ],
}

export default function ChatBot() {
  const { lang } = useLang()
  const isRTL = lang === 'ar'
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: isRTL ? 'أهلاً! 👋 أنا مساعدك الذكي. كيف أقدر أساعدك؟' : 'Hello! 👋 I\'m your AI HR Assistant. How can I help you?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { from: 'user', text: msg }])
    setLoading(true)
    try {
      const res = await api.post('/chatbot', { message: msg })
      setMessages(prev => [...prev, { from: 'bot', text: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: isRTL ? 'عذراً، حدث خطأ. حاول مرة أخرى.' : 'Sorry, something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: isRTL ? 'auto' : 24, left: isRTL ? 24 : 'auto',
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #1b4332, #40916c)', color: '#fff',
          boxShadow: '0 4px 20px rgba(27,67,50,0.4)', fontSize: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.3s, box-shadow 0.3s', zIndex: 9999,
          transform: open ? 'rotate(0deg)' : 'rotate(0deg)',
        }}
        onMouseEnter={e => { e.target.style.transform = 'scale(1.1)'; e.target.style.boxShadow = '0 6px 24px rgba(27,67,50,0.5)' }}
        onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 4px 20px rgba(27,67,50,0.4)' }}
      >
        <ion-icon name={open ? 'close' : 'chatbubbles'} />
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: isRTL ? 'auto' : 24, left: isRTL ? 24 : 'auto',
          width: 380, maxHeight: '70vh', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', background: 'var(--t-card, #fff)',
          border: '1px solid var(--t-border, #e5e7eb)',
          animation: 'slideUp 0.3s ease',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1b4332, #2d6a4f)',
            padding: '16px 20px', color: '#fff',
            display: 'flex', alignItems: 'center', gap: 12,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              <ion-icon name="sparkles" />
            </div>
            <div style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>CoreHR AI</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{isRTL ? 'مساعدك الذكي' : 'Smart HR Assistant'}</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
            minHeight: 300, maxHeight: 'calc(70vh - 160px)', background: 'var(--t-bg, #f9fafb)',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}>
                {msg.from === 'bot' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, #1b4332, #40916c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 14, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0,
                  }}>
                    <ion-icon name="sparkles" />
                  </div>
                )}
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', direction: isRTL ? 'rtl' : 'ltr',
                  ...(msg.from === 'user' ? {
                    background: 'linear-gradient(135deg, #1b4332, #2d6a4f)', color: '#fff',
                    borderBottomRightRadius: isRTL ? 12 : 2, borderBottomLeftRadius: isRTL ? 2 : 12,
                  } : {
                    background: 'var(--t-card, #fff)', color: 'var(--t-text, #1a1a1a)',
                    border: '1px solid var(--t-border, #e5e7eb)',
                    borderBottomLeftRadius: isRTL ? 12 : 2, borderBottomRightRadius: isRTL ? 2 : 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }),
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, #1b4332, #40916c)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 14,
                }}>
                  <ion-icon name="sparkles" />
                </div>
                <div style={{
                  background: 'var(--t-card, #fff)', border: '1px solid var(--t-border)',
                  borderRadius: 12, padding: '10px 18px', fontSize: 20,
                }}>
                  <span style={{ animation: 'pulse 1.5s infinite' }}>...</span>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && (
            <div style={{
              padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: 6,
              borderTop: '1px solid var(--t-border, #e5e7eb)',
            }}>
              {(QUICK_ACTIONS[lang] || QUICK_ACTIONS.en).map((qa, i) => (
                <button key={i} onClick={() => send(qa.msg)} style={{
                  padding: '5px 12px', borderRadius: 20, border: '1px solid var(--t-border, #e5e7eb)',
                  background: 'var(--t-card, #fff)', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  color: '#40916c', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.target.style.background = '#40916c'; e.target.style.color = '#fff' }}
                  onMouseLeave={e => { e.target.style.background = 'var(--t-card, #fff)'; e.target.style.color = '#40916c' }}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--t-border, #e5e7eb)',
            display: 'flex', gap: 8, alignItems: 'center', background: 'var(--t-card, #fff)',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isRTL ? 'اكتب سؤالك هنا...' : 'Type your question...'}
              disabled={loading}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 13,
                border: '1px solid var(--t-border, #e5e7eb)', outline: 'none',
                background: 'var(--t-bg, #f9fafb)', color: 'var(--t-text, #1a1a1a)',
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: input.trim() ? 'linear-gradient(135deg, #1b4332, #40916c)' : '#e5e7eb',
                color: input.trim() ? '#fff' : '#9ca3af', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <ion-icon name="send" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </>
  )
}
