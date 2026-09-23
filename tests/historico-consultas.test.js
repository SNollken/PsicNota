"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const page = path.join(__dirname, "..", "psicologo", "historico-consultas.html");

/* historico-consultas.html já foi uma página 100% estática com pacientes
   fictícios. Agora ela precisa estar ligada ao banco: scripts da stack Supabase
   + o JS da própria página + o hook #appointmentsList que o JS preenche. */

test("historico-consultas.html carrega a stack Supabase", () => {
  const html = fs.readFileSync(page, "utf8");
  assert.ok(html.includes("supabase-client.js"), "falta supabase-client.js");
  assert.ok(html.includes("shared-data.js"), "falta shared-data.js");
  assert.ok(html.includes("profile-backend.js"), "falta profile-backend.js");
});

test("historico-consultas.html carrega o próprio JS", () => {
  const html = fs.readFileSync(page, "utf8");
  assert.ok(
    html.includes("historico-consultas.js"),
    "historico-consultas.js não está incluído na página"
  );
});

test("historico-consultas.html expõe o hook #appointmentsList", () => {
  const html = fs.readFileSync(page, "utf8");
  assert.ok(
    html.includes('id="appointmentsList"'),
    "falta id=\"appointmentsList\" — o JS não tem onde renderizar as consultas"
  );
});
