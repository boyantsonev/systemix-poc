const HEADLINE = "The design system that learns from what you ship."

export async function POST() {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      await sleep(900)
      for (const char of HEADLINE) {
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
