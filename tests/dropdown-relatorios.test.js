"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const root = new URL("../", pathToFileURL(__filename));

test("relatorios.html contém a estrutura do dropdown customizado e select original", () => {
  const html = fs.readFileSync(new URL("psicologo/relatorios.html", root), "utf8");

  assert.ok(html.includes('id="appointmentDropdownBtn"'), 'falta id="appointmentDropdownBtn"');
  assert.ok(html.includes('aria-haspopup="listbox"'), 'falta aria-haspopup="listbox"');
  assert.ok(html.includes('id="appointmentDropdownList"'), 'falta id="appointmentDropdownList"');
  assert.ok(html.includes('role="listbox"'), 'falta role="listbox"');
  assert.ok(html.includes('id="reportAppointment"'), 'falta id="reportAppointment"');
});

test("relatorios.js contém funções, referências e eventos do dropdown", () => {
  const js = fs.readFileSync(new URL("assets/js/psicologo/relatorios.js", root), "utf8");

  assert.ok(js.includes("toggleDropdown"), "falta toggleDropdown");
  assert.ok(js.includes("updateDropdownTrigger"), "falta updateDropdownTrigger");
  assert.ok(js.includes("selectAppointmentInDropdown"), "falta selectAppointmentInDropdown");
  assert.ok(js.includes("dropdownBtn"), "falta dropdownBtn");
  assert.ok(
    js.includes("dispatchEvent(new Event('change'))"),
    "falta dispatchEvent(new Event('change'))"
  );
});

test("relatorios.css contém classes de estilização do dropdown", () => {
  const css = fs.readFileSync(new URL("assets/css/psicologo/relatorios.css", root), "utf8");

  assert.ok(css.includes(".appointment-dropdown-btn"), "falta .appointment-dropdown-btn");
  assert.ok(css.includes(".appointment-dropdown-list"), "falta .appointment-dropdown-list");
  assert.ok(css.includes(".appointment-dropdown-item"), "falta .appointment-dropdown-item");
  assert.ok(css.includes(".dropdown-pill-avatar"), "falta .dropdown-pill-avatar");
});
