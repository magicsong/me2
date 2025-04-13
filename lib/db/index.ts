import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { BaseRepository } from './base';
import { BasePersistenceService } from './persistence';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

export const db = drizzle(pool);
export { BaseRepository, BasePersistenceService };
export * from './base';
export * from './persistence';
export * from './intf';
