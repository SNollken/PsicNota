/**
 * PsicNota — roteiro de validacao CDP (MVP-07)
 *
 * Percorre o roteiro do psicologo e do paciente em resolucao de
 * notebook (1440x1097) e celular (375x812), exercitando o loop
 * completo: paciente cria uma solicitacao -> psicologa aprova na
 * agenda -> consulta aparece no banco.
 *
 * Uso:
 *   npm i ws puppeteer   (ou ter node_modules/ com puppeteer)
 *   python -m http.server 8899
 *   node tests/roteiro-cdp.mjs
 *
 * Relatorio em $QA_OUT/relatorio-roteiros.md (default: temp do SO).
 */
import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const BASE = "http://127.0.0.1:8899";
const OUT = process.env.QA_OUT || path.join(os.tmpdir(), "psicnota-qa");
const SUPABASE_URL = "https://gjfqslgoplpqeqewytdn.supabase.co";
const SUPABASE_KEY = "sb_publishable_UxS7h_Kh4zwWB6kEjhJfxQ_T79Q4q5x";

const resultado = [];

function registrar(cenario, passo, status, detalhe = "", erros = []) {
  resultado.push({ cenario, passo, status, detalhe, erros });
  console.log(`[${status}] ${cenario} :: ${passo}${detalhe ? ` — ${detalhe}` : ""}${erros.length ? ` (${erros.length} erro(s))` : ""}`);
}

/* ----------------------------- helpers REST ----------------------------- */

async function tokenSupabase(email) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "123" })
  });
  const body = await resp.json();
  return body.access_token;
}

async function linhas(token, tabela, select = "id") {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?select=${encodeURIComponent(select)}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
  });
  const body = await resp.json();
  return Array.isArray(body) ? body : [];
}

/* ----------------------------- helpers browser ----------------------------- */

function coletorDeErros(page) {
  const eventos = [];
  let vistos = 0;
  page.on("pageerror", (erro) => eventos.push({ tipo: "pageerror", texto: erro.message }));
  page.on("console", (msg) => {
    if (msg.type() === "error") eventos.push({ tipo: "console", texto: msg.text() });
  });
  return () => {
    const novos = eventos.slice(vistos);
    vistos = eventos.length;
    return novos;
  };
}

async function texto(page, seletor) {
  try {
    return await page.$eval(seletor, (el) => el.textContent.trim());
  } catch {
    return null;
  }
}

async function contem(page, seletor) {
  try {
    return Boolean(await page.$(seletor));
  } catch {
    return false;
  }
}

/* ----------------------------- login ----------------------------- */

async function entrar(page, usuario) {
  await page.goto(`${BASE}/auth/login.html`, { waitUntil: "networkidle0" });
  await page.type("#loginEmail", usuario);
  await page.type("#loginPassword", "123");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click("#loginForm button[type=submit]")
  ]);
  return page.url();
}

async function sair(page) {
  // Clique via JS: popups abertos podem bloquear o hit-test do clique real.
  await page.evaluate(() => {
    const link = document.querySelector("a.nav-item-sair");
    if (link) link.click();
    else window.location.href = "../auth/login.html";
  });
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  return page.url();
}

/* ----------------------------- roteiro do psicologo ----------------------------- */

async function roteiroPsicologo(page, passada, dreno) {
  const cenario = `psicologo ${passada.resolucao}`;

  const url = await entrar(page, "psicologo");
  registrar(cenario, "login", url.includes("psicologo/home.html") ? "ok" : "falha", url, dreno());

  // 2. indicadores da pagina inicial
  const stats = {
    usuario: await texto(page, "#homeUserName"),
    consultas: await texto(page, "#statConsultas"),
    pacientes: await texto(page, "#statPacientes"),
    anotacoes: await texto(page, "#statAnotacoes")
  };
  registrar(cenario, "home indicadores", "ok", JSON.stringify(stats), dreno());
  await page.screenshot({ path: path.join(OUT, `${cenario.replace(" ", "-")}-01-home.png`) });

  // 3. lista de pacientes
  await page.goto(`${BASE}/psicologo/pacientes.html`, { waitUntil: "networkidle0" });
  const cards = await page.$$eval("#patientList article", (arts) => arts.length).catch(() => 0);
  registrar(cenario, "lista de pacientes", cards >= 2 ? "ok" : "falha", `${cards} card(s)`, dreno());
  await page.screenshot({ path: path.join(OUT, `${cenario.replace(" ", "-")}-02-pacientes.png`) });

  // 4. perfil da Mariana
  await page.goto(`${BASE}/psicologo/paciente-perfil.html?paciente=Mariana%20Lopes`, { waitUntil: "networkidle0" });
  const nomePerfil = await texto(page, "#patientName");
  registrar(cenario, "perfil do paciente", nomePerfil ? "ok" : "falha", `nome="${nomePerfil}"`, dreno());

  // 5. todas as abas do perfil (scroll + clique via JS para mobile)
  const abas = await page.$$('[role="tab"]');
  const abasVisitadas = [];
  for (const aba of abas) {
    await aba.evaluate((el) => {
      el.scrollIntoView({ block: "center" });
      el.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    abasVisitadas.push(await aba.evaluate((el) => el.textContent.trim()));
  }
  registrar(cenario, "abas do perfil", abasVisitadas.length === 5 ? "ok" : "falha", abasVisitadas.join(", "), dreno());
  await page.screenshot({ path: path.join(OUT, `${cenario.replace(" ", "-")}-03-perfil.png`) });

  // 6. consulta existente
  await page.goto(`${BASE}/psicologo/consulta.html?id=c1111111-1111-4111-8111-111111111111`, { waitUntil: "networkidle0" });
  const consultaVisivel = !(await page.$eval("#consultaContent", (el) => el.hidden).catch(() => true));
  registrar(cenario, "abrir consulta", consultaVisivel ? "ok" : "falha", consultaVisivel ? "conteudo visivel" : "nao encontrada", dreno());

  // 7. registrar nota
  const notaBase = `Nota de validacao ${passada.resolucao} em ${new Date().toISOString()}`;
  await page.$eval("#sessionNote", (el) => { el.value = ""; });
  await page.type("#sessionNote", notaBase);
  await page.click("#saveNoteButton");
  await new Promise((r) => setTimeout(r, 1200));
  const statusNota = await texto(page, "#noteSaveStatus");
  registrar(cenario, "registrar nota", statusNota ? "ok" : "falha", `status="${statusNota}"`, dreno());
  await page.screenshot({ path: path.join(OUT, `${cenario.replace(" ", "-")}-04-nota.png`) });

  // 8. relatorios
  await page.goto(`${BASE}/psicologo/relatorios.html`, { waitUntil: "networkidle0" });
  const totalRelatorios = await texto(page, "#reportTotal");
  registrar(cenario, "lista de relatorios", totalRelatorios ? "ok" : "falha", totalRelatorios, dreno());
  const linkVer = await page.$('a[href^="relatorio-view.html"]');
  if (linkVer) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      linkVer.click()
    ]);
    const docPaciente = await texto(page, "#docPatient");
    registrar(cenario, "visualizar relatorio", docPaciente ? "ok" : "falha", `paciente="${docPaciente}"`, dreno());
    await page.screenshot({ path: path.join(OUT, `${cenario.replace(" ", "-")}-05-relatorio.png`) });
  }

  // 9. agenda
  await page.goto(`${BASE}/psicologo/agenda-psicologo.html`, { waitUntil: "networkidle0" });
  const agenda = {
    proxima: await texto(page, "#nextAppointmentSummary"),
    semana: await texto(page, "#weekAppointmentsCount"),
    pendentes: await texto(page, "#pendingRequestsCount")
  };
  registrar(cenario, "agenda resumo", "ok", JSON.stringify(agenda), dreno());
  await page.click("#pendingRequestsCard");
  await new Promise((r) => setTimeout(r, 600));
  const solicitacoes = await page.$$(".psic-request-item");
  registrar(cenario, "popup pendentes", "ok", `${solicitacoes.length} solicitacao(oes)`, dreno());
  await page.screenshot({ path: path.join(OUT, `${cenario.replace(" ", "-")}-06-agenda.png`) });

  // 10. logout e reentrada
  const urlSaida = await sair(page);
  registrar(cenario, "logout", urlSaida.includes("login") ? "ok" : "falha", urlSaida, dreno());
  await entrar(page, "psicologo");
  const statsApos = {
    consultas: await texto(page, "#statConsultas"),
    pacientes: await texto(page, "#statPacientes")
  };
  const persistiu = statsApos.consultas === stats.consultas && statsApos.pacientes === stats.pacientes;
  registrar(cenario, "reentrada persiste dados", persistiu ? "ok" : "falha", JSON.stringify(statsApos), dreno());

  return agenda;
}

/* ----------------------------- roteiro do paciente ----------------------------- */

async function roteiroPaciente(page, passada, dreno) {
  const cenario = `paciente ${passada.resolucao}`;

  const url = await entrar(page, "paciente");
  registrar(cenario, "login", url.includes("paciente/home.html") ? "ok" : "falha", url, dreno());

  // 2. home
  const home = {
    nome: await texto(page, "#patientFirstName"),
    proxima: await texto(page, "#nextAppointment"),
    futuras: await page.$$eval("#upcomingAppointments li", (lis) => lis.length).catch(() => 0)
  };
  registrar(cenario, "home paciente", "ok", JSON.stringify(home), dreno());
  await page.screenshot({ path: path.join(OUT, `${cenario.replace(" ", "-")}-01-home.png`) });

  // 3. agenda
  await page.goto(`${BASE}/paciente/agenda-paciente.html`, { waitUntil: "networkidle0" });
  const diasDisponiveis = await page.$$(".patient-day:not([disabled])");
  registrar(cenario, "agenda do paciente", diasDisponiveis.length ? "ok" : "falha", `${diasDisponiveis.length} dia(s) disponivel(is)`, dreno());
  await page.screenshot({ path: path.join(OUT, `${cenario.replace(" ", "-")}-02-agenda.png`) });

  // 4. + 5. escolhe um dia e um horario online
  const indiceDia = Math.floor(Math.random() * diasDisponiveis.length);
  await diasDisponiveis[indiceDia].click();
  await new Promise((r) => setTimeout(r, 600));
  const popupAberto = await contem(page, "#schedulePopup.open");
  registrar(cenario, "popup de agendamento", popupAberto ? "ok" : "falha", popupAberto ? "aberto" : "fechado", dreno());
  const horario = await page.$("#onlineTimes .schedule-time");
  if (!horario) {
    registrar(cenario, "escolher horario", "falha", "nenhum slot online", dreno());
    return null;
  }
  await horario.click();
  await new Promise((r) => setTimeout(r, 300));

  // 6. + 7. termos e envio
  await page.click("#scheduleTerms");
  await page.click("#scheduleSubmit");
  await new Promise((r) => setTimeout(r, 1500));
  const toast = await texto(page, "#patientToastMessage");
  registrar(cenario, "enviar solicitacao", "ok", `toast="${toast}"`, dreno());
  await page.screenshot({ path: path.join(OUT, `${cenario.replace(" ", "-")}-03-solicitacao.png`) });

  // verificacao no banco
  const token = await tokenSupabase("paciente@psicnota.test");
  const pendentes = await linhas(token, "solicitacoes", "id,data_desejada,horario,status").then((rows) =>
    rows.filter((row) => row.status === "pending")
  );
  registrar(cenario, "solicitacao no banco", pendentes.length ? "ok" : "falha", `${pendentes.length} pendente(s)`, dreno());

  // saida e reentrada
  const urlSaida = await sair(page);
  registrar(cenario, "logout", urlSaida.includes("login") ? "ok" : "falha", urlSaida, dreno());

  return pendentes[0] || null;
}

/* ----------------------------- fechamento: aprovar ----------------------------- */

async function aprovarSolicitacao(page, dreno) {
  const cenario = "fechamento aprovacao";
  await entrar(page, "psicologo");
  await page.goto(`${BASE}/psicologo/agenda-psicologo.html`, { waitUntil: "networkidle0" });
  const pendentesAntes = await texto(page, "#pendingRequestsCount");
  registrar(cenario, "pendentes antes", "ok", pendentesAntes, dreno());

  await page.click("#pendingRequestsCard");
  await new Promise((r) => setTimeout(r, 600));
  const aprovar = await page.$(".psic-request-approve");
  if (!aprovar) {
    registrar(cenario, "aprovar", "falha", "botao de aprovacao ausente", dreno());
    return false;
  }
  await aprovar.click();
  await new Promise((r) => setTimeout(r, 2000));
  const toast = await texto(page, "#psicToastMessage");
  registrar(cenario, "aprovar", toast.includes("aprovada") ? "ok" : "falha", `toast="${toast}"`, dreno());
  await page.screenshot({ path: path.join(OUT, "fechamento-aprovacao.png") });

  // consulta apareceu no banco?
  const token = await tokenSupabase("psicologo@psicnota.test");
  const consultas = await linhas(token, "consultas", "id,origem,solicitacao_id");
  const novas = consultas.filter((c) => c.origem === "patient_request");
  registrar(cenario, "consulta criada no banco", novas.length ? "ok" : "falha", `${consultas.length} consultas, ${novas.length} via solicitacao`, dreno());

  await sair(page);
  return true;
}

/* ----------------------------- orquestracao ----------------------------- */

const VIEWPORTS = [
  { resolucao: "notebook", width: 1440, height: 1097, isMobile: false },
  { resolucao: "celular", width: 375, height: 812, isMobile: true }
];

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  try {
    const page = await browser.newPage();
    const dreno = coletorDeErros(page);

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
      console.log(`\n=== passada ${vp.resolucao} ${vp.width}x${vp.height} ===`);
      await rodar(roteiroPsicologo, [page, { ...vp }, dreno], "psicologo", vp.resolucao);
      await rodar(roteiroPaciente, [page, { ...vp }, dreno], "paciente", vp.resolucao);
      await rodar(aprovarSolicitacao, [page, dreno], "fechamento", vp.resolucao);
    }
  } finally {
    await browser.close();
  }

  await escreverRelatorio();
}

async function rodar(fn, args, cenario, resolucao) {
  try {
    await fn(...args);
  } catch (erro) {
    registrar(`${cenario} ${resolucao}`, "etapa abortou", "falha", erro.message, []);
    console.error(`!! ${cenario} ${resolucao} abortou: ${erro.message}`);
  }
}

async function escreverRelatorio() {
  const totalFalhas = resultado.filter((r) => r.status === "falha");
  const totalErros = resultado.reduce((soma, r) => soma + r.erros.length, 0);
  const linhas = resultado.map((r, i) => {
    const erros = r.erros.length ? `\n    - ${r.erros.map((e) => `${e.tipo}: ${e.texto}`).join("\n    - ")}` : "";
    return `${i + 1}. **${r.status.toUpperCase()}** — ${r.cenario} :: ${r.passo} — ${r.detalhe}${erros}`;
  });

  const relatorio = [
    "# Relatorio de validacao — roteiros do MVP-07",
    "",
    `Data: ${new Date().toISOString()}`,
    `Passadas: ${VIEWPORTS.map((v) => `${v.resolucao} ${v.width}x${v.height}`).join(" + ")}`,
    `Total de etapas: ${resultado.length} | Falhas: ${totalFalhas.length} | Erros de console: ${totalErros}`,
    "",
    "## Etapas",
    "",
    ...linhas,
    "",
    `Screenshots em \`${OUT}\`.`
  ].join("\n");

  await fs.writeFile(path.join(OUT, "relatorio-roteiros.md"), relatorio, "utf8");
  console.log(`\nRelatorio: ${path.join(OUT, "relatorio-roteiros.md")}`);
  console.log(`Falhas: ${totalFalhas.length} | Erros de console: ${totalErros}`);
  if (totalFalhas.length) {
    console.log(totalFalhas.map((f) => `  - ${f.cenario} :: ${f.passo} — ${f.detalhe}`).join("\n"));
  }
}

main().catch((erro) => {
  console.error("Roteiro abortado:", erro);
  process.exit(1);
});
