"use strict";
(function () {
  function create(form, collect, save) {
    let baseline = "";
    let ready = false;
    let saving = false;
    function markSaved() { baseline = JSON.stringify(collect()); ready = true; }
    async function request() {
      if (!ready || saving || JSON.stringify(collect()) === baseline) return;
      if (!form.reportValidity()) return;
      saving = true;
      form.inert = true;
      form.setAttribute("aria-busy", "true");
      try { if (await save()) markSaved(); }
      finally { saving = false; form.inert = false; form.removeAttribute("aria-busy"); }
    }
    form.addEventListener("focusout", (event) => {
      const field = event.target;
      if (field.matches('input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea')) void request();
    });
    form.addEventListener("change", (event) => {
      if (event.target.matches('select, input[type="checkbox"], input[type="radio"]')) void request();
    });
    form.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches('input:not([type="file"]):not([type="checkbox"]):not([type="radio"])')) {
        event.preventDefault();
        void request();
      }
    });
    form.addEventListener("submit", (event) => { event.preventDefault(); void request(); });
    return { markSaved, request };
  }
  window.PsicNotaAutosave = { create };
}());
