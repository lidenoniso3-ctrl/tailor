/* =====================================================
   1. Gestion de l'écran d'installation (PWA)
   ===================================================== */
const installScreen = document.getElementById('install-screen');
const appWrapper = document.getElementById('app-wrapper');
const btnInstallPWA = document.getElementById('btnInstallPWA');
const btnSkipInstall = document.getElementById('btnSkipInstall');
const iosInstruction = document.getElementById('ios-instruction');

let deferredPrompt = null;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

if (isStandalone) {
  installScreen.style.display = 'none';
  appWrapper.style.display = 'flex';
} else {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) iosInstruction.style.display = 'block';

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstallPWA.style.display = 'flex';
  });

  btnInstallPWA.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstallPWA.style.display = 'none';
    enterApp();
  });

  btnSkipInstall.addEventListener('click', enterApp);
}

function enterApp() {
  installScreen.style.display = 'none';
  appWrapper.style.display = 'flex';
}

/* =====================================================
   2. Service Worker
   ===================================================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW registration failed:', err));
  });
}

/* =====================================================
   3. Navigation par onglets
   ===================================================== */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* =====================================================
   4. Calculateur de métrage
   ===================================================== */
// Valeurs de base (en mètres) pour une laize de 140 cm[reference:4]
const baseMetrage = {
  robe: 2.5,
  jupe: 1.5,
  pantalon: 2.5,
  veste: 3.0,
  chemise: 1.6,
  rideau: 2.5 // par panneau, avec fronces standard
};

document.getElementById('btn-calc-metrage').addEventListener('click', () => {
  const type = document.getElementById('metrage-type').value;
  const laize = parseFloat(document.getElementById('metrage-laize').value) || 140;
  const marge = parseFloat(document.getElementById('metrage-marge').value) || 0;
  const raccord = document.getElementById('metrage-raccord').checked;

  let base = baseMetrage[type] || 2.0;

  // Ajustement selon la largeur (laize)[reference:5]
  if (laize >= 150) base *= 0.90;      // 10% de moins
  else if (laize < 120) base *= 1.25;  // 25% de plus

  // Marge de sécurité[reference:6]
  base *= (1 + marge / 100);

  // Raccord de motif
  if (raccord) base *= 1.10;

  const resultat = Math.ceil(base * 10) / 10; // arrondi aux 10 cm supérieurs[reference:7]

  document.getElementById('result-metrage').innerHTML = `
    <p>Pour un(e) <strong>${document.querySelector('#metrage-type option:checked').textContent}</strong> avec une laize de <strong>${laize} cm</strong> :</p>
    <p>Métrage estimé : <strong>${resultat.toFixed(1)} m</strong></p>
    <p style="font-size:12px;color:var(--muted);">Inclut ${marge}% de marge${raccord ? ' + 10% pour raccord de motif' : ''}. Arrondi au décimètre supérieur.</p>
  `;
});

/* =====================================================
   5. Calculateur de jupe cercle
   ===================================================== */
document.getElementById('btn-calc-jupe').addEventListener('click', () => {
  const part = parseFloat(document.getElementById('jupe-type').value);
  const taille = parseFloat(document.getElementById('jupe-taille').value) || 70;
  const aisance = parseFloat(document.getElementById('jupe-aisance').value) || 0;
  const longueur = parseFloat(document.getElementById('jupe-longueur').value) || 50;
  const ourlet = parseFloat(document.getElementById('jupe-ourlet').value) || 0;

  // Formule : r = (taille + aisance) / (2π × part)[reference:8]
  const r = (taille + aisance) / (2 * Math.PI * part);
  const R = r + longueur + ourlet;

  document.getElementById('result-jupe').innerHTML = `
    <p><strong>Rayon de taille (r) : ${r.toFixed(1)} cm</strong></p>
    <p><strong>Rayon total (R) : ${R.toFixed(1)} cm</strong></p>
    <p style="font-size:12px;color:var(--muted);">Placez le patron en utilisant ces rayons. Prévoyez toujours un test sur chute avant de couper le tissu définitif.</p>
  `;
});

/* =====================================================
   6. Calculateur de biais
   ===================================================== */
document.getElementById('btn-calc-biais').addEventListener('click', () => {
  const longueur = parseFloat(document.getElementById('biais-longueur').value) || 200;
  const largeur = parseFloat(document.getElementById('biais-largeur').value) || 4;
  const perte = parseFloat(document.getElementById('biais-perte').value) || 8;

  // Surface nécessaire = longueur × largeur[reference:9]
  const surface = longueur * largeur;
  // Avec perte
  const surfaceAvecPerte = surface * (1 + perte / 100);

  // Côté du carré de tissu nécessaire (si on part d'un carré)
  const coteCarre = Math.sqrt(surfaceAvecPerte);

  document.getElementById('result-biais').innerHTML = `
    <p>Surface de tissu nécessaire : <strong>${(surfaceAvecPerte / 100).toFixed(0)} dm²</strong></p>
    <p>Côté du carré de tissu (si découpe en continu) : <strong>${coteCarre.toFixed(0)} cm</strong></p>
    <p style="font-size:12px;color:var(--muted);">Pour un biais fini de 1 cm, coupez généralement des bandes de 4 cm de large[reference:10].</p>
  `;
});

/* =====================================================
   7. Calculateur de plis
   ===================================================== */
document.getElementById('btn-calc-plis').addEventListener('click', () => {
  const hanches = parseFloat(document.getElementById('plis-hanches').value) || 100;
  const tissuTotal = parseFloat(document.getElementById('plis-tissu').value) || 200;
  const largeurPli = parseFloat(document.getElementById('plis-largeur').value) || 4;

  // Nombre de plis ≈ (largeur totale - tour de hanches) / (2 × largeur du pli)[reference:11]
  const surplus = tissuTotal - hanches;
  const nombrePlis = Math.floor(surplus / (2 * largeurPli));

  document.getElementById('result-plis').innerHTML = `
    <p>Nombre de plis possibles : <strong>${nombrePlis > 0 ? nombrePlis : 0}</strong></p>
    <p>Profondeur de chaque pli : <strong>${largeurPli} cm</strong></p>
    <p style="font-size:12px;color:var(--muted);">Formule indicative. Ajustez selon le tombé et l'aisance souhaités.</p>
  `;
});

/* =====================================================
   8. Calculateur de doublure
   ===================================================== */
document.getElementById('btn-calc-doublure').addEventListener('click', () => {
  const metrage = parseFloat(document.getElementById('doublure-metrage').value) || 200;
  const reduction = parseFloat(document.getElementById('doublure-reduction').value) || 15;

  const doublure = metrage - reduction;

  document.getElementById('result-doublure').innerHTML = `
    <p>Métrage de doublure estimé : <strong>${doublure > 0 ? doublure : 0} cm</strong></p>
    <p style="font-size:12px;color:var(--muted);">La doublure est généralement coupée 2 cm plus courte que le vêtement principal[reference:12].</p>
  `;
});