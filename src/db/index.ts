import * as schema from './schema';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
});

const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL,
});
export const db = drizzle({ client: poolConnection, schema, mode: 'default'  });

// For standalone scripts (migrations, etc.)
export const getDbConnection = async () => {
  return drizzle(connection, { schema, mode: 'default' });
};

