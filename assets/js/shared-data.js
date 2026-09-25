"use strict";

(function () {
  const STORAGE_KEYS = {
    appointments: "psinote.agenda.appointments",
    requests: "psinote.agenda.requests",
    notes: "psinote.agenda.notes",
    reports: "psinote.reports",
    profiles: "psinoteProfilesDemo",
    latestProfile: "psinoteProfileDemo",
    session: "psinote.auth.session"
  };
  const UNLINKED_NOTE_PREFIX = "__sem_consulta__:";

  function createId(prefix = "item") {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function fromDateKey(dateKey) {
    const [year, month, day] = String(dateKey).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function readStorage(storage, key, fallback) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (error) {
      console.warn(`Não foi possível ler ${key}.`, error);
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function defaultSlotsForDate(dateKey) {
    const day = fromDateKey(dateKey).getDay();
    const schedules = {
      1: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
      2: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
      3: ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"],
      4: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
      5: ["09:00", "10:00", "11:00", "14:00", "15:00"]
    };
    return schedules[day] || [];
  }

  function ensureData() {
    if (!Array.isArray(readStorage(localStorage, STORAGE_KEYS.appointments, null))) write(STORAGE_KEYS.appointments, []);
    if (!Array.isArray(readStorage(localStorage, STORAGE_KEYS.requests, null))) write(STORAGE_KEYS.requests, []);
    const notes = readStorage(localStorage, STORAGE_KEYS.notes, null);
    if (!notes || typeof notes !== "object" || Array.isArray(notes)) write(STORAGE_KEYS.notes, {});
    if (!Array.isArray(readStorage(localStorage, STORAGE_KEYS.profiles, null))) {
      const latest = readStorage(localStorage, STORAGE_KEYS.latestProfile, null);
      write(STORAGE_KEYS.profiles, latest ? [latest] : []);
    }
    if (!Array.isArray(readStorage(localStorage, STORAGE_KEYS.reports, null))) write(STORAGE_KEYS.reports, []);
  }

  function getAppointments() {
    ensureData();
    return readStorage(localStorage, STORAGE_KEYS.appointments, []);
  }

  function saveAppointments(items) {
    write(STORAGE_KEYS.appointments, items);
  }

  function getRequests() {
    ensureData();
    return readStorage(localStorage, STORAGE_KEYS.requests, []);
  }

  function saveRequests(items) {
    write(STORAGE_KEYS.requests, items);
  }

  function getNotes() {
    ensureData();
    return readStorage(localStorage, STORAGE_KEYS.notes, {});
  }

  function saveNotes(notes) {
    write(STORAGE_KEYS.notes, notes);
  }

  function getProfiles() {
    ensureData();
    return readStorage(localStorage, STORAGE_KEYS.profiles, []);
  }

  function saveProfiles(profiles) {
    write(STORAGE_KEYS.profiles, profiles);
  }

  function getReports() {
    ensureData();
    return readStorage(localStorage, STORAGE_KEYS.reports, []);
  }

  function saveReports(items) {
    write(STORAGE_KEYS.reports, items);
  }

  function appointmentNoteKey(appointmentId) {
    const noteId = String(appointmentId || "");
    return noteId.startsWith(UNLINKED_NOTE_PREFIX)
      ? `note:unlinked:${noteId.slice(UNLINKED_NOTE_PREFIX.length)}`
      : `appt:${appointmentId}`;
  }

  function getAppointmentNote(appointmentId) {
    return getNotes()[appointmentNoteKey(appointmentId)] || "";
  }

  function setAppointmentNote(appointmentId, text) {
    const allNotes = getNotes();
    const key = appointmentNoteKey(appointmentId);
    const value = String(text || "").trim();
    if (value) allNotes[key] = value;
    else delete allNotes[key];
    saveNotes(allNotes);
  }

  function hasAppointmentNote(appointmentId) {
    return Boolean(getAppointmentNote(appointmentId).trim());
  }

  function appointmentMoodKey(appointmentId) {
    return `appt:${appointmentId}:mood`;
  }

  function getAppointmentMood(appointmentId) {
    return getNotes()[appointmentMoodKey(appointmentId)] || "";
  }

  function setAppointmentMood(appointmentId, moodKey) {
    const allNotes = getNotes();
    const key = appointmentMoodKey(appointmentId);
    const value = String(moodKey || "").trim();
    if (value) allNotes[key] = value;
    else delete allNotes[key];
    saveNotes(allNotes);
  }

  function getOpenSlots(dateKey) {
    const occupied = new Set(
      getAppointments()
        .filter((item) => item.date === dateKey && item.status !== "cancelled")
        .map((item) => item.time)
    );
    return defaultSlotsForDate(dateKey).filter((time) => !occupied.has(time));
  }

  function getSession() {
    return readStorage(sessionStorage, STORAGE_KEYS.session, null)
      || readStorage(localStorage, STORAGE_KEYS.session, null)
      || readStorage(sessionStorage, "psinoteSession", null)
      || readStorage(localStorage, "psinoteSession", null);
  }

  function setSession(user, remember = true) {
    clearSession();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
    storage.setItem("psinoteSession", JSON.stringify(user));
  }

  function clearSession() {
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem(STORAGE_KEYS.session);
      storage.removeItem("psinoteSession");
    });
  }

  /* =========================================================
     SINCRONIZAÇÃO COM O BANCO (Supabase)
     Em sessão autenticada o banco é a fonte de verdade e o
     localStorage vira cache (write-through). Sem cliente ou sem
     sessão, o cache local continua a fonte (offline).
     ========================================================= */

  function getSupabaseClient() {
    return window.PsicNotaSupabase || null;
  }

  async function getAuthUser() {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data?.user) return null;
      return data.user;
    } catch {
      return null;
    }
  }

  function displayNameFromProfile(profile) {
    return profile?.nome_social || profile?.nome_completo || "";
  }

  function normalizeAppointment(row) {
    return {
      id: row.id,
      patientId: row.paciente_id,
      psychologistId: row.psicologo_id,
      patient: displayNameFromProfile(row.paciente) || "Paciente",
      psychologist: displayNameFromProfile(row.psicologo) || "Psicólogo",
      date: row.data,
      time: String(row.horario || "").slice(0, 5),
      duration: row.duracao_min || 50,
      mode: capitalizeFirst(row.modalidade),
      observation: row.observacao || "",
      status: row.status,
      source: row.origem || "psychologist",
      requestId: row.solicitacao_id || null
    };
  }

  function normalizeReport(row) {
    return {
      id: row.id,
      patientId: row.paciente_id,
      patient: displayNameFromProfile(row.paciente) || "Paciente",
      appointmentId: row.consulta_id || null,
      mood: row.humor || null,
      blocks: {
        queixa: row.bloco_queixa || "",
        intervencao: row.bloco_intervencao || "",
        evolucao: row.bloco_evolucao || "",
        proxima: row.bloco_encaminhamentos || ""
      },
      freeText: row.texto_livre || "",
      status: row.status,
      createdAt: row.criado_em,
      updatedAt: row.atualizado_em
    };
  }

  const APPOINTMENT_SELECT = (
    "id, psicologo_id, paciente_id, data, horario, duracao_min, modalidade,"
    + " status, observacao, origem, solicitacao_id,"
    + " paciente:perfis!consultas_paciente_id_fkey(nome_completo, nome_social),"
    + " psicologo:perfis!consultas_psicologo_id_fkey(nome_completo, nome_social)"
  );

  async function fetchPapel(client, uid) {
    const { data, error } = await client.from("perfis").select("papel").eq("id", uid).single();
    if (error || !data) return null;
    return data.papel || null;
  }

  async function loadAppointmentsFromDb() {
    const client = getSupabaseClient();
    if (!client) return null;

    const user = await getAuthUser();
    if (!user) return null;

    const papel = await fetchPapel(client, user.id);
    if (!papel) return null;

    const { data: rows, error } = await client
      .from("consultas")
      .select(APPOINTMENT_SELECT)
      .eq(papel === "psicologo" ? "psicologo_id" : "paciente_id", user.id)
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (error) return null;

    const items = (rows || []).map(normalizeAppointment);
    saveAppointments(items);
    return items;
  }

  async function loadNotesFromDb() {
    const client = getSupabaseClient();
    if (!client) return null;

    const user = await getAuthUser();
    if (!user) return null;

    const { data: rows, error } = await client
      .from("notas")
      .select("consulta_id, conteudo, humor")
      .eq("psicologo_id", user.id);

    if (error) return null;

    const notes = {};
    (rows || []).forEach((row) => {
      const text = String(row.conteudo || "").trim();
      const noteId = row.consulta_id || `${UNLINKED_NOTE_PREFIX}${user.id}`;
      if (text) notes[appointmentNoteKey(noteId)] = text;
      const mood = String(row.humor || "").trim();
      if (mood) notes[appointmentMoodKey(noteId)] = mood;
    });

    saveNotes(notes);
    return notes;
  }

  async function loadReportsFromDb() {
    const client = getSupabaseClient();
    if (!client) return null;

    const user = await getAuthUser();
    if (!user) return null;

    const { data: rows, error } = await client
      .from("relatorios")
      .select(
        "id, psicologo_id, paciente_id, consulta_id, humor, status, bloco_queixa,"
        + " bloco_intervencao, bloco_evolucao, bloco_encaminhamentos, texto_livre,"
        + " criado_em, atualizado_em,"
        + " paciente:perfis!relatorios_paciente_id_fkey(nome_completo, nome_social)"
      )
      .eq("psicologo_id", user.id)
      .order("atualizado_em", { ascending: false });

    if (error) return null;

    const items = (rows || []).map(normalizeReport);
    saveReports(items);
    return items;
  }

  async function syncRemoteData() {
    const client = getSupabaseClient();
    if (!client) return null;

    const user = await getAuthUser();
    if (!user) return null;

    const papel = await fetchPapel(client, user.id);
    if (!papel) return null;

    const appointments = await loadAppointmentsFromDb();

    let notes = null;
    let reports = null;
    if (papel === "psicologo") {
      [notes, reports] = await Promise.all([loadNotesFromDb(), loadReportsFromDb()]);
    }

    return { papel, appointments, notes, reports };
  }

  /* =========================================================
     ESCRITAS NO BANCO (Supabase)
     Todas as mutações de dados clínicos passam por aqui. Sem
     cliente/sessão, caem no fallback do localStorage (demo).
     ========================================================= */

  function modalidadeToDb(mode) {
    return String(mode || "").toLowerCase().startsWith("presencial") ? "presencial" : "online";
  }

  async function persistAppointmentToDb(appointment) {
    const client = getSupabaseClient();
    if (!client) return null;

    const user = await getAuthUser();
    if (!user || !appointment.patientId) return null;

    const payload = {
      psicologo_id: user.id,
      paciente_id: appointment.patientId,
      data: appointment.date,
      horario: appointment.time,
      duracao_min: appointment.duration || 50,
      modalidade: modalidadeToDb(appointment.mode),
      status: appointment.status || "confirmed",
      observacao: appointment.observation || "",
      origem: appointment.source || "psychologist",
      solicitacao_id: appointment.requestId || null
    };

    const { data, error } = await client.from("consultas").insert(payload).select("id").single();
    if (error) return null;
    return data.id;
  }

  async function cancelAppointmentInDb(appointmentId) {
    const client = getSupabaseClient();
    if (!client) return false;

    const user = await getAuthUser();
    if (!user) return false;

    const { error, count } = await client
      .from("consultas")
      .update({ status: "cancelled" }, { count: "exact" })
      .eq("id", appointmentId)
      .eq("psicologo_id", user.id)
      .neq("status", "cancelled");

    return !error && Boolean(count);
  }

  async function saveNoteToDb(consultaId, conteudo, humor) {
    const client = getSupabaseClient();
    if (!client) return false;

    const user = await getAuthUser();
    if (!user) return false;

    const nota = {
      consulta_id: consultaId,
      psicologo_id: user.id,
      conteudo: String(conteudo || ""),
      humor: humor || null
    };
    if (consultaId) {
      const { error } = await client.from("notas").upsert(nota, { onConflict: "consulta_id" });
      return !error;
    }

    const { data: existing, error: lookupError } = await client.from("notas")
      .select("id")
      .eq("psicologo_id", user.id)
      .is("consulta_id", null)
      .maybeSingle();
    if (lookupError) return false;

    const result = existing
      ? await client.from("notas").update(nota).eq("id", existing.id).eq("psicologo_id", user.id)
      : await client.from("notas").insert(nota);

    return !result.error;
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function saveReportToDb(report) {
    const client = getSupabaseClient();
    if (!client) return null;

    const user = await getAuthUser();
    if (!user) return null;

    if (!report.patientId) return null;

    const payload = {
      psicologo_id: user.id,
      paciente_id: report.patientId,
      consulta_id: report.appointmentId || null,
      humor: report.mood || null,
      status: report.status === "final" ? "final" : "rascunho",
      bloco_queixa: report.blocks?.queixa || "",
      bloco_intervencao: report.blocks?.intervencao || "",
      bloco_evolucao: report.blocks?.evolucao || "",
      bloco_encaminhamentos: report.blocks?.proxima || "",
      texto_livre: report.freeText || ""
    };

    if (UUID_RE.test(String(report.id))) payload.id = report.id;

    const { data, error } = await client
      .from("relatorios")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .single();

    if (error) return null;
    return data.id;
  }

  async function deleteReportFromDb(reportId) {
    const client = getSupabaseClient();
    if (!client) return false;

    const user = await getAuthUser();
    if (!user) return false;

    const { error, count } = await client
      .from("relatorios")
      .delete({ count: "exact" })
      .eq("id", reportId)
      .eq("psicologo_id", user.id);

    return !error && Boolean(count);
  }

  function formatRequestMoment(isoString, withSeconds = true) {
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    };
    if (withSeconds) options.second = "2-digit";
    return new Intl.DateTimeFormat("pt-BR", options).format(new Date(isoString));
  }

  function capitalizeFirst(value) {
    const text = String(value ?? "");
    return text ? text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1) : text;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  ensureData();

  window.PsiNoteData = {
    STORAGE_KEYS,
    createId,
    toDateKey,
    fromDateKey,
    addDays,
    defaultSlotsForDate,
    getOpenSlots,
    getAppointments,
    saveAppointments,
    getRequests,
    saveRequests,
    getNotes,
    saveNotes,
    getReports,
    saveReports,
    getAppointmentNote,
    setAppointmentNote,
    hasAppointmentNote,
    getAppointmentMood,
    setAppointmentMood,
    getProfiles,
    saveProfiles,
    getSession,
    setSession,
    clearSession,
    loadAppointmentsFromDb,
    loadNotesFromDb,
    loadReportsFromDb,
    syncRemoteData,
    persistAppointmentToDb,
    cancelAppointmentInDb,
    saveNoteToDb,
    saveReportToDb,
    deleteReportFromDb,
    formatRequestMoment,
    escapeHtml
  };
}());
