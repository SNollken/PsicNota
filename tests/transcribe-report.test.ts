import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

let handler: (req: Request) => Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((callback: typeof handler) => { handler = callback; return {}; }) as typeof Deno.serve;
await import('../supabase/functions/transcribe-report/index.ts');
Deno.serve = originalServe;

Deno.test('transcription authenticates and authorizes before provider access; validates audio and readiness', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = Deno.env.get;
  let hasKey = true;
  let role = 'psicologo';
  let authenticated = true;
  let providerStatus = 200;
  let providerCalls = 0;
  Deno.env.get = name => name === 'OPENAI_API_KEY' ? (hasKey ? 'test-key' : undefined)
    : name === 'SUPABASE_URL' ? 'https://test.supabase.co' : 'test-anon';
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) return Response.json({id:'test-id'}, {status:authenticated?200:401});
    if (url.includes('/rest/v1/perfis')) return Response.json([{papel:role}]);
    providerCalls++;
    const form = options?.body as FormData;
    assertEquals(form.get('model'), 'gpt-4o-transcribe');
    assertEquals(form.get('language'), 'pt');
    assertEquals(options?.headers, {Authorization:'Bearer test-key'});
    return Response.json(providerStatus === 200 ? {text:'Texto reconhecido.'} : {error:'private provider message'}, {status:providerStatus});
  };
  const request = (method='POST', type='audio/webm', body='audio', extra={}) => new Request('https://test/transcribe-report', {
    method, headers:{Authorization:'Bearer user-token','Content-Type':type,...extra}, ...(method==='POST'?{body}:{}),
  });
  try {
    assertEquals((await handler(new Request('https://test/'))).status,401);
    authenticated=false; assertEquals((await handler(request())).status,401); authenticated=true;
    role='paciente'; assertEquals((await handler(request())).status,403); role='psicologo';
    assertEquals(providerCalls,0);
    hasKey=false; assertEquals((await handler(request('GET'))).status,503); hasKey=true;
    assertEquals(await (await handler(request('GET'))).json(),{ready:true});
    assertEquals((await handler(request('POST','text/plain'))).status,415);
    assertEquals((await handler(request('POST','audio/webm',''))).status,400);
    assertEquals((await handler(request('POST','audio/webm','audio',{'Content-Length':'10485761'}))).status,413);
    assertEquals((await handler(request('POST','audio/webm','a'.repeat(10485761)))).status,413);
    assertEquals(providerCalls,0);
    assertEquals(await (await handler(request())).json(),{text:'Texto reconhecido.'});
    providerStatus=429;
    const failure=await handler(request());assertEquals(failure.status,502);
    assertEquals((await failure.text()).includes('private provider message'),false);
  } finally { globalThis.fetch=originalFetch; Deno.env.get=originalEnv; }
});
