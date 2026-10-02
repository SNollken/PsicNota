"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../assets/js/login.js"), "utf8");

function setupLogin({ user = null, profileExists = true, url = "https://example.com/auth/login.html" } = {}) {
  let destination = null;
  let googleSigned = false;
  let openedAccount = false;
  const elements = {};
  const listeners = {};

  const makeElement = (id) => ({
    id,
    value: "",
    type: "text",
    checked: false,
    disabled: false,
    textContent: "",
    className: "",
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener(event, fn) {
      if (!listeners[id]) listeners[id] = {};
      listeners[id][event] = fn;
    }
  });

  const ids = [
    "loginForm", "loginMessage", "loginEmail", "loginPassword",
    "loginEmailError", "loginPasswordError", "rememberMe", "googleLoginBtn"
  ];
  for (const id of ids) {
    elements[id] = makeElement(id);
  }

  const submitButton = { disabled: false, textContent: "Entrar" };
  elements.loginForm.querySelector = (selector) => {
    if (selector.includes("submit")) return submitButton;
    return null;
  };

  const window = {
    location: {
      href: url,
      search: url.includes("?") ? url.slice(url.indexOf("?")) : "",
      hash: url.includes("#") ? url.slice(url.indexOf("#")) : "",
      replace(dest) { destination = dest; }
    },
    PsicNotaSupabase: {
      auth: {
        async signInWithPassword() { return { data: { user }, error: null }; },
        async getSession() { return { data: { session: user ? { user } : null }, error: null }; },
        onAuthStateChange(cb) {
          if (user) cb("SIGNED_IN", { user });
        }
      }
    },
    PsiNoteData: { clearSession() {} },
    PsicNotaAuth: {
      async signInWithGoogle(options) {
        googleSigned = true;
        return { data: { url: "https://accounts.google.com" }, error: null };
      },
      async resolveProfile(u) {
        return { exists: profileExists, profile: profileExists ? { id: u.id, papel: "psicologo" } : null };
      },
      async openAccount(u, remember) {
        openedAccount = true;
        return "../psicologo/home.html";
      }
    }
  };

  const document = {
    getElementById(id) { return elements[id] || null; },
    querySelectorAll() { return []; }
  };

  vm.runInNewContext(source, {
    window,
    document,
    URLSearchParams,
    Set,
    setTimeout: (fn) => fn()
  });

  return {
    elements,
    triggerGoogleClick: () => listeners.googleLoginBtn?.click?.(),
    destination: () => destination,
    isGoogleSigned: () => googleSigned,
    isOpenedAccount: () => openedAccount
  };
}

test("clique no botão Google chama signInWithGoogle", async () => {
  const env = setupLogin();
  assert.ok(env.elements.googleLoginBtn);
  await env.triggerGoogleClick();
  assert.equal(env.isGoogleSigned(), true);
});

test("retorno OAuth com perfil existente abre painel", async () => {
  const env = setupLogin({
    user: { id: "google-user", app_metadata: { provider: "google" } },
    profileExists: true,
    url: "https://example.com/auth/login.html?code=test-code"
  });
  // aguarda microtasks do async checkOAuth
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(env.isOpenedAccount(), true);
  assert.equal(env.destination(), "../psicologo/home.html");
});

test("retorno OAuth sem perfil prévio redireciona para completar cadastro", async () => {
  const env = setupLogin({
    user: { id: "google-new-user", app_metadata: { provider: "google" } },
    profileExists: false,
    url: "https://example.com/auth/login.html?code=test-code"
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(env.isOpenedAccount(), false);
  assert.equal(env.destination(), "cadastro.html?completar=google");
});
