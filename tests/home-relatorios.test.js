"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const homeJs = path.join(__dirname, "..", "assets", "js", "psicologo", "home.js");

/* A home do psicólogo é a primeira tela após o login. Ela não pode exibir a
   frase "Relatórios ainda não são salvos no banco." — a tabela `relatorios`
   existe, tem seed data e é parte do escopo do MVP. */

test("home.js não contém o stub falso sobre relatórios", () => {
  const source = fs.readFileSync(homeJs, "utf8");
  assert.ok(
    !source.includes("Relatórios ainda não são salvos no banco."),
    "home.js ainda exibe a mensagem falsa de que relatórios não são salvos no banco"
  );
});

test("home.js consulta a tabela relatorios", () => {
  const source = fs.readFileSync(homeJs, "utf8");
  assert.ok(
    source.includes('.from("relatorios")'),
    "home.js não consulta a tabela relatorios — os relatórios recentes não vêm do banco"
  );
});
