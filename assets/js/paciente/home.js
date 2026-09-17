"use strict";

(function () {
  const data = window.PsiNoteData;
  const client = window.PsicNotaSupabase || null;

  const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
  const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" });
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

  function displayName(profile) {
    return profile?.nome_social || profile?.nome_completo || "Paciente";
  }

  function formatTime(time) {
    return String(time || "").slice(0, 5);
  }

  function formatMode(mode) {
    return String(mode || "").toLowerCase().startsWith("presencial")
      ? "Consulta presencial"
      : "Consulta online";
  }

  function capitalizeFirst(value) {
    const text = String(value ?? "");
    return text ? text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1) : text;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function dateTimeFromItem(item) {
    return new Date(`${item.date}T${item.time}:00`);
  }

  function renderNextAppointment(upcoming) {
    const box = document.getElementById("nextAppointment");
    if (!box) return;
    box.replaceChildren();

    if (!upcoming.length) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "Nenhuma consulta agendada.";
      box.append(empty);
      return;
    }

    const item = upcoming[0];
    const date = data.fromDateKey(item.date);
    const when = `${capitalizeFirst(weekdayFormatter.format(date))}, ${fullDateFormatter.format(date)} - ${item.time}`;

    const info = document.createElement("div");
    info.className = "next-info";

    const strong = document.createElement("strong");
    strong.textContent = when;

    const modeSpan = document.createElement("span");
    modeSpan.textContent = formatMode(item.mode);

    const withSpan = document.createElement("span");
    withSpan.textContent = `com ${item.psychologist || "Psicólogo"}`;

    const buttons = document.createElement("div");
    buttons.className = "next-buttons";

    const enter = document.createElement("a");
    enter.className = "enter";
    enter.href = "agenda-paciente.html";
    enter.textContent = "Entrar na consulta";

    const details = document.createElement("a");
    details.href = "agenda-paciente.html";
    details.textContent = "Ver detalhes";

    buttons.append(enter, details);
    info.append(strong, modeSpan, withSpan, buttons);
    box.append(info);
  }

  function renderUpcomingList(upcoming) {
    const list = document.getElementById("upcomingAppointments");
    if (!list) return;
    list.replaceChildren();

    if (!upcoming.length) {
      const empty = document.createElement("li");
      empty.className = "empty-message";
      empty.textContent = "Nenhuma consulta futura.";
      list.append(empty);
      return;
    }

    upcoming.slice(0, 3).forEach((item) => {
      const date = data.fromDateKey(item.date);
      const month = monthFormatter.format(date).replace(".", "").toUpperCase();
      const day = String(date.getDate()).padStart(2, "0");

      const li = document.createElement("li");

      const badge = document.createElement("span");
      badge.className = "date-badge";

      const monthSmall = document.createElement("small");
      monthSmall.textContent = month;
      const dayStrong = document.createElement("strong");
      dayStrong.textContent = day;
      badge.append(monthSmall, dayStrong);

      const detail = document.createElement("span");
      detail.className = "upcoming-detail";

      const when = document.createElement("strong");
      when.textContent = `${capitalizeFirst(weekdayFormatter.format(date))} - ${item.time}`;

      const mode = document.createElement("span");
      mode.textContent = formatMode(item.mode);

      detail.append(when, mode);
      li.append(badge, detail);
      list.append(li);
    });
  }

  function renderAll(appointments) {
    const now = new Date();
    const upcoming = appointments
      .filter((item) => item.status !== "cancelled" && dateTimeFromItem(item) >= now)
      .sort((a, b) => dateTimeFromItem(a) - dateTimeFromItem(b));

    renderNextAppointment(upcoming);
    renderUpcomingList(upcoming);
  }

  function loadLocalFallback() {
    const session = data.getSession();
    const profiles = data.getProfiles();
    const profile =
      profiles.find((item) => item.id === session?.id) ||
      profiles.find((item) => item.role === "paciente" || item.role === "patient") ||
      null;

    const patientName =
      profile?.socialName || profile?.fullName || profile?.name || session?.fullName || "Paciente";

    const appointments = data
      .getAppointments()
      .filter((item) => item.status !== "cancelled" && item.patientId === (profile?.id || session?.id));

    setText("patientFirstName", patientName.split(" ")[0]);
    renderAll(appointments);
  }

  async function loadHome() {
    if (!client) {
      loadLocalFallback();
      return;
    }

    const remote = await data.loadAppointmentsFromDb();
    if (!remote) {
      loadLocalFallback();
      return;
    }

    let patientName = remote.length ? remote[0].patient : null;

    const { data: authData } = await client.auth.getUser();
    if (authData?.user) {
      const { data: profile } = await client
        .from("perfis")
        .select("nome_completo, nome_social")
        .eq("id", authData.user.id)
        .single();
      if (profile) patientName = displayName(profile);
    }

    setText("patientFirstName", (patientName || "Paciente").split(" ")[0]);
    renderAll(remote.map((item) => ({ ...item, time: formatTime(item.time) })));
  }

  const menuButton = document.querySelector(".mobile-menu");
  const sidebar = document.querySelector(".sidebar");
  if (menuButton && sidebar) {
    menuButton.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  void loadHome();
}());
