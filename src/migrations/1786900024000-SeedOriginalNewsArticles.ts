import { MigrationInterface, QueryRunner } from 'typeorm';

// Restores the 8 placeholder news items that used to be hardcoded in the frontend's news.jsx
// before the real news_articles table existed — they disappeared from view the moment the
// component switched to reading from the (until-then-empty) DB instead of that array. Seeded
// only if the table is still empty, so this never duplicates real articles an admin already
// created after the table went live.
export class SeedOriginalNewsArticles1786900024000 implements MigrationInterface {
  name = 'SeedOriginalNewsArticles1786900024000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = await queryRunner.query(`SELECT COUNT(*)::int AS count FROM "news_articles"`);
    if (Number(count) > 0) {
      return;
    }

    // Oldest first here (item 8 gets the earliest createdAt, item 1 the latest) so the
    // ORDER BY "createdAt" DESC the app already uses reproduces the original array order.
    const items = [
      {
        tag: 'Novedad',
        titulo: 'Centro de Ayuda con tickets de soporte',
        texto: '¿Tenés una consulta? Abrí un ticket desde la sección Ayuda y nuestro equipo te va a responder ahí mismo.',
      },
      {
        tag: 'Novedad',
        titulo: 'Ranking de Top Ganadores',
        texto: 'Mirá quién está ganando más fichas en los juegos y quién está conectado ahora mismo, directo desde el Inicio.',
      },
      {
        tag: 'Novedad',
        titulo: 'Catálogo de juegos por categoría',
        texto: 'Explorá Bingo, Casino, Cartas, Slots y más, todo organizado por categoría, con la info de cada juego a un clic de distancia.',
      },
      {
        tag: 'Novedad',
        titulo: 'Amigos y mensajes privados',
        texto: 'Agregá amigos, visitá su perfil y mandales un mensaje privado directo desde la plataforma.',
      },
      {
        tag: 'Novedad',
        titulo: 'Nuevo sistema de rangos',
        texto: 'De Bronce a Diamante: subí de rango a medida que cargás fichas y desbloqueá el prestigio de los jugadores de élite.',
      },
      {
        tag: 'Promoción',
        titulo: '1 millón de fichas para los primeros 100 usuarios',
        texto: 'Los primeros 100 jugadores en registrarse reciben 1.000.000 de fichas de regalo directo en su cuenta. ¡No te quedes afuera!',
      },
      {
        tag: 'Juegos',
        titulo: 'Ya podés jugar Royal Joker, Minas y Royal Pachinka',
        texto: 'Nuestros primeros tres juegos ya están activos y disponibles ahora mismo. Elegí tu favorito desde la sección Juegos y probá suerte.',
      },
      {
        tag: 'Lanzamiento',
        titulo: 'RoyalGames se lanza muy pronto',
        texto: 'Estamos ultimando los últimos detalles para el gran lanzamiento de la plataforma. Prepará tu cuenta, la diversión está por comenzar.',
      },
    ];

    for (let i = 0; i < items.length; i++) {
      const { tag, titulo, texto } = items[i];
      const minutesAgo = (items.length - i) * 5;
      await queryRunner.query(
        `INSERT INTO "news_articles" ("titulo", "texto", "tag", "createdAt")
         VALUES ($1, $2, $3, now() - ($4 || ' minutes')::interval)`,
        [titulo, texto, tag, minutesAgo],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: don't delete real articles an admin may have added since — this migration is
    // additive-only.
  }
}
