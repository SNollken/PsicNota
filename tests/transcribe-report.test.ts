import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
let handler: (req: Request) => Response;
const originalServe = Deno.serve;
Deno.serve = ((callback: typeof handler) => { handler = callback; return {}; }) as typeof Deno.serve;
await import('../supabase/functions/transcribe-report/index.ts');
Deno.serve = originalServe;

Deno.test('retired cloud endpoint never reads audio or calls a provider', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('Cloud access forbidden'); };
  try {
    const request = new Request('https://test/transcribe-report', { method: 'POST', body: 'private-audio' });
    const response = handler(request);
    assertEquals(response.status, 410);
    assertEquals(request.bodyUsed, false);
    assertEquals(calls, 0);
    assertEquals((await response.json()).error.includes('modelo local'), true);
    assertEquals(handler(new Request('https://test/', { method: 'OPTIONS' })).status, 200);
  } finally { globalThis.fetch = originalFetch; }
});