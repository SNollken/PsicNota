"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Stubs de browser para poder carregar shared-data.js no Node
function createStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

function loadPsiNoteData({ supabaseStub } = {}) {
  const sandbox = {
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    console,
    Intl,
    setTimeout: () => 0,
    clearTimeout: () => {},
    crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000000" }
  };
  sandbox.window = sandbox;
  if (supabaseStub) sandbox.window.PsicNotaSupabase = supabaseStub;

  const source = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "shared-data.js"), "utf8");
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "shared-data.js" });
  return sandbox.window.PsiNoteData;
}

const LINHA_SEED = {
  id: "c1111111-1111-4111-8111-111111111111",
  psicologo_id: "psi-uuid",
  paciente_id: "pac-uuid",
  data: "2026-09-22",
  horario: "09:00:00",
  duracao_min: 50,
  modalidade: "online",
  status: "confirmed",
  observacao: "Sessão semanal.",
  origem: "psychologist",
  solicitacao_id: null,
  paciente: { nome_completo: "Mariana Lopes", nome_social: "" },
  psicologo: { nome_completo: "Helena Vasconcelos", nome_social: "" }
};

function clienteStub(consultas, relatorios, papel = "psicologo") {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "psi-uuid" } }, error: null }) },
    from: (tabela) => {
      if (tabela === "consultas") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({ data: consultas, error: null })
              })
            })
          })
        };
      }
      if (tabela === "relatorios") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: relatorios, error: null })
            })
          })
        };
      }
      if (tabela === "perfis") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { papel }, error: null })
            })
          })
        };
      }
      throw new Error(`tabela inesperada: ${tabela}`);
    }
  };
}

test("mapeia uma linha de consultas para o formato da interface via loader", async () => {
  const data = loadPsiNoteData({ supabaseStub: clienteStub([LINHA_SEED], []) });
  const [itens] = await Promise.all([data.loadAppointmentsFromDb()]);

  assert.equal(itens.length, 1);
  const item = itens[0];
  assert.equal(item.id, LINHA_SEED.id);
  assert.equal(item.patientId, "pac-uuid");
  assert.equal(item.patient, "Mariana Lopes");
  assert.equal(item.psychologist, "Helena Vasconcelos");
  assert.equal(item.date, "2026-09-22");
  assert.equal(item.time, "09:00", "horario deve virar HH:MM");
  assert.equal(item.duration, 50);
  assert.equal(item.mode, "Online", "modalidade deve ser capitalizada");
  assert.equal(item.status, "confirmed");
  assert.equal(item.source, "psychologist");
});

test("mapeia uma linha de relatorios para o formato da interface via loader", async () => {
  const linhaRelatorio = {
    id: "d1111111-1111-4111-8111-111111111111",
    psicologo_id: "psi-uuid",
    paciente_id: "pac-uuid",
    consulta_id: "c1111111-1111-4111-8111-111111111111",
    humor: "bem",
    status: "final",
    bloco_queixa: "Queixa",
    bloco_intervencao: "Intervenção",
    bloco_evolucao: "Evolução",
    bloco_encaminhamentos: "Encaminhamentos",
    texto_livre: "Texto livre",
    criado_em: "2026-09-01T10:00:00Z",
    atualizado_em: "2026-09-01T11:00:00Z",
    paciente: { nome_completo: "Mariana Lopes", nome_social: "Mariana" }
  };
  const data = loadPsiNoteData({ supabaseStub: clienteStub([], [linhaRelatorio]) });
  const relatorios = await data.loadReportsFromDb();

  assert.equal(relatorios.length, 1);
  const report = relatorios[0];
  assert.equal(report.patient, "Mariana", "nome social tem prioridade");
  assert.equal(report.appointmentId, linhaRelatorio.consulta_id);
  assert.equal(report.mood, "bem");
  assert.equal(report.status, "final");
  assert.equal(report.blocks.proxima, "Encaminhamentos");
  assert.equal(report.freeText, "Texto livre");
});

test("sem cliente Supabase os loaders retornam null e preservam o cache", async () => {
  const data = loadPsiNoteData({ supabaseStub: null });
  const resultado = await data.loadAppointmentsFromDb();
  assert.equal(resultado, null);
});

test("sem sessão autenticada o loader retorna null", async () => {
  const data = loadPsiNoteData({
    supabaseStub: {
      auth: { getUser: async () => ({ data: { user: null }, error: null }) }
    }
  });
  const resultado = await data.loadAppointmentsFromDb();
  assert.equal(resultado, null);
});

test("com sessão autenticada o loader faz write-through no cache", async () => {
  const data = loadPsiNoteData({ supabaseStub: clienteStub([LINHA_SEED], []) });

  const itens = await data.loadAppointmentsFromDb();
  assert.ok(Array.isArray(itens));
  assert.equal(itens.length, 1);
  assert.equal(itens[0].time, "09:00");
  assert.equal(data.getAppointments().length, 1, "cache local não recebeu write-through");
});
