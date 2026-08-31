const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const srcPath = path.join(__dirname, '..', 'src', 'common', 'constants', 'default-avatar.ts');
const src = fs.readFileSync(srcPath, 'utf8');

const match = src.match(/DEFAULT_AVATAR_BASE64 =\s*\n?\s*'([^']+)'/);
if (!match) {
  console.error('No se encontro DEFAULT_AVATAR_BASE64 en el archivo.');
  process.exit(1);
}

const buffer = Buffer.from(match[1], 'base64');
const png = PNG.sync.read(buffer);

// Mismo criterio que ExtractTopSquareThumbnail en Unity: cuadrado desde arriba, centrado
// horizontalmente. En PNG (top-left origin) "arriba" es y = 0.
const size = Math.min(png.width, png.height);
const x = Math.floor((png.width - size) / 2);
const y = 0;

const thumb = new PNG({ width: size, height: size });
PNG.bitblt(png, thumb, x, y, size, size, 0, 0);

const outBuffer = PNG.sync.write(thumb);
const outBase64 = outBuffer.toString('base64');

console.log(`Original: ${png.width}x${png.height}`);
console.log(`Thumbnail: ${size}x${size}`);
console.log(`Base64 length: ${outBase64.length}`);

fs.writeFileSync(path.join(__dirname, 'default-thumb-base64.txt'), outBase64);
console.log('Guardado en scripts/default-thumb-base64.txt');
