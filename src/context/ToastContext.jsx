import { createContext, useCallback, useContext, useState } from 'react'
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'

const ToastContext = createContext(null)

let idc = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (msg, type = 'info', timeout = 3500) => {
      const id = ++idc
      setToasts((t) => [...t, { id, msg, type }])
      if (timeout) setTimeout(() => remove(id), timeout)
      return id
    },
    [remove]
  )

  const toast = {
    success: (m, t) => push(m, 'success', t),
    error: (m, t) => push(m, 'error', t),
    info: (m, t) => push(m, 'info', t)
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,360px)]">
        {toasts.map((t) => {
          const Icon = t.type === 'success' ? FiCheckCircle : t.type === 'error' ? FiAlertCircle : FiInfo
          const color =
            t.type === 'success' ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
            : t.type === 'error' ? 'text-stone-700 bg-stone-100 border-stone-300'
            : 'text-primary-600 bg-primary-50 border-primary-200'
          return (
            <div key={t.id} className={`card flex items-start gap-2.5 px-3.5 py-3 text-sm ${color}`}>
              <Icon className="mt-0.5 shrink-0" />
              <div className="flex-1">{t.msg}</div>
              <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100">
                <FiX />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
