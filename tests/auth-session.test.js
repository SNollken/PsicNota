"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../assets/js/auth-session.js"), "utf8");

function setup(profileResult, professionalResult) {
  const calls = [], sessions = [];
  let signedOut = false, cleared = false;
  const window = {
    PsicNotaSupabase: {
      auth: { async signOut() { signedOut = true; } },
      from(table) {
        calls.push(table);
        return { select() { return { eq(column, id) {
          assert.equal(id, "account");
          return { async single() { return table === "perfis" ? profileResult : professionalResult; } };
        } }; } };
      }
    },
    PsiNoteData: {
      setSession(session, remember) { sessions.push({session, remember}); },
      clearSession() { cleared = true; }
    }
  };
  vm.runInNewContext(source, {window});
  return {open: remember => window.PsicNotaAuth.openAccount({id:"account"}, remember), calls, sessions,
    signedOut: () => signedOut, cleared: () => cleared};
}

const profile = papel => ({ data: { id: "account", papel, nome_completo: "Pessoa Teste", email: "teste@example.com" }, error: null });

test("psicólogo só abre painel com perfil profissional persistido", async () => {
  const auth = setup(profile("psicologo"), {data:{perfil_id:"account"}, error:null});
  assert.equal(await auth.open(false), "../psicologo/home.html");
  assert.deepEqual(auth.calls, ["perfis", "dados_psicologo"]);
  assert.equal(auth.sessions[0].session.role, "psicologo");
  assert.equal(auth.sessions[0].remember, false);
});

test("papel do banco direciona paciente sem consultar dados profissionais", async () => {
  const auth = setup(profile("paciente"));
  assert.equal(await auth.open(true), "../paciente/home.html");
  assert.deepEqual(auth.calls, ["perfis"]);
});

test("perfil inválido ou profissional ausente encerra sessão sem criar cache", async () => {
  for (const result of [{data:null,error:{message:"missing"}},profile("admin"),profile("psicologo")]) {
    const auth = setup(result, {data:null,error:{message:"missing"}});
    await assert.rejects(auth.open(true));
    assert.equal(auth.signedOut(), true);
    assert.equal(auth.cleared(), true);
    assert.equal(auth.sessions.length, 0);
  }
});
