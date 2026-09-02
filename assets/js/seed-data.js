"use strict";

/* Seed de dados de teste — popula o localStorage com consultas, pedidos
   e notas quando nao existem dados ainda. Roda uma vez so. */

(function () {
  var STORAGE_KEYS = window.PsiNoteData && window.PsiNoteData.STORAGE_KEYS;
  if (!STORAGE_KEYS) return;

  var appointmentsKey = STORAGE_KEYS.appointments;
  var requestsKey = STORAGE_KEYS.requests;
  var notesKey = STORAGE_KEYS.notes;

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function mergeById(existing, seedItems) {
    var byId = new Map();

    (Array.isArray(existing) ? existing : []).forEach(function (item) {
      if (item && item.id) byId.set(item.id, item);
    });

    seedItems.forEach(function (item) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    });

    return Array.from(byId.values());
  }

  var today = new Date();
  function dateKey(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  function addDays(d, n) {
    var r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }
  function isoNow() {
    return new Date().toISOString();
  }

  var seedAppointments = [
    {
      id: "appt-seed-1",
      date: dateKey(addDays(today, -10)),
      time: "09:00",
      patient: "Ana Beatriz Souza",
      patientEmail: "ana.beatriz@email.com",
      status: "confirmed",
      mode: "Online",
      duration: 50,
      observation: "",
      source: "psychologist",
      createdAt: isoNow()
    },
    {
      id: "appt-seed-2",
      date: dateKey(addDays(today, -7)),
      time: "14:00",
      patient: "Carlos Eduardo Martins",
      patientEmail: "carlos.martins@email.com",
      status: "confirmed",
      mode: "Presencial",
      duration: 50,
      observation: "",
      source: "psychologist",
      createdAt: isoNow()
    },
    {
      id: "appt-seed-3",
      date: dateKey(addDays(today, -3)),
      time: "10:00",
      patient: "Fernanda Lima Ribeiro",
      patientEmail: "fernanda.lima@email.com",
      status: "cancelled",
      mode: "Online",
      duration: 50,
      observation: "",
      source: "psychologist",
      createdAt: isoNow()
    },
    {
      id: "appt-seed-4",
      date: dateKey(addDays(today, 2)),
      time: "09:00",
      patient: "Ana Beatriz Souza",
      patientEmail: "ana.beatriz@email.com",
      status: "confirmed",
      mode: "Presencial",
      duration: 50,
      observation: "",
      source: "psychologist",
      createdAt: isoNow()
    },
    {
      id: "appt-seed-5",
      date: dateKey(addDays(today, 5)),
      time: "15:00",
      patient: "Mariana Oliveira Costa",
      patientEmail: "mariana.oliveira@email.com",
      status: "confirmed",
      mode: "Online",
      duration: 50,
      observation: "",
      source: "psychologist",
      createdAt: isoNow()
    },
    {
      id: "appt-seed-6",
      date: dateKey(addDays(today, 12)),
      time: "11:00",
      patient: "Carlos Eduardo Martins",
      patientEmail: "carlos.martins@email.com",
      status: "confirmed",
      mode: "Online",
      duration: 50,
      observation: "",
      source: "psychologist",
      createdAt: isoNow()
    },
    {
      id: "appt-seed-7",
      date: dateKey(addDays(today, -5)),
      time: "08:30",
      patient: "Beatriz Nascimento",
      patientEmail: "beatriz.nascimento@email.com",
      status: "confirmed",
      mode: "Presencial",
      duration: 50,
      observation: "",
      source: "psychologist",
      createdAt: isoNow()
    },
    {
      id: "appt-seed-8",
      date: dateKey(addDays(today, 8)),
      time: "16:00",
      patient: "Gustavo Henrique Alves",
      patientEmail: "gustavo.alves@email.com",
      status: "confirmed",
      mode: "Online",
      duration: 50,
      observation: "",
      source: "psychologist",
      createdAt: isoNow()
    }
  ];

  var requests = [
    {
      id: "req-seed-1",
      date: dateKey(addDays(today, 3)),
      time: "14:00",
      patient: "Lucas Pereira dos Santos",
      patientEmail: "lucas.santos@email.com",
      patientId: null,
      mode: "Online",
      duration: 50,
      note: "",
      status: "pending",
      requestedAt: isoNow()
    },
    {
      id: "req-seed-2",
      date: dateKey(addDays(today, 7)),
      time: "10:00",
      patient: "Juliana Carvalho",
      patientEmail: "juliana.carvalho@email.com",
      patientId: null,
      mode: "Presencial",
      duration: 50,
      note: "",
      status: "pending",
      requestedAt: isoNow()
    }
  ];

  var notes = {
    "appt:appt-seed-1": "Paciente relata melhora no sono. Continuar com técnica de relaxamento. Retorno em 15 dias.",
    "appt:appt-seed-2": "Sessão focada em ansiedade. Trabalhar respiração diafragmática. Paciente demonstra disposição.",
    "appt:appt-seed-1:mood": "melhor",
    "appt:appt-seed-2:mood": "neutro"
  };

  var appointments = mergeById(readJSON(appointmentsKey, []), seedAppointments);
  var existingRequests = readJSON(requestsKey, null);
  var existingNotes = readJSON(notesKey, null);

  localStorage.setItem(appointmentsKey, JSON.stringify(appointments));

  if (Array.isArray(existingRequests)) {
    localStorage.setItem(requestsKey, JSON.stringify(existingRequests));
  } else {
    localStorage.setItem(requestsKey, JSON.stringify(requests));
  }

  if (existingNotes && typeof existingNotes === "object" && !Array.isArray(existingNotes)) {
    var mergedNotes = Object.assign({}, notes, existingNotes);
    localStorage.setItem(notesKey, JSON.stringify(mergedNotes));
  } else {
    localStorage.setItem(notesKey, JSON.stringify(notes));
  }
})();
