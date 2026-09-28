"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("fluxos ativos do psicólogo abrem o perfil novo sem passar pelo histórico legado", () => {
  const patientsJs = read("assets/js/psicologo/pacientes.js");
  const consultationJs = read("assets/js/psicologo/consulta.js");
  const consultationHtml = read("psicologo/consulta.html");

  assert.doesNotMatch(patientsJs, /historico\.html\?/);
  assert.doesNotMatch(consultationJs, /historico\.html\?/);
  assert.doesNotMatch(consultationHtml, /href=["']historico\.html["']/);

  assert.match(patientsJs, /paciente-perfil\.html\?/);
  assert.match(consultationJs, /paciente-perfil\.html\?/);
  assert.match(consultationHtml, /href=["']paciente-perfil\.html["']/);
});

test("rotas antigas do perfil são somente aliases de compatibilidade", () => {
  const aliases = [
    ["psicologo/historico.html", "overview"],
    ["psicologo/historico-notas.html", "notes"],
    ["psicologo/historico-relatorios.html", "reports"]
  ];

  for (const [file, tab] of aliases) {
    const html = read(file);
    assert.match(html, /window\.location\.replace\(`paciente-perfil\.html\?/);
    assert.match(html, new RegExp(`params\\.set\\(["']aba["'], ["']${tab}["']\\)`));
    assert.doesNotMatch(html, /assets\/js\/psicologo\/historico/);
  }
});
