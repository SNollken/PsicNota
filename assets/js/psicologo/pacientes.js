"use strict";

(function () {
  const client = window.PsicNotaSupabase;
  const ui = {
    list: document.querySelector("#patientList"),
    total: document.querySelector("#patientTotal"),
    loading: document.querySelector("#loadingPatients"),
    empty: document.querySelector("#emptyPatients"),
    error: document.querySelector("#patientError"),
    loadMore: document.querySelector("#loadMorePatients"),
    sidebar: document.querySelector(".sidebar"),
    mobileMenu: document.querySelector(".mobile-menu")
  };
  const PAGE_SIZE = 10;
  const dateFormatter = new Intl.DateTimeFormat("pt-BR");
  let patients = [];
  let visiblePatients = PAGE_SIZE;

  function nameOf(patient) {
    return patient.nome_social || patient.nome_completo || "Paciente";
  }

  function appointmentText(appointment, prefix) {
    if (!appointment) return prefix === "Próxima" ? "Sem consulta agendada" : "Nenhuma consulta anterior";
    const date = dateFormatter.format(new Date(`${appointment.data}T12:00:00`));
    const time = String(appointment.horario || "").slice(0, 5);
    return `${prefix}: ${date}${time ? ` às ${time}` : ""}`;
  }

  function createCard(patient) {
    const name = nameOf(patient);
    const card = document.createElement("a");
    card.className = "patient-card";
    card.href = `paciente-perfil.html?paciente=${encodeURIComponent(name)}&id=${encodeURIComponent(patient.id)}`;
    card.setAttribute("aria-label", `Abrir perfil de ${name}`);

    const avatar = document.createElement("img");
    avatar.className = "patient-avatar";
    avatar.src = patient.avatarUrl || "../assets/img/avatar-paciente.png";
    avatar.alt = "";

    const info = document.createElement("span");
    info.className = "patient-info";
    const title = document.createElement("strong");
    title.textContent = name;
    const next = document.createElement("span");
    next.className = "patient-next";
    next.textContent = appointmentText(patient.nextAppointment, "Próxima");
    const last = document.createElement("span");
    last.className = "patient-last";
    last.textContent = appointmentText(patient.lastAppointment, "Última consulta");
    info.append(title, next, last);

    const arrow = document.createElement("span");
    arrow.className = "patient-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.innerHTML = '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';
    card.append(avatar, info, arrow);
    return card;
  }

  function render() {
    const visible = patients.slice(0, visiblePatients);
    ui.list.replaceChildren(...visible.map(createCard));
    ui.empty.hidden = patients.length !== 0;
    ui.loadMore.hidden = visible.length >= patients.length;
    ui.total.textContent = `${patients.length} ${patients.length === 1 ? "paciente" : "pacientes"}`;
  }

  async function avatarUrl(path) {
    if (!path) return "";
    const { data } = await client.storage.from("avatars").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  }

  function attachAppointments(profile, appointments, now) {
    const patientAppointments = appointments.filter((item) => item.paciente_id === profile.id && item.status !== "cancelled");
    const sorted = patientAppointments.map((item) => ({ ...item, timestamp: new Date(`${item.data}T${item.horario}`) }));
    return {
      ...profile,
      nextAppointment: sorted.filter((item) => item.timestamp >= now).sort((a, b) => a.timestamp - b.timestamp)[0] || null,
      lastAppointment: sorted.filter((item) => item.timestamp < now).sort((a, b) => b.timestamp - a.timestamp)[0] || null
    };
  }

  async function load() {
    if (!client) return showError();
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return window.location.replace("../auth/login.html");

    const [profilesResult, appointmentsResult] = await Promise.all([
      client.from("perfis").select("id, nome_completo, nome_social, avatar_url").eq("papel", "paciente").order("nome_completo"),
      client.from("consultas").select("paciente_id, data, horario, status").eq("psicologo_id", authData.user.id)
    ]);
    if (profilesResult.error || appointmentsResult.error) return showError(profilesResult.error || appointmentsResult.error);

    const appointments = appointmentsResult.data || [];
    const now = new Date();
    patients = await Promise.all((profilesResult.data || []).map(async (profile) => ({
      ...attachAppointments(profile, appointments, now),
      avatarUrl: await avatarUrl(profile.avatar_url)
    })));
    ui.loading.hidden = true;
    ui.list.setAttribute("aria-busy", "false");
    render();
  }

  function showError(error) {
    if (error) console.error("Falha ao carregar pacientes:", error.message);
    ui.loading.hidden = true;
    ui.error.hidden = false;
    ui.list.setAttribute("aria-busy", "false");
    ui.total.textContent = "Indisponível";
    ui.loadMore.hidden = true;
  }

  ui.loadMore.addEventListener("click", () => { visiblePatients += PAGE_SIZE; render(); });
  if (ui.mobileMenu && ui.sidebar) {
    ui.mobileMenu.addEventListener("click", () => {
      const open = ui.sidebar.classList.toggle("open");
      ui.mobileMenu.setAttribute("aria-expanded", String(open));
    });
  }
  void load();
}());
