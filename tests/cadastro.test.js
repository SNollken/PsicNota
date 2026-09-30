"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../assets/js/cadastro.js"), "utf8");

function setup(signUp, openAccount = async () => "../psicologo/home.html") {
  const fields = {};
  const values = {
    fullName: "Pessoa Teste", birthDate: "23/04/1990", phone: "(11) 98765-4321",
    registerEmail: "Pessoa@Exemplo.com", registerPassword: "Senha1234",
    confirmPassword: "Senha1234", crp: "12345", crpState: "SP",
    specialty: "Psicologia clínica", serviceFormat: "ambos", inviteCode: "CONVITE", terms: "", role: "psicologo"
  };
  for (const [id, value] of Object.entries(values)) {
    fields[id] = { id, value, checked: true, attrs: {}, addEventListener() {},
      setAttribute(key, val) { this.attrs[key] = val; }, focus() {} };
    fields[id + "Error"] = { textContent: "" };
  }
  const submit = { disabled: false, textContent: "Criar conta" };
  const listeners = {};
  fields.registerMessage = { textContent: "", className: "" };
  fields.psychologistFields = { hidden: true };
  fields.inviteFields = { hidden: true };
  fields.registerForm = {
    addEventListener(name, fn) { listeners[name] = fn; },
    querySelectorAll() { return Object.keys(values).map(id => fields[id]); },
    querySelector(selector) { return selector.includes("submit") ? submit : Object.values(fields).find(f => f.attrs?.["aria-invalid"] === "true"); }
  };
  let destination;
  const window = { PsicNotaSupabase: { auth: { signUp } }, PsiNoteData: {},
    PsicNotaAuth: { openAccount }, location: { search: "", href: "https://example.com/auth/cadastro.html", replace(url) { destination = url; } } };
  const document = {
    querySelector(selector) { return selector.includes(":checked") ? fields.role : fields[selector.slice(1)]; },
    querySelectorAll(selector) { return selector.includes("role") ? [fields.role] : []; }
  };
  vm.runInNewContext(source, { window, document, URL, URLSearchParams, Date });
  return { fields, submit, send: () => listeners.submit({ preventDefault() {} }), destination: () => destination };
}

test("cadastro envia data ISO e abre sessão e painel sem pedir novo login", async () => {
  let payload;
  const form = setup(async value => { payload = value; return { data: { user: { id: "new" }, session: {} }, error: null }; });
  await form.send();
  assert.equal(payload.options.data.data_nascimento, "1990-04-23");
  assert.equal(payload.email, "pessoa@exemplo.com");
  assert.equal(payload.options.data.crp_numero, "12345");
  assert.equal(form.destination(), "../psicologo/home.html?boas-vindas=1");
  assert.equal(form.fields.registerPassword.value, "");
});

test("data impossível ou futura, CRP inválido e senha curta não criam conta", async () => {
  for (const [field, value] of [["birthDate", "31/02/1990"], ["birthDate", "01/01/2099"], ["crp", "abcd"], ["registerPassword", "curta"]]) {
    let calls = 0;
    const form = setup(async () => { calls++; });
    form.fields[field].value = value;
    await form.send();
    assert.equal(calls, 0);
    assert.equal(form.fields[field].attrs["aria-invalid"], "true");
  }
});

test("envios concorrentes criam apenas uma conta", async () => {
  let calls = 0, resolve;
  const form = setup(() => { calls++; return new Promise(done => { resolve = done; }); });
  const pending = form.send();
  await form.send();
  assert.equal(calls, 1);
  resolve({ data: { user: { id: "new" }, session: {} }, error: null });
  await pending;
});

test("falha de rede libera nova tentativa preservando dados", async () => {
  let calls = 0;
  const form = setup(async () => { calls++; throw new Error("Failed to fetch"); });
  await form.send();
  assert.equal(form.submit.disabled, false);
  assert.match(form.fields.registerMessage.textContent, /Sem conexão/);
  assert.equal(form.fields.registerPassword.value, "Senha1234");
  await form.send();
  assert.equal(calls, 2);
});

test("conta criada sem sessão orienta confirmação sem permitir novo cadastro", async () => {
  let calls = 0;
  const form = setup(async () => { calls++; return { data: { session: null }, error: null }; });
  await form.send();
  await form.send();
  assert.equal(calls, 1);
  assert.equal(form.destination(), undefined);
  assert.match(form.fields.registerMessage.textContent, /Confira seu e-mail/);
  assert.equal(form.submit.disabled, true);
});

test("perfil indisponível após criação orienta login sem repetir signup", async () => {
  let calls = 0;
  const form = setup(async () => { calls++; return { data: { user: { id: "new" }, session: {} }, error: null }; }, async () => { throw new Error("profile"); });
  await form.send();
  await form.send();
  assert.equal(calls, 1);
  assert.match(form.fields.registerMessage.textContent, /Use Entrar/);
  assert.equal(form.destination(), undefined);
});

test("paciente sem convite não cria conta após integração remota", async () => {
  let calls = 0;
  const form = setup(async () => { calls++; });
  form.fields.role.value = "paciente";
  form.fields.inviteCode.value = "";
  await form.send();
  assert.equal(calls, 0);
  assert.equal(form.fields.inviteCode.attrs["aria-invalid"], "true");
});

test("cadastro de paciente preserva código de convite no Auth", async () => {
  let payload;
  const form = setup(async value => { payload = value; return {data:{user:{id:"patient"},session:{}},error:null}; }, async () => "../paciente/home.html");
  form.fields.role.value = "paciente";
  form.fields.inviteCode.value = "  convite-valido  ";
  await form.send();
  assert.equal(payload.options.data.codigo_convite, "CONVITE-VALIDO");
  assert.equal(payload.options.data.crp_numero, undefined);
  assert.equal(form.destination(), "../paciente/home.html");
});
