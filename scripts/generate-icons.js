const sharp = require('sharp');
const path = require('path');

const BG_DARK = '#0f172a';
const BG_LIGHT = '#1e293b';
const PRIMARY = '#6366f1';
const PRIMARY_LIGHT = '#818cf8';
const ACCENT = '#22d3ee';

function buildIconSvg(size, adaptive) {
  const pad = adaptive ? Math.round(size * 0.22) : Math.round(size * 0.12);
  const inner = size - pad * 2;
  const cr = adaptive ? 0 : Math.round(size * 0.22);

  const sw = inner * 0.125;
  const nL = pad + inner * 0.22;
  const nR = pad + inner * 0.78;
  const nT = pad + inner * 0.22;
  const nB = pad + inner * 0.78;

  const ringR = inner * 0.46;
  const cx = size / 2;
  const cy = size / 2;

  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG_DARK}"/>
      <stop offset="100%" stop-color="${BG_LIGHT}"/>
    </linearGradient>
    <linearGradient id="ng" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PRIMARY_LIGHT}"/>
      <stop offset="60%" stop-color="${ACCENT}"/>
    </linearGradient>
    <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PRIMARY}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0.08"/>
    </linearGradient>
    <filter id="gl">
      <feGaussianBlur stdDeviation="${size * 0.012}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="gl2">
      <feGaussianBlur stdDeviation="${size * 0.025}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  ${!adaptive ? `<rect width="${size}" height="${size}" rx="${cr}" fill="url(#bg)"/>` : ''}

  <!-- Anéis decorativos -->
  <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="url(#rg)"
    stroke-width="${sw * 0.25}" stroke-dasharray="${ringR * 0.7} ${ringR * 1.8}"
    transform="rotate(-25 ${cx} ${cy})"/>
  <circle cx="${cx}" cy="${cy}" r="${ringR * 0.78}" fill="none" stroke="url(#rg)"
    stroke-width="${sw * 0.15}" stroke-dasharray="${ringR * 0.4} ${ringR * 2.2}"
    transform="rotate(50 ${cx} ${cy})"/>

  <!-- N principal -->
  <path d="M ${nL} ${nB} L ${nL} ${nT} L ${nR} ${nB} L ${nR} ${nT}"
    fill="none" stroke="url(#ng)" stroke-width="${sw}"
    stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)"/>

  <!-- Acento luminoso -->
  <circle cx="${nR + sw * 0.05}" cy="${nT - sw * 0.45}" r="${sw * 0.32}"
    fill="${ACCENT}" filter="url(#gl2)" opacity="0.95"/>

  <!-- Brilho sutil inferior esquerdo -->
  <circle cx="${nL - sw * 0.05}" cy="${nB + sw * 0.45}" r="${sw * 0.2}"
    fill="${PRIMARY_LIGHT}" filter="url(#gl2)" opacity="0.5"/>
</svg>`;
}

function buildSplashSvg(w, h) {
  const s = Math.round(Math.min(w, h) * 0.18);
  const sw = s * 0.125;
  const cx = w / 2;
  const cy = h / 2 - s * 0.4;

  const nL = cx - s * 0.28;
  const nR = cx + s * 0.28;
  const nT = cy - s * 0.28;
  const nB = cy + s * 0.28;

  const textY = cy + s * 0.65;

  return `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ng" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PRIMARY_LIGHT}"/>
      <stop offset="60%" stop-color="${ACCENT}"/>
    </linearGradient>
    <filter id="gl">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="${BG_DARK}"/>

  <path d="M ${nL} ${nB} L ${nL} ${nT} L ${nR} ${nB} L ${nR} ${nT}"
    fill="none" stroke="url(#ng)" stroke-width="${sw}"
    stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)"/>

  <circle cx="${nR + sw * 0.05}" cy="${nT - sw * 0.45}" r="${sw * 0.32}"
    fill="${ACCENT}" opacity="0.9"/>

  <text x="${cx}" y="${textY}" text-anchor="middle" fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif" font-size="${s * 0.28}"
    font-weight="700" letter-spacing="6">NEXO</text>
  <text x="${cx}" y="${textY + s * 0.18}" text-anchor="middle" fill="${PRIMARY_LIGHT}"
    font-family="Arial, Helvetica, sans-serif" font-size="${s * 0.1}"
    font-weight="400" opacity="0.6">Finanças Inteligentes</text>
</svg>`;
}

async function main() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  console.log('🎨  Gerando ícones do Nexo…\n');

  // icon.png (1024x1024)
  await sharp(Buffer.from(buildIconSvg(1024, false)))
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('  ✅  icon.png           1024×1024');

  // adaptive-icon.png (1024x1024, sem fundo)
  await sharp(Buffer.from(buildIconSvg(1024, true)))
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('  ✅  adaptive-icon.png  1024×1024');

  // splash-icon.png (centrado)
  await sharp(Buffer.from(buildSplashSvg(1284, 2778)))
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('  ✅  splash-icon.png    1284×2778');

  console.log('\n🎉  Pronto! Todos os ícones gerados em /assets');
}

main().catch(console.error);
