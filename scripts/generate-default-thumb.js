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

// Mismo criterio que ExtractTopSquareThumbnail en Unity: se mide el ancho real de contenido
// opaco solo en la mitad de arriba de la imagen (cabeza + pelo, sin hombros) y se usa eso
// como lado del cuadrado, en vez de todo el ancho del busto. En PNG (top-left origin)
// "arriba" es y = 0, así que la mitad de arriba es y en [0, height/2).
const topRegionHeight = Math.floor(png.height / 2);
let headMinX = png.width;
let headMaxX = 0;
let found = false;

for (let y = 0; y < topRegionHeight; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2;
    const alpha = png.data[idx + 3];
    if (alpha > 100) {
      found = true;
      if (x < headMinX) headMinX = x;
      if (x > headMaxX) headMaxX = x;
    }
  }
}

let size, x;
if (found) {
  const headWidth = Math.ceil((headMaxX - headMinX + 1) * 1.15);
  const headCenterX = Math.floor((headMinX + headMaxX) / 2);
  size = Math.min(Math.max(headWidth, 1), png.width);
  x = Math.min(Math.max(headCenterX - Math.floor(size / 2), 0), png.width - size);
} else {
  size = Math.min(png.width, png.height);
  x = Math.floor((png.width - size) / 2);
}
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
