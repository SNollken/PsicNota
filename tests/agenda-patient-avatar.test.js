"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "agenda-psicologo.js"), "utf8");
const avatarStart = source.indexOf("async function resolvePatientAvatarUrl(value) {");
const profilesStart = source.indexOf("async function loadRemotePatientProfiles() {", avatarStart);
const end = source.indexOf("\nfunction normalizeRemoteRequest", profilesStart);
assert.notEqual(avatarStart, -1, "resolvePatientAvatarUrl deve existir na agenda");
assert.notEqual(profilesStart, -1, "loadRemotePatientProfiles deve existir na agenda");
assert.notEqual(end, -1, "loadRemotePatientProfiles deve terminar antes da normalização de solicitações");
const implementation = source.slice(avatarStart, end);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("busca pacientes no Supabase e assina o caminho da foto no bucket avatars", async () => {
  const profiles = [
    {
      id: "paciente-123",
      nome_completo: "Ana Lima",
      nome_social: "Ana",
      email: "ana@example.test",
      avatar_url: "paciente-123/avatar.webp"
    }
  ];
  const queries = [];
  const signedPaths = [];
  const sandbox = {
    remotePatientProfiles: [],
    console: { error: (...args) => queries.push({ type: "error", args }) },
    supabaseClient: {
      from: (table) => {
        queries.push({ type: "from", table });
        return {
          select: (columns) => {
            queries.push({ type: "select", columns });
            return {
              eq: (column, value) => {
                queries.push({ type: "eq", column, value });
                return {
                  order: (field, options) => {
                    queries.push({ type: "order", field, options });
                    return Promise.resolve({ data: profiles, error: null });
                  }
                };
              }
            };
          }
        };
      },
      storage: {
        from: (bucket) => {
          queries.push({ type: "bucket", bucket });
          return {
            createSignedUrl: (filePath, expiresIn) => {
              signedPaths.push({ filePath, expiresIn });
              return Promise.resolve({
                data: { signedUrl: "https://storage.example.test/signed/avatar" },
                error: null
              });
            }
          };
        }
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(`${implementation}\nthis.loadRemotePatientProfiles = loadRemotePatientProfiles;`, sandbox);
  const loaded = await sandbox.loadRemotePatientProfiles();

  assert.equal(loaded, true);
  assert.deepEqual(plain(queries.slice(0, 4)), [
    { type: "from", table: "perfis" },
    { type: "select", columns: "id, nome_completo, nome_social, email, avatar_url" },
    { type: "eq", column: "papel", value: "paciente" },
    { type: "order", field: "nome_completo", options: { ascending: true } }
  ]);
  assert.deepEqual(signedPaths, [{ filePath: "paciente-123/avatar.webp", expiresIn: 3600 }]);
  assert.deepEqual(plain(sandbox.remotePatientProfiles), [{
    id: "paciente-123",
    role: "paciente",
    fullName: "Ana Lima",
    socialName: "Ana",
    avatarUrl: "https://storage.example.test/signed/avatar"
  }]);
});

test("mantém o fallback sem foto quando o perfil não tem avatar salvo", async () => {
  const sandbox = {
    remotePatientProfiles: [],
    console: { error: () => {} },
    supabaseClient: {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({
              data: [{ id: "paciente-123", nome_completo: "Ana Lima", avatar_url: null }],
              error: null
            })
          })
        })
      }),
      storage: { from: () => { throw new Error("Não deve assinar arquivo sem caminho"); } }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(`${implementation}\nthis.loadRemotePatientProfiles = loadRemotePatientProfiles;`, sandbox);
  const loaded = await sandbox.loadRemotePatientProfiles();

  assert.equal(loaded, true);
  assert.equal(sandbox.remotePatientProfiles[0].avatarUrl, "");
});
