// Fenêtre Réglages : thème, délai de verrouillage automatique, changement du
// mot de passe maître (et du code PIN), lien de sauvegarde, remise à zéro et
// mentions légales.

import { LIEN_LONG } from "./config.js";
import { activerBiometrie, biometrieActive, biometrieDisponible, changerMotDePasse, desactiverBiometrie, pinActif, reinitialiserCoffre, verifierMotDePasse } from "./coffre.js";
import { estimerForce } from "./generateur.js";
import { MENTION_COURTE, MENTION_LEGALE, VERSION_TEXTE } from "./mentions.js";
import { creerLienSauvegarde } from "./restauration.js";
import { lirePrefs, sauverPrefs } from "./storage.js";
import { appliquerTheme } from "./theme.js";
import { $, message } from "./utils.js";

const PIN_VALIDE = /^\d{6}$/;

let surReinitialisation = () => {};

function majForceChangement() {
  const f = estimerForce($("cf-chg-nouveau").value);
  const barre = $("cf-chg-force");
  barre.className = `cf-force cf-force-${f.classe}`;
  barre.textContent = $("cf-chg-nouveau").value ? f.texte : "";
}

function ouvrirChangementMdp() {
  $("cf-chg-actuel").value = "";
  $("cf-chg-pin-actuel").value = "";
  $("cf-chg-pin-actuel-zone").hidden = !pinActif();
  $("cf-chg-nouveau").value = "";
  $("cf-chg-confirmation").value = "";
  $("cf-chg-indice").value = "";
  $("cf-chg-pin-active").checked = pinActif();
  $("cf-chg-pin-zone").hidden = !pinActif();
  $("cf-chg-pin").value = "";
  $("cf-chg-pin-confirmation").value = "";
  $("cf-chg-erreur").hidden = true;
  majForceChangement();
  $("cf-changer-mdp").showModal();
}

async function validerChangementMdp(e) {
  e.preventDefault();
  const erreur = $("cf-chg-erreur");
  erreur.hidden = true;
  const actuel = $("cf-chg-actuel").value;
  const pinActuel = $("cf-chg-pin-actuel").value;
  const nouveau = $("cf-chg-nouveau").value;
  const confirmation = $("cf-chg-confirmation").value;
  const avecNouveauPin = $("cf-chg-pin-active").checked;
  const nouveauPin = $("cf-chg-pin").value;
  const nouveauPinConfirmation = $("cf-chg-pin-confirmation").value;
  if (nouveau.length < 8) {
    erreur.textContent = "Au moins 8 caractères pour le nouveau mot de passe.";
    erreur.hidden = false;
    return;
  }
  if (nouveau !== confirmation) {
    erreur.textContent = "Les deux saisies du nouveau mot de passe ne correspondent pas.";
    erreur.hidden = false;
    return;
  }
  if (avecNouveauPin && !PIN_VALIDE.test(nouveauPin)) {
    erreur.textContent = "Le nouveau code PIN doit faire exactement 6 chiffres.";
    erreur.hidden = false;
    return;
  }
  if (avecNouveauPin && nouveauPin !== nouveauPinConfirmation) {
    erreur.textContent = "Les deux saisies du nouveau code PIN ne correspondent pas.";
    erreur.hidden = false;
    return;
  }
  $("cf-chg-valider").disabled = true;
  try {
    if (!(await verifierMotDePasse(actuel, pinActuel))) {
      erreur.textContent = pinActif() ? "Mot de passe ou code PIN actuel incorrect." : "Mot de passe actuel incorrect.";
      erreur.hidden = false;
      return;
    }
    await changerMotDePasse(actuel, pinActuel, nouveau, $("cf-chg-indice").value.trim(), avecNouveauPin ? nouveauPin : "");
    $("cf-chg-actuel").value = "";
    $("cf-chg-pin-actuel").value = "";
    $("cf-chg-nouveau").value = "";
    $("cf-chg-confirmation").value = "";
    $("cf-chg-pin").value = "";
    $("cf-chg-pin-confirmation").value = "";
    $("cf-changer-mdp").close();
    message(avecNouveauPin ? "✅ Mot de passe maître et code PIN changés." : "✅ Mot de passe maître changé.");
  } catch (err) {
    erreur.textContent = `⚠️ ${err.message}`;
    erreur.hidden = false;
  } finally {
    $("cf-chg-valider").disabled = false;
  }
}

async function creerSauvegarde() {
  const retour = $("cf-sauvegarde-retour");
  retour.hidden = false;
  retour.textContent = "Préparation du lien…";
  try {
    const lien = await creerLienSauvegarde();
    let copie = false;
    try {
      await navigator.clipboard.writeText(lien);
      copie = true;
    } catch {
      // Presse-papiers refusé : le lien reste affiché pour le copier à la main.
    }
    const trop_long = lien.length > LIEN_LONG ? " ⚠️ Il est assez long : certaines messageries le coupent, préfère un mail ou une note." : "";
    retour.textContent = copie ? `✅ Lien copié dans le presse-papiers.${trop_long} Il est déjà chiffré : il ne révèle rien sans ton mot de passe maître${pinActif() ? " ni ton code PIN" : ""}.` : `Copie ce lien :${trop_long} ${lien}`;
  } catch (e) {
    retour.textContent = `⚠️ Impossible de créer le lien : ${e.message}`;
  }
}

function majEtatBiometrie() {
  const dispo = biometrieDisponible();
  const actif = biometrieActive();
  $("cf-bio-section").hidden = !dispo && !actif;
  if (!dispo) {
    $("cf-bio-etat").textContent = "Pas disponible sur ce navigateur/appareil.";
    $("cf-bio-toggle-btn").hidden = true;
    return;
  }
  $("cf-bio-toggle-btn").hidden = false;
  $("cf-bio-etat").textContent = actif ? "👆 Activé : tu peux déverrouiller avec ton empreinte/visage." : "Non activé -- le mot de passe reste le seul moyen de déverrouiller.";
  $("cf-bio-toggle-btn").textContent = actif ? "🚫 Désactiver le déverrouillage biométrique" : "👆 Activer le déverrouillage biométrique";
}

function ouvrirActivationBiometrie() {
  $("cf-bio-mdp").value = "";
  $("cf-bio-pin").value = "";
  $("cf-bio-pin-zone").hidden = !pinActif();
  $("cf-bio-erreur").hidden = true;
  $("cf-bio-activer").showModal();
}

async function validerActivationBiometrie(e) {
  e.preventDefault();
  const erreur = $("cf-bio-erreur");
  erreur.hidden = true;
  $("cf-bio-valider").disabled = true;
  try {
    await activerBiometrie($("cf-bio-mdp").value, $("cf-bio-pin").value);
    $("cf-bio-mdp").value = "";
    $("cf-bio-pin").value = "";
    $("cf-bio-activer").close();
    majEtatBiometrie();
    message("✅ Déverrouillage par empreinte activé.");
  } catch (err) {
    erreur.textContent = `⚠️ ${err.message}`;
    erreur.hidden = false;
  } finally {
    $("cf-bio-valider").disabled = false;
  }
}

function basculerBiometrie() {
  if (biometrieActive()) {
    if (!confirm("Désactiver le déverrouillage par empreinte ? Le mot de passe maître restera le seul moyen de déverrouiller.")) return;
    desactiverBiometrie()
      .then(() => {
        majEtatBiometrie();
        message("Déverrouillage par empreinte désactivé.");
      })
      .catch((err) => message(`⚠️ ${err.message}`));
  } else {
    ouvrirActivationBiometrie();
  }
}

function proposerReinitialisationComplete() {
  const texte = prompt('Effacer TOUT le coffre (toutes les notes, définitivement, sans recours) ? Tape "EFFACER" pour confirmer.');
  if (texte === null) return; // boîte annulée : rien à signaler
  if (texte.trim().toUpperCase() !== "EFFACER") {
    message('Rien n\'a été effacé : il fallait taper exactement "EFFACER".');
    return;
  }
  reinitialiserCoffre();
  $("cf-reglages").close();
  surReinitialisation();
}

export function initialiserReglages(apresReinitialisation) {
  surReinitialisation = apresReinitialisation;
  $("cf-version").textContent = VERSION_TEXTE;
  $("cf-mention").textContent = `${MENTION_COURTE}. ${MENTION_LEGALE}`;

  $("cf-reglages-btn").addEventListener("click", () => {
    const p = lirePrefs();
    $("cf-theme").value = p.theme ?? "auto";
    $("cf-delai-verrou").value = String(p.delaiVerrouMs ?? 180000);
    $("cf-sauvegarde-retour").hidden = true;
    $("cf-pin-etat").textContent = pinActif() ? "🔢 Code PIN activé : demandé en plus du mot de passe." : "Aucun code PIN -- tu peux en ajouter un ci-dessous.";
    majEtatBiometrie();
    $("cf-reglages").showModal();
  });
  $("cf-reglages-fermer").addEventListener("click", () => $("cf-reglages").close());
  $("cf-theme").addEventListener("change", (e) => {
    sauverPrefs({ theme: e.target.value });
    appliquerTheme(e.target.value);
  });
  $("cf-delai-verrou").addEventListener("change", (e) => sauverPrefs({ delaiVerrouMs: Number(e.target.value) }));

  $("cf-changer-mdp-btn").addEventListener("click", ouvrirChangementMdp);
  $("cf-chg-fermer").addEventListener("click", () => $("cf-changer-mdp").close());
  $("cf-chg-nouveau").addEventListener("input", majForceChangement);
  $("cf-chg-voir").addEventListener("click", () => {
    const type = $("cf-chg-nouveau").type === "password" ? "text" : "password";
    $("cf-chg-nouveau").type = type;
    $("cf-chg-confirmation").type = type;
  });
  $("cf-chg-pin-active").addEventListener("change", (e) => {
    $("cf-chg-pin-zone").hidden = !e.target.checked;
    if (!e.target.checked) {
      $("cf-chg-pin").value = "";
      $("cf-chg-pin-confirmation").value = "";
    }
  });
  $("cf-chg-corps").addEventListener("submit", validerChangementMdp);

  $("cf-sauvegarde-btn").addEventListener("click", creerSauvegarde);
  $("cf-bio-toggle-btn").addEventListener("click", basculerBiometrie);
  $("cf-bio-annuler").addEventListener("click", () => $("cf-bio-activer").close());
  $("cf-bio-corps").addEventListener("submit", validerActivationBiometrie);
  $("cf-reinitialiser-btn").addEventListener("click", proposerReinitialisationComplete);
}
