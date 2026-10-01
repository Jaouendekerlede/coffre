// Déverrouillage par empreinte / visage, via WebAuthn et son extension PRF :
// le capteur du téléphone (jamais Coffre lui-même) dérive un secret propre à
// CET appareil et à CE capteur, utilisé pour envelopper la clé du coffre (voir
// crypto.js, nouvelleCleDonnees). C'est un vrai second moyen de déverrouiller,
// pas juste un raccourci -- et le mot de passe maître continue de fonctionner
// quoi qu'il arrive, il n'est jamais retiré par l'activation de la biométrie.
//
// Limite à connaître : la prise en charge de l'extension PRF varie selon le
// téléphone et la version d'Android/du navigateur. Quand elle manque,
// l'activation échoue avec un message clair, sans rien changer au coffre.

const SEL_PRF = new TextEncoder().encode("coffre-biometrie-v1");

export function disponible() {
  return !!(window.PublicKeyCredential && navigator.credentials?.create);
}

function versBase64(tampon) {
  const octets = new Uint8Array(tampon);
  let binaire = "";
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binaire);
}

function depuisBase64(texte) {
  return Uint8Array.from(atob(texte), (c) => c.charCodeAt(0));
}

// Redemande l'empreinte pour un identifiant déjà créé, et renvoie le même
// secret de 32 octets qu'à la création (déterministe : même capteur, même
// sel -> même résultat). Lève une erreur si refusé, annulé, ou non reconnu.
export async function obtenirCle(credentialId) {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: depuisBase64(credentialId), type: "public-key" }],
      userVerification: "required",
      extensions: { prf: { eval: { first: SEL_PRF } } },
      timeout: 20000,
    },
  });
  const resultat = assertion?.getClientExtensionResults().prf?.results?.first;
  if (!resultat) throw new Error("empreinte non reconnue sur cet appareil");
  return new Uint8Array(resultat);
}

// Crée un nouvel identifiant biométrique pour ce coffre, sur cet appareil.
// Renvoie { credentialId, cle (32 octets) }. Lève une erreur explicite si ce
// n'est pas possible (biométrie absente, extension PRF non supportée,
// annulé par la personne...) -- n'enregistre rien dans ce cas.
export async function creerCredential() {
  if (!disponible()) throw new Error("ce navigateur ne prend pas en charge le déverrouillage biométrique");
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { id: location.hostname, name: "Coffre" },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "coffre", displayName: "Coffre" },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256, compatibilité plus large
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      extensions: { prf: {} },
      timeout: 20000,
    },
  });
  if (!cred) throw new Error("création annulée");
  if (!cred.getClientExtensionResults().prf?.enabled) {
    throw new Error("ce téléphone ne prend pas en charge cette fonction (extension PRF absente pour son capteur)");
  }
  const credentialId = versBase64(cred.rawId);
  const cle = await obtenirCle(credentialId); // 2e invite : récupère le secret réel
  return { credentialId, cle };
}
