import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

export function isNeonConfigured(): boolean {
  const conn = getConnectionString();
  return Boolean(conn && conn.startsWith("postgres"));
}

export function getNeonSql(): NeonQueryFunction<boolean, boolean> | null {
  if (!isNeonConfigured()) {
    return null;
  }
  return neon(getConnectionString()!);
}

export function getNeonDb() {
  const sql = getNeonSql();
  if (!sql) return null;
  return drizzle(sql, { schema });
}
