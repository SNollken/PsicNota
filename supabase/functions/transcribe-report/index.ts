// Retired: audio transcription now runs entirely in the browser.
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
};
Deno.serve((req: Request) => req.method === 'OPTIONS'
  ? new Response(null, { headers })
  : Response.json({ error: 'Transcrição em nuvem desativada. Use o modelo local no navegador.' }, { status: 410, headers }));