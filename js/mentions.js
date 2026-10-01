// Propriété, droits d'auteur et version -- même principe que TrajetVE, MeteoAI, Vallet et Scanix.

export const PROPRIETAIRE = "Jean-Luc RIO";
export const ANNEE = 2026;
export const VERSION = 1;
export const VERSION_TEXTE = "Version 1 : coffre de notes chiffré (Argon2id + AES-256-GCM), générateur de mots de passe, verrouillage automatique, lien de sauvegarde chiffré";

export const MENTION_COURTE = `© ${ANNEE} ${PROPRIETAIRE} — Tous droits réservés`;

export const MENTION_LEGALE = `Cette application, son code source, sa conception, ses textes et ses graphismes sont la propriété exclusive de ${PROPRIETAIRE}. Toute reproduction, représentation, modification, adaptation, diffusion ou exploitation, totale ou partielle, sans son autorisation écrite préalable est interdite et constitue une contrefaçon (articles L.122-4 et L.335-2 du Code de la propriété intellectuelle). Coffre fonctionne entièrement sur votre appareil : vos notes ne sont jamais envoyées à un serveur, et aucun mot de passe maître oublié ne peut être récupéré par quiconque, y compris l'auteur. La bibliothèque tierce embarquée (hash-wasm, pour Argon2id) reste soumise à sa licence MIT.`;
