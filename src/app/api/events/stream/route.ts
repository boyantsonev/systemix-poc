import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EVENTS_DIR = path.join(process.cwd(), '.systemix', 'events');
const POLL_INTERVAL_MS = 1000;

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let lastSeen = new Date(req.nextUrl.searchParams.get('since') ?? 0).getTime();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial "connected" event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`));

      // Poll events dir every POLL_INTERVAL_MS
      const interval = setInterval(async () => {
        try {
          if (!fs.existsSync(EVENTS_DIR)) return;

          const files = fs.readdirSync(EVENTS_DIR)
            .filter(f => f.endsWith('.json'))
            .sort(); // ISO timestamp prefix sorts correctly

          const newEvents = [];
          for (const file of files) {
            const filePath = path.join(EVENTS_DIR, file);
            try {
              const stat = fs.statSync(filePath);
              if (stat.mtimeMs > lastSeen) {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                newEvents.push(content);
                if (stat.mtimeMs > lastSeen) lastSeen = stat.mtimeMs;
              }
            } catch { /* skip malformed */ }
          }

          for (const event of newEvents) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        } catch (err) {
          // Don't crash the stream on read errors
        }
      }, POLL_INTERVAL_MS);

      // Clean up on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
