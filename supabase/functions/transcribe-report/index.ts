// No audio or transcript is persisted or logged by this function.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const MAX_AUDIO = 10 * 1024 * 1024;
const formats = new Map([
  ['audio/webm', 'webm'], ['audio/mp4', 'mp4'], ['audio/wav', 'wav'],
]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Método inválido.' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Entre novamente para transcrever.' }, 401);

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const headers = { Authorization: authorization, apikey: Deno.env.get('SUPABASE_ANON_KEY') || '' };
    // Validate the token with Auth, then authorize using the database, never user_metadata.
    const auth = await fetch(`${url}/auth/v1/user`, { headers, signal: AbortSignal.timeout(10000) });
    if (!auth.ok) return json({ error: 'Entre novamente para transcrever.' }, 401);
    const user = await auth.json();
    const profileResponse = await fetch(`${url}/rest/v1/perfis?id=eq.${encodeURIComponent(user.id)}&select=papel`, {
      headers, signal: AbortSignal.timeout(10000),
    });
    if (!profileResponse.ok) return json({ error: 'Não foi possível verificar seu perfil.' }, 503);
    const profiles = await profileResponse.json();
    if (profiles[0]?.papel !== 'psicologo') return json({ error: 'Recurso exclusivo para psicólogos.' }, 403);

    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) return json({ error: 'A transcrição ainda não foi ativada. É necessário configurar o serviço de áudio.' }, 503);
    if (req.method === 'GET') return json({ ready: true });

    const type = (req.headers.get('Content-Type') || '').split(';')[0].toLowerCase();
    const extension = formats.get(type);
    if (!extension) return json({ error: 'Formato de áudio não suportado.' }, 415);
    if (Number(req.headers.get('Content-Length')) > MAX_AUDIO) return json({ error: 'O áudio excede 10 MB.' }, 413);
    const reader = req.body?.getReader();
    if (!reader) return json({ error: 'Áudio vazio.' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AUDIO) {
        await reader.cancel();
        return json({ error: 'O áudio excede 10 MB.' }, 413);
      }
      chunks.push(value);
    }
    if (!size) return json({ error: 'Áudio vazio.' }, 400);
    const audio = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { audio.set(chunk, offset); offset += chunk.byteLength; }
    const form = new FormData();
    form.append('file', new Blob([audio], { type }), `anotacao.${extension}`);
    form.append('model', 'gpt-4o-transcribe');
    form.append('language', 'pt');
    form.append('response_format', 'json');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form,
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) return json({ error: response.status === 429
      ? 'O serviço de transcrição está sem capacidade no momento. Tente novamente mais tarde.'
      : 'Não foi possível transcrever. Tente novamente.' }, 502);
    const result = await response.json();
    if (typeof result.text !== 'string' || !result.text.trim()) return json({ error: 'Nenhuma fala foi reconhecida. Grave novamente.' }, 422);
    return json({ text: result.text.trim() });
  } catch {
    return json({ error: 'O serviço de transcrição está indisponível. Tente novamente.' }, 503);
  }
});
