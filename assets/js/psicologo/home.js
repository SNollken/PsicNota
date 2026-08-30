"use strict";

(function () {
  const menuButton = document.querySelector(".mobile-menu");
  const sidebar = document.querySelector(".sidebar");

  if (!menuButton || !sidebar) return;

  menuButton.addEventListener("click", function () {
    const isOpen = sidebar.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", function (event) {
    if (
      window.innerWidth <= 720
      && !sidebar.contains(event.target)
      && !menuButton.contains(event.target)
    ) {
      sidebar.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}());
