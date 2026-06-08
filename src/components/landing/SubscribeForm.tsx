'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

type State = 'idle' | 'loading' | 'success' | 'error'

export function SubscribeForm() {
  const [state, setState] = useState<State>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const email = inputRef.current?.value ?? ''
    if (!email) return

    setState('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <p className="text-[14px] text-muted-foreground font-mono">
        You&apos;re on the list. We&apos;ll be in touch.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm mx-auto">
      <input
        ref={inputRef}
        type="email"
        required
        placeholder="you@company.com"
        className="flex-1 h-10 px-3 text-[14px] bg-background border border-border rounded-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Button type="submit" disabled={state === 'loading'} size="default">
        {state === 'loading' ? '…' : 'Subscribe'}
      </Button>
    </form>
  )
}
