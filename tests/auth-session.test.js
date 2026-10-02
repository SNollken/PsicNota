"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../assets/js/auth-session.js"), "utf8");

function setup(profileResult, professionalResult, rpcResult = { data: { ok: true }, error: null }) {
  const calls = [], sessions = [];
  let signedOut = false, cleared = false, oAuthParams = null;
  const window = {
    location: { href: "https://example.com/auth/login.html" },
    PsicNotaSupabase: {
      auth: {
        async signOut() { signedOut = true; },
        async signInWithOAuth(params) { oAuthParams = params; return { data: {}, error: null }; }
      },
      rpc(name, payload) {
        calls.push(`rpc:${name}`);
        return Promise.resolve(rpcResult);
      },
      from(table) {
        calls.push(table);
        return { select() { return { eq(column, id) {
          assert.equal(id, "account");
          return {
            async single() { return table === "perfis" ? profileResult : professionalResult; },
            async maybeSingle() { return table === "perfis" ? profileResult : professionalResult; }
          };
        } }; } };
      }
    },
    PsiNoteData: {
      setSession(session, remember) { sessions.push({session, remember}); },
      clearSession() { cleared = true; }
    }
  };
  vm.runInNewContext(source, {window});
  return {
    open: remember => window.PsicNotaAuth.openAccount({id:"account"}, remember),
    resolve: () => window.PsicNotaAuth.resolveProfile({id:"account"}),
    signInGoogle: options => window.PsicNotaAuth.signInWithGoogle(options),
    completeOAuth: payload => window.PsicNotaAuth.completeOAuthRegistration(payload),
    calls, sessions,
    getOAuthParams: () => oAuthParams,
    signedOut: () => signedOut, cleared: () => cleared
  };
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

test("resolveProfile retorna exists=true e dados quando perfil existe", async () => {
  const auth = setup(profile("psicologo"), {data:{perfil_id:"account"}, error:null});
  const res = await auth.resolve();
  assert.equal(res.exists, true);
  assert.equal(res.profile.papel, "psicologo");
});

test("resolveProfile retorna exists=false sem deslogar quando perfil não existe", async () => {
  const auth = setup({ data: null, error: null }, null);
  const res = await auth.resolve();
  assert.equal(res.exists, false);
  assert.equal(res.profile, null);
  assert.equal(auth.signedOut(), false);
  assert.equal(auth.cleared(), false);
});

test("signInWithGoogle dispara signInWithOAuth com provedor google e redirectTo", async () => {
  const auth = setup(profile("paciente"), null);
  await auth.signInGoogle({ redirectTo: "https://example.com/retorno" });
  const params = auth.getOAuthParams();
  assert.equal(params.provider, "google");
  assert.equal(params.options.redirectTo, "https://example.com/retorno");
});

test("completeOAuthRegistration chama RPC concluir_cadastro_oauth", async () => {
  const auth = setup(profile("paciente"), null, { data: { ok: true, papel: "paciente" }, error: null });
  const res = await auth.completeOAuth({ p_papel: "paciente", p_nome_completo: "Teste", p_data_nascimento: "2000-01-01" });
  assert.equal(res.ok, true);
  assert.ok(auth.calls.includes("rpc:concluir_cadastro_oauth"));
});

