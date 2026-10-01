// Stockage local du coffre (localStorage). Tout ce qui est ici est soit déjà
// chiffré, soit non sensible (sel, paramètres Argon2id, dates) : voir
// crypto.js pour l'explication de pourquoi le sel n'a pas besoin d'être secret.
// L'indice de mot de passe (s'il existe) reste volontairement en clair : il
// doit être lisible AVANT de pouvoir déverrouiller, pour servir à quelque chose.

import { STORAGE_KEYS } from "./config.js";

function lireJson(cle, defaut) {
  try {
    const v = JSON.parse(localStorage.getItem(cle));
    return v ?? defaut;
  } catch {
    return defaut;
  }
}

function ecrireJson(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false; // stockage plein ou bloqué (navigation privée)
  }
}

export function coffreExiste() {
  return !!localStorage.getItem(STORAGE_KEYS.coffre);
}

export function lireCoffreBrut() {
  return lireJson(STORAGE_KEYS.coffre, null);
}

// `brut` : { sel, argon2, indice, chiffre, creeLe, modifieLe }. Renvoie false
// si le stockage est plein (l'appelant doit alors prévenir l'utilisateur).
export function ecrireCoffreBrut(brut) {
  return ecrireJson(STORAGE_KEYS.coffre, brut);
}

export function effacerCoffre() {
  localStorage.removeItem(STORAGE_KEYS.coffre);
}

export function lirePrefs() {
  return lireJson(STORAGE_KEYS.prefs, {});
}

export function sauverPrefs(partiel) {
  ecrireJson(STORAGE_KEYS.prefs, { ...lirePrefs(), ...partiel });
}
