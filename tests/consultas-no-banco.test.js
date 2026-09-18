"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const SHARED = "assets/js/shared-data.js";
const CONSUMERS = [
  "assets/js/agenda-psicologo.js",
  "assets/js/paciente/agenda-paciente.js",
  "assets/js/paciente/home.js"
];

test("a fonte única de consultas é o shared-data.js", () => {
  const source = read(SHARED);
  assert.match(source, /\.from\("consultas"\)/, "shared-data.js não consulta public.consultas");
  assert.match(source, /normalizeAppointment\s*\(/, "falta normalizador de consulta");
  assert.match(source, /saveAppointments\(/, "falta write-through no cache de consultas");
});

test("as telas de agenda leem a fonte compartilhada em vez de só localStorage", () => {
  CONSUMERS.forEach((file) => {
    const source = read(file);
    assert.match(
      source,
      /loadAppointmentsFromDb|syncRemoteData/,
      `${file} não chama o loader compartilhado de consultas`
    );
  });
});

test("campos do banco são adaptados para o formato da interface", () => {
  const source = read(SHARED);

  // horario (time) -> "HH:MM"
  assert.match(source, /\.slice\(0,\s*5\)/, "horario não está sendo truncado para HH:MM");
  // modalidade -> "Online"/"Presencial"
  assert.match(source, /capitalizeFirst\(row\.modalidade\)/, "modalidade não está sendo capitalizada");
  // status do banco é preservado (completed/confirmed/cancelled)
  assert.match(source, /status:\s*row\.status/, "status não está sendo preservado");
  // notas e relatórios também têm loader próprio
  assert.match(source, /\.from\("notas"\)/, "faltando leitura de public.notas");
  assert.match(source, /\.from\("relatorios"\)/, "faltando leitura de public.relatorios");
});

test("sem sessão autenticada o cache local permanece a fonte", () => {
  const source = read(SHARED);
  assert.match(source, /getAuthUser/, "falta resolução de sessão");
  assert.match(source, /if \(!user\) return null/, "falta fallback para cache local");
});

test("toda página com supabase-client.js carrega o CDN do Supabase antes", () => {
  const pastas = ["", "auth", "paciente", "psicologo"];
  const paginas = pastas.flatMap((pasta) => {
    const dir = pasta ? path.join(root, pasta) : root;
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((entrada) => entrada.isFile() && entrada.name.endsWith(".html"))
      .map((entrada) => (pasta ? path.join(pasta, entrada.name) : entrada.name));
  });

  paginas.forEach((arquivo) => {
    const fonte = read(arquivo);
    const temCliente = fonte.includes("assets/js/supabase-client.js");
    if (!temCliente) return;
    const posicaoCdn = fonte.indexOf("cdn.jsdelivr.net/npm/@supabase");
    const posicaoCliente = fonte.indexOf("assets/js/supabase-client.js");
    assert.notEqual(posicaoCdn, -1, `${arquivo} carrega supabase-client.js sem o CDN do Supabase`);
    assert.ok(posicaoCdn < posicaoCliente, `${arquivo}: o CDN deve vir antes de supabase-client.js`);
  });
});
