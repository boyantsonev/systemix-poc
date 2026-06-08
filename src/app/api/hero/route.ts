import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export const runtime = 'nodejs'

const FALLBACK = "The design system that learns from what you ship."

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return streamFallback()
  }

  try {
    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system:
        'Write a landing page hero headline. Output ONLY the headline — no quotes, no explanation. End with a period. Maximum 10 words.',
      prompt:
        'Systemix keeps design, engineering, marketing, and business aligned through one learning loop that measures what you ship.',
      temperature: 0,
      maxOutputTokens: 25,
    })
    return result.toTextStreamResponse()
  } catch {
    return streamFallback()
  }
}

function streamFallback() {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      await sleep(900)
      for (const char of FALLBACK) {
        controller.enqueue(encoder.encode(char))
        await sleep(25)
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
