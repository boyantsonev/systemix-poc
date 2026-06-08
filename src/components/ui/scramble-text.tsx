'use client'

import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*<>[]{}|'

function scramble(progress: number, target: string, seed: number): string {
  const revealed = Math.floor(progress * target.length)
  return target
    .split('')
    .map((char, i) => {
      if (i < revealed) return char
      if (char === ' ') return ' '
      // Deterministic-ish random per position to avoid React batching jitter
      const idx = Math.floor(((seed + i * 7) % CHARS.length + CHARS.length) % CHARS.length)
      return CHARS[idx]
    })
    .join('')
}

interface ScrambleTextProps {
  text: string
  duration?: number
  delay?: number
  className?: string
  as?: keyof JSX.IntrinsicElements
}

export function ScrambleText({
  text,
  duration = 1.2,
  delay = 0,
  className,
  as: Tag = 'span',
}: ScrambleTextProps) {
  const [display, setDisplay] = useState(() => scramble(0, text, 0))
  const seedRef = useRef(0)

  useEffect(() => {
    const controls = animate(0, 1, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate(progress) {
        seedRef.current = (seedRef.current + 13) % CHARS.length
        setDisplay(scramble(progress, text, seedRef.current))
      },
    })
    return controls.stop
  }, [text, duration, delay])

  return <Tag className={className}>{display}</Tag>
}
