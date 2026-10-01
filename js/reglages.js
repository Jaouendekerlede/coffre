// Fenêtre Réglages : thème, délai de verrouillage automatique, changement du
// mot de passe maître, lien de sauvegarde, remise à zéro et mentions légales.

import { LIEN_LONG } from "./config.js";
import { changerMotDePasse, reinitialiserCoffre, verifierMotDePasse } from "./coffre.js";
import { estimerForce } from "./generateur.js";
import { MENTION_COURTE, MENTION_LEGALE, VERSION_TEXTE } from "./mentions.js";
import { creerLienSauvegarde } from "./restauration.js";
import { lirePrefs, sauverPrefs } from "./storage.js";
import { appliquerTheme } from "./theme.js";
import { $, message } from "./utils.js";

let surReinitialisation = () => {};

function majForceChangement() {
  const f = estimerForce($("cf-chg-nouveau").value);
  const barre = $("cf-chg-force");
  barre.className = `cf-force cf-force-${f.classe}`;
  barre.textContent = $("cf-chg-nouveau").value ? f.texte : "";
}

function ouvrirChangementMdp() {
  $("cf-chg-actuel").value = "";
  $("cf-chg-nouveau").value = "";
  $("cf-chg-confirmation").value = "";
  $("cf-chg-indice").value = "";
  $("cf-chg-erreur").hidden = true;
  majForceChangement();
  $("cf-changer-mdp").showModal();
}

async function validerChangementMdp(e) {
  e.preventDefault();
  const erreur = $("cf-chg-erreur");
  erreur.hidden = true;
  const actuel = $("cf-chg-actuel").value;
  const nouveau = $("cf-chg-nouveau").value;
  const confirmation = $("cf-chg-confirmation").value;
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
  $("cf-chg-valider").disabled = true;
  try {
    if (!(await verifierMotDePasse(actuel))) {
      erreur.textContent = "Mot de passe actuel incorrect.";
      erreur.hidden = false;
      return;
    }
    await changerMotDePasse(nouveau, $("cf-chg-indice").value.trim());
    $("cf-chg-actuel").value = "";
    $("cf-chg-nouveau").value = "";
    $("cf-chg-confirmation").value = "";
    $("cf-changer-mdp").close();
    message("✅ Mot de passe maître changé.");
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
    retour.textContent = copie ? `✅ Lien copié dans le presse-papiers.${trop_long} Il est déjà chiffré : il ne révèle rien sans ton mot de passe maître.` : `Copie ce lien :${trop_long} ${lien}`;
  } catch (e) {
    retour.textContent = `⚠️ Impossible de créer le lien : ${e.message}`;
  }
}

function proposerReinitialisationComplete() {
  const texte = prompt('Effacer TOUT le coffre (toutes les notes, définitivement, sans recours) ? Tape "EFFACER" pour confirmer.');
  if (texte !== "EFFACER") return;
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
  $("cf-chg-corps").addEventListener("submit", validerChangementMdp);

  $("cf-sauvegarde-btn").addEventListener("click", creerSauvegarde);
  $("cf-reinitialiser-btn").addEventListener("click", proposerReinitialisationComplete);
}
