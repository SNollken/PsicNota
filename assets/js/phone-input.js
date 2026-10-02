"use strict";
(function () {
  const countries = window.PsicNotaPhoneCountries;
  const names = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  const controls = new WeakMap();
  function digits(value) { return String(value || "").replace(/\D/g, ""); }
  function value(input) {
    const number = digits(input.value);
    return number ? "+" + controls.get(input).selectedOptions[0].dataset.code + number : "";
  }
  function valid(input) {
    const number = digits(input.value);
    return number.length >= 4 && digits(value(input)).length <= 15;
  }
  function set(input, stored) {
    const country = controls.get(input);
    let number = digits(stored);
    country.value = "BR";
    if (String(stored || "").trim().startsWith("+")) {
      const match = countries.slice().sort((a, b) => b[1].length - a[1].length)
        .find((entry) => number.startsWith(entry[1]));
      if (match) { country.value = match[0]; number = number.slice(match[1].length); }
    }
    input.value = number;
    input.setCustomValidity("");
  }
  document.querySelectorAll('input[name="phone"]').forEach((input) => {
    const country = document.createElement("select");
    country.name = "phoneCountry";
    country.setAttribute("aria-label", "País e código internacional do telefone (DDI)");
    countries.map(([id, code]) => ({ id, code, label: names.of(id) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
      .forEach(({ id, code, label }) => {
        const option = new Option(label + " (+" + code + ")", id);
        option.dataset.code = code;
        country.add(option);
      });
    controls.set(input, country);
    input.before(country);
    input.autocomplete = "tel-national";
    input.placeholder = "Número com código de área";
    input.maxLength = 20;
    country.value = "BR";
    function validate() {
      input.setCustomValidity(input.value && !valid(input) ? "Informe um telefone com até 15 dígitos incluindo o DDI." : "");
    }
    input.addEventListener("input", validate);
    country.addEventListener("change", validate);
  });
  window.PsicNotaPhone = { value, valid, set };
}());
