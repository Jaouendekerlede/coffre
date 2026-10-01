// Écrans de verrouillage : création du coffre (premier lancement), saisie du
// mot de passe maître, et verrouillage automatique (inactivité ou appli mise
// en arrière-plan). Affiche aussi l'écran principal une fois déverrouillé.

import { DELAI_ARRIERE_PLAN_MS, DELAI_INACTIVITE_MS } from "./config.js";
import { coffreExiste, creerCoffre, deverrouiller, estDeverrouille, indiceMotDePasse, reinitialiserCoffre, verrouiller } from "./coffre.js";
import { estimerForce } from "./generateur.js";
import { lirePrefs } from "./storage.js";
import { $, message } from "./utils.js";

let surDeverrouille = () => {};
let surVerrouille = () => {};
let minuteur = null;
let masqueeDepuis = null;

function afficherEcran(nom) {
  for (const id of ["cf-creation", "cf-verrou", "cf-app"]) $(id).hidden = id !== nom;
}

function planifierVerrouAuto() {
  clearTimeout(minuteur);
  if (!estDeverrouille()) return;
  const delai = lirePrefs().delaiVerrouMs ?? DELAI_INACTIVITE_MS;
  if (delai > 0) minuteur = setTimeout(() => verrouillerMaintenant("inactivite"), delai);
}

export function verrouillerMaintenant(raison = "manuel") {
  if (!estDeverrouille()) return;
  verrouiller();
  clearTimeout(minuteur);
  $("cf-verrou-mdp").value = "";
  $("cf-verrou-erreur").hidden = true;
  $("cf-verrou-indice").hidden = true;
  afficherEcran("cf-verrou");
  surVerrouille(raison);
  setTimeout(() => $("cf-verrou-mdp").focus(), 50);
}

function majForceCreation() {
  const f = estimerForce($("cf-creation-mdp").value);
  const barre = $("cf-creation-force");
  barre.className = `cf-force cf-force-${f.classe}`;
  barre.textContent = $("cf-creation-mdp").value ? f.texte : "";
}

async function soumettreCreation(e) {
  e.preventDefault();
  const mdp = $("cf-creation-mdp").value;
  const confirmation = $("cf-creation-confirmation").value;
  const erreur = $("cf-creation-erreur");
  erreur.hidden = true;
  if (mdp.length < 8) {
    erreur.textContent = "Au moins 8 caractères -- idéalement beaucoup plus : c'est ta seule protection.";
    erreur.hidden = false;
    return;
  }
  if (mdp !== confirmation) {
    erreur.textContent = "Les deux saisies ne correspondent pas.";
    erreur.hidden = false;
    return;
  }
  if (!$("cf-creation-confirme-risque").checked) {
    erreur.textContent = "Coche la case : personne ne peut récupérer ce mot de passe s'il est oublié.";
    erreur.hidden = false;
    return;
  }
  $("cf-creation-valider").disabled = true;
  try {
    await creerCoffre(mdp, $("cf-creation-indice").value.trim());
    $("cf-creation-mdp").value = "";
    $("cf-creation-confirmation").value = "";
    afficherEcran("cf-app");
    surDeverrouille();
    planifierVerrouAuto();
  } catch (err) {
    erreur.textContent = `⚠️ ${err.message}`;
    erreur.hidden = false;
  } finally {
    $("cf-creation-valider").disabled = false;
  }
}

async function soumettreDeverrouillage(e) {
  e.preventDefault();
  const mdp = $("cf-verrou-mdp").value;
  $("cf-verrou-valider").disabled = true;
  $("cf-verrou-erreur").hidden = true;
  const ok = await deverrouiller(mdp);
  $("cf-verrou-valider").disabled = false;
  if (!ok) {
    $("cf-verrou-erreur").textContent = "Mot de passe incorrect.";
    $("cf-verrou-erreur").hidden = false;
    $("cf-verrou-mdp").value = "";
    $("cf-verrou-mdp").focus();
    return;
  }
  $("cf-verrou-mdp").value = "";
  afficherEcran("cf-app");
  surDeverrouille();
  planifierVerrouAuto();
}

function basculerIndice() {
  const indice = indiceMotDePasse();
  $("cf-verrou-indice").textContent = indice ? `💡 Indice : ${indice}` : "Aucun indice n'a été enregistré pour ce coffre.";
  $("cf-verrou-indice").hidden = false;
}

function proposerReinitialisation() {
  const texte = prompt('Mot de passe définitivement oublié : la seule solution est EFFACER tout le coffre (toutes les notes seront perdues, sans recours). Tape "EFFACER" pour confirmer.');
  if (texte !== "EFFACER") return;
  reinitialiserCoffre();
  message("Coffre effacé.");
  afficherEcran("cf-creation");
  $("cf-creation-mdp").focus();
}

export function initialiserVerrou({ deverrouille, verrouille }) {
  surDeverrouille = deverrouille;
  surVerrouille = verrouille;

  $("cf-creation-corps").addEventListener("submit", soumettreCreation);
  $("cf-creation-mdp").addEventListener("input", majForceCreation);
  $("cf-creation-voir").addEventListener("click", () => {
    const champ = $("cf-creation-mdp");
    champ.type = champ.type === "password" ? "text" : "password";
  });

  $("cf-verrou-corps").addEventListener("submit", soumettreDeverrouillage);
  $("cf-verrou-indice-btn").addEventListener("click", basculerIndice);
  $("cf-verrou-oublie").addEventListener("click", proposerReinitialisation);

  $("cf-verrouiller-btn").addEventListener("click", () => verrouillerMaintenant("manuel"));

  // Verrouillage automatique : inactivité (on relance le délai à chaque
  // interaction) et mise en arrière-plan prolongée.
  for (const evt of ["pointerdown", "keydown", "scroll"]) document.addEventListener(evt, () => estDeverrouille() && planifierVerrouAuto(), { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!estDeverrouille()) return;
    if (document.visibilityState === "hidden") masqueeDepuis = Date.now();
    else if (masqueeDepuis && Date.now() - masqueeDepuis >= DELAI_ARRIERE_PLAN_MS) verrouillerMaintenant("arriere-plan");
    else planifierVerrouAuto();
  });

  if (coffreExiste()) {
    afficherEcran("cf-verrou");
    setTimeout(() => $("cf-verrou-mdp").focus(), 50);
  } else {
    afficherEcran("cf-creation");
    setTimeout(() => $("cf-creation-mdp").focus(), 50);
  }
}

export { planifierVerrouAuto };
