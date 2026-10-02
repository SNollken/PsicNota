"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("login.html contém botão Google e divisor estilizado com acessibilidade", () => {
  const html = fs.readFileSync(path.join(root, "auth/login.html"), "utf8");
  assert.ok(html.includes('id="googleLoginBtn"'), "Botão googleLoginBtn deve existir no login.html");
  assert.ok(html.includes('class="google-button"'), "Classe google-button deve existir no login.html");
  assert.ok(html.includes('class="auth-divider"'), "Divisor auth-divider deve existir no login.html");
  assert.ok(html.includes('Entrar com o Google'), "Texto do botão deve estar correto");
  assert.ok(html.includes('<svg class="google-icon"'), "Ícone SVG do Google deve estar presente");
});

test("cadastro.html contém botão Google, divisor e wrapper de campos de senha", () => {
  const html = fs.readFileSync(path.join(root, "auth/cadastro.html"), "utf8");
  assert.ok(html.includes('id="googleSignupBtn"'), "Botão googleSignupBtn deve existir no cadastro.html");
  assert.ok(html.includes('class="google-button"'), "Classe google-button deve existir no cadastro.html");
  assert.ok(html.includes('class="auth-divider"'), "Divisor auth-divider deve existir no cadastro.html");
  assert.ok(html.includes('Cadastrar com o Google'), "Texto do botão deve estar correto");
  assert.ok(html.includes('id="passwordFields"'), "Wrapper passwordFields deve existir para permitir ocultação");
});

test("login.css e cadastro.css possuem regras de estilo para google-button e auth-divider", () => {
  const loginCss = fs.readFileSync(path.join(root, "assets/css/login.css"), "utf8");
  const cadastroCss = fs.readFileSync(path.join(root, "assets/css/cadastro.css"), "utf8");

  for (const [name, css] of [["login.css", loginCss], ["cadastro.css", cadastroCss]]) {
    assert.ok(css.includes(".auth-divider"), `${name} deve definir .auth-divider`);
    assert.ok(css.includes(".google-button"), `${name} deve definir .google-button`);
    assert.ok(css.includes(".google-icon"), `${name} deve definir .google-icon`);
    assert.ok(css.includes(".google-button:hover"), `${name} deve ter hover no google-button`);
    assert.ok(css.includes(".google-button:focus-visible"), `${name} deve ter focus-visible no google-button`);
  }
});

test("auth-session.js exporta os helpers necessários para OAuth", () => {
  const js = fs.readFileSync(path.join(root, "assets/js/auth-session.js"), "utf8");
  assert.ok(js.includes("signInWithGoogle"), "auth-session.js deve exportar signInWithGoogle");
  assert.ok(js.includes("resolveProfile"), "auth-session.js deve exportar resolveProfile");
  assert.ok(js.includes("completeOAuthRegistration"), "auth-session.js deve exportar completeOAuthRegistration");
});

test("migration SQL existe no diretório de migrations", () => {
  const migrationPath = path.join(root, "supabase/migrations/20261002100000_oauth_google_support.sql");
  assert.ok(fs.existsSync(migrationPath), "Arquivo de migração deve existir");
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.ok(sql.includes("handle_new_user()"), "Migration deve atualizar handle_new_user");
  assert.ok(sql.includes("concluir_cadastro_oauth"), "Migration deve criar concluir_cadastro_oauth");
});
