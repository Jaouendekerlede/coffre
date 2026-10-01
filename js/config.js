// Constantes de sécurité et de l'appli. Les paramètres Argon2id ci-dessous
// sont volontairement au-dessus des minimums recommandés (OWASP 2024 : au
// moins 19 Mo / 2 passages) : mesurés à 80-350 ms sur un téléphone récent,
// ce qui reste confortable pour un déverrouillage.
export const ARGON2 = { memorySize: 65536, iterations: 3, parallelism: 1, hashLength: 32 };

export const TAILLE_SEL = 16; // octets, aléatoire par coffre
export const TAILLE_IV = 12; // octets, aléatoire par donnée chiffrée (AES-GCM)

export const STORAGE_KEYS = {
  coffre: "coffre_vault", // { sel, argon2, chiffre } -- chiffre = IV + données
  prefs: "coffre_prefs",
};

export const CATEGORIES = [
  { id: "mdp", nom: "Mot de passe", icone: "🔑" },
  { id: "code", nom: "Code / PIN", icone: "🔢" },
  { id: "carte", nom: "Carte bancaire", icone: "💳" },
  { id: "wifi", nom: "Wi-Fi", icone: "📶" },
  { id: "note", nom: "Note sécurisée", icone: "📝" },
  { id: "autre", nom: "Autre", icone: "🗂️" },
];

// Verrouillage automatique.
export const DELAI_INACTIVITE_MS = 3 * 60 * 1000; // 3 min sans toucher l'écran
export const DELAI_ARRIERE_PLAN_MS = 30 * 1000; // 30 s en arrière-plan

// Presse-papiers : la copie d'un mot de passe est effacée toute seule.
export const DELAI_EFFACEMENT_PRESSE_PAPIERS_MS = 60 * 1000;

// Au-delà, le lien de sauvegarde devient trop long pour beaucoup de messageries.
export const LIEN_LONG = 30000;

// Générateur de mots de passe.
export const GENERATEUR_DEFAUT = { longueur: 20, majuscules: true, minuscules: true, chiffres: true, symboles: true, ambigus: false };
export const JEUX_CARACTERES = {
  majuscules: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  minuscules: "abcdefghijkmnpqrstuvwxyz",
  chiffres: "23456789",
  symboles: "!@#$%^&*()-_=+[]{}?",
  // Caractères ambigus ajoutés seulement si l'option correspondante est cochée.
  ambigus: "Il1O0",
};
