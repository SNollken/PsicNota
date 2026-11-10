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

const MAX_ANEXOS = 3;
const MAX_BYTES = 3 * 1024 * 1024;

function base64(buffer) {
  const bytes = new Uint8Array(buffer);
  let saida = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    saida += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(saida);
}

function tipoPermitido(tipo) {
  return String(tipo || "").startsWith("image/") || tipo === "application/pdf";
}

export default {
  async fetch(req, env) {
    const origem = req.headers.get("Origin") || "";
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origem) });

    const url = new URL(req.url);

    if (req.method === "POST") {
      const tipoConteudo = String(req.headers.get("Content-Type") || "").toLowerCase();
      const multipart = tipoConteudo.includes("multipart/form-data");
      let dados = {};
      const arquivos = [];

      if (multipart) {
        let form;
        try {
          form = await req.formData();
        } catch {
          return json({ error: "form" }, 400, origem);
        }
        for (const campo of ["mensagem", "tela", "papel", "contato", "site"]) {
          dados[campo] = form.get(campo);
        }
        for (const [campo, valor] of form.entries()) {
          if (campo === "anexos" && typeof valor !== "string" && valor && valor.size > 0) {
            arquivos.push(valor);
          }
        }
      } else {
        if (Number(req.headers.get("content-length") || 0) > 12000) return json({ error: "grande" }, 413, origem);
        try {
          dados = await req.json();
        } catch {
          return json({ error: "json" }, 400, origem);
        }
      }

      // Campo invisível para pessoas: se vier preenchido, é bot.
      if (dados.site) return json({ ok: true }, 201, origem);

      const mensagem = String(dados.mensagem || "").trim();
      if (mensagem.length < 3 || mensagem.length > 2000) return json({ error: "mensagem" }, 400, origem);
      if (arquivos.length > MAX_ANEXOS) return json({ error: "anexos" }, 400, origem);
      for (const arquivo of arquivos) {
        if (!tipoPermitido(arquivo.type) || arquivo.size > MAX_BYTES) return json({ error: "anexo" }, 400, origem);
      }

      const ip = req.headers.get("CF-Connecting-IP") || "0";
      if (await env.FEEDBACK.get(`rl:${ip}`)) return json({ error: "rate" }, 429, origem);
      await env.FEEDBACK.put(`rl:${ip}`, "1", { expirationTtl: 60 });

      const id = `fb:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
      const anexos = [];
      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const nome = String(arquivo.name || "anexo").replace(/[^\w.\-]+/g, "_").slice(0, 80) || "anexo";
        const chave = `anx:${id}:${i}`;
        const conteudo = {
          nome,
          tipo: arquivo.type,
          tamanho: arquivo.size,
          base64: base64(await arquivo.arrayBuffer()),
        };
        await env.FEEDBACK.put(chave, JSON.stringify(conteudo));
        anexos.push({ nome, tipo: arquivo.type, tamanho: arquivo.size, chave });
      }

      const item = {
        mensagem,
        tela: String(dados.tela || "").slice(0, 200),
        papel: String(dados.papel || "").slice(0, 30),
        contato: String(dados.contato || "").trim().slice(0, 200),
        criado_em: new Date().toISOString(),
        ua: String(req.headers.get("User-Agent") || "").slice(0, 300),
        anexos,
      };
      await env.FEEDBACK.put(id, JSON.stringify(item));
      return json({ ok: true }, 201, origem);
    }

    if (req.method === "GET" || req.method === "DELETE") {
      if (url.searchParams.get("token") !== env.FEEDBACK_TOKEN) return json({ error: "token" }, 401, origem);

      if (req.method === "GET") {
        const anexo = url.searchParams.get("anexo");
        if (anexo) {
          if (!anexo.startsWith("anx:")) return json({ error: "anexo" }, 400, origem);
          const valor = await env.FEEDBACK.get(anexo);
          if (!valor) return json({ error: "anexo" }, 404, origem);
          return new Response(valor, {
            headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origem) },
          });
        }

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
      for (const chave of chaves) {
        const valor = await env.FEEDBACK.get(chave);
        if (valor) {
          try {
            const item = JSON.parse(valor);
            for (const anexo of item.anexos || []) await env.FEEDBACK.delete(anexo.chave);
          } catch {}
        }
        await env.FEEDBACK.delete(chave);
      }
      return json({ ok: true, removidos: chaves.length }, 200, origem);
    }

    return json({ error: "metodo" }, 405, origem);
  },
};
