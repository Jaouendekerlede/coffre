// Liste des entrées : recherche, filtre par catégorie, favoris.

import { listerEntrees } from "./coffre.js";
import { categoriesPresentes, categorieDe, filtrerEtTrier } from "./entrees.js";
import { $, el } from "./utils.js";

const etat = { recherche: "", categorie: "toutes" };
let surOuvrir = () => {};

function creerTuile(entree) {
  const cat = categorieDe(entree.categorie);
  const tuile = el("button", "cf-entree");
  tuile.type = "button";
  const gauche = el("span", "cf-entree-icone", cat.icone);
  const milieu = el("span", "cf-entree-milieu");
  milieu.append(el("strong", "", entree.titre || "(sans titre)"), el("span", "cf-entree-sous", entree.login || entree.url || cat.nom));
  tuile.append(gauche, milieu);
  if (entree.favori) tuile.append(el("span", "cf-entree-star", "★"));
  tuile.addEventListener("click", () => surOuvrir(entree.id));
  return tuile;
}

function afficherFiltres(entrees) {
  const conteneur = $("cf-filtres");
  conteneur.replaceChildren();
  const puces = [{ id: "toutes", nom: "Toutes", icone: "" }, ...categoriesPresentes(entrees)];
  for (const p of puces) {
    const b = el("button", "cf-puce" + (etat.categorie === p.id ? " actif" : ""), `${p.icone ? p.icone + " " : ""}${p.nom}`);
    b.type = "button";
    b.addEventListener("click", () => {
      etat.categorie = p.id;
      afficherListe();
    });
    conteneur.append(b);
  }
}

export function afficherListe() {
  let toutes;
  try {
    toutes = listerEntrees();
  } catch {
    return; // coffre verrouillé entre-temps : rien à afficher
  }
  if (etat.categorie !== "toutes" && !toutes.some((e) => e.categorie === etat.categorie)) etat.categorie = "toutes";
  afficherFiltres(toutes);
  const visibles = filtrerEtTrier(toutes, etat);
  const conteneur = $("cf-liste");
  conteneur.replaceChildren();
  if (!visibles.length) {
    conteneur.append(el("div", "cf-vide", toutes.length ? "Aucune entrée ne correspond." : "Ton coffre est vide pour l'instant.\nAppuie sur ＋ pour ajouter un premier mot de passe, code ou note."));
    return;
  }
  conteneur.append(...visibles.map(creerTuile));
}

export function initialiserListe(ouvrir) {
  surOuvrir = ouvrir;
  $("cf-recherche").addEventListener("input", (e) => {
    etat.recherche = e.target.value;
    afficherListe();
  });
}

export function reinitialiserFiltres() {
  etat.recherche = "";
  etat.categorie = "toutes";
  $("cf-recherche").value = "";
}
