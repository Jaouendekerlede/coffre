// Chiffrement du coffre. Deux briques, toutes deux éprouvées et standard :
//  - Argon2id (bibliothèque hash-wasm, chargée à la demande) pour transformer
//    le mot de passe maître en clé de 256 bits -- résistant à la force brute,
//    y compris par des machines puissantes (GPU) ;
//  - AES-256-GCM (Web Crypto, intégré au navigateur, rien à charger) pour
//    chiffrer les données avec cette clé. GCM authentifie aussi les données :
//    toute modification ou tout mauvais mot de passe est détecté au
//    déchiffrement (ça échoue proprement, jamais de contenu corrompu silencieux).
//
// Le sel et les paramètres Argon2id ne sont PAS secrets (c'est normal : la
// sécurité vient de la clé dérivée, pas du secret des paramètres) et sont
// gardés en clair à côté des données chiffrées, pour pouvoir redériver la
// même clé au prochain déverrouillage.

import { ARGON2, TAILLE_IV, TAILLE_SEL } from "./config.js";
import { chargerScript } from "./chargeur.js";

async function argon2id() {
  await chargerScript("js/vendor/hash-wasm.umd.min.js");
  return window.hashwasm;
}

function aleatoire(taille) {
  return crypto.getRandomValues(new Uint8Array(taille));
}

function versBase64(octets) {
  let binaire = "";
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binaire);
}

function depuisBase64(texte) {
  return Uint8Array.from(atob(texte), (c) => c.charCodeAt(0));
}

// Dérive une clé AES-256-GCM (objet CryptoKey, jamais exportable) à partir du
// mot de passe maître et d'un sel. `params` : { memorySize, iterations, parallelism, hashLength }.
export async function deriverCle(motDePasse, sel, params = ARGON2) {
  const hw = await argon2id();
  const octets = await hw.argon2id({
    password: new TextEncoder().encode(motDePasse),
    salt: sel,
    memorySize: params.memorySize,
    iterations: params.iterations,
    parallelism: params.parallelism,
    hashLength: params.hashLength,
    outputType: "binary",
  });
  return crypto.subtle.importKey("raw", octets, "AES-GCM", false, ["encrypt", "decrypt"]);
}

// Chiffre un objet JS quelconque. Renvoie une chaîne base64 autonome : IV
// (toujours en clair, ce n'est pas un secret) suivi des données chiffrées.
export async function chiffrer(cle, objet) {
  const iv = aleatoire(TAILLE_IV);
  const clair = new TextEncoder().encode(JSON.stringify(objet));
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cle, clair));
  const sortie = new Uint8Array(iv.length + chiffre.length);
  sortie.set(iv, 0);
  sortie.set(chiffre, iv.length);
  return versBase64(sortie);
}

// Déchiffre une chaîne produite par chiffrer(). Lève une erreur si la clé est
// fausse (mauvais mot de passe) ou si les données sont corrompues/modifiées :
// AES-GCM authentifie, il ne renvoie jamais un résultat corrompu en silence.
export async function dechiffrer(cle, texte) {
  const octets = depuisBase64(texte);
  const iv = octets.slice(0, TAILLE_IV);
  const chiffre = octets.slice(TAILLE_IV);
  const clair = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cle, chiffre);
  return JSON.parse(new TextDecoder().decode(clair));
}

export function nouveauSel() {
  return aleatoire(TAILLE_SEL);
}

export const selVersTexte = versBase64;
export const texteVersSel = depuisBase64;
