import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

export function isNeonConfigured(): boolean {
  return Boolean(connectionString && connectionString.startsWith("postgres"));
}

export function getNeonSql(): NeonQueryFunction<boolean, boolean> | null {
  if (!isNeonConfigured()) {
    return null;
  }
  return neon(connectionString!);
}

export function getNeonDb() {
  const sql = getNeonSql();
  if (!sql) return null;
  return drizzle(sql, { schema });
}
