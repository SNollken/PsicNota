"use strict";

/* psicologo/historico.js — lista do histórico de consultas do paciente.
   Fluxo de dados: shared-data.js (getAppointments, getAppointmentMood).
   Layout fiel a docs/designs/Historico das consultas.svg (lista paginada)
   com estado vazio da variante -1. */

const data = window.PsiNoteData;

const params = new URLSearchParams(window.location.search);
const patientFilter = params.get("paciente") || "";

const PAGE_SIZE = 7;

const MOODS = {
  "muito-bem": { label: "Muito bem", emoji: "😄" },
  "bem": { label: "Bem", emoji: "🙂" },
  "neutro": { label: "Estável", emoji: "😐" },
  "mal": { label: "Mal", emoji: "🙁" },
  "muito-mal": { label: "Muito mal", emoji: "😞" }
};

const STATUS = {
  confirmed: { label: "Confirmada", className: "status-confirmed" },
  cancelled: { label: "Cancelada", className: "status-cancelled" },
  pending: { label: "Pendente", className: "status-pending" }
};

const elements = {
  card: document.querySelector("#historyCard"),
  rows: document.querySelector("#historyRows"),
  pager: document.querySelector("#historyPager"),
  count: document.querySelector("#historyCount"),
  empty: document.querySelector("#historyEmpty"),
  emptyText: document.querySelector("#historyEmptyText"),
  chip: document.querySelector("#patientChip"),
  chipName: document.querySelector("#patientChipName"),
  chipAvatar: document.querySelector("#patientChipAvatar"),
  sidebar: document.querySelector(".sidebar"),
  mobileMenu: document.querySelector(".mobile-menu")
};

let currentPage = 1;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(dateKey) {
  const [year, month, day] = String(dateKey).split("-");
  return `${day}/${month}/${year}`;
}

function getAppointments() {
  const items = data.getAppointments()
    .filter((item) => (patientFilter ? item.patient === patientFilter : true));

  return items.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

function statusOf(item) {
  return STATUS[item.status] || STATUS.pending;
}

function moodOf(item) {
  return MOODS[data.getAppointmentMood(item.id)] || null;
}

function renderChip() {
  if (!patientFilter) return;
  elements.chip.hidden = false;
  elements.chipName.textContent = patientFilter;
  elements.chipAvatar.textContent = initials(patientFilter);
}

function createRow(item) {
  const status = statusOf(item);
  const mood = moodOf(item);

  const row = document.createElement("article");
  row.className = "history-row";

  const meta = [
    `${item.time} • ${item.mode}`,
    patientFilter ? "" : item.patient
  ].filter(Boolean).join(" • ");

  row.innerHTML = `
    <span class="history-tile" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
        <path d="M8 2v4m8-4v4M3 9h18" />
      </svg>
    </span>

    <div class="history-main">
      <strong>${escapeHtml(formatDate(item.date))}</strong>
      <span>${escapeHtml(meta)}</span>
    </div>

    <span class="status-badge ${status.className}">${status.label}</span>

    <span class="history-mood${mood ? "" : " empty"}">
      ${mood ? `${mood.emoji} ${mood.label}` : "Sem humor"}
    </span>

    <div class="history-actions">
      <a class="square-button" href="consulta.html?id=${encodeURIComponent(item.id)}" title="Abrir consulta" aria-label="Abrir consulta de ${escapeHtml(formatDate(item.date))}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </a>
    </div>
  `;

  return row;
}

function renderPager(totalPages) {
  elements.pager.replaceChildren();
  if (totalPages <= 1) return;

  for (let page = 1; page <= totalPages; page += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pager-button" + (page === currentPage ? " current" : "");
    button.textContent = String(page);
    button.setAttribute("aria-label", `Página ${page}`);
    if (page === currentPage) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => {
      currentPage = page;
      render();
    });
    elements.pager.append(button);
  }
}

function render() {
  const items = getAppointments();

  if (!items.length) {
    elements.card.hidden = true;
    elements.empty.hidden = false;
    elements.emptyText.textContent = patientFilter
      ? `Ainda não há consultas registradas para ${patientFilter}. Assim que a primeira consulta entrar na agenda, ela aparece aqui.`
      : "Quando houver consultas registradas, elas aparecem nesta página em ordem cronológica.";
    return;
  }

  elements.empty.hidden = true;
  elements.card.hidden = false;

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  elements.count.textContent =
    `${items.length} consulta${items.length === 1 ? "" : "s"}` +
    (totalPages > 1 ? ` · página ${currentPage} de ${totalPages}` : "");

  elements.rows.replaceChildren();
  pageItems.forEach((item) => elements.rows.append(createRow(item)));

  renderPager(totalPages);
}

function initMobileMenu() {
  if (!elements.mobileMenu || !elements.sidebar) return;
  elements.mobileMenu.addEventListener("click", () => {
    const isOpen = elements.sidebar.classList.toggle("open");
    elements.mobileMenu.setAttribute("aria-expanded", String(isOpen));
  });
}

initMobileMenu();
renderChip();
render();
