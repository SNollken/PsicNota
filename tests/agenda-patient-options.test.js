"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "agenda-psicologo.js"), "utf8");
const start = source.indexOf("function getPatientOptions() {");
const end = source.indexOf("\nfunction renderPatientSelect() {", start);
assert.notEqual(start, -1, "getPatientOptions deve existir na agenda");
assert.notEqual(end, -1, "getPatientOptions deve terminar antes da renderização do seletor");
const implementation = source.slice(start, end);

function getPatientOptions({ remotePatientProfiles, profiles, requests, appointments }) {
  const sandbox = {
    remotePatientProfiles,
    data: { getProfiles: () => profiles },
    requests,
    appointments
  };
  vm.createContext(sandbox);
  vm.runInContext(`${implementation}\nthis.result = getPatientOptions();`, sandbox);
  return Array.from(sandbox.result);
}

test("mantém pacientes de mesmo nome quando os IDs são diferentes e une a mesma identidade", () => {
  const options = getPatientOptions({
    remotePatientProfiles: [
      { id: "paciente-a", role: "paciente", fullName: "Maria Silva", avatarUrl: "https://storage.test/paciente-a" },
      { id: "paciente-b", role: "paciente", fullName: "Maria Silva", avatarUrl: "https://storage.test/paciente-b" }
    ],
    profiles: [
      { id: "paciente-a", role: "paciente", fullName: "Maria Silva", avatarUrl: "https://cache.test/paciente-a" }
    ],
    requests: [{ patient: "Maria Silva", patientId: "paciente-a" }],
    appointments: [{ patient: "Maria Silva", patientId: "paciente-b" }]
  });

  assert.equal(options.length, 2);
  assert.deepEqual(options.map(({ id }) => id).sort(), ["paciente-a", "paciente-b"]);
  assert.equal(options.find(({ id }) => id === "paciente-a").avatarUrl, "https://storage.test/paciente-a");
  assert.equal(options.find(({ id }) => id === "paciente-b").avatarUrl, "https://storage.test/paciente-b");
});
