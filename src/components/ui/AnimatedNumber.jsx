import { useEffect, useRef, useState } from 'react'

export default function AnimatedNumber({ value, duration = 800, suffix = '', className = '' }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const target = Number(value) || 0
    if (ref.current && !started.current) {
      started.current = true
      const start = performance.now()
      const from = 0
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        setDisplay(from + (target - from) * eased)
        if (p < 1) requestAnimationFrame(tick)
        else setDisplay(target)
      }
      requestAnimationFrame(tick)
    }
  }, [value, duration])

  const isFloat = !Number.isInteger(Number(value))
  const shown = isFloat ? display.toFixed(1) : Math.round(display)
  return (
    <span ref={ref} className={className}>
      {shown}
      {suffix}
    </span>
  )
}
