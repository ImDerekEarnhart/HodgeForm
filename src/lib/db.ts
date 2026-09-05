import { pendingMigrations } from "../../scripts/migration-plan.mjs";

export type DbSource = "postgres" | "pglite";
const rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
const databaseUrl = rawDatabaseUrl?.trim() || undefined;
export const dbSource: DbSource = databaseUrl ? "postgres" : "pglite";

export interface Sql {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;
function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) => run<T>(text, params);
  return sql;
}

const globalRef = globalThis as typeof globalThis & {
  __hfPoolPromise__?: Promise<import("pg").Pool>;
  __hfPglitePromise__?: Promise<import("@electric-sql/pglite").PGlite>;
  __hfPgliteMigrateChain__?: Promise<void>;
};

async function getPool(): Promise<import("pg").Pool> {
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  globalRef.__hfPoolPromise__ ??= (async () => {
    const { Pool, types } = await import("pg");
    types.setTypeParser(20, Number);
    types.setTypeParser(1082, (v) => v);
    return new Pool({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: Math.max(250, Number(process.env.HODGEFORM_DB_CONNECT_TIMEOUT_MS ?? "5000") || 5000) });
  })();
  return globalRef.__hfPoolPromise__;
}

async function getEmbedded(): Promise<import("@electric-sql/pglite").PGlite> {
  globalRef.__hfPglitePromise__ ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite();
    await pg.waitReady;
    await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
    return pg;
  })();
  const pg = await globalRef.__hfPglitePromise__;
  const migrate = async () => {
    let migrations: Record<string, string>;
    // Vite replaces glob calls but does not preserve import.meta.glob at runtime.
    // SSR is a compile-time constant in the bundle and absent in direct Node tests.
    if (import.meta.env?.SSR || typeof import.meta.glob === "function") {
      migrations = import.meta.glob("/migrations/*.sql", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    } else {
      // Direct Node-based integration tests do not provide Vite's import.meta.glob.
      // Load the same source-controlled migration directory without changing the
      // basename-based migration ledger used in production.
      const { readdir, readFile } = await import("node:fs/promises");
      const directory = new URL("../../migrations/", import.meta.url);
      migrations = Object.fromEntries(await Promise.all(
        (await readdir(directory)).filter((name) => name.endsWith(".sql")).map(async (name) => [
          `/migrations/${name}`,
          await readFile(new URL(name, directory), "utf8"),
        ]),
      ));
    }
    const applied = (await pg.query<{ name: string }>("select name from _migrations")).rows.map((r) => r.name);
    for (const { name, path } of pendingMigrations(Object.keys(migrations), applied)) {
      await pg.transaction(async (tx) => {
        await tx.exec(migrations[path]);
        await tx.query("insert into _migrations (name) values ($1)", [name]);
      });
    }
  };
  const pass = (globalRef.__hfPgliteMigrateChain__ ?? Promise.resolve()).catch(() => undefined).then(migrate);
  globalRef.__hfPgliteMigrateChain__ = pass;
  await pass;
  return pg;
}

let sqlPromise: Promise<Sql> | null = null;
export function getSql(): Promise<Sql> {
  if (typeof window !== "undefined") throw new Error("Database access is server-only");
  sqlPromise ??= (async () => {
    if (dbSource === "postgres") {
      const pool = await getPool();
      return toSql(async <T>(text: string, params: unknown[]) => (await pool.query(text, params)).rows as T[]);
    }
    const pg = await getEmbedded();
    return toSql(async <T>(text: string, params: unknown[]) => (await pg.query<T>(text, params)).rows);
  })().catch((error) => { sqlPromise = null; throw error; });
  return sqlPromise;
}

export async function withTransaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  if (typeof window !== "undefined") throw new Error("Database transactions are server-only");
  if (dbSource === "postgres") {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const sql = toSql(async <R>(text: string, params: unknown[]) => (await client.query(text, params)).rows as R[]);
      const result = await fn(sql);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
      throw error;
    } finally {
      client.release();
    }
  }
  const pg = await getEmbedded();
  return pg.transaction(async (tx) => {
    const sql = toSql(async <R>(text: string, params: unknown[]) => (await tx.query<R>(text, params)).rows);
    return fn(sql);
  });
}

export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  if (dbSource !== "pglite") throw new Error("PGlite is only available without DATABASE_URL");
  return getEmbedded();
}

export async function ensureDbReady(): Promise<void> {
  if (dbSource === "pglite") await getEmbedded();
}

if (typeof window === "undefined" && dbSource === "pglite") void ensureDbReady();
