"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "psicologo", "perfil.js"), "utf8");
const start = source.indexOf("async function loadWeeklyAvailability() {");
const end = source.indexOf("\n  function profileFromSession()", start);
assert.notEqual(start, -1, "loadWeeklyAvailability deve existir no perfil");
assert.notEqual(end, -1, "loadWeeklyAvailability deve terminar antes de profileFromSession");
const implementation = source.slice(start, end);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createAvailabilityLoader(results) {
  const selectedColumns = [];
  const filters = [];
  const statuses = [];
  const renderedSlots = [];
  let nextResult = 0;
  const sandbox = {
    userId: "psicologo-123",
    setAvailabilityStatus: (message, isError = false) => statuses.push({ message, isError }),
    renderWeeklyAvailability: (slots) => renderedSlots.push(slots),
    supabaseClient: {
      from: (table) => {
        assert.equal(table, "disponibilidades");
        return {
          select: (columns) => {
            selectedColumns.push(columns);
            return {
              eq: (column, value) => {
                filters.push({ column, value });
                return Promise.resolve(results[nextResult++]);
              }
            };
          }
        };
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(`${implementation}\nthis.loadAvailability = loadWeeklyAvailability;`, sandbox);
  return { load: sandbox.loadAvailability(), selectedColumns, filters, statuses, renderedSlots };
}

test("carrega horários do psicólogo com modalidade do Supabase", async () => {
  const rows = [
    { dia_semana: 1, horario: "08:00:00", modalidade: "online" },
    { dia_semana: 3, horario: "14:00:00", modalidade: "presencial" }
  ];
  const result = createAvailabilityLoader([{ data: rows, error: null }]);
  await result.load;

  assert.deepEqual(result.selectedColumns, ["dia_semana, horario, modalidade"]);
  assert.deepEqual(result.filters, [{ column: "psicologo_id", value: "psicologo-123" }]);
  assert.deepEqual(plain(result.renderedSlots[0]), rows);
  assert.equal(result.statuses.at(-1).message, "");
});

test("usa os horários antigos como online se a coluna modalidade ainda não existir", async () => {
  const rows = [{ dia_semana: 2, horario: "09:00:00" }];
  const result = createAvailabilityLoader([
    { data: null, error: { code: "42703", message: "column modalidade does not exist" } },
    { data: rows, error: null }
  ]);
  await result.load;

  assert.deepEqual(result.selectedColumns, ["dia_semana, horario, modalidade", "dia_semana, horario"]);
  assert.deepEqual(plain(result.renderedSlots[0]), [{ dia_semana: 2, horario: "09:00:00", modalidade: "online" }]);
  assert.match(result.statuses.at(-1).message, /considerados online/);
  assert.equal(result.statuses.at(-1).isError, false);
});

test("informa erro do banco sem deixar disponibilidade antiga na tela", async () => {
  const result = createAvailabilityLoader([{ data: null, error: { code: "42501", message: "permission denied" } }]);
  await result.load;

  assert.deepEqual(plain(result.renderedSlots), [[]]);
  assert.match(result.statuses.at(-1).message, /Não foi possível carregar/);
  assert.equal(result.statuses.at(-1).isError, true);
});
