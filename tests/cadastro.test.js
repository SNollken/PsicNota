"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../assets/js/cadastro.js"), "utf8");

function setup(signUp, openAccount = async () => "../psicologo/home.html", {
  currentUser = null,
  profileExists = false,
  completeOAuth = async (payload) => ({ ok: true, papel: payload.p_papel }),
  url = "https://example.com/auth/cadastro.html"
} = {}) {
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
  const googleSignupBtn = { disabled: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(event, fn) { listeners["googleSignupBtn:" + event] = fn; } };
  const listeners = {};
  fields.registerMessage = { textContent: "", className: "" };
  fields.psychologistFields = { hidden: true };
  fields.inviteFields = { hidden: true };
  fields.googleSignupBtn = googleSignupBtn;
  fields.registerForm = {
    addEventListener(name, fn) { listeners[name] = fn; },
    querySelectorAll() { return Object.keys(values).map(id => fields[id]); },
    querySelector(selector) {
      if (selector.includes("submit")) return submit;
      if (selector.includes("googleSignupBtn")) return googleSignupBtn;
      return Object.values(fields).find(f => f.attrs?.["aria-invalid"] === "true");
    }
  };
  let destination;
  let googleSignedOptions = null;
  const storage = {};
  const sessionStorage = {
    getItem(k) { return storage[k] || null; },
    setItem(k, v) { storage[k] = String(v); },
    removeItem(k) { delete storage[k]; }
  };
  const window = {
    sessionStorage,
    PsicNotaSupabase: {
      auth: {
        signUp,
        async getSession() { return { data: { session: currentUser ? { user: currentUser } : null }, error: null }; },
        onAuthStateChange(cb) { if (currentUser) cb("SIGNED_IN", { user: currentUser }); }
      }
    },
    PsiNoteData: {},
    PsicNotaPhone: { valid: input => input.value.replace(/\D/g, "").length >= 4, value: input => "+55" + input.value.replace(/\D/g, "") },
    PsicNotaAuth: {
      openAccount,
      async resolveProfile(u) { return { exists: profileExists, profile: profileExists ? { id: u.id, papel: "paciente" } : null }; },
      async signInWithGoogle(options) { googleSignedOptions = options; return { data: {}, error: null }; },
      completeOAuthRegistration: completeOAuth
    },
    location: {
      search: url.includes("?") ? url.slice(url.indexOf("?")) : "",
      href: url,
      replace(u) { destination = u; }
    }
  };
  const document = {
    querySelector(selector) {
      if (selector.includes(":checked")) return fields.role;
      if (selector.includes("googleSignupBtn") || selector.includes("#googleSignupBtn")) return googleSignupBtn;
      return fields[selector.replace(/^[#.]/, "")];
    },
    querySelectorAll(selector) { return selector.includes("role") ? [fields.role] : []; }
  };
  vm.runInNewContext(source, { window, document, URL, URLSearchParams, Date, JSON });
  return {
    fields,
    submit,
    googleSignupBtn,
    send: () => listeners.submit({ preventDefault() {} }),
    clickGoogle: () => listeners["googleSignupBtn:click"]?.(),
    destination: () => destination,
    storage: () => storage,
    getGoogleSignedOptions: () => googleSignedOptions
  };
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

test("persiste rascunho e dispara signInWithGoogle ao clicar no botao Google", async () => {
  const form = setup(async () => {});
  form.fields.fullName.value = "Doutora Exemplo";
  form.fields.role.value = "psicologo";
  form.fields.crp.value = "998877";
  await form.clickGoogle();
  assert.ok(form.getGoogleSignedOptions());
  const draft = JSON.parse(form.storage()["psicnota_oauth_draft"]);
  assert.equal(draft.fullName, "Doutora Exemplo");
  assert.equal(draft.role, "psicologo");
  assert.equal(draft.crp, "998877");
});

test("conclui cadastro oauth de paciente com convite valido", async () => {
  let rpcPayload = null;
  const user = { id: "google-paciente", email: "paciente@gmail.com", user_metadata: { full_name: "Paciente Google" } };
  const form = setup(async () => {}, async () => "../paciente/home.html", {
    currentUser: user,
    profileExists: false,
    completeOAuth: async (p) => { rpcPayload = p; return { ok: true, papel: "paciente" }; },
    url: "https://example.com/auth/cadastro.html?completar=google"
  });
  await new Promise(r => setTimeout(r, 0));
  // restaura ou preenche campos para paciente
  form.fields.role.value = "paciente";
  form.fields.inviteCode.value = "CONVITE123";
  form.fields.birthDate.value = "15/08/1995";
  form.fields.phone.value = "(11) 98888-7777";
  form.fields.terms.checked = true;

  await form.send();
  assert.ok(rpcPayload);
  assert.equal(rpcPayload.p_papel, "paciente");
  assert.equal(rpcPayload.p_codigo_convite, "CONVITE123");
  assert.equal(rpcPayload.p_data_nascimento, "1995-08-15");
  assert.equal(form.destination(), "../paciente/home.html");
});

test("conclui cadastro oauth de psicologo com crp valido", async () => {
  let rpcPayload = null;
  const user = { id: "google-psi", email: "psi@gmail.com", user_metadata: { full_name: "Psi Google" } };
  const form = setup(async () => {}, async () => "../psicologo/home.html", {
    currentUser: user,
    profileExists: false,
    completeOAuth: async (p) => { rpcPayload = p; return { ok: true, papel: "psicologo" }; },
    url: "https://example.com/auth/cadastro.html?completar=google"
  });
  await new Promise(r => setTimeout(r, 0));
  form.fields.role.value = "psicologo";
  form.fields.crp.value = "123456";
  form.fields.crpState.value = "SP";
  form.fields.specialty.value = "Clínica";
  form.fields.serviceFormat.value = "ambos";
  form.fields.birthDate.value = "10/10/1988";
  form.fields.phone.value = "(11) 97777-6666";
  form.fields.terms.checked = true;

  await form.send();
  assert.ok(rpcPayload);
  assert.equal(rpcPayload.p_papel, "psicologo");
  assert.equal(rpcPayload.p_crp_numero, "123456");
  assert.equal(rpcPayload.p_crp_uf, "SP");
  assert.equal(form.destination(), "../psicologo/home.html?boas-vindas=1");
});

test("rejeita conclusao oauth com codigo invalido", async () => {
  const user = { id: "google-paciente", email: "paciente@gmail.com", user_metadata: { full_name: "Paciente Google" } };
  const form = setup(async () => {}, async () => "../paciente/home.html", {
    currentUser: user,
    profileExists: false,
    completeOAuth: async () => { throw new Error("Código do psicólogo inválido"); },
    url: "https://example.com/auth/cadastro.html?completar=google"
  });
  await new Promise(r => setTimeout(r, 0));
  form.fields.role.value = "paciente";
  form.fields.inviteCode.value = "ERRADO";
  form.fields.birthDate.value = "15/08/1995";
  form.fields.phone.value = "(11) 98888-7777";
  form.fields.terms.checked = true;

  await form.send();
  assert.match(form.fields.registerMessage.textContent, /Código do psicólogo inválido/);
  assert.equal(form.fields.inviteCode.attrs["aria-invalid"], "true");
  assert.equal(form.destination(), undefined);
});

