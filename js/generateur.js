// Génération de mots de passe robustes, et estimation (approximative) de la
// force d'un mot de passe -- utilisée aussi bien pour le mot de passe maître
// que pour les mots de passe des entrées.

import { JEUX_CARACTERES } from "./config.js";

export function genererMotDePasse(options) {
  let jeu = "";
  if (options.majuscules) jeu += JEUX_CARACTERES.majuscules;
  if (options.minuscules) jeu += JEUX_CARACTERES.minuscules;
  if (options.chiffres) jeu += JEUX_CARACTERES.chiffres;
  if (options.symboles) jeu += JEUX_CARACTERES.symboles;
  if (options.ambigus) jeu += JEUX_CARACTERES.ambigus;
  if (!jeu) jeu = JEUX_CARACTERES.minuscules + JEUX_CARACTERES.chiffres; // jamais un jeu vide
  const valeurs = crypto.getRandomValues(new Uint32Array(options.longueur));
  return Array.from(valeurs, (v) => jeu[v % jeu.length]).join("");
}

// Estimation simple (entropie approximative à partir des familles de
// caractères utilisées) : suffisante pour guider l'utilisateur, pas une
// vraie analyse façon zxcvbn (qui demanderait une bibliothèque de plusieurs
// Mo de mots de passe courants -- pas inclus ici).
export function estimerForce(motDePasse) {
  if (!motDePasse) return { score: 0, texte: "Vide", classe: "nulle" };
  let jeu = 0;
  if (/[a-z]/.test(motDePasse)) jeu += 26;
  if (/[A-Z]/.test(motDePasse)) jeu += 26;
  if (/[0-9]/.test(motDePasse)) jeu += 10;
  if (/[^a-zA-Z0-9]/.test(motDePasse)) jeu += 32;
  const entropie = motDePasse.length * Math.log2(Math.max(jeu, 2));
  const repetitions = motDePasse.length - new Set(motDePasse).size;
  const penalite = repetitions > motDePasse.length / 2 ? 0.6 : 1;
  const bits = entropie * penalite;
  if (motDePasse.length < 8 || bits < 35) return { score: 1, texte: "Faible", classe: "faible" };
  if (bits < 60) return { score: 2, texte: "Moyen", classe: "moyen" };
  if (bits < 90) return { score: 3, texte: "Fort", classe: "fort" };
  return { score: 4, texte: "Très fort", classe: "tres-fort" };
}
