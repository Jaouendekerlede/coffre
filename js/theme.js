// Thème clair / sombre : automatique (suit le téléphone) ou forcé dans Réglages.

import { lirePrefs } from "./storage.js";

const sombreSysteme = window.matchMedia("(prefers-color-scheme: dark)");

export function appliquerTheme(preference = lirePrefs().theme ?? "auto") {
  const theme = preference === "auto" ? (sombreSysteme.matches ? "sombre" : "clair") : preference;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "clair" ? "#f3f0ea" : "#13100d");
}

sombreSysteme.addEventListener("change", () => appliquerTheme());
