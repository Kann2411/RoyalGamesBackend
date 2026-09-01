require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Los dos JSON viejos que pudo haber recibido un usuario al registrarse antes de este cambio
// (antes y despues de ajustar el tono de piel, pero con el diseño/indices viejos: headIndex 2,
// hairIndex 0, capIndex 0, etc). Se comparan como jsonb (ignora orden de claves), así que
// alcanza con listar los dos valores exactos que se llegaron a asignar.
const oldVariantBase = {
  capColor: '#FFFFFFFF',
  capIndex: 0,
  bodyIndex: -1,
  earsIndex: 0,
  eyesIndex: 0,
  hairColor: '#353333FF',
  hairIndex: 0,
  headIndex: 2,
  noseIndex: 0,
  beardColor: '#353333FF',
  beardIndex: -1,
  mouthIndex: 0,
  shirtColor: '#FFFFFFFF',
  shirtIndex: 0,
  jacketColor: '#FFFFFFFF',
  jacketIndex: -1,
  glassesColor: '#FFFFFFFF',
  glassesIndex: -1,
  tattoosColor: '#FFFFFFFF',
  tattoosIndex: -1,
  earringsColor: '#FFFFFFFF',
  earringsIndex: -1,
  eyebrowsColor: '#353333FF',
  eyebrowsIndex: -1,
  necklaceColor: '#FFFFFFFF',
  necklaceIndex: -1,
};

const oldVariant1 = { ...oldVariantBase, headColor: '#D7A280FF' };
const oldVariant2 = { ...oldVariantBase, headColor: '#E6B996FF' };

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const previewResult = await client.query(
      `SELECT id, nick FROM "users" WHERE "avatarData" = $1::jsonb OR "avatarData" = $2::jsonb`,
      [JSON.stringify(oldVariant1), JSON.stringify(oldVariant2)],
    );
    console.log(`Usuarios que todavia tienen el avatar viejo por defecto: ${previewResult.rows.length}`);
    console.log(previewResult.rows.map((r) => r.nick).join(', '));

    if (previewResult.rows.length === 0) {
      console.log('Nada para actualizar.');
      return;
    }

    // Datos nuevos: se leen del mismo archivo ya compilado para no duplicar los valores.
    const constantsSrc = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'common', 'constants', 'default-avatar.ts'),
      'utf8',
    );
    const base64Match = constantsSrc.match(/DEFAULT_AVATAR_BASE64 =\s*\n\s*'([^']+)'/);
    const thumbBase64Match = constantsSrc.match(/DEFAULT_AVATAR_THUMB_BASE64 =\s*\n\s*'([^']+)'/);
    const dataMatch = constantsSrc.match(/DEFAULT_AVATAR_DATA = (\{[\s\S]*?\n\});/);

    if (!base64Match || !thumbBase64Match || !dataMatch) {
      throw new Error('No se pudieron leer los valores nuevos de default-avatar.ts');
    }

    const newAvatarBuffer = Buffer.from(base64Match[1], 'base64');
    const newThumbBuffer = Buffer.from(thumbBase64Match[1], 'base64');
    const newAvatarData = eval('(' + dataMatch[1] + ')');

    const updateResult = await client.query(
      `UPDATE "users"
       SET "avatar_bin" = $1, "avatar_mime" = $2, "avatarData" = $3, "avatar_thumb_bin" = $4, "avatar_thumb_mime" = $2
       WHERE "avatarData" = $5::jsonb OR "avatarData" = $6::jsonb`,
      [
        newAvatarBuffer,
        'image/png',
        JSON.stringify(newAvatarData),
        newThumbBuffer,
        JSON.stringify(oldVariant1),
        JSON.stringify(oldVariant2),
      ],
    );
    console.log(`Filas actualizadas: ${updateResult.rowCount}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
