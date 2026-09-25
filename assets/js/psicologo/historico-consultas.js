"use strict";


const data = window.PsiNoteData;
const supabaseClient = window.PsicNotaSupabase || null;
let patientAvatarUrls = new Map();


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
}




function formatDate(date){
  const p = date.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

async function loadPatientAvatarUrls(patientIds) {
  const avatars = new Map();
  if (!supabaseClient || !patientIds.length) return avatars;

  try {
    const { data: profiles, error } = await supabaseClient
      .from("perfis")
      .select("id, avatar_url")
      .eq("papel", "paciente")
      .in("id", patientIds);

    if (error || !profiles) return avatars;

    const signedAvatars = await Promise.all(profiles.map(async profile => {
      if (!profile.avatar_url) return null;
      const { data: signed, error: signedError } = await supabaseClient
        .storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 3600);
      if (signedError || !signed?.signedUrl) return null;
      return [profile.id, signed.signedUrl];
    }));

    signedAvatars.filter(Boolean).forEach(([id, url]) => avatars.set(id, url));
  } catch {
    return avatars;
  }

  return avatars;
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

  const hasPatient = !!(patientId || (patientName && patientName !== "Paciente"));

  document
    .querySelectorAll(".patient-tabs a")
    .forEach(link=>{
      if (link.dataset.patientDetails !== undefined) return;

      const rawHref = link.getAttribute("href");
      if (!rawHref) return;

      const page =
        rawHref
        .split("?")[0];

      const isAppointmentsLink =
        page === "historico-consultas.html" ||
        link.textContent.trim() === "Consultas";

      if (hasPatient && isAppointmentsLink) {
        link.href =
          `paciente-perfil.html?${idParam}paciente=${encodedPatient}&aba=appointments`;
        return;
      }

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
      '<td><div class="patient"><span class="patient-copy"><strong>' + name + '</strong></span></div></td>' +
      '<td><span class="appointment-type">' + (isOnline ? svgOnline : svgPresencial) + (isOnline ? "Online" : "Presencial") + '</span></td>' +
      '<td>50 min</td>' +
      '<td><span class="status ' + statusClass + '">' + statusLabel + '</span></td>' +
      '<td><div class="row-actions"><a href="consulta.html?id=' + item.id + '" aria-label="Visualizar consulta de ' + name + '">' + svgEye + '</a></div></td>';

    const avatar = document.createElement("span");
    avatar.className = "patient-avatar";
    const avatarUrl = patientAvatarUrls.get(item.patientId);
    if (avatarUrl) {
      const image = document.createElement("img");
      image.alt = "";
      image.src = avatarUrl;
      image.addEventListener("error", () => {
        avatar.replaceChildren();
        avatar.textContent = initials;
      }, { once: true });
      avatar.append(image);
    } else {
      avatar.textContent = initials;
    }
    tr.querySelector(".patient").prepend(avatar);

    list.appendChild(tr);
  });
}




async function init(){
  const _auth = await window.PsicNotaBackend.requireProfile("psicologo");
  if (!_auth) return;

  await data.syncRemoteData();

  const appointments = data.getAppointments().filter(item => {
    const matchesPatient = patientId
      ? item.patientId === patientId
      : (!patientName || patientName === "Paciente" || item.patient === patientName);
    return matchesPatient && item.status !== "cancelled" && item.patientId;
  });
  patientAvatarUrls = await loadPatientAvatarUrls([...new Set(appointments.map(item => item.patientId))]);

  renderPatient();
  renderAppointments();
  updateTabsLinks();
}


void init();
