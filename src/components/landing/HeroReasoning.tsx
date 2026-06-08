'use client'

import { useCompletion } from '@ai-sdk/react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrambleText } from '@/components/ui/scramble-text'
import { siteConfig } from '@/lib/site-config'

const SUB = "One loop. Design aligns. Engineering ships. Marketing measures. Business decides."

type Phase = 'idle' | 'thinking' | 'streaming' | 'done'

export function HeroReasoning() {
  const [phase, setPhase] = useState<Phase>('idle')

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/hero',
    streamProtocol: 'text',
    onFinish: () => setPhase('done'),
    onError: () => setPhase('done'),
  })

  useEffect(() => {
    setPhase('thinking')
    complete('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (completion && phase === 'thinking') setPhase('streaming')
  }, [completion, phase])

  const isDone = phase === 'done'

  return (
    <div className="flex flex-col items-center gap-8 text-center max-w-2xl mx-auto px-6">
      {/* Thinking / headline slot */}
      <div className="relative w-full min-h-[4rem] flex items-center justify-center">
        <AnimatePresence>
          {(phase === 'thinking' || phase === 'idle') && (
            <motion.div
              key="thinking"
              className="absolute flex items-center gap-2.5 text-[13px] text-muted-foreground font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span>thinking</span>
              <ThinkingDots />
            </motion.div>
          )}
        </AnimatePresence>

        {completion && (
          <motion.h1
            className="w-full text-[clamp(1.75rem,4.5vw,3rem)] font-black tracking-tight leading-[1.15] text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {completion}
          </motion.h1>
        )}
      </div>

      {/* Sub — fades in when done */}
      <AnimatePresence>
        {isDone && (
          <motion.p
            key="sub"
            className="text-[16px] text-muted-foreground leading-relaxed max-w-md"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <ScrambleText text={SUB} duration={2} delay={0.3} />
          </motion.p>
        )}
      </AnimatePresence>

      {/* CTA — reveals last */}
      <AnimatePresence>
        {isDone && (
          <motion.div
            key="cta"
            className="flex items-center gap-3 flex-wrap justify-center"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <Button size="lg" asChild>
              <a href="#subscribe">Subscribe for beta</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer">
                GitHub ↗
              </a>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-1 h-1 rounded-full bg-muted-foreground/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}
