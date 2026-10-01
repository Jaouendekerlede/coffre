// Cœur du coffre : état en mémoire (clé dérivée et entrées déchiffrées,
// UNIQUEMENT pendant que le coffre est déverrouillé), et passage par
// crypto.js pour tout ce qui touche au chiffrement. Verrouiller efface
// vraiment la clé et les entrées de la mémoire -- elles ne sont plus
// récupérables tant qu'on n'a pas retapé le mot de passe maître.

import { ARGON2 } from "./config.js";
import { chiffrer, dechiffrer, deriverCle, nouveauSel, selVersTexte, texteVersSel } from "./crypto.js";
import { coffreExiste, ecrireCoffreBrut, effacerCoffre, lireCoffreBrut } from "./storage.js";

const VERSION_COFFRE = 1;

let cle = null; // CryptoKey en mémoire, seulement si déverrouillé
let entrees = null; // tableau en mémoire, seulement si déverrouillé

export { coffreExiste };

export function estDeverrouille() {
  return cle !== null;
}

export function indiceMotDePasse() {
  return lireCoffreBrut()?.indice || "";
}

async function ecrireChiffre(nouvellesEntrees, selOctets, params, indice) {
  const brutActuel = lireCoffreBrut();
  const chiffre = await chiffrer(cle, { version: VERSION_COFFRE, entrees: nouvellesEntrees });
  return ecrireCoffreBrut({
    sel: selVersTexte(selOctets),
    argon2: params,
    indice: indice ?? brutActuel?.indice ?? "",
    chiffre,
    creeLe: brutActuel?.creeLe ?? Date.now(),
    modifieLe: Date.now(),
  });
}

// Crée un nouveau coffre (vide) protégé par ce mot de passe. Écrase un
// éventuel coffre existant -- l'appelant doit avoir confirmé avec l'utilisateur.
export async function creerCoffre(motDePasse, indice = "") {
  const sel = nouveauSel();
  cle = await deriverCle(motDePasse, sel, ARGON2);
  entrees = [];
  const ok = await ecrireChiffre(entrees, sel, ARGON2, indice);
  if (!ok) {
    cle = null;
    entrees = null;
    throw new Error("stockage de l'appareil plein ou bloqué");
  }
  return true;
}

// Tente de déverrouiller. Renvoie true/false ; ne lève pas d'erreur pour un
// mauvais mot de passe (c'est un résultat attendu, pas une panne).
export async function deverrouiller(motDePasse) {
  const brut = lireCoffreBrut();
  if (!brut) return false;
  try {
    const sel = texteVersSel(brut.sel);
    const candidate = await deriverCle(motDePasse, sel, brut.argon2 || ARGON2);
    const contenu = await dechiffrer(candidate, brut.chiffre);
    cle = candidate;
    entrees = Array.isArray(contenu.entrees) ? contenu.entrees : [];
    return true;
  } catch {
    return false; // mauvais mot de passe, ou coffre corrompu
  }
}

// Efface la clé et les entrées de la mémoire (pas du stockage). Après ça,
// plus aucune fonction de ce module ne peut lire les notes sans redéverrouiller.
export function verrouiller() {
  cle = null;
  entrees = null;
}

export function listerEntrees() {
  if (!entrees) throw new Error("coffre verrouillé");
  return entrees.map((e) => ({ ...e }));
}

async function remplacerEntrees(nouvellesEntrees) {
  if (!cle) throw new Error("coffre verrouillé");
  const brut = lireCoffreBrut();
  const ok = await ecrireChiffre(nouvellesEntrees, texteVersSel(brut.sel), brut.argon2, undefined);
  if (!ok) throw new Error("stockage de l'appareil plein : libère de la place ou supprime une entrée");
  entrees = nouvellesEntrees;
}

export async function ajouterEntree(entree) {
  const nouvelle = { id: `e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, favori: false, creeLe: Date.now(), modifieLe: Date.now(), ...entree };
  await remplacerEntrees([...entrees, nouvelle]);
  return nouvelle;
}

export async function modifierEntree(id, champs) {
  const i = entrees.findIndex((e) => e.id === id);
  if (i < 0) throw new Error("entrée introuvable");
  const nouvelles = entrees.map((e, k) => (k === i ? { ...e, ...champs, modifieLe: Date.now() } : e));
  await remplacerEntrees(nouvelles);
  return nouvelles[i];
}

export async function supprimerEntree(id) {
  await remplacerEntrees(entrees.filter((e) => e.id !== id));
}

// Vérifie un mot de passe SANS changer l'état courant (ni verrouiller, ni
// déverrouiller) -- sert à reconfirmer l'identité avant une action sensible
// (changer le mot de passe maître) même si le coffre est déjà déverrouillé.
export async function verifierMotDePasse(motDePasse) {
  const brut = lireCoffreBrut();
  if (!brut) return false;
  try {
    const candidate = await deriverCle(motDePasse, texteVersSel(brut.sel), brut.argon2 || ARGON2);
    await dechiffrer(candidate, brut.chiffre);
    return true;
  } catch {
    return false;
  }
}

// Change le mot de passe maître (et éventuellement l'indice) : nouveau sel,
// nouvelle dérivation, les entrées existantes sont reprises telles quelles.
export async function changerMotDePasse(nouveauMotDePasse, indice = "") {
  if (!cle || !entrees) throw new Error("coffre verrouillé");
  const sel = nouveauSel();
  const nouvelleCle = await deriverCle(nouveauMotDePasse, sel, ARGON2);
  const ancienneCle = cle;
  const ancienneEntrees = entrees;
  cle = nouvelleCle;
  try {
    const ok = await ecrireChiffre(ancienneEntrees, sel, ARGON2, indice);
    if (!ok) throw new Error("stockage de l'appareil plein");
  } catch (e) {
    cle = ancienneCle; // on ne touche pas au coffre existant en cas d'échec
    entrees = ancienneEntrees;
    throw e;
  }
}

// Dernier recours si le mot de passe maître est définitivement perdu : efface
// tout (sans lui, les données ne servent de toute façon à rien). L'appelant
// doit avoir fait confirmer très explicitement par l'utilisateur.
export function reinitialiserCoffre() {
  verrouiller();
  effacerCoffre();
}

// Pour le lien de sauvegarde : le coffre tel qu'il est stocké, encore chiffré
// (jamais les entrées en clair, même si le coffre est déverrouillé).
export function exporterCoffreBrut() {
  return lireCoffreBrut();
}

// Restaure un coffre reçu par lien de sauvegarde (déjà chiffré). Remplace le
// coffre actuel -- l'appelant doit avoir fait confirmer l'écrasement.
export function importerCoffreBrut(brut) {
  if (!brut?.sel || !brut?.chiffre || !brut?.argon2) throw new Error("ce lien n'est pas une sauvegarde Coffre valide");
  verrouiller();
  if (!ecrireCoffreBrut(brut)) throw new Error("stockage de l'appareil plein");
}
