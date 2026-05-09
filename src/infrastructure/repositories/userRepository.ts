import { pool } from '../db/postgresClient';

export type User = {
  id: string;
  provider: string;
  email?: string;
  name?: string;
  picture?: string;
  createdAt: string;
  updatedAt: string;
};

const mapRowToUser = (row: any): User => ({
  id: row.id,
  provider: row.provider,
  email: row.email || undefined,
  name: row.name || undefined,
  picture: row.picture || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class UserRepository {
  async findById(id: string): Promise<User | undefined> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    if (result.rowCount === 0) {
      return undefined;
    }
    return mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    if (result.rowCount === 0) {
      return undefined;
    }
    return mapRowToUser(result.rows[0]);
  }

  async save(user: User): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (id, provider, email, name, picture, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        picture = EXCLUDED.picture,
        updated_at = now()
      RETURNING *`,
      [
        user.id,
        user.provider,
        user.email ?? null,
        user.name ?? null,
        user.picture ?? null,
        user.createdAt,
      ],
    );

    return mapRowToUser(result.rows[0]);
  }
}
