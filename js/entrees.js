// Fonctions pures sur un tableau d'entrées déjà déchiffrées (recherche, tri,
// valeurs par défaut). Rien ici ne touche au stockage ni au chiffrement --
// voir coffre.js pour la persistance.

import { CATEGORIES } from "./config.js";

export function nouvelleEntreeVide(categorie = "mdp") {
  return { titre: "", categorie, login: "", mdp: "", url: "", notes: "", favori: false };
}

export function categorieDe(id) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

function normaliser(t) {
  return (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filtrerEtTrier(entrees, { recherche = "", categorie = "toutes" } = {}) {
  const requete = normaliser(recherche.trim());
  return entrees
    .filter((e) => categorie === "toutes" || e.categorie === categorie)
    .filter((e) => !requete || normaliser(`${e.titre} ${e.login} ${e.url} ${e.notes}`).includes(requete))
    .sort((a, b) => Number(b.favori) - Number(a.favori) || a.titre.localeCompare(b.titre, "fr"));
}

export function categoriesPresentes(entrees) {
  return CATEGORIES.filter((c) => entrees.some((e) => e.categorie === c.id));
}
