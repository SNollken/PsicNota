"use strict";

(function () {
  const client = window.PsicNotaSupabase;
  const elements = {
    search: document.querySelector("#patientSearch"),
    list: document.querySelector("#patientList"),
    total: document.querySelector("#patientTotal"),
    loading: document.querySelector("#loadingPatients"),
    empty: document.querySelector("#emptyPatients"),
    noMatch: document.querySelector("#noMatch"),
    error: document.querySelector("#patientError"),
    loadMore: document.querySelector("#loadMorePatients"),
    sidebar: document.querySelector(".sidebar"),
    mobileMenu: document.querySelector(".mobile-menu")
  };
  const PAGE_SIZE = 10;
  let patients = [];
  let visiblePatients = PAGE_SIZE;

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }

  function displayName(patient) {
    return patient.nome_social || patient.nome_completo || "Paciente";
  }

  function createPatientCard(patient) {
    const name = displayName(patient);
    const card = document.createElement("a");
    card.className = "patient-card";
    card.href = `paciente-perfil.html?paciente=${encodeURIComponent(name)}&id=${encodeURIComponent(patient.id)}`;
    card.setAttribute("aria-label", `Abrir perfil de ${name}`);

    const avatar = document.createElement("span");
    avatar.className = "patient-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = initials(name);

    const info = document.createElement("span");
    info.className = "patient-info";
    const title = document.createElement("strong");
    title.textContent = name;
    const meta = document.createElement("span");
    meta.className = "patient-meta";
    meta.textContent = patient.email || "Perfil do paciente";
    const arrow = document.createElement("span");
    arrow.className = "patient-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.innerHTML = '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';

    info.append(title, meta);
    card.append(avatar, info, arrow);
    return card;
  }

  function filteredPatients() {
    const query = elements.search.value.trim().toLocaleLowerCase("pt-BR");
    if (!query) return patients;
    return patients.filter((patient) => {
      const searchable = `${displayName(patient)} ${patient.nome_completo || ""} ${patient.email || ""}`;
      return searchable.toLocaleLowerCase("pt-BR").includes(query);
    });
  }

  function renderPatients() {
    const filtered = filteredPatients();
    const visible = filtered.slice(0, visiblePatients);
    elements.list.replaceChildren(...visible.map(createPatientCard));
    elements.empty.hidden = patients.length !== 0;
    elements.noMatch.hidden = patients.length === 0 || filtered.length !== 0;
    elements.loadMore.hidden = visible.length >= filtered.length;
    elements.total.textContent = `${filtered.length} ${filtered.length === 1 ? "paciente" : "pacientes"} no total`;
  }

  function showLoadError() {
    elements.loading.hidden = true;
    elements.list.setAttribute("aria-busy", "false");
    elements.error.hidden = false;
    elements.total.textContent = "Pacientes indisponíveis";
    elements.loadMore.hidden = true;
  }

  async function loadPatients() {
    if (!client) {
      showLoadError();
      return;
    }

    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      window.location.replace("../auth/login.html");
      return;
    }

    const { data, error } = await client
      .from("perfis")
      .select("id, nome_completo, nome_social, email")
      .eq("papel", "paciente")
      .order("nome_completo", { ascending: true });

    if (error) {
      console.error("Falha ao carregar pacientes:", error.message);
      showLoadError();
      return;
    }

    patients = data || [];
    elements.loading.hidden = true;
    elements.list.setAttribute("aria-busy", "false");
    renderPatients();
  }

  elements.search.addEventListener("input", () => {
    visiblePatients = PAGE_SIZE;
    renderPatients();
  });

  elements.loadMore.addEventListener("click", () => {
    visiblePatients += PAGE_SIZE;
    renderPatients();
  });

  if (elements.mobileMenu && elements.sidebar) {
    elements.mobileMenu.addEventListener("click", () => {
      const open = elements.sidebar.classList.toggle("open");
      elements.mobileMenu.setAttribute("aria-expanded", String(open));
    });
  }

  void loadPatients();
}());
