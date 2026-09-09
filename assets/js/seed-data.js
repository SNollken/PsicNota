"use strict";

(function () {
  var STORAGE_KEYS = window.PsiNoteData && window.PsiNoteData.STORAGE_KEYS;
  if (!STORAGE_KEYS) return;

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function replaceSeedItems(existing, seedItems, prefix) {
    var customItems = (Array.isArray(existing) ? existing : []).filter(function (item) {
      return !item || !String(item.id || "").startsWith(prefix);
    });
    return customItems.concat(seedItems);
  }

  function dateKey(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function addDays(date, amount) {
    var result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  var today = new Date();
  var createdAt = today.toISOString();
  var patients = [
    { id: "patient-seed-ana", name: "Ana Beatriz Souza", fullName: "Ana Beatriz Souza", email: "ana.beatriz@email.com", phone: "+55 (61) 99991-2048", location: "Brasília, DF, Brasil", avatar: "../assets/img/patient-ana.svg", avatarDataUrl: "../assets/img/patient-ana.svg" },
    { id: "patient-seed-carlos", name: "Carlos Eduardo Martins", fullName: "Carlos Eduardo Martins", email: "carlos.martins@email.com", phone: "+55 (61) 99982-7316", location: "Goiânia, GO, Brasil", avatar: "../assets/img/patient-carlos.svg", avatarDataUrl: "../assets/img/patient-carlos.svg" },
    { id: "patient-seed-fernanda", name: "Fernanda Lima Ribeiro", fullName: "Fernanda Lima Ribeiro", email: "fernanda.lima@email.com", phone: "+55 (61) 99973-6589", location: "Brasília, DF, Brasil", avatar: "../assets/img/patient-fernanda.svg", avatarDataUrl: "../assets/img/patient-fernanda.svg" }
  ];

  var appointments = [
    { id: "appt-seed-ana-last", date: dateKey(addDays(today, -12)), time: "09:00", patient: "Ana Beatriz Souza", patientEmail: "ana.beatriz@email.com", status: "confirmed", mode: "Online", duration: 50, observation: "Acompanhamento de rotina.", source: "psychologist", createdAt: createdAt },
    { id: "appt-seed-ana-next", date: dateKey(addDays(today, 4)), time: "14:30", patient: "Ana Beatriz Souza", patientEmail: "ana.beatriz@email.com", status: "confirmed", mode: "Presencial", duration: 50, observation: "", source: "psychologist", createdAt: createdAt },
    { id: "appt-seed-carlos-last", date: dateKey(addDays(today, -8)), time: "16:00", patient: "Carlos Eduardo Martins", patientEmail: "carlos.martins@email.com", status: "confirmed", mode: "Presencial", duration: 50, observation: "Revisão das estratégias combinadas.", source: "psychologist", createdAt: createdAt },
    { id: "appt-seed-carlos-next", date: dateKey(addDays(today, 7)), time: "10:00", patient: "Carlos Eduardo Martins", patientEmail: "carlos.martins@email.com", status: "confirmed", mode: "Online", duration: 50, observation: "", source: "psychologist", createdAt: createdAt },
    { id: "appt-seed-fernanda-last", date: dateKey(addDays(today, -5)), time: "11:30", patient: "Fernanda Lima Ribeiro", patientEmail: "fernanda.lima@email.com", status: "confirmed", mode: "Online", duration: 50, observation: "Acompanhamento de adaptação à nova rotina.", source: "psychologist", createdAt: createdAt },
    { id: "appt-seed-fernanda-next", date: dateKey(addDays(today, 10)), time: "15:00", patient: "Fernanda Lima Ribeiro", patientEmail: "fernanda.lima@email.com", status: "confirmed", mode: "Presencial", duration: 50, observation: "", source: "psychologist", createdAt: createdAt }
  ];

  var notes = {
    "appt:appt-seed-ana-last": "Paciente relata melhora na qualidade do sono. Manter a rotina de relaxamento antes de dormir.",
    "appt:appt-seed-carlos-last": "Sessão focada em reconhecer sinais de sobrecarga. Paciente definiu pausas curtas durante o trabalho.",
    "appt:appt-seed-fernanda-last": "Paciente se mostrou mais segura ao relatar limites estabelecidos na nova rotina familiar.",
    "appt:appt-seed-ana-last:mood": "melhor",
    "appt:appt-seed-carlos-last:mood": "neutro",
    "appt:appt-seed-fernanda-last:mood": "melhor"
  };

  var reports = [
    { id: "report-seed-ana", patient: "Ana Beatriz Souza", appointmentId: "appt-seed-ana-last", mood: "melhor", status: "final", blocks: { queixa: "Dificuldade para desacelerar antes de dormir.", intervencao: "Psicoeducação sobre higiene do sono e prática de respiração guiada.", evolucao: "Relata redução dos despertares noturnos durante a semana.", proxima: "Revisar rotina noturna e estratégias de prevenção." }, freeText: "", attachments: [], createdAt: createdAt, updatedAt: createdAt },
    { id: "report-seed-carlos", patient: "Carlos Eduardo Martins", appointmentId: "appt-seed-carlos-last", mood: "neutro", status: "final", blocks: { queixa: "Sensação de sobrecarga nas demandas profissionais.", intervencao: "Mapeamento de prioridades e treino de pausas conscientes.", evolucao: "Identificou situações que antecedem o aumento da ansiedade.", proxima: "Acompanhar aplicação das pausas e reavaliar limites." }, freeText: "", attachments: [], createdAt: createdAt, updatedAt: createdAt },
    { id: "report-seed-fernanda", patient: "Fernanda Lima Ribeiro", appointmentId: "appt-seed-fernanda-last", mood: "melhor", status: "final", blocks: { queixa: "Dificuldade para adaptar a rotina familiar às novas demandas.", intervencao: "Exploração de limites, rede de apoio e organização semanal.", evolucao: "Relata maior clareza para comunicar necessidades.", proxima: "Consolidar os acordos de rotina definidos na sessão." }, freeText: "", attachments: [], createdAt: createdAt, updatedAt: createdAt }
  ];

  var existingNotes = readJSON(STORAGE_KEYS.notes, {});
  var customNotes = {};
  if (existingNotes && typeof existingNotes === "object" && !Array.isArray(existingNotes)) {
    Object.keys(existingNotes).forEach(function (key) {
      if (!key.startsWith("appt:appt-seed-")) customNotes[key] = existingNotes[key];
    });
  }

  localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(replaceSeedItems(readJSON(STORAGE_KEYS.appointments, []), appointments, "appt-seed-")));
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(replaceSeedItems(readJSON(STORAGE_KEYS.profiles, []), patients, "patient-seed-")));
  localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(replaceSeedItems(readJSON(STORAGE_KEYS.reports, []), reports, "report-seed-")));
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(Object.assign(customNotes, notes)));
}());
