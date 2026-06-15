import { useState, useCallback } from 'react'

export function useConfirm() {
  const [state, setState] = useState(null)

  const confirm = useCallback((opts = {}) => {
    return new Promise(resolve => {
      setState({
        title: opts.title || 'Confirm',
        message: opts.message || 'Are you sure?',
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        danger: opts.danger || false,
        resolve,
      })
    })
  }, [])

  const close = useCallback(answer => {
    if (state) state.resolve(answer)
    setState(null)
  }, [state])

  const dialog = state && (
    <div className="modal-overlay" onClick={() => close(false)}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{state.title}</span>
          <button className="modal-close" onClick={() => close(false)}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--t-text-muted, #555)' }}>{state.message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => close(false)}>{state.cancelText}</button>
          <button className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>{state.confirmText}</button>
        </div>
      </div>
    </div>
  )

  return [dialog, confirm]
}
