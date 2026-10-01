// Lien de sauvegarde : le coffre, encore chiffré, compressé dans l'adresse de
// l'appli après le « # ». Comme les données sont déjà chiffrées, ce lien est
// sûr à garder (note, mail à soi-même…) même s'il était intercepté : il ne
// révèle rien sans le mot de passe maître. La partie après « # » n'est de
// toute façon jamais envoyée à GitHub Pages.
// Limite à connaître : un lien très ancien pointera vers une version plus
// ancienne de tes notes que l'état actuel si tu as modifié le coffre depuis.

import { exporterCoffreBrut, importerCoffreBrut } from "./coffre.js";

const MARQUE = "#coffre=";

async function transformer(octets, flux) {
  const sortie = new Blob([octets]).stream().pipeThrough(flux);
  return new Uint8Array(await new Response(sortie).arrayBuffer());
}

function versBase64Url(octets) {
  let binaire = "";
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function depuisBase64Url(texte) {
  const binaire = atob(texte.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0));
}

export async function creerLienSauvegarde(adresse = location.href) {
  const brut = exporterCoffreBrut();
  if (!brut) throw new Error("aucun coffre à sauvegarder");
  const octets = await transformer(new TextEncoder().encode(JSON.stringify(brut)), new CompressionStream("deflate"));
  const base = adresse.split("#")[0].split("?")[0];
  return `${base}${MARQUE}${versBase64Url(octets)}`;
}

// À appeler une fois au démarrage. Si l'adresse contient un lien de
// sauvegarde, le signale sans l'appliquer tout de suite (il faut une
// confirmation explicite : ça remplacerait le coffre actuel). Renvoie le
// coffre brut à importer, ou null si l'adresse n'en contenait pas.
export async function lireLienAdresse() {
  const hash = location.hash;
  if (!hash.startsWith(MARQUE)) return null;
  history.replaceState(null, "", location.pathname);
  const octets = await transformer(depuisBase64Url(hash.slice(MARQUE.length)), new DecompressionStream("deflate"));
  const brut = JSON.parse(new TextDecoder().decode(octets));
  if (!brut?.sel || !brut?.chiffre) throw new Error("ce lien n'est pas une sauvegarde Coffre valide");
  return brut;
}

export function appliquerImport(brut) {
  importerCoffreBrut(brut);
}
