import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBingoEntities1783469000000 implements MigrationInterface {
  name = 'CreateBingoEntities1783469000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE bingo_player_status AS ENUM ('online', 'offline', 'banned');
      CREATE TYPE bingo_room_type AS ENUM ('public', 'private');
      CREATE TYPE bingo_game_state AS ENUM ('waiting', 'running', 'finished', 'cancelled');
      CREATE TYPE bingo_win_type AS ENUM ('linea', 'doubleLine', 'bingo', 'superbingo');
    `);

    await queryRunner.query(`
      CREATE TABLE bingo_players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(80) NOT NULL UNIQUE,
        displayName VARCHAR(120),
        avatarUrl VARCHAR,
        chips BIGINT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status bingo_player_status NOT NULL DEFAULT 'offline',
        meta JSONB
      );
    `);

    await queryRunner.query(`
      CREATE TABLE bingo_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        type bingo_room_type NOT NULL DEFAULT 'public',
        betAmount BIGINT DEFAULT 0,
        maxPlayers INT DEFAULT 8,
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        config JSONB
      );
    `);

    await queryRunner.query(`
      CREATE TABLE bingo_games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        roomId UUID NOT NULL,
        state bingo_game_state NOT NULL DEFAULT 'waiting',
        startAt TIMESTAMP,
        endAt TIMESTAMP,
        currentRound INT DEFAULT 0,
        superbingoPoolId UUID,
        resultSummary JSONB,
        persistedSnapshot JSONB,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_bingo_games_room FOREIGN KEY (roomId) REFERENCES bingo_rooms(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE bingo_super_bingo_pools (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        roomId UUID,
        amount BIGINT DEFAULT 0,
        lastUpdatedAt TIMESTAMP,
        reservedForGameId UUID,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_bingo_super_bingo_pools_game FOREIGN KEY (reservedForGameId) REFERENCES bingo_games(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE bingo_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gameId UUID NOT NULL,
        ownerId UUID NOT NULL,
        numbers JSONB NOT NULL,
        marks JSONB DEFAULT '{}'::jsonb,
        isWinning BOOLEAN DEFAULT false,
        claimedLines JSONB DEFAULT '[]'::jsonb,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_bingo_cards_game FOREIGN KEY (gameId) REFERENCES bingo_games(id) ON DELETE CASCADE,
        CONSTRAINT FK_bingo_cards_player FOREIGN KEY (ownerId) REFERENCES bingo_players(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE bingo_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gameId UUID NOT NULL,
        playerId UUID NOT NULL,
        cardIds JSONB DEFAULT '[]'::jsonb,
        cost BIGINT DEFAULT 0,
        purchasedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_bingo_tickets_game FOREIGN KEY (gameId) REFERENCES bingo_games(id) ON DELETE CASCADE,
        CONSTRAINT FK_bingo_tickets_player FOREIGN KEY (playerId) REFERENCES bingo_players(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE bingo_rounds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gameId UUID NOT NULL,
        roundNumber INT NOT NULL,
        drawnNumber INT NOT NULL,
        drawnAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_bingo_rounds_game FOREIGN KEY (gameId) REFERENCES bingo_games(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE bingo_winners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gameId UUID NOT NULL,
        playerId UUID NOT NULL,
        cardId UUID,
        prizeAmount BIGINT DEFAULT 0,
        winType bingo_win_type NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_bingo_winners_game FOREIGN KEY (gameId) REFERENCES bingo_games(id) ON DELETE CASCADE,
        CONSTRAINT FK_bingo_winners_player FOREIGN KEY (playerId) REFERENCES bingo_players(id) ON DELETE CASCADE,
        CONSTRAINT FK_bingo_winners_card FOREIGN KEY (cardId) REFERENCES bingo_cards(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE bingo_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entityType VARCHAR(120) NOT NULL,
        entityId UUID NOT NULL,
        action VARCHAR(120) NOT NULL,
        payload JSONB,
        performedBy UUID,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_bingo_games_roomId ON bingo_games(roomId);
      CREATE INDEX IDX_bingo_cards_gameId ON bingo_cards(gameId);
      CREATE INDEX IDX_bingo_cards_ownerId ON bingo_cards(ownerId);
      CREATE INDEX IDX_bingo_tickets_gameId ON bingo_tickets(gameId);
      CREATE INDEX IDX_bingo_tickets_playerId ON bingo_tickets(playerId);
      CREATE INDEX IDX_bingo_rounds_gameId ON bingo_rounds(gameId);
      CREATE INDEX IDX_bingo_winners_gameId ON bingo_winners(gameId);
      CREATE INDEX IDX_bingo_audit_entityType ON bingo_audit(entityType);
      CREATE INDEX IDX_bingo_audit_entityId ON bingo_audit(entityId);
      CREATE INDEX IDX_bingo_players_username ON bingo_players(username);
      CREATE INDEX IDX_bingo_rooms_name ON bingo_rooms(name);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bingo_audit;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bingo_winners;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bingo_rounds;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bingo_tickets;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bingo_cards;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bingo_super_bingo_pools;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bingo_games;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bingo_rooms;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bingo_players;`);
    await queryRunner.query(`DROP TYPE IF EXISTS bingo_win_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS bingo_game_state;`);
    await queryRunner.query(`DROP TYPE IF EXISTS bingo_room_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS bingo_player_status;`);
  }
}
