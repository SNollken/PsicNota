"use strict";

(function () {
  const STORAGE_KEYS = {
    appointments: "psinote.agenda.appointments",
    requests: "psinote.agenda.requests",
    notes: "psinote.agenda.notes",
    profiles: "psinoteProfilesDemo",
    latestProfile: "psinoteProfileDemo",
    session: "psinote.auth.session"
  };

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
    getProfiles,
    saveProfiles,
    getSession,
    setSession,
    clearSession,
    formatRequestMoment
  };
}());
