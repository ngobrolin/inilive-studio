import { sql } from "kysely";
import { createDatabase } from "../../src/lib/server/db/database.ts";

const db = createDatabase();

try {
  const result = await sql`select 1 as ok`.execute(db);
  console.log(`Database smoke query returned ${result.rows[0]?.ok}.`);
} finally {
  await db.destroy();
}
