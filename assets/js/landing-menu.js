"use strict";

const landingMenu = document.querySelector(".landing-mobile-menu");
if (landingMenu) {
  landingMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) landingMenu.open = false;
  });
  document.addEventListener("click", (event) => {
    if (!landingMenu.contains(event.target)) landingMenu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && landingMenu.open) {
      landingMenu.open = false;
      landingMenu.querySelector("summary").focus();
    }
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
    if (event.matches) landingMenu.open = false;
  });
}
