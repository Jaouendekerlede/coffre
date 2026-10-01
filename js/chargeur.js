// Chargement à la demande d'une bibliothèque (js/vendor/), une seule fois.

const chargees = {};

export function chargerScript(src) {
  chargees[src] ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => {
      delete chargees[src];
      reject(new Error("bibliothèque introuvable (hors-ligne au tout premier lancement ?)"));
    };
    document.head.appendChild(s);
  });
  return chargees[src];
}
