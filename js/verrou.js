// Écrans de verrouillage : création du coffre (premier lancement), saisie du
// mot de passe maître (et du code PIN, si le coffre en a un), et verrouillage
// automatique (inactivité ou appli mise en arrière-plan). Affiche aussi
// l'écran principal une fois déverrouillé.

import { DELAI_ARRIERE_PLAN_MS, DELAI_INACTIVITE_MS } from "./config.js";
import { biometrieActive, biometrieDisponible, coffreExiste, creerCoffre, deverrouiller, deverrouillerAvecBiometrie, estDeverrouille, indiceMotDePasse, pinActif, reinitialiserCoffre, verrouiller } from "./coffre.js";
import { estimerForce } from "./generateur.js";
import { lirePrefs } from "./storage.js";
import { $, message } from "./utils.js";

const PIN_VALIDE = /^\d{6}$/;

let surDeverrouille = () => {};
let surVerrouille = () => {};
let minuteur = null;
let masqueeDepuis = null;

function afficherEcran(nom) {
  for (const id of ["cf-creation", "cf-verrou", "cf-app"]) $(id).hidden = id !== nom;
}

function majBoutonBiometrie() {
  $("cf-verrou-bio-btn").hidden = !(biometrieActive() && biometrieDisponible());
  $("cf-verrou-bio-erreur").hidden = true;
}

// Fait passer l'écran de verrouillage à l'appli, après un déverrouillage
// réussi (mot de passe ou empreinte).
function surDeverrouillageReussi() {
  $("cf-verrou-mdp").value = "";
  $("cf-verrou-pin").value = "";
  afficherEcran("cf-app");
  surDeverrouille();
  planifierVerrouAuto();
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
  $("cf-verrou-pin").value = "";
  $("cf-verrou-pin-zone").hidden = !pinActif();
  $("cf-verrou-erreur").hidden = true;
  $("cf-verrou-indice").hidden = true;
  majBoutonBiometrie();
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
  const avecPin = $("cf-creation-pin-active").checked;
  const pin = $("cf-creation-pin").value;
  const pinConfirmation = $("cf-creation-pin-confirmation").value;
  const erreur = $("cf-creation-erreur");
  erreur.hidden = true;
  if (mdp.length < 8) {
    erreur.textContent = "Au moins 8 caractères -- idéalement beaucoup plus : c'est ta seule protection.";
    erreur.hidden = false;
    return;
  }
  if (mdp !== confirmation) {
    erreur.textContent = "Les deux saisies du mot de passe ne correspondent pas.";
    erreur.hidden = false;
    return;
  }
  if (avecPin && !PIN_VALIDE.test(pin)) {
    erreur.textContent = "Le code PIN doit faire exactement 6 chiffres.";
    erreur.hidden = false;
    return;
  }
  if (avecPin && pin !== pinConfirmation) {
    erreur.textContent = "Les deux saisies du code PIN ne correspondent pas.";
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
    await creerCoffre(mdp, $("cf-creation-indice").value.trim(), avecPin ? pin : "");
    $("cf-creation-mdp").value = "";
    $("cf-creation-confirmation").value = "";
    $("cf-creation-pin").value = "";
    $("cf-creation-pin-confirmation").value = "";
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
  const pin = $("cf-verrou-pin").value;
  $("cf-verrou-valider").disabled = true;
  $("cf-verrou-erreur").hidden = true;
  const ok = await deverrouiller(mdp, pin);
  $("cf-verrou-valider").disabled = false;
  if (!ok) {
    $("cf-verrou-erreur").textContent = pinActif() ? "Mot de passe ou code PIN incorrect." : "Mot de passe incorrect.";
    $("cf-verrou-erreur").hidden = false;
    $("cf-verrou-mdp").value = "";
    $("cf-verrou-pin").value = "";
    $("cf-verrou-mdp").focus();
    return;
  }
  surDeverrouillageReussi();
}

async function tenterDeverrouillageBiometrique() {
  $("cf-verrou-bio-btn").disabled = true;
  $("cf-verrou-bio-erreur").hidden = true;
  try {
    await deverrouillerAvecBiometrie();
    surDeverrouillageReussi();
  } catch (err) {
    $("cf-verrou-bio-erreur").textContent = `⚠️ ${err.message} -- utilise ton mot de passe.`;
    $("cf-verrou-bio-erreur").hidden = false;
  } finally {
    $("cf-verrou-bio-btn").disabled = false;
  }
}

function basculerIndice() {
  const indice = indiceMotDePasse();
  $("cf-verrou-indice").textContent = indice ? `💡 Indice : ${indice}` : "Aucun indice n'a été enregistré pour ce coffre.";
  $("cf-verrou-indice").hidden = false;
}

function proposerReinitialisation() {
  const texte = prompt('Mot de passe (ou code PIN) définitivement oublié : la seule solution est EFFACER tout le coffre (toutes les notes seront perdues, sans recours). Tape "EFFACER" pour confirmer.');
  if (texte === null) return; // boîte annulée : rien à signaler
  // Comparaison insensible à la casse et aux espaces : le clavier du
  // téléphone met parfois une majuscule automatique sur la première lettre
  // seulement ("Effacer"), ce qui ne doit pas bloquer silencieusement.
  if (texte.trim().toUpperCase() !== "EFFACER") {
    message('Rien n\'a été effacé : il fallait taper exactement "EFFACER".');
    return;
  }
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
    // Affiche aussi la confirmation : c'est en comparant les deux à l'œil
    // qu'on repère une suggestion du navigateur glissée dans un seul champ.
    const type = $("cf-creation-mdp").type === "password" ? "text" : "password";
    $("cf-creation-mdp").type = type;
    $("cf-creation-confirmation").type = type;
  });
  $("cf-creation-pin-active").addEventListener("change", (e) => {
    $("cf-creation-pin-zone").hidden = !e.target.checked;
    if (!e.target.checked) {
      $("cf-creation-pin").value = "";
      $("cf-creation-pin-confirmation").value = "";
    }
  });

  $("cf-verrou-corps").addEventListener("submit", soumettreDeverrouillage);
  $("cf-verrou-bio-btn").addEventListener("click", tenterDeverrouillageBiometrique);
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
    $("cf-verrou-pin-zone").hidden = !pinActif();
    majBoutonBiometrie();
    afficherEcran("cf-verrou");
    setTimeout(() => $("cf-verrou-mdp").focus(), 50);
  } else {
    afficherEcran("cf-creation");
    setTimeout(() => $("cf-creation-mdp").focus(), 50);
  }
}

export { planifierVerrouAuto };
