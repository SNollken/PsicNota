// Recebe o feedback da caixa presente em todas as telas do PsicNota.
// Grava no KV e expõe leitura/remoção autenticadas por token para o workflow
// que leva os itens ao TODO do projeto no HermesSync.

const ORIGEM_PERMITIDA = /^https:\/\/psicnota\.onrender\.com$|^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

function cors(origem) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origem && ORIGEM_PERMITIDA.test(origem)) headers["Access-Control-Allow-Origin"] = origem;
  return headers;
}

function json(dados, status, origem) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origem) },
  });
}

export default {
  async fetch(req, env) {
    const origem = req.headers.get("Origin") || "";
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origem) });

    const url = new URL(req.url);

    if (req.method === "POST") {
      if (Number(req.headers.get("content-length") || 0) > 12000) return json({ error: "grande" }, 413, origem);

      let dados;
      try {
        dados = await req.json();
      } catch {
        return json({ error: "json" }, 400, origem);
      }

      // Campo invisível para pessoas: se vier preenchido, é bot.
      if (dados.site) return json({ ok: true }, 201, origem);

      const mensagem = String(dados.mensagem || "").trim();
      if (mensagem.length < 3 || mensagem.length > 2000) return json({ error: "mensagem" }, 400, origem);

      const ip = req.headers.get("CF-Connecting-IP") || "0";
      if (await env.FEEDBACK.get(`rl:${ip}`)) return json({ error: "rate" }, 429, origem);
      await env.FEEDBACK.put(`rl:${ip}`, "1", { expirationTtl: 60 });

      const id = `fb:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
      const item = {
        mensagem,
        tela: String(dados.tela || "").slice(0, 200),
        papel: String(dados.papel || "").slice(0, 30),
        contato: String(dados.contato || "").trim().slice(0, 200),
        criado_em: new Date().toISOString(),
        ua: String(req.headers.get("User-Agent") || "").slice(0, 300),
      };
      await env.FEEDBACK.put(id, JSON.stringify(item));
      return json({ ok: true }, 201, origem);
    }

    if (req.method === "GET" || req.method === "DELETE") {
      if (url.searchParams.get("token") !== env.FEEDBACK_TOKEN) return json({ error: "token" }, 401, origem);

      if (req.method === "GET") {
        const limite = Math.min(Number(url.searchParams.get("limit") || 50), 100);
        const lista = await env.FEEDBACK.list({ prefix: "fb:", limit: limite });
        const itens = [];
        for (const chave of lista.keys) {
          const valor = await env.FEEDBACK.get(chave.name);
          if (valor) itens.push({ id: chave.name, ...JSON.parse(valor) });
        }
        return json({ itens, cursor: lista.cursor || null }, 200, origem);
      }

      const chaves = (url.searchParams.get("keys") || "")
        .split(",")
        .filter((chave) => chave.startsWith("fb:"))
        .slice(0, 100);
      for (const chave of chaves) await env.FEEDBACK.delete(chave);
      return json({ ok: true, removidos: chaves.length }, 200, origem);
    }

    return json({ error: "metodo" }, 405, origem);
  },
};
