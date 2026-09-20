"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

/* ───────── helpers ───────── */

/** Coleta recursivamente todos os arquivos .html sob `dir`. */
function htmlFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
      result.push(...htmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      result.push(full);
    }
  }
  return result;
}

/** Extrai valores de href="..." e src="..." do HTML bruto. */
function extractRefs(html) {
  const refs = [];
  const re = /\b(?:href|src)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) refs.push(m[1]);
  return refs;
}

/** Verdadeiro se a referência deve ser ignorada (externa, âncora, vazia, etc.). */
function isExternal(ref) {
  return (
    !ref ||
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("//") ||
    ref.startsWith("#") ||
    ref.startsWith("mailto:") ||
    ref.startsWith("tel:") ||
    ref.startsWith("data:") ||
    ref.startsWith("javascript:")
  );
}

/* ───────── configuração ───────── */

/*
 * assets/menu/menu.html é um preview estático do componente <psic-menu>.
 * Seus hrefs (agenda-psicologo.html, pacientes.html, agenda-paciente.html)
 * são relativos ao próprio diretório assets/menu/, onde essas páginas não
 * existem — são falsos positivos documentados (N10). Pulamos o arquivo
 * inteiro em vez de listar exceções frágeis por referência.
 */
const SKIP_FILES = new Set([
  path.join(root, "assets", "menu", "menu.html")
]);

/* ───────── teste ───────── */

test("toda referência local href/src aponta para um arquivo existente", () => {
  const pages = htmlFiles(root).filter((f) => !SKIP_FILES.has(f));
  assert.ok(pages.length > 0, "nenhum arquivo HTML encontrado no repo");

  const broken = [];

  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    const dir = path.dirname(file);

    for (const ref of extractRefs(html)) {
      if (isExternal(ref)) continue;

      // Remove query string e fragmento antes de resolver
      const clean = ref.split("?")[0].split("#")[0];
      if (!clean) continue;

      const target = path.resolve(dir, clean);

      if (!fs.existsSync(target)) {
        broken.push({
          file: path.relative(root, file),
          ref,
          resolved: path.relative(root, target)
        });
      }
    }
  }

  assert.equal(
    broken.length,
    0,
    "Referências locais quebradas:\n" +
      broken.map((b) => `  ${b.file}  →  ${b.ref}  (${b.resolved})`).join("\n")
  );
});
