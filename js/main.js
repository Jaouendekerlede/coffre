// Point d'entrée : détecte un éventuel lien de sauvegarde dans l'adresse,
// câble les écrans, puis lance l'appli (création ou déverrouillage).

import { initialiserVerrou } from "./verrou.js";
import { initialiserListe, afficherListe, reinitialiserFiltres } from "./liste.js";
import { initialiserFormulaire, ouvrirFormulaire } from "./formulaire.js";
import { initialiserReglages } from "./reglages.js";
import { appliquerImport, lireLienAdresse } from "./restauration.js";
import { appliquerTheme } from "./theme.js";
import { $, dateCourte, message } from "./utils.js";

appliquerTheme();

function surVerrouillage() {
  // Nettoyage défensif du DOM : aucune donnée déchiffrée ne doit rester
  // lisible une fois le coffre verrouillé, même via l'inspecteur du navigateur.
  $("cf-liste").replaceChildren();
  reinitialiserFiltres();
}

function surDeverrouillage() {
  afficherListe();
}

async function proposerImportSiPresent() {
  let brut;
  try {
    brut = await lireLienAdresse();
  } catch (e) {
    message(`⚠️ Lien de sauvegarde invalide : ${e.message}`);
    return;
  }
  if (!brut) return;
  $("cf-import-date").textContent = brut.modifieLe ? `Sauvegarde du ${dateCourte(brut.modifieLe)}.` : "";
  $("cf-import").showModal();
  await new Promise((resolve) => {
    $("cf-import-remplacer").onclick = () => {
      try {
        appliquerImport(brut);
        message("✅ Coffre restauré. Déverrouille-le avec son mot de passe maître.");
      } catch (e) {
        message(`⚠️ Restauration impossible : ${e.message}`);
      }
      $("cf-import").close();
      resolve();
    };
    $("cf-import-annuler").onclick = () => {
      $("cf-import").close();
      resolve();
    };
  });
}

async function demarrer() {
  await proposerImportSiPresent();
  initialiserListe(ouvrirFormulaire);
  initialiserFormulaire(afficherListe);
  initialiserReglages(() => {
    surVerrouillage();
    location.reload(); // repart proprement sur l'écran de création
  });
  initialiserVerrou({ deverrouille: surDeverrouillage, verrouille: surVerrouillage });
  document.getElementById("cf-ajouter-btn").addEventListener("click", () => ouvrirFormulaire());

  const splash = $("cf-splash");
  splash.classList.add("fini");
  setTimeout(() => splash.remove(), 400);
}

demarrer();

// Lien de sauvegarde ouvert alors que l'appli l'était déjà (même onglet) :
// changer seulement le "#" ne recharge pas la page (même document), donc le
// code d'import ci-dessus ne s'exécuterait jamais -- on force un vrai
// rechargement pour repartir sur un démarrage complet (même principe que
// TrajetVE pour son propre lien de sauvegarde).
window.addEventListener("hashchange", () => {
  if (location.hash.startsWith("#coffre=")) location.reload();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
