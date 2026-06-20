import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

export default function CallSystem() {
  const { user } = useAuth()
  const socketRef     = useRef(null)
  const pcRef         = useRef(null)
  const localStream   = useRef(null)
  const remoteVideoEl = useRef(null)
  const localVideoEl  = useRef(null)

  const [callState, setCallState]           = useState('idle') // idle | calling | incoming | connecting | in-call
  const [incomingCall, setIncomingCall]     = useState(null)
  const [remoteSocket, setRemoteSocket]     = useState(null)
  const [adminOffline, setAdminOffline]     = useState(false)
  const [pendingTarget, setPendingTarget]   = useState(null)
  const [muted, setMuted]                   = useState(false)
  const [videoOff, setVideoOff]             = useState(false)

  // ── socket setup ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('register', {
        userId: user.id,
        isSuperuser: user.is_superuser,
        name: `${user.first_name} ${user.last_name}`,
      })
    })

    socket.on('incoming-call', ({ callerName, callerSocket }) => {
      setIncomingCall({ callerName, callerSocket })
      setCallState('incoming')
    })

    socket.on('call-accepted', ({ adminSocket }) => {
      setRemoteSocket(adminSocket)
      setCallState('in-call')
      setPendingTarget(adminSocket)
    })

    socket.on('call-rejected', () => {
      setCallState('idle')
    })

    socket.on('admin-offline', () => {
      setCallState('idle')
      setAdminOffline(true)
      setTimeout(() => setAdminOffline(false), 3500)
    })

    socket.on('webrtc-offer', ({ offer, from }) => {
      setRemoteSocket(from)
      handleOffer(offer, from)
    })

    socket.on('webrtc-answer', async ({ answer }) => {
      try { await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer)) } catch {}
    })

    socket.on('ice-candidate', async ({ candidate }) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
    })

    socket.on('call-ended', () => cleanup())

    return () => { socket.disconnect() }
  }, [user])

  // ── when pendingTarget is set and in-call UI is rendered, start WebRTC ──
  useEffect(() => {
    if (callState === 'in-call' && pendingTarget) {
      setPendingTarget(null)
      startAsInitiator(pendingTarget)
    }
  }, [callState, pendingTarget])

  // ── helpers ───────────────────────────────────────────────────
  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    localStream.current = stream
    if (localVideoEl.current) localVideoEl.current.srcObject = stream
    return stream
  }

  const buildPC = useCallback((targetSocket) => {
    const pc = new RTCPeerConnection(ICE)
    pcRef.current = pc
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current.emit('ice-candidate', { to: targetSocket, candidate })
    }
    pc.ontrack = (e) => {
      if (remoteVideoEl.current) remoteVideoEl.current.srcObject = e.streams[0]
    }
    return pc
  }, [])

  const startAsInitiator = async (targetSocket) => {
    try {
      const stream = await getMedia()
      const pc = buildPC(targetSocket)
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socketRef.current.emit('webrtc-offer', { to: targetSocket, offer })
    } catch (e) { console.error('startAsInitiator:', e) }
  }

  const handleOffer = async (offer, from) => {
    try {
      const stream = await getMedia()
      const pc = buildPC(from)
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socketRef.current.emit('webrtc-answer', { to: from, answer })
      setCallState('in-call')
    } catch (e) { console.error('handleOffer:', e) }
  }

  const cleanup = () => {
    localStream.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    pcRef.current    = null
    localStream.current = null
    setCallState('idle')
    setIncomingCall(null)
    setRemoteSocket(null)
    setPendingTarget(null)
    setMuted(false)
    setVideoOff(false)
  }

  // ── actions ───────────────────────────────────────────────────
  const callAdmin = () => {
    setCallState('calling')
    socketRef.current.emit('call-admin', {
      callerId: user.id,
      callerName: `${user.first_name} ${user.last_name}`,
    })
  }

  const acceptCall = () => {
    socketRef.current.emit('accept-call', { callerSocket: incomingCall.callerSocket })
    setCallState('connecting')
  }

  const rejectCall = () => {
    socketRef.current.emit('reject-call', { callerSocket: incomingCall.callerSocket })
    setIncomingCall(null)
    setCallState('idle')
  }

  const endCall = () => {
    const target = remoteSocket || incomingCall?.callerSocket
    if (target) socketRef.current.emit('end-call', { to: target })
    cleanup()
  }

  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = muted })
    setMuted(m => !m)
  }

  const toggleVideo = () => {
    localStream.current?.getVideoTracks().forEach(t => { t.enabled = videoOff })
    setVideoOff(v => !v)
  }

  if (!user) return null
  const isEmployee = !user.is_superuser

  return (
    <>
      {/* ── Call Button (employees only) ── */}
      {isEmployee && callState === 'idle' && (
        <button onClick={callAdmin} style={S.callBtn} title="Call Admin">
          <ion-icon name="call" />
        </button>
      )}

      {/* ── Calling (waiting for admin) ── */}
      {callState === 'calling' && (
        <div style={S.overlay}>
          <div style={S.card}>
            <div style={S.bigAvatar}>🧑‍💼</div>
            <div style={S.callerName}>Super Admin</div>
            <div style={S.callerStatus}>Calling...</div>
            <div style={S.dots}><span /><span /><span /></div>
            <button onClick={endCall} style={S.redBtn}>
              <ion-icon name="call" style={{ transform: 'rotate(135deg)' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Incoming Call (admin sees this) ── */}
      {callState === 'incoming' && incomingCall && (
        <div style={S.overlay}>
          <div style={S.card}>
            <div style={S.ringWrap}>
              <div style={S.ring} />
              <div style={S.bigAvatar}>👤</div>
            </div>
            <div style={S.callerName}>{incomingCall.callerName}</div>
            <div style={S.callerStatus}>Incoming Call</div>
            <div style={S.actionRow}>
              <div style={{ textAlign: 'center' }}>
                <button onClick={rejectCall} style={S.redBtn}>
                  <ion-icon name="call" style={{ transform: 'rotate(135deg)' }} />
                </button>
                <div style={S.btnLabel}>Decline</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button onClick={acceptCall} style={S.greenBtn}>
                  <ion-icon name="call" />
                </button>
                <div style={S.btnLabel}>Accept</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Connecting ── */}
      {callState === 'connecting' && (
        <div style={S.overlay}>
          <div style={S.card}>
            <div style={S.bigAvatar}>🔗</div>
            <div style={S.callerName}>Connecting...</div>
            <div style={S.dots}><span /><span /><span /></div>
          </div>
        </div>
      )}

      {/* ── In Call (video) ── */}
      {callState === 'in-call' && (
        <div style={S.videoWrap}>
          {/* Remote video fullscreen */}
          <video ref={remoteVideoEl} autoPlay playsInline style={S.remoteVid} />

          {/* Local video PiP */}
          <video ref={localVideoEl} autoPlay playsInline muted style={{
            ...S.localVid,
            filter: videoOff ? 'brightness(0)' : 'none',
          }} />

          {/* Label */}
          <div style={S.callLabel}>
            <div style={S.greenDot} />
            Live Call
          </div>

          {/* Controls */}
          <div style={S.controls}>
            <button onClick={toggleMute} style={{ ...S.ctrlBtn, background: muted ? '#ef4444' : 'rgba(255,255,255,0.15)' }} title={muted ? 'Unmute' : 'Mute'}>
              <ion-icon name={muted ? 'mic-off' : 'mic'} />
            </button>
            <button onClick={endCall} style={S.redBtn} title="End Call">
              <ion-icon name="call" style={{ transform: 'rotate(135deg)' }} />
            </button>
            <button onClick={toggleVideo} style={{ ...S.ctrlBtn, background: videoOff ? '#ef4444' : 'rgba(255,255,255,0.15)' }} title={videoOff ? 'Turn Video On' : 'Turn Video Off'}>
              <ion-icon name={videoOff ? 'videocam-off' : 'videocam'} />
            </button>
          </div>
        </div>
      )}

      {/* ── Admin Offline Toast ── */}
      {adminOffline && (
        <div style={S.toast}>
          <ion-icon name="wifi-outline" style={{ marginRight: 8 }} />
          Admin is currently offline
        </div>
      )}

      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.3);opacity:1} }
        @keyframes ripple   { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
        @keyframes blink    { 0%,100%{opacity:.3} 50%{opacity:1} }
        [data-call-dot] span { display:inline-block; width:8px; height:8px; border-radius:50%;
          background:#52b788; margin:0 3px; animation:blink 1.2s infinite; }
        [data-call-dot] span:nth-child(2){animation-delay:.2s}
        [data-call-dot] span:nth-child(3){animation-delay:.4s}
      `}</style>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  callBtn: {
    position:'fixed', bottom:90, right:90, width:50, height:50,
    borderRadius:'50%', border:'none', cursor:'pointer', zIndex:9998,
    background:'linear-gradient(135deg,#1b4332,#40916c)', color:'#fff',
    fontSize:22, display:'flex', alignItems:'center', justifyContent:'center',
    boxShadow:'0 4px 16px rgba(27,67,50,0.45)',
    transition:'transform .2s, box-shadow .2s',
  },
  overlay: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000,
    backdropFilter:'blur(6px)',
  },
  card: {
    background:'linear-gradient(160deg,#1a3c2e,#2d6a4f)',
    borderRadius:28, padding:'44px 64px', textAlign:'center',
    color:'#fff', animation:'fadeUp .35s ease',
    boxShadow:'0 24px 64px rgba(0,0,0,0.5)',
    minWidth:280,
  },
  bigAvatar: { fontSize:64, marginBottom:20, display:'block' },
  callerName: { fontSize:22, fontWeight:700, marginBottom:6 },
  callerStatus: { fontSize:13, opacity:.7, marginBottom:28 },
  dots: { marginBottom:32, display:'flex', gap:8, justifyContent:'center' },
  actionRow: { display:'flex', gap:48, justifyContent:'center', marginTop:8 },
  btnLabel: { fontSize:11, opacity:.7, marginTop:8 },
  greenBtn: {
    width:64, height:64, borderRadius:'50%', border:'none', cursor:'pointer',
    background:'#22c55e', color:'#fff', fontSize:28,
    display:'flex', alignItems:'center', justifyContent:'center',
    boxShadow:'0 4px 20px rgba(34,197,94,0.5)', transition:'transform .15s',
  },
  redBtn: {
    width:64, height:64, borderRadius:'50%', border:'none', cursor:'pointer',
    background:'#ef4444', color:'#fff', fontSize:28,
    display:'flex', alignItems:'center', justifyContent:'center',
    margin:'0 auto', boxShadow:'0 4px 20px rgba(239,68,68,0.5)',
    transition:'transform .15s',
  },
  ringWrap: { position:'relative', width:80, height:80, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center' },
  ring: {
    position:'absolute', inset:-10, borderRadius:'50%',
    border:'3px solid rgba(255,255,255,0.4)',
    animation:'ripple 1.6s ease-out infinite',
  },
  videoWrap: {
    position:'fixed', inset:0, background:'#000', zIndex:10000,
  },
  remoteVid: { width:'100%', height:'100%', objectFit:'cover' },
  localVid: {
    position:'absolute', bottom:100, right:20, width:180, height:130,
    borderRadius:14, objectFit:'cover',
    border:'2px solid rgba(255,255,255,0.6)',
    boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
  },
  callLabel: {
    position:'absolute', top:20, left:20,
    background:'rgba(0,0,0,0.5)', color:'#fff',
    padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600,
    display:'flex', alignItems:'center', gap:8, backdropFilter:'blur(4px)',
  },
  greenDot: {
    width:8, height:8, borderRadius:'50%', background:'#4ade80',
    animation:'pulse 1.5s infinite',
  },
  controls: {
    position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)',
    display:'flex', gap:20, alignItems:'center',
  },
  ctrlBtn: {
    width:52, height:52, borderRadius:'50%', border:'none', cursor:'pointer',
    color:'#fff', fontSize:22,
    display:'flex', alignItems:'center', justifyContent:'center',
    backdropFilter:'blur(8px)', transition:'background .2s',
  },
  toast: {
    position:'fixed', bottom:110, right:24,
    background:'#ef4444', color:'#fff',
    padding:'12px 20px', borderRadius:14, zIndex:10001,
    fontSize:13, fontWeight:600, display:'flex', alignItems:'center',
    boxShadow:'0 4px 20px rgba(239,68,68,0.4)',
    animation:'fadeUp .3s ease',
  },
}
