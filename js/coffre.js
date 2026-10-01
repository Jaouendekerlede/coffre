// Cœur du coffre : état en mémoire (clé de données déchiffrée -- "CEK" -- et
// entrées déchiffrées, UNIQUEMENT pendant que le coffre est déverrouillé), et
// passage par crypto.js pour tout ce qui touche au chiffrement. Verrouiller
// efface vraiment la clé et les entrées de la mémoire -- elles ne sont plus
// récupérables tant qu'on n'a pas redéverrouillé (mot de passe + PIN).
//
// Les notes sont chiffrées avec une clé de données (CEK) générée une seule
// fois à la création du coffre, elle-même enveloppée (chiffrée) par le mot de
// passe + PIN. Changer de mot de passe ne touche qu'à cette enveloppe : les
// notes elles-mêmes ne sont pas rechiffrées.

import { ARGON2 } from "./config.js";
import { chiffrer, combinerSecret, dechiffrer, deriverCle, importerCleBrute, nouveauSel, nouvelleCleDonnees, selVersTexte, texteVersSel } from "./crypto.js";
import { coffreExiste, ecrireCoffreBrut, effacerCoffre, lireCoffreBrut } from "./storage.js";

const VERSION_COFFRE = 1;

let cle = null; // CEK (CryptoKey), en mémoire seulement si déverrouillé
let entrees = null; // tableau en mémoire, seulement si déverrouillé

export { coffreExiste };

export function estDeverrouille() {
  return cle !== null;
}

export function indiceMotDePasse() {
  return lireCoffreBrut()?.indice || "";
}

export function pinActif() {
  return !!lireCoffreBrut()?.avecPin;
}

async function ecrire(champs) {
  const brutActuel = lireCoffreBrut();
  return ecrireCoffreBrut({ ...brutActuel, ...champs, modifieLe: Date.now() });
}

// Crée un nouveau coffre (vide) protégé par ce mot de passe (et ce PIN, si
// fourni). Écrase un éventuel coffre existant -- l'appelant doit avoir
// confirmé avec l'utilisateur.
export async function creerCoffre(motDePasse, indice = "", pin = "") {
  const sel = nouveauSel();
  const cleMdp = await deriverCle(combinerSecret(motDePasse, pin), sel, ARGON2);
  const cekOctets = nouvelleCleDonnees();
  cle = await importerCleBrute(cekOctets);
  entrees = [];
  const ok = await ecrireCoffreBrut({
    sel: selVersTexte(sel),
    argon2: ARGON2,
    indice,
    avecPin: !!pin,
    cekMdp: await chiffrer(cleMdp, { cek: selVersTexte(cekOctets) }),
    chiffre: await chiffrer(cle, { version: VERSION_COFFRE, entrees }),
    creeLe: Date.now(),
    modifieLe: Date.now(),
  });
  if (!ok) {
    cle = null;
    entrees = null;
    throw new Error("stockage de l'appareil plein ou bloqué");
  }
  return true;
}

// Tente de déverrouiller avec le mot de passe (+ PIN). Renvoie true/false ;
// ne lève pas d'erreur pour un mauvais mot de passe/PIN (résultat attendu).
export async function deverrouiller(motDePasse, pin = "") {
  const brut = lireCoffreBrut();
  if (!brut) return false;
  try {
    const cleMdp = await deriverCle(combinerSecret(motDePasse, brut.avecPin ? pin : ""), texteVersSel(brut.sel), brut.argon2 || ARGON2);
    const { cek } = await dechiffrer(cleMdp, brut.cekMdp);
    const cekCandidate = await importerCleBrute(texteVersSel(cek));
    const contenu = await dechiffrer(cekCandidate, brut.chiffre);
    cle = cekCandidate;
    entrees = Array.isArray(contenu.entrees) ? contenu.entrees : [];
    return true;
  } catch {
    return false; // mauvais mot de passe, mauvais PIN, ou coffre corrompu
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
  const ok = await ecrire({ chiffre: await chiffrer(cle, { version: VERSION_COFFRE, entrees: nouvellesEntrees }) });
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

// Vérifie un mot de passe (+ PIN) SANS changer l'état courant (ni verrouiller,
// ni déverrouiller) -- sert à reconfirmer l'identité avant une action sensible.
export async function verifierMotDePasse(motDePasse, pin = "") {
  const brut = lireCoffreBrut();
  if (!brut) return false;
  try {
    const cleMdp = await deriverCle(combinerSecret(motDePasse, brut.avecPin ? pin : ""), texteVersSel(brut.sel), brut.argon2 || ARGON2);
    await dechiffrer(cleMdp, brut.cekMdp);
    return true;
  } catch {
    return false;
  }
}

// Change le mot de passe maître et/ou le PIN. La CEK (et donc les notes)
// n'est pas touchée : seule son enveloppe "mot de passe" est recalculée.
// `motDePasseActuel`/`pinActuel` servent à retrouver la CEK -- l'appelant a
// déjà dû les vérifier avec verifierMotDePasse.
export async function changerMotDePasse(motDePasseActuel, pinActuel, nouveauMotDePasse, indice = "", nouveauPin = "") {
  const brut = lireCoffreBrut();
  if (!brut) throw new Error("coffre introuvable");
  const ancienneCleMdp = await deriverCle(combinerSecret(motDePasseActuel, brut.avecPin ? pinActuel : ""), texteVersSel(brut.sel), brut.argon2 || ARGON2);
  const { cek } = await dechiffrer(ancienneCleMdp, brut.cekMdp);
  const sel = nouveauSel();
  const nouvelleCleMdp = await deriverCle(combinerSecret(nouveauMotDePasse, nouveauPin), sel, ARGON2);
  const ok = await ecrire({
    sel: selVersTexte(sel),
    argon2: ARGON2,
    indice,
    avecPin: !!nouveauPin,
    cekMdp: await chiffrer(nouvelleCleMdp, { cek }),
  });
  if (!ok) throw new Error("stockage de l'appareil plein");
}

// Dernier recours si le mot de passe maître (ou le PIN) est définitivement
// perdu : efface tout (sans eux, les données ne servent de toute façon à
// rien). L'appelant doit avoir fait confirmer très explicitement.
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
  if (!brut?.sel || !brut?.chiffre || !brut?.cekMdp) throw new Error("ce lien n'est pas une sauvegarde Coffre valide");
  verrouiller();
  if (!ecrireCoffreBrut(brut)) throw new Error("stockage de l'appareil plein");
}
