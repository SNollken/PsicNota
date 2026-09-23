"use strict";


const data = window.PsiNoteData;


const params = new URLSearchParams(window.location.search);


const patientId =
  params.get("id") || "";


const patientName =
  params.get("paciente") || "Paciente";



const list =
  document.querySelector("#appointmentsList");


const menuButton = document.querySelector(".mobile-menu");
const sidebar = document.querySelector(".sidebar");
if (menuButton && sidebar) {
  menuButton.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
  document.addEventListener("click", (event) => {
    if (window.innerWidth <= 720 && !sidebar.contains(event.target) && !menuButton.contains(event.target)) {
      sidebar.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}




function formatDate(date){
  const p = date.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}




function renderPatient(){

  const profiles =
    data.getProfiles ? data.getProfiles() : [];

  const patient =
    profiles.find(
      p =>
        (patientId && p.id === patientId) ||
        p.name === patientName ||
        p.fullName === patientName
    );

  const title =
    document.querySelector("#patientTitle");

  const name =
    document.querySelector("#patientName");

  if(title){
    title.textContent =
      `PERFIL DE ${patientName.toUpperCase()}`;
  }

  if(name){
    name.textContent =
      patientName;
  }

  if(!patient) return;

  document.querySelector("#patientEmail").textContent =
    patient.email || "Não informado";

  document.querySelector("#patientPhone").textContent =
    patient.phone ||
    patient.telephone ||
    "Não informado";

  document.querySelector("#patientLocation").textContent =
    patient.location ||
    patient.city ||
    "Não informado";

  const avatar =
    document.querySelector("#patientAvatar");

  if(avatar){
    if(patient.avatar){
      avatar.src = patient.avatar;
    }
    else if(patient.photo){
      avatar.src = patient.photo;
    }
  }
}




function updateTabsLinks(){

  const encodedPatient =
    encodeURIComponent(patientName);

  const idParam =
    patientId ? `id=${encodeURIComponent(patientId)}&` : "";

  document
    .querySelectorAll(".patient-tabs a")
    .forEach(link=>{
      if (link.dataset.patientDetails !== undefined) return;

      const page =
        link
        .getAttribute("href")
        .split("?")[0];

      link.href =
        `${page}?${idParam}paciente=${encodedPatient}${page === "paciente-perfil.html" ? "&aba=details" : ""}`;
    });
}




function renderAppointments(){
  const allAppointments = data.getAppointments();
  const hasFilter = !!(patientId || (patientName && patientName !== "Paciente"));

  const appointments = allAppointments
    .filter(item => {
      if (hasFilter) {
        const match = patientId
          ? item.patientId === patientId
          : item.patient === patientName;
        if (!match) return false;
      }
      return item.status !== "cancelled";
    })
    .sort((a,b) => (b.date + b.time).localeCompare(a.date + a.time));

  const countEl = document.querySelector("#histCount");

  list.innerHTML = "";

  if (!appointments.length) {
    list.innerHTML = '<tr><td colspan="6">Nenhuma consulta encontrada.</td></tr>';
    if (countEl) countEl.textContent = "Nenhuma consulta registrada";
    return;
  }

  if (countEl) {
    countEl.textContent = appointments.length === 1
      ? "Mostrando 1 consulta"
      : "Mostrando " + appointments.length + " consultas";
  }

  const svgOnline = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>';
  const svgPresencial = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3"></circle><path d="M6 21v-2a6 6 0 0 1 12 0v2"></path></svg>';
  const svgEye = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>';

  appointments.forEach(item => {
    const name = item.patient || "Paciente";
    const initials = name.split(" ").map(w => w[0]).join("").substring(0,2).toUpperCase();
    const isOnline = (item.mode || "").toLowerCase().includes("online");
    const isDone = item.status === "completed";
    const isCancelled = item.status === "cancelled";
    const statusClass = isCancelled ? "status-cancelled" : "status-completed";
    const statusLabel = isCancelled ? "Cancelada" : isDone ? "Realizada" : "Confirmada";

    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td><strong class="date">' + formatDate(item.date) + '</strong><span class="time">' + (item.time || "") + '</span></td>' +
      '<td><div class="patient"><span class="patient-avatar">' + initials + '</span><span class="patient-copy"><strong>' + name + '</strong><small>' + (item.patientId ? "ID: " + item.patientId : "") + '</small></span></div></td>' +
      '<td><span class="appointment-type">' + (isOnline ? svgOnline : svgPresencial) + (isOnline ? "Online" : "Presencial") + '</span></td>' +
      '<td>50 min</td>' +
      '<td><span class="status ' + statusClass + '">' + statusLabel + '</span></td>' +
      '<td><div class="row-actions"><a href="consulta.html?id=' + item.id + '" aria-label="Visualizar consulta de ' + name + '">' + svgEye + '</a></div></td>';

    list.appendChild(tr);
  });
}




async function init(){
  const _auth = await window.PsicNotaBackend.requireProfile("psicologo");
  if (!_auth) return;

  await data.syncRemoteData();

  renderPatient();
  renderAppointments();
  updateTabsLinks();
}


void init();
