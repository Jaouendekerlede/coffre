// Petits outils partagés : accès au DOM, messages, copie presse-papiers
// auto-effacée (jamais un mot de passe ne doit traîner indéfiniment dans le
// presse-papiers du téléphone).

import { DELAI_EFFACEMENT_PRESSE_PAPIERS_MS } from "./config.js";

export const $ = (id) => document.getElementById(id);

export function el(balise, classe, texte) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

let delaiMessage = null;
export function message(texte, duree = 3500) {
  const m = $("cf-message");
  m.textContent = texte;
  m.hidden = false;
  clearTimeout(delaiMessage);
  delaiMessage = setTimeout(() => (m.hidden = true), duree);
}

let jetonEffacement = 0;
// Copie `valeur` dans le presse-papiers, puis l'efface après un délai -- sauf
// si entre-temps le presse-papiers contient autre chose (l'utilisateur a
// copié quelque chose d'autre, on ne touche pas à ça).
export async function copierPuisEffacer(valeur, libelle = "Copié") {
  try {
    await navigator.clipboard.writeText(valeur);
  } catch {
    message("⚠️ Copie impossible (autorisation refusée par le navigateur).");
    return;
  }
  message(`✅ ${libelle}. Effacé du presse-papiers dans ${DELAI_EFFACEMENT_PRESSE_PAPIERS_MS / 1000} s.`);
  const monJeton = ++jetonEffacement;
  setTimeout(async () => {
    if (monJeton !== jetonEffacement) return; // une copie plus récente a eu lieu
    try {
      const actuel = await navigator.clipboard.readText();
      if (actuel === valeur) await navigator.clipboard.writeText("");
    } catch {
      // Lecture refusée par le navigateur : tant pis, rien d'autre à faire.
    }
  }, DELAI_EFFACEMENT_PRESSE_PAPIERS_MS);
}

export function dateCourte(ts) {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
