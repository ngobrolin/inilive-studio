import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql, type Generated, type Kysely } from "kysely";

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export type SqlMigration = {
  name: string;
  sql: string;
};

export async function readMigrationFiles(directory = migrationsDirectory): Promise<SqlMigration[]> {
  const names = (await readdir(directory)).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();

  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await readFile(join(directory, name), "utf8"),
    })),
  );
}

type MigrationDatabase = {
  schema_migrations: {
    name: string;
    applied_at: Generated<Date>;
  };
};

export async function migrateDatabase(db: Kysely<MigrationDatabase>): Promise<void> {
  await db.schema
    .createTable("schema_migrations")
    .ifNotExists()
    .addColumn("name", "text", (column) => column.primaryKey())
    .addColumn("applied_at", "timestamptz", (column) => column.notNull().defaultTo(db.fn("now")))
    .execute();

  for (const migration of await readMigrationFiles()) {
    const applied = await db
      .selectFrom("schema_migrations")
      .select("name")
      .where("name", "=", migration.name)
      .executeTakeFirst();

    if (applied) {
      continue;
    }

    await db.transaction().execute(async (transaction) => {
      await sql.raw(migration.sql).execute(transaction);
      await transaction.insertInto("schema_migrations").values({ name: migration.name }).execute();
    });
  }
}
