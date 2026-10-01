// Formulaire d'ajout / modification d'une entrée, avec générateur de mot de
// passe intégré et estimation de sa force.

import { CATEGORIES, GENERATEUR_DEFAUT } from "./config.js";
import { ajouterEntree, listerEntrees, modifierEntree, supprimerEntree } from "./coffre.js";
import { estimerForce, genererMotDePasse } from "./generateur.js";
import { $, copierPuisEffacer, message } from "./utils.js";

let idEnCours = null;
let surChangement = () => {};
let optionsGenerateur = { ...GENERATEUR_DEFAUT };

function montrerErreur(texte) {
  $("cf-f-erreur").textContent = texte ?? "";
  $("cf-f-erreur").hidden = !texte;
}

function majForce() {
  const f = estimerForce($("cf-f-mdp").value);
  const barre = $("cf-f-force");
  barre.className = `cf-force cf-force-${f.classe}`;
  barre.textContent = $("cf-f-mdp").value ? f.texte : "";
}

function genererEtRemplir() {
  $("cf-f-mdp").value = genererMotDePasse(optionsGenerateur);
  $("cf-f-mdp").type = "text";
  $("cf-f-mdp-voir").textContent = "🙈";
  majForce();
}

export function ouvrirFormulaire(id = null) {
  idEnCours = id;
  const existante = id ? listerEntrees().find((e) => e.id === id) : null;
  $("cf-form-titre").textContent = existante ? "Modifier l'entrée" : "Nouvelle entrée";
  $("cf-f-supprimer").hidden = !existante;
  $("cf-f-titre").value = existante?.titre ?? "";
  $("cf-f-categorie").value = existante?.categorie ?? "mdp";
  $("cf-f-login").value = existante?.login ?? "";
  $("cf-f-mdp").value = existante?.mdp ?? "";
  $("cf-f-mdp").type = "password";
  $("cf-f-mdp-voir").textContent = "👁️";
  $("cf-f-url").value = existante?.url ?? "";
  $("cf-f-notes").value = existante?.notes ?? "";
  $("cf-f-favori").checked = !!existante?.favori;
  $("cf-f-generateur").open = false;
  majForce();
  montrerErreur("");
  $("cf-form").showModal();
  setTimeout(() => $("cf-f-titre").focus(), 50);
}

function fermer() {
  $("cf-form").close();
  // Le mot de passe ne doit pas rester visible/lisible dans le DOM une fois le formulaire fermé.
  $("cf-f-mdp").value = "";
}

async function enregistrer(e) {
  e.preventDefault();
  const titre = $("cf-f-titre").value.trim();
  if (!titre) return montrerErreur("Donne un titre à cette entrée (ex. « Gmail », « Carte Visa »…).");
  const champs = {
    titre,
    categorie: $("cf-f-categorie").value,
    login: $("cf-f-login").value.trim(),
    mdp: $("cf-f-mdp").value,
    url: $("cf-f-url").value.trim(),
    notes: $("cf-f-notes").value.trim(),
    favori: $("cf-f-favori").checked,
  };
  try {
    if (idEnCours) await modifierEntree(idEnCours, champs);
    else await ajouterEntree(champs);
  } catch (err) {
    return montrerErreur(`⚠️ ${err.message}`);
  }
  fermer();
  surChangement();
}

export function initialiserFormulaire(apresChangement) {
  surChangement = apresChangement;
  $("cf-f-categorie").replaceChildren(...CATEGORIES.map((c) => new Option(`${c.icone} ${c.nom}`, c.id)));

  $("cf-f-mdp").addEventListener("input", majForce);
  $("cf-f-mdp-voir").addEventListener("click", () => {
    const champ = $("cf-f-mdp");
    champ.type = champ.type === "password" ? "text" : "password";
    $("cf-f-mdp-voir").textContent = champ.type === "password" ? "👁️" : "🙈";
  });
  $("cf-f-mdp-copier").addEventListener("click", () => {
    if ($("cf-f-mdp").value) copierPuisEffacer($("cf-f-mdp").value, "Mot de passe copié");
    else message("Rien à copier : le mot de passe est vide.");
  });
  $("cf-f-login-copier").addEventListener("click", () => {
    if ($("cf-f-login").value) copierPuisEffacer($("cf-f-login").value, "Identifiant copié");
    else message("Rien à copier : l'identifiant est vide.");
  });
  $("cf-f-generer-btn").addEventListener("click", genererEtRemplir);

  for (const [id, cle] of [["cf-gen-longueur", "longueur"], ["cf-gen-maj", "majuscules"], ["cf-gen-min", "minuscules"], ["cf-gen-chiffres", "chiffres"], ["cf-gen-symboles", "symboles"], ["cf-gen-ambigus", "ambigus"]]) {
    $(id).addEventListener("input", (e) => {
      optionsGenerateur[cle] = e.target.type === "checkbox" ? e.target.checked : Number(e.target.value);
      $("cf-gen-longueur-val").textContent = optionsGenerateur.longueur;
      genererEtRemplir();
    });
  }

  $("cf-f-annuler").addEventListener("click", fermer);
  $("cf-form").addEventListener("cancel", () => ($("cf-f-mdp").value = ""));
  $("cf-f-supprimer").addEventListener("click", async () => {
    if (!idEnCours) return;
    const entree = listerEntrees().find((e) => e.id === idEnCours);
    if (!confirm(`Supprimer « ${entree?.titre || "cette entrée"} » ? C'est définitif.`)) return;
    try {
      await supprimerEntree(idEnCours);
      fermer();
      surChangement();
    } catch (err) {
      montrerErreur(`⚠️ ${err.message}`);
    }
  });
  $("cf-form-corps").addEventListener("submit", enregistrer);
}
